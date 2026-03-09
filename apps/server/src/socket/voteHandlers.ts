import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Phase,
  Role,
  RoleKoreanName,
} from '@mafia/shared';
import { getRoom, updateRoom, findRoomByPlayerId } from '../state/roomStore';
import {
  tallyVote1,
  resolveVote2,
  getVoterWeight,
  canVote,
  checkWinCondition,
  clearHypnotizedAtVote2Start,
} from '@mafia/game-core';
import { scheduleNightTimer } from './nightHandlers';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Collected live votes for current Vote1 round */
const vote1Entries = new Map<string, Map<string, { targetId: string; weight: number }>>();
/** Collected live votes for current Vote2 round */
const vote2Entries = new Map<string, Map<string, { choice: 'yes' | 'no'; weight: number }>>();

export function registerVoteHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AppSocket
) {
  socket.on('vote1_cast', ({ targetId }) => {
    const room = findRoomByPlayerId(socket.id);
    if (!room || room.phase !== Phase.VOTE1) return;

    const voter = room.players.find((p) => p.id === socket.id);
    if (!voter) return;
    if (!canVote(voter, 'vote1', room.settings.ghostVoteMode, room.round))
      return;

    if (!vote1Entries.has(room.id))
      vote1Entries.set(room.id, new Map());
    const roomVotes = vote1Entries.get(room.id)!;
    roomVotes.set(socket.id, {
      targetId,
      weight: getVoterWeight(voter),
    });

    // Check if all eligible voters have voted
    const eligibleVoters = room.players.filter((p) =>
      canVote(p, 'vote1', room.settings.ghostVoteMode, room.round)
    );
    if (roomVotes.size >= eligibleVoters.length) {
      finalizeVote1(io, room.id);
    }
  });

  socket.on('ghost_vote1_cast', ({ targetId }) => {
    const room = findRoomByPlayerId(socket.id);
    if (!room || room.phase !== Phase.VOTE1) return;
    if (!room.settings.ghostVoteMode) return;

    const voter = room.players.find((p) => p.id === socket.id);
    if (!voter || voter.isAlive) return; // must be dead
    if (voter.ghostVotesUsedVote1) return;

    voter.ghostVotesUsedVote1 = true;
    updateRoom(room);

    if (!vote1Entries.has(room.id))
      vote1Entries.set(room.id, new Map());
    const roomVotes = vote1Entries.get(room.id)!;
    roomVotes.set(`ghost_${socket.id}`, { targetId, weight: 1 });

    const eligibleVoters = room.players.filter((p) =>
      canVote(p, 'vote1', room.settings.ghostVoteMode, room.round)
    );
    if (roomVotes.size >= eligibleVoters.length) {
      finalizeVote1(io, room.id);
    }
  });

  socket.on('vote2_cast', ({ choice }) => {
    const room = findRoomByPlayerId(socket.id);
    if (!room || room.phase !== Phase.VOTE2) return;

    const voter = room.players.find((p) => p.id === socket.id);
    if (!voter) return;
    if (!canVote(voter, 'vote2', room.settings.ghostVoteMode, room.round))
      return;
    // Politician cannot be killed by vote unless drunk
    if (voter.id === room.vote1Candidate) return;

    if (!vote2Entries.has(room.id))
      vote2Entries.set(room.id, new Map());
    const roomVotes = vote2Entries.get(room.id)!;
    roomVotes.set(socket.id, {
      choice,
      weight: getVoterWeight(voter),
    });

    const eligibleVoters = room.players.filter(
      (p) =>
        canVote(p, 'vote2', room.settings.ghostVoteMode, room.round) &&
        p.id !== room.vote1Candidate
    );
    if (roomVotes.size >= eligibleVoters.length) {
      finalizeVote2(io, room.id);
    }
  });

  socket.on('ghost_vote2_cast', ({ choice }) => {
    const room = findRoomByPlayerId(socket.id);
    if (!room || room.phase !== Phase.VOTE2) return;
    if (!room.settings.ghostVoteMode) return;

    const voter = room.players.find((p) => p.id === socket.id);
    if (!voter || voter.isAlive) return;
    if (voter.ghostVotesUsedVote2) return;

    voter.ghostVotesUsedVote2 = true;
    updateRoom(room);

    if (!vote2Entries.has(room.id))
      vote2Entries.set(room.id, new Map());
    const roomVotes = vote2Entries.get(room.id)!;
    roomVotes.set(`ghost_${socket.id}`, { choice, weight: 1 });

    const eligibleVoters = room.players.filter(
      (p) =>
        canVote(p, 'vote2', room.settings.ghostVoteMode, room.round) &&
        p.id !== room.vote1Candidate
    );
    if (roomVotes.size >= eligibleVoters.length) {
      finalizeVote2(io, room.id);
    }
  });
}

export function finalizeVote1(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string
) {
  const room = getRoom(roomId);
  if (!room) return;

  const roomVoteMap = vote1Entries.get(roomId) ?? new Map();
  const voteArray = Array.from(roomVoteMap.entries()).map(
    ([voterId, { targetId, weight }]) => ({ voterId, targetId, weight })
  );

  const { candidate, isTie, tally } = tallyVote1(voteArray);

  room.vote1Candidate = candidate;
  room.vote1Tally = tally;

  // Check if candidate is a politician who is not drunk
  let finalCandidate = candidate;
  if (candidate) {
    const candidatePlayer = room.players.find((p) => p.id === candidate);
    if (
      candidatePlayer?.role === Role.POLITICIAN &&
      !candidatePlayer.isDrunk
    ) {
      finalCandidate = null; // politician cannot be executed by vote unless drunk
    }
  }

  io.to(roomId).emit('vote1_result', {
    candidate: finalCandidate,
    isTie,
    tally,
  });

  vote1Entries.delete(roomId);

  if (finalCandidate) {
    room.phase = Phase.VOTE2;
    room.vote1Candidate = finalCandidate;
    // Clear hypnotized status at VOTE2 start
    room.players = clearHypnotizedAtVote2Start(room.players, room.round);
    updateRoom(room);
    io.to(roomId).emit('phase_changed', { phase: Phase.VOTE2, round: room.round });
  } else {
    // No candidate → go to NIGHT; clear hypnotized here to prevent stale effects
    // carrying into the next round (VOTE2 won't occur so expiry won't trigger otherwise)
    room.players = clearHypnotizedAtVote2Start(room.players, room.round);
    room.phase = Phase.NIGHT;
    room.round += 1;
    room.nightActions = {};
    room.quickFinishVotes = [];
    updateRoom(room);
    io.to(roomId).emit('phase_changed', { phase: Phase.NIGHT, round: room.round });
    scheduleNightTimer(io, roomId);
  }
  io.to(roomId).emit('room_state', room);
}

export function finalizeVote2(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string
) {
  const room = getRoom(roomId);
  if (!room || !room.vote1Candidate) return;

  const candidateId = room.vote1Candidate;
  const roomVoteMap = vote2Entries.get(roomId) ?? new Map();
  const voteArray = Array.from(roomVoteMap.entries()).map(
    ([voterId, { choice, weight }]) => ({ voterId, choice, weight })
  );

  const eligibleCount = room.players.filter(
    (p) =>
      canVote(p, 'vote2', room.settings.ghostVoteMode, room.round) &&
      p.id !== candidateId
  ).length;

  const { executed } = resolveVote2(voteArray, eligibleCount);

  const yesCnt = voteArray
    .filter((v) => v.choice === 'yes')
    .reduce((s, v) => s + v.weight, 0);
  const noCnt = voteArray
    .filter((v) => v.choice === 'no')
    .reduce((s, v) => s + v.weight, 0);

  room.vote2Tally = { yes: yesCnt, no: noCnt };

  io.to(roomId).emit('vote2_result', {
    executed,
    candidateId,
    tally: { yes: yesCnt, no: noCnt },
  });

  vote2Entries.delete(roomId);

  // Expire drunk/voteBlock effects from this round
  for (const p of room.players) {
    if (p.drunkExpiresAfterVote2 === room.round) {
      p.isDrunk = false;
      p.drunkExpiresAfterVote2 = null;
    }
    if (p.voteBlockExpiresAfterVote2 === room.round) {
      p.isVoteBlocked = false;
      p.voteBlockExpiresAfterVote2 = null;
    }
  }

  if (executed) {
    const candidate = room.players.find((p) => p.id === candidateId);
    if (candidate) {
      candidate.isAlive = false;
      io.to(roomId).emit('player_died', {
        playerId: candidateId,
        role: room.settings.announcementMode ? candidate.role : undefined,
      });
      const roleInfo = room.settings.announcementMode
        ? ` (${RoleKoreanName[candidate.role]})`
        : '';
      io.to(roomId).emit(
        'announcement',
        `${candidate.nickname}님이 처형되었습니다.${roleInfo}`
      );
    }
  }

  // Check win condition
  const winResult = checkWinCondition(room.players);
  if (winResult.winner) {
    room.phase = Phase.ENDED;
    updateRoom(room);
    io.to(roomId).emit('game_ended', {
      winner: winResult.winner,
      reason: winResult.reason,
    });
    return;
  }

  // Go to next NIGHT
  room.phase = Phase.NIGHT;
  room.round += 1;
  room.vote1Candidate = null;
  room.vote1Tally = {};
  room.vote2Tally = { yes: 0, no: 0 };
  room.nightActions = {};
  room.quickFinishVotes = [];
  updateRoom(room);
  io.to(roomId).emit('phase_changed', { phase: Phase.NIGHT, round: room.round });
  io.to(roomId).emit('room_state', room);
  scheduleNightTimer(io, roomId);
}
