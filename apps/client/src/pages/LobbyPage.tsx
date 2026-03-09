import { useState } from 'react';
import socket from '../socket';

export default function LobbyPage() {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  const handleCreate = () => {
    if (!nickname.trim()) return alert('닉네임을 입력해주세요.');
    socket.emit('create_room', { nickname: nickname.trim() });
  };

  const handleJoin = () => {
    if (!nickname.trim()) return alert('닉네임을 입력해주세요.');
    if (!roomId.trim()) return alert('방 코드를 입력해주세요.');
    socket.emit('join_room', {
      roomId: roomId.trim().toUpperCase(),
      nickname: nickname.trim(),
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 16,
        fontFamily: 'sans-serif',
      }}
    >
      <h1>🎭 마피아 웹게임</h1>
      <input
        placeholder="닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        style={{ padding: 8, fontSize: 16, width: 240 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setMode('create')}
          style={{
            padding: '8px 16px',
            background: mode === 'create' ? '#333' : '#eee',
            color: mode === 'create' ? '#fff' : '#333',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          방 만들기
        </button>
        <button
          onClick={() => setMode('join')}
          style={{
            padding: '8px 16px',
            background: mode === 'join' ? '#333' : '#eee',
            color: mode === 'join' ? '#fff' : '#333',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          방 참가
        </button>
      </div>
      {mode === 'join' && (
        <input
          placeholder="방 코드 (6자리)"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          maxLength={6}
          style={{ padding: 8, fontSize: 16, width: 240, letterSpacing: 4 }}
        />
      )}
      <button
        onClick={mode === 'create' ? handleCreate : handleJoin}
        style={{
          padding: '10px 24px',
          fontSize: 16,
          background: '#e74c3c',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 4,
        }}
      >
        {mode === 'create' ? '방 만들기' : '입장하기'}
      </button>
    </div>
  );
}
