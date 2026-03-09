import { useEffect, useState } from 'react';
import socket from '../../socket';
import { useGameStore } from '../../store/gameStore';
import Timer from '../Timer';
import PlayerList from '../PlayerList';

export default function Vote1Phase() {
  const { roomState, myPlayerId } = useGameStore();
  const [voted, setVoted] = useState(false);
  const [tally, setTally] = useState<Record<string, number>>({});

  useEffect(() => {
    setVoted(false);
    setTally({});
  }, [roomState?.round]);

  useEffect(() => {
    socket.on('vote1_result', ({ tally }) => {
      setTally(tally);
    });
    return () => {
      socket.off('vote1_result');
    };
  }, []);

  if (!roomState || !myPlayerId) return null;

  const me = roomState.players.find((p) => p.id === myPlayerId);

  const handleVote = (targetId: string) => {
    socket.emit('vote1_cast', { targetId });
    setVoted(true);
  };

  const handleGhostVote = (targetId: string) => {
    socket.emit('ghost_vote1_cast', { targetId });
    setVoted(true);
  };

  const isAlive = me?.isAlive ?? false;
  const isDead = !isAlive;
  const canGhostVote = isDead && roomState.settings.ghostVoteMode && !me?.ghostVotesUsedVote1;

  const targets = roomState.players.filter((p) => p.isAlive);

  return (
    <div>
      <h2>🗳️ 투표1 ({roomState.round}라운드)</h2>
      <Timer seconds={roomState.settings.vote1TimerSec} label="남은 시간" />
      {me?.isHypnotized && (
        <div
          style={{
            background: '#4a0080',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 6,
            marginBottom: 12,
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          당신은 지금 말을 할 수 없습니다. 말을 해서는 안됩니다.
        </div>
      )}

      {Object.keys(tally).length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <strong>현재 집계:</strong>
          {Object.entries(tally).map(([id, cnt]) => {
            const p = roomState.players.find((pl) => pl.id === id);
            return (
              <span key={id} style={{ marginLeft: 8 }}>
                {p?.nickname ?? id}: {cnt}
              </span>
            );
          })}
        </div>
      )}

      {!voted && (isAlive || canGhostVote) && (
        <div>
          <h4>{canGhostVote ? '👻 영혼 투표' : '처형 대상 선택'}</h4>
          {targets.map((p) => (
            <button
              key={p.id}
              onClick={() => (canGhostVote ? handleGhostVote(p.id) : handleVote(p.id))}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                marginBottom: 4,
                background: '#f0f0f0',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {p.nickname}
            </button>
          ))}
        </div>
      )}
      {voted && (
        <p style={{ color: '#27ae60', fontWeight: 'bold' }}>✅ 투표 완료</p>
      )}
      {isDead && !canGhostVote && (
        <p style={{ color: '#888' }}>사망한 상태입니다.</p>
      )}

      <PlayerList />
    </div>
  );
}
