import { lazy, Suspense, useEffect, useState } from 'react';
import { Phase } from '@mafia/shared';
import socket from './socket';
import { useGameStore } from './store/gameStore';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import AdminPage from './pages/AdminPage';
import NightPhase from './components/phases/NightPhase';
import DayPhase from './components/phases/DayPhase';
import Vote1Phase from './components/phases/Vote1Phase';
import Vote2Phase from './components/phases/Vote2Phase';
import AnnouncementBanner from './components/AnnouncementBanner';
import PrivateToast from './components/PrivateToast';

const IS_DEV = import.meta.env.DEV;

// DevPage is only bundled in dev builds; the lazy import is dead code in production.
const DevPage = IS_DEV
  ? lazy(() => import('./pages/DevPage'))
  : null;

export default function App() {
  const { roomState, myPlayerId, setRoomState, setMyInfo, addAnnouncement } =
    useGameStore();

  const [showDev, setShowDev] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    socket.on('room_state', (room) => setRoomState(room));

    socket.on('game_started', ({ yourRole, yourPlayerId, mafiaTeam, roomState }) => {
      setMyInfo(yourPlayerId, yourRole, mafiaTeam);
      setRoomState(roomState);
    });

    socket.on('role_updated', ({ yourRole, mafiaTeam }) => {
      const playerId = useGameStore.getState().myPlayerId;
      if (!playerId) return;
      setMyInfo(playerId, yourRole, mafiaTeam);
    });

    socket.on('phase_changed', ({ phase, round }) => {
      setRoomState({ ...useGameStore.getState().roomState!, phase, round });
    });

    socket.on('announcement', (msg) => addAnnouncement(msg));

    socket.on('player_died', ({ playerId }) => {
      const state = useGameStore.getState();
      if (!state.roomState) return;
      const updated = {
        ...state.roomState,
        players: state.roomState.players.map((p) =>
          p.id === playerId ? { ...p, isAlive: false } : p
        ),
      };
      setRoomState(updated);
    });

    socket.on('game_ended', ({ winner, reason }) => {
      addAnnouncement(
        `게임 종료! ${winner === 'mafia' ? '마피아' : '시민'} 팀 승리! ${reason}`
      );
    });

    socket.on('error', (msg) => alert(msg));

    socket.on('hacker_visited', ({ hackerNickname }) => {
      addAnnouncement(
        `🤖 [개인] 해커 '${hackerNickname}'이(가) 당신을 방문했습니다!`
      );
    });

    return () => {
      socket.off('room_state');
      socket.off('game_started');
      socket.off('role_updated');
      socket.off('phase_changed');
      socket.off('announcement');
      socket.off('player_died');
      socket.off('game_ended');
      socket.off('error');
      socket.off('hacker_visited');
    };
  }, []);

  const phase = roomState?.phase;

  if (IS_DEV && showDev && DevPage) {
    return (
      <div>
        <button
          onClick={() => setShowDev(false)}
          style={{ margin: 8, padding: '4px 12px', cursor: 'pointer' }}
        >
          ← 게임으로 돌아가기
        </button>
        <Suspense fallback={<div>Loading...</div>}>
          <DevPage />
        </Suspense>
      </div>
    );
  }

  if (showAdmin) {
    return <AdminPage onBack={() => setShowAdmin(false)} />;
  }

  const devToggle = IS_DEV ? (
    <button
      onClick={() => setShowDev(true)}
      title="Dev Panel"
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        padding: '6px 10px',
        background: '#ff6b6b',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 12,
        zIndex: 9999,
        opacity: 0.85,
      }}
    >
      🛠 Dev
    </button>
  ) : null;

  if (!roomState || !myPlayerId) {
    return (
      <>
        <LobbyPage onShowAdmin={() => setShowAdmin(true)} />
        {devToggle}
      </>
    );
  }

  if (phase === Phase.LOBBY) {
    return (
      <>
        <RoomPage />
        {devToggle}
      </>
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto' }}>
      <PrivateToast />
      <AnnouncementBanner />
      {phase === Phase.NIGHT && <NightPhase />}
      {phase === Phase.DAY && <DayPhase />}
      {phase === Phase.VOTE1 && <Vote1Phase />}
      {phase === Phase.VOTE2 && <Vote2Phase />}
      {phase === Phase.ENDED && (
        <div style={{ textAlign: 'center', fontSize: 24, marginTop: 40 }}>
          🎮 게임 종료
        </div>
      )}
      {devToggle}
    </div>
  );
}
