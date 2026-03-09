import socket from '../../socket';
import { useGameStore } from '../../store/gameStore';
import Timer from '../Timer';
import PlayerList from '../PlayerList';
import AnnouncementBanner from '../AnnouncementBanner';

export default function DayPhase() {
  const { roomState, myPlayerId } = useGameStore();
  if (!roomState) return null;

  const me = roomState.players.find((p) => p.id === myPlayerId);
  const isAlive = me?.isAlive ?? false;

  const handleQuickFinish = () => {
    socket.emit('quick_finish');
  };

  return (
    <div>
      <h2>☀️ 낮 ({roomState.round}라운드)</h2>
      <Timer seconds={roomState.settings.dayTimerSec} label="남은 시간" />
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
      <AnnouncementBanner />
      <PlayerList />
      {isAlive && roomState.settings.allowQuickFinish && (
        <button
          onClick={handleQuickFinish}
          style={{
            marginTop: 12,
            padding: '8px 20px',
            background: '#f39c12',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          ⚡ 빨리하기 ({roomState.quickFinishVotes.length} /{' '}
          {Math.ceil(roomState.players.filter((p) => p.isAlive).length / 2) + 1})
        </button>
      )}
    </div>
  );
}
