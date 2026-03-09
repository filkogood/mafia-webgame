import { Player, GameSettings, Role, RoleKoreanName } from '@mafia/shared';

export interface NightActionResult {
  deaths: string[];
  healedPlayers: string[];
  announcements: string[];
  updatedPlayers: Player[];
  /** Night visits: each entry means fromId's role visited toId that night. */
  visits: Array<{ fromId: string; toId: string }>;
  /** Private per-player notifications (e.g. investigation results). */
  privateNotifications: Array<{ playerId: string; message: string }>;
}

function clonePlayers(players: Player[]): Player[] {
  return players.map((p) => ({ ...p }));
}

function pickRandomTargets(targets: string[], count: number, rng: () => number): string[] {
  const arr = [...targets];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function isMafiaTeam(player: Player): boolean {
  return (
    player.role === Role.MAFIA ||
    player.role === Role.ROOKIE_MAFIA ||
    player.role === Role.HACKER ||
    player.role === Role.MADAM ||
    player.role === Role.BURGLAR ||
    player.role === Role.CULT_MONK
  );
}

export function processNightActions(
  players: Player[],
  confirmedActions: Record<string, string | null>,
  settings: GameSettings,
  round: number,
  rng: () => number = Math.random
): NightActionResult {
  const updated = clonePlayers(players);
  const byId = (id: string) => updated.find((p) => p.id === id);

  const deaths: string[] = [];
  const healedPlayers: string[] = [];
  const announcements: string[] = [];

  // Capture pre-night state for investigation: track which ROOKIE_MAFIA were
  // non-inherited at the START of the night (before inheritance runs this round).
  const nonInheritedRookieMafiaIds = new Set(
    players
      .filter((p) => p.role === Role.ROOKIE_MAFIA && !p.hasInheritedMafia && p.isAlive)
      .map((p) => p.id)
  );

  // ── Madam: apply drunk / break couple ─────────────────────────────────────
  for (const actor of updated) {
    if (actor.role !== Role.MADAM || !actor.isAlive) continue;
    const targetId = confirmedActions[actor.id] ?? null;
    if (!targetId) continue;
    const target = byId(targetId);
    if (!target) continue;

    // Android is immune to Madam's abilities
    if (target.role === Role.ANDROID) continue;

    if (target.isCouple) {
      // Break couple status for both partners and citizenize both
      target.isCouple = false;
      target.isDrunk = false;
      target.drunkExpiresAfterVote2 = null;
      target.role = Role.CITIZEN;
      if (target.couplePairId) {
        const partner = byId(target.couplePairId);
        if (partner) {
          partner.isCouple = false;
          partner.couplePairId = null;
          partner.isDrunk = false;
          partner.drunkExpiresAfterVote2 = null;
          partner.role = Role.CITIZEN;
        }
      }
      target.couplePairId = null;
      announcements.push(`${target.nickname}의 커플 관계가 해제되었습니다.`);
    } else {
      target.isDrunk = true;
      target.drunkExpiresAfterVote2 = round;
    }
  }

  // ── Burglar: apply vote-block ──────────────────────────────────────────────
  for (const actor of updated) {
    if (actor.role !== Role.BURGLAR || !actor.isAlive) continue;
    const targetId = confirmedActions[actor.id] ?? null;
    if (!targetId) continue;
    const target = byId(targetId);
    if (!target) continue;

    target.isVoteBlocked = true;
    target.voteBlockExpiresAfterVote2 = round;
  }

  // ── Hypnotist (CULT_MONK): apply hypnotized ────────────────────────────────
  for (const actor of updated) {
    if (actor.role !== Role.CULT_MONK || !actor.isAlive) continue;
    const targetId = confirmedActions[actor.id] ?? null;
    if (!targetId) continue;
    const target = byId(targetId);
    if (!target) continue;

    target.isHypnotized = true;
    target.hypnotizedExpiresAtVote2 = round;
  }

  // ── Doctor: collect saves ──────────────────────────────────────────────────
  const savedIds = new Set<string>();
  for (const actor of updated) {
    if (actor.role !== Role.DOCTOR || !actor.isAlive) continue;
    const targetId = confirmedActions[actor.id] ?? null;
    if (!targetId) continue;
    // Self-heal rule: allowed any round when toggle is on, only round 1 when off
    if (targetId === actor.id && !settings.doctorSelfHealEnabled && round > 1) continue;
    savedIds.add(targetId);
  }

  // ── Mafia: collect kill targets ────────────────────────────────────────────
  const mafiaActors = updated.filter(
    (p) =>
      p.isAlive &&
      (p.role === Role.MAFIA ||
        (p.role === Role.ROOKIE_MAFIA && p.hasInheritedMafia))
  );

  const mafiaTargetVotes: Record<string, number> = {};
  for (const actor of mafiaActors) {
    const targetId = confirmedActions[actor.id] ?? null;
    if (!targetId) continue;
    const target = byId(targetId);
    if (!target || !target.isAlive) continue;
    // teamKillMode OFF: cannot target own team
    if (!settings.teamKillMode && isMafiaTeam(target)) continue;
    mafiaTargetVotes[targetId] = (mafiaTargetVotes[targetId] ?? 0) + 1;
  }

  let killTargets: string[] = [];
  if (Object.keys(mafiaTargetVotes).length > 0) {
    if (settings.multiKillMode) {
      // 2 random unique targets
      const candidates = Object.keys(mafiaTargetVotes);
      killTargets = pickRandomTargets(candidates, Math.min(2, candidates.length), rng);
    } else {
      // Most-voted target
      const maxVotes = Math.max(...Object.values(mafiaTargetVotes));
      const topTargets = Object.entries(mafiaTargetVotes)
        .filter(([, v]) => v === maxVotes)
        .map(([id]) => id);
      killTargets = [topTargets[Math.floor(rng() * topTargets.length)]];
    }
  }

  // ── Apply kills with couple-shield and doctor-save ────────────────────────
  for (const targetId of killTargets) {
    const target = byId(targetId);
    if (!target || !target.isAlive) continue;

    // Android is absolutely immune to mafia night kill
    if (target.role === Role.ANDROID) continue;

    if (savedIds.has(targetId)) {
      healedPlayers.push(targetId);
      continue;
    }

    if (target.isCouple && target.couplePairId) {
      // Partner dies instead
      const partner = byId(target.couplePairId);
      if (partner && partner.isAlive) {
        if (savedIds.has(partner.id)) {
          healedPlayers.push(partner.id);
        } else if (partner.role === Role.ANDROID) {
          // Android partner is immune – shield absorbs the kill, nobody dies
        } else {
          partner.isAlive = false;
          deaths.push(partner.id);
        }
      } else {
        // Partner already dead, target dies normally
        target.isAlive = false;
        deaths.push(targetId);
      }
    } else {
      target.isAlive = false;
      deaths.push(targetId);
    }
  }

  // ── RookieMafia inheritance ────────────────────────────────────────────────
  const aliveMafiaBodies = updated.filter(
    (p) => p.isAlive && p.role === Role.MAFIA
  );
  if (aliveMafiaBodies.length === 0) {
    for (const p of updated) {
      if (p.role === Role.ROOKIE_MAFIA && !p.hasInheritedMafia && p.isAlive) {
        p.hasInheritedMafia = true;
        announcements.push(`${p.nickname}이(가) 마피아 역할을 계승했습니다.`);
      }
    }
  }

  // ── Possessor inheritance (first night only) ───────────────────────────────
  if (round === 1 && deaths.length > 0) {
    const possessor = updated.find(
      (p) => p.role === Role.POSSESSOR && p.isAlive && !deaths.includes(p.id)
    );
    if (possessor) {
      const idx = Math.floor(rng() * deaths.length);
      const inheritedFrom = byId(deaths[idx]);
      if (inheritedFrom) {
        possessor.role = inheritedFrom.role;
        possessor.knownMafiaTeam = null;
      }
    }
  }

  // ── Expire drunk / voteBlock / hypnotized from previous rounds ───────────
  // (expiry is checked at vote time; we just clean up here for completed rounds)
  for (const p of updated) {
    if (
      p.isDrunk &&
      p.drunkExpiresAfterVote2 !== null &&
      p.drunkExpiresAfterVote2 < round
    ) {
      p.isDrunk = false;
      p.drunkExpiresAfterVote2 = null;
    }
    if (
      p.isVoteBlocked &&
      p.voteBlockExpiresAfterVote2 !== null &&
      p.voteBlockExpiresAfterVote2 < round
    ) {
      p.isVoteBlocked = false;
      p.voteBlockExpiresAfterVote2 = null;
    }
    if (
      p.isHypnotized &&
      p.hypnotizedExpiresAtVote2 !== null &&
      p.hypnotizedExpiresAtVote2 < round
    ) {
      p.isHypnotized = false;
      p.hypnotizedExpiresAtVote2 = null;
    }
  }

  // ── Compute visits: Hacker targeting a player counts as a visit ───────────
  const visits: Array<{ fromId: string; toId: string }> = [];
  for (const actor of updated) {
    if (!actor.isAlive || actor.role !== Role.HACKER) continue;
    const targetId = confirmedActions[actor.id] ?? null;
    if (targetId) visits.push({ fromId: actor.id, toId: targetId });
  }

  // ── Compute private notifications ─────────────────────────────────────────
  const privateNotifications: Array<{ playerId: string; message: string }> = [];

  // Rookie Mafia investigation (non-inherited only, based on pre-night state)
  for (const actor of updated) {
    if (!nonInheritedRookieMafiaIds.has(actor.id)) continue;
    const targetId = confirmedActions[actor.id] ?? null;
    if (!targetId) continue;
    const target = byId(targetId);
    if (!target) continue;
    const result = target.role === Role.MAFIA ? '마피아' : '시민';
    privateNotifications.push({ playerId: actor.id, message: `조사 결과: ${result}` });
  }

  // Hacker investigation
  for (const actor of updated) {
    if (actor.role !== Role.HACKER || !actor.isAlive) continue;
    const targetId = confirmedActions[actor.id] ?? null;
    if (!targetId) continue;
    const target = byId(targetId);
    if (!target) continue;
    let message: string;
    if (actor.knownMafiaTeam === null) {
      // Pre-contact: only MAFIA body counts as "마피아"; all other roles count as "시민"
      const result = target.role === Role.MAFIA ? '마피아' : '시민';
      message = `해킹 결과: ${result}`;
    } else {
      // Post-contact: reveal exact role
      message = `해킹 결과: ${RoleKoreanName[target.role]}`;
    }
    privateNotifications.push({ playerId: actor.id, message });
  }

  return { deaths, healedPlayers, announcements, updatedPlayers: updated, visits, privateNotifications };
}

/**
 * Clears hypnotized status for all players whose effect expires at the start of
 * Vote2 for the given round. Call this when transitioning from VOTE1 to VOTE2.
 */
export function clearHypnotizedAtVote2Start(players: Player[], round: number): Player[] {
  return players.map((p) => {
    if (p.isHypnotized && p.hypnotizedExpiresAtVote2 === round) {
      return { ...p, isHypnotized: false, hypnotizedExpiresAtVote2: null };
    }
    return p;
  });
}
