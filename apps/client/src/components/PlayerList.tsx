import { useGameStore } from '../store/gameStore';
import { RoleKoreanName } from '@mafia/shared';

export default function PlayerList() {
  const { roomState, myPlayerId, myRole } = useGameStore();
  if (!roomState) return null;

  return (
    <div>
      <h3>플레이어 ({roomState.players.length}명)</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {roomState.players.map((p) => {
          const isMe = p.id === myPlayerId;
          const roleLabel =
            isMe && myRole ? ` [${RoleKoreanName[myRole]}]` : '';
          return (
            <li
              key={p.id}
              style={{
                padding: '6px 8px',
                marginBottom: 4,
                background: p.isAlive ? '#f0f0f0' : '#ddd',
                borderRadius: 4,
                color: p.isAlive ? '#222' : '#888',
                textDecoration: p.isAlive ? 'none' : 'line-through',
                fontWeight: isMe ? 'bold' : 'normal',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {!p.isAlive && '💀 '}
              {p.nickname}
              {p.id === roomState.hostId && ' 👑'}
              {roleLabel && (
                <span style={{ fontSize: 12, color: '#666' }}>{roleLabel}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
