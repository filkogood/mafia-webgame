import { Player, GameSettings, Role } from '@mafia/shared';

export interface NightActionResult {
  deaths: string[];
  healedPlayers: string[];
  announcements: string[];
  updatedPlayers: Player[];
}

function clonePlayers(players: Player[]): Player[] {
  return players.map((p) => ({ ...p }));
}

function pickRandomTargets(targets: string[], count: number): string[] {
  const shuffled = [...targets].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
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
  round: number
): NightActionResult {
  const updated = clonePlayers(players);
  const byId = (id: string) => updated.find((p) => p.id === id);

  const deaths: string[] = [];
  const healedPlayers: string[] = [];
  const announcements: string[] = [];

  // ── Madam: apply drunk / break couple ─────────────────────────────────────
  for (const actor of updated) {
    if (actor.role !== Role.MADAM || !actor.isAlive) continue;
    const targetId = confirmedActions[actor.id] ?? null;
    if (!targetId) continue;
    const target = byId(targetId);
    if (!target) continue;

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
      killTargets = pickRandomTargets(candidates, Math.min(2, candidates.length));
    } else {
      // Most-voted target
      const maxVotes = Math.max(...Object.values(mafiaTargetVotes));
      const topTargets = Object.entries(mafiaTargetVotes)
        .filter(([, v]) => v === maxVotes)
        .map(([id]) => id);
      killTargets = [topTargets[Math.floor(Math.random() * topTargets.length)]];
    }
  }

  // ── Apply kills with couple-shield and doctor-save ────────────────────────
  for (const targetId of killTargets) {
    const target = byId(targetId);
    if (!target || !target.isAlive) continue;

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

  // ── Expire drunk / voteBlock from previous rounds ─────────────────────────
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
  }

  return { deaths, healedPlayers, announcements, updatedPlayers: updated };
}
