import { Player, Role } from '@mafia/shared';

/** Determines if a player is an effective mafia body (including inherited RookieMafia) */
function isMafiaBody(player: Player): boolean {
  return (
    player.role === Role.MAFIA ||
    (player.role === Role.ROOKIE_MAFIA && player.hasInheritedMafia)
  );
}

export function checkWinCondition(players: Player[]): {
  winner: 'mafia' | 'citizen' | null;
  reason: string;
} {
  const alivePlayers = players.filter((p) => p.isAlive);
  const aliveMafiaBodies = alivePlayers.filter(isMafiaBody);
  const aliveNonMafiaBody = alivePlayers.filter((p) => !isMafiaBody(p));

  if (aliveMafiaBodies.length === 0) {
    return { winner: 'citizen', reason: '마피아가 모두 제거되었습니다.' };
  }

  if (aliveMafiaBodies.length >= aliveNonMafiaBody.length) {
    return {
      winner: 'mafia',
      reason: '마피아 수가 시민 수 이상이 되었습니다.',
    };
  }

  return { winner: null, reason: '' };
}
