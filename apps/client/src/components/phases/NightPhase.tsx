import { useEffect, useState } from 'react';
import { Role, RoleCategory } from '@mafia/shared';
import socket from '../../socket';
import { useGameStore } from '../../store/gameStore';
import Timer from '../Timer';
import PlayerList from '../PlayerList';
import RoleCard from '../RoleCard';

export default function NightPhase() {
  const { roomState, myPlayerId, myRole, mafiaTeam } = useGameStore();
  const [previewTarget, setPreviewTarget] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [mafiaPreviewTargets, setMafiaPreviewTargets] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    setPreviewTarget(null);
    setConfirmed(false);
  }, [roomState?.round]);

  useEffect(() => {
    socket.on('night_preview_update', (targets) => {
      setMafiaPreviewTargets(targets);
    });
    return () => {
      socket.off('night_preview_update');
    };
  }, []);

  if (!roomState || !myPlayerId || !myRole) return null;

  const me = roomState.players.find((p) => p.id === myPlayerId);
  if (!me?.isAlive) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <h2>🌙 밤 ({roomState.round}라운드)</h2>
        <p style={{ color: '#888' }}>사망한 상태입니다. 밤이 끝나기를 기다리세요.</p>
      </div>
    );
  }

  const canAct =
    myRole === Role.MAFIA ||
    (myRole === Role.ROOKIE_MAFIA && me.hasInheritedMafia) ||
    myRole === Role.HACKER ||
    myRole === Role.MADAM ||
    myRole === Role.BURGLAR ||
    myRole === Role.CULT_MONK ||
    myRole === Role.DOCTOR;

  const isMafia =
    myRole === Role.MAFIA ||
    (myRole === Role.ROOKIE_MAFIA && me.hasInheritedMafia);

  // Post-contact collaborators can also see the mafia target preview
  const canSeePreview =
    isMafia ||
    (RoleCategory[myRole] === 'mafia_collaborator' && me.knownMafiaTeam !== null);

  const handlePreview = (targetId: string) => {
    // Toggle: clicking the same player deselects; clicking a new player selects
    const newTarget = previewTarget === targetId ? null : targetId;
    setPreviewTarget(newTarget);
    socket.emit('night_preview', { targetId: newTarget });
    if (confirmed) {
      // Re-confirm immediately with updated selection
      socket.emit('night_confirm', { targetId: newTarget });
    }
  };

  const handleConfirm = () => {
    socket.emit('night_confirm', { targetId: previewTarget });
    setConfirmed(true);
  };

  const alivePlayers = roomState.players.filter(
    (p) => p.isAlive && p.id !== myPlayerId
  );

  return (
    <div>
      <h2>🌙 밤 ({roomState.round}라운드)</h2>
      <RoleCard role={myRole} />
      <Timer seconds={roomState.settings.nightTimerSec} label="남은 시간" />

      {canAct && (
        <div style={{ marginTop: 12 }}>
          <h4>대상 선택</h4>
          {alivePlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePreview(p.id)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                marginBottom: 4,
                background: previewTarget === p.id ? '#e74c3c' : '#f0f0f0',
                color: previewTarget === p.id ? '#fff' : '#222',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {p.nickname}
            </button>
          ))}
          {!confirmed && (
            <button
              onClick={handleConfirm}
              style={{
                marginTop: 8,
                padding: '8px 20px',
                background: '#333',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {previewTarget ? '확정' : '행동 안함'}
            </button>
          )}
        </div>
      )}
      {confirmed && (
        <p style={{ color: '#27ae60', fontWeight: 'bold' }}>✅ 행동이 확정되었습니다.</p>
      )}

      {canSeePreview && Object.keys(mafiaPreviewTargets).length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: '#ffeaea',
            borderRadius: 4,
          }}
        >
          <strong>마피아 팀 예고 대상:</strong>
          {mafiaTeam?.map((m) => {
            const t = mafiaPreviewTargets[m.id];
            const target = t
              ? roomState.players.find((p) => p.id === t)
              : null;
            return (
              <div key={m.id} style={{ fontSize: 13 }}>
                {m.nickname}: {target ? target.nickname : '없음'}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <PlayerList />
      </div>
    </div>
  );
}
