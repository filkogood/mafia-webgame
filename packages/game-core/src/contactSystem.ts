import { Player, Role } from '@mafia/shared';

/** Returns array of collaborator player IDs who triggered contact this night */
export function checkContacts(
  players: Player[],
  confirmedActions: Record<string, string | null>
): string[] {
  const triggered: string[] = [];

  const mafiaBodies = players.filter(
    (p) =>
      p.isAlive &&
      (p.role === Role.MAFIA ||
        (p.role === Role.ROOKIE_MAFIA && p.hasInheritedMafia))
  );
  const mafiaBodyIds = new Set(mafiaBodies.map((p) => p.id));

  // Targets chosen by mafia this night
  const mafiaTargets = new Set<string>();
  for (const mafia of mafiaBodies) {
    const t = confirmedActions[mafia.id] ?? null;
    if (t) mafiaTargets.add(t);
  }

  const collaborators = players.filter(
    (p) =>
      p.isAlive &&
      (p.role === Role.ROOKIE_MAFIA ||
        p.role === Role.HACKER ||
        p.role === Role.MADAM ||
        p.role === Role.BURGLAR ||
        p.role === Role.CULT_MONK) &&
      !p.hasInheritedMafia && // inherited rookieMafia is already mafia body
      p.knownMafiaTeam === null // contact not yet triggered
  );

  for (const collab of collaborators) {
    const collabTarget = confirmedActions[collab.id] ?? null;
    if (!collabTarget) continue;

    // Condition 1: collab targets same player as mafia
    const targetsMafiaTarget = mafiaTargets.has(collabTarget);
    // Condition 2: collab directly targets a mafia body
    const targetsMafiaBody = mafiaBodyIds.has(collabTarget);

    if (targetsMafiaTarget || targetsMafiaBody) {
      triggered.push(collab.id);
    }
  }

  return triggered;
}
