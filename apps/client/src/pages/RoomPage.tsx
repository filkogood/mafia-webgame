import socket from '../socket';
import { useGameStore } from '../store/gameStore';
import PlayerList from '../components/PlayerList';

export default function RoomPage() {
  const { roomState, myPlayerId } = useGameStore();
  if (!roomState) return null;

  const isHost = roomState.hostId === myPlayerId;
  const canStart =
    roomState.players.length >= 4 && roomState.players.length <= 12;

  const toggle = (key: keyof typeof roomState.settings) => {
    socket.emit('update_settings', {
      settings: { [key]: !roomState.settings[key] },
    });
  };

  const updateTimer = (key: keyof typeof roomState.settings, value: number) => {
    socket.emit('update_settings', { settings: { [key]: value } });
  };

  return (
    <div
      style={{
        maxWidth: 500,
        margin: '40px auto',
        fontFamily: 'sans-serif',
        padding: 16,
      }}
    >
      <h2>🏠 방 코드: {roomState.id}</h2>
      <PlayerList />

      {isHost && (
        <div
          style={{
            border: '1px solid #ddd',
            padding: 12,
            borderRadius: 4,
            marginTop: 16,
          }}
        >
          <h3 style={{ margin: '0 0 8px' }}>게임 설정</h3>
          {(
            [
              ['ghostVoteMode', '영혼투표모드'],
              ['teamKillMode', '팀킬모드'],
              ['multiKillMode', '멀티킬모드'],
              ['announcementMode', '공지모드'],
              ['allowQuickFinish', '빨리하기'],
            ] as [keyof typeof roomState.settings, string][]
          ).map(([key, label]) => (
            <label
              key={key}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}
            >
              <input
                type="checkbox"
                checked={!!roomState.settings[key]}
                onChange={() => toggle(key)}
              />
              {label}
            </label>
          ))}

          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(
              [
                ['nightTimerSec', '밤 타이머(초)'],
                ['dayTimerSec', '낮 타이머(초)'],
                ['vote1TimerSec', '투표1 타이머(초)'],
                ['vote2TimerSec', '투표2 타이머(초)'],
              ] as [keyof typeof roomState.settings, string][]
            ).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ width: 130 }}>{label}</span>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={roomState.settings[key] as number}
                  onChange={(e) => updateTimer(key, parseInt(e.target.value))}
                  style={{ width: 60, padding: 4 }}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {isHost && (
        <button
          onClick={() => socket.emit('start_game')}
          disabled={!canStart}
          style={{
            marginTop: 16,
            padding: '10px 24px',
            fontSize: 16,
            background: canStart ? '#e74c3c' : '#ccc',
            color: '#fff',
            border: 'none',
            cursor: canStart ? 'pointer' : 'not-allowed',
            borderRadius: 4,
            width: '100%',
          }}
        >
          게임 시작 ({roomState.players.length}명)
        </button>
      )}
      {!isHost && (
        <p style={{ textAlign: 'center', color: '#888' }}>
          호스트가 게임을 시작하기를 기다리는 중...
        </p>
      )}
    </div>
  );
}
