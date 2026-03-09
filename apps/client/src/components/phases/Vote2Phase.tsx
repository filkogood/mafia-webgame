import { useEffect, useState } from 'react';
import socket from '../../socket';
import { useGameStore } from '../../store/gameStore';
import Timer from '../Timer';

export default function Vote2Phase() {
  const { roomState, myPlayerId } = useGameStore();
  const [voted, setVoted] = useState(false);
  const [tally, setTally] = useState<{ yes: number; no: number } | null>(null);

  useEffect(() => {
    setVoted(false);
    setTally(null);
  }, [roomState?.round]);

  useEffect(() => {
    socket.on('vote2_result', ({ tally }) => {
      setTally(tally);
    });
    return () => {
      socket.off('vote2_result');
    };
  }, []);

  if (!roomState || !myPlayerId) return null;

  const me = roomState.players.find((p) => p.id === myPlayerId);
  const candidateId = roomState.vote1Candidate;
  const candidate = roomState.players.find((p) => p.id === candidateId);

  const isAlive = me?.isAlive ?? false;
  const isDead = !isAlive;
  const isCandidate = myPlayerId === candidateId;
  const canGhostVote =
    isDead && roomState.settings.ghostVoteMode && !me?.ghostVotesUsedVote2;

  const handleVote = (choice: 'yes' | 'no') => {
    socket.emit('vote2_cast', { choice });
    setVoted(true);
  };

  const handleGhostVote = (choice: 'yes' | 'no') => {
    socket.emit('ghost_vote2_cast', { choice });
    setVoted(true);
  };

  return (
    <div>
      <h2>⚖️ 투표2 ({roomState.round}라운드)</h2>
      <Timer seconds={roomState.settings.vote2TimerSec} label="남은 시간" />

      <div
        style={{
          padding: 12,
          background: '#ffeaea',
          borderRadius: 4,
          marginBottom: 12,
        }}
      >
        <strong>처형 후보:</strong> {candidate?.nickname ?? '알 수 없음'}
      </div>

      {tally && (
        <div style={{ marginBottom: 8 }}>
          찬성 {tally.yes} / 반대 {tally.no}
        </div>
      )}

      {!voted && !isCandidate && (isAlive || canGhostVote) && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => (canGhostVote ? handleGhostVote('yes') : handleVote('yes'))}
            style={{
              flex: 1,
              padding: 12,
              background: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            {canGhostVote ? '👻 ' : ''}👍 찬성
          </button>
          <button
            onClick={() => (canGhostVote ? handleGhostVote('no') : handleVote('no'))}
            style={{
              flex: 1,
              padding: 12,
              background: '#2980b9',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            {canGhostVote ? '👻 ' : ''}👎 반대
          </button>
        </div>
      )}
      {isCandidate && (
        <p style={{ color: '#e74c3c' }}>당신이 처형 후보입니다!</p>
      )}
      {voted && (
        <p style={{ color: '#27ae60', fontWeight: 'bold' }}>✅ 투표 완료</p>
      )}
      {isDead && !canGhostVote && (
        <p style={{ color: '#888' }}>사망한 상태입니다.</p>
      )}
    </div>
  );
}
