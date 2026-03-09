import { useEffect } from 'react';
import { Phase } from '@mafia/shared';
import socket from './socket';
import { useGameStore } from './store/gameStore';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import NightPhase from './components/phases/NightPhase';
import DayPhase from './components/phases/DayPhase';
import Vote1Phase from './components/phases/Vote1Phase';
import Vote2Phase from './components/phases/Vote2Phase';
import AnnouncementBanner from './components/AnnouncementBanner';

export default function App() {
  const { roomState, myPlayerId, setRoomState, setMyInfo, addAnnouncement } =
    useGameStore();

  useEffect(() => {
    socket.on('room_state', (room) => setRoomState(room));

    socket.on('game_started', ({ yourRole, yourPlayerId, mafiaTeam, roomState }) => {
      setMyInfo(yourPlayerId, yourRole, mafiaTeam);
      setRoomState(roomState);
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

    return () => {
      socket.off('room_state');
      socket.off('game_started');
      socket.off('phase_changed');
      socket.off('announcement');
      socket.off('player_died');
      socket.off('game_ended');
      socket.off('error');
    };
  }, []);

  const phase = roomState?.phase;

  if (!roomState || !myPlayerId) {
    return <LobbyPage />;
  }

  if (phase === Phase.LOBBY) {
    return <RoomPage />;
  }

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto' }}>
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
    </div>
  );
}
