import { useState } from 'react';
import socket from '../socket';
import { Phase, Role } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';

const DEV_SECRET = import.meta.env.VITE_DEV_SECRET ?? '';

// ---------------------------------------------------------------------------
// Preset scenarios for common test cases
// ---------------------------------------------------------------------------

const PRESET_LABEL: Record<string, string> = {
  day1_night: '1라운드 밤',
  day2_night_pre: '2라운드 밤 (해커 접선 전)',
  day2_night_post: '2라운드 밤 (해커 접선 후)',
  day2_day_hypnotized: '2라운드 낮 (최면)',
  vote1_hypnotized: '투표1 (최면)',
};

function buildPreset(key: string, players: { id: string; nickname: string }[]): object {
  const ids = players.map((p) => p.id);
  const p0 = ids[0] ?? 'p0';
  const p1 = ids[1] ?? 'p1';
  const p2 = ids[2] ?? 'p2';
  const p3 = ids[3] ?? 'p3';

  switch (key) {
    case 'day1_night':
      return {
        phase: Phase.NIGHT,
        round: 1,
        players: [
          { id: p0, role: Role.MAFIA, isAlive: true },
          { id: p1, role: Role.HACKER, isAlive: true },
          { id: p2, role: Role.CITIZEN, isAlive: true },
          { id: p3, role: Role.DOCTOR, isAlive: true },
        ],
      };
    case 'day2_night_pre':
      return {
        phase: Phase.NIGHT,
        round: 2,
        players: [
          { id: p0, role: Role.MAFIA, isAlive: true },
          { id: p1, role: Role.HACKER, isAlive: true, knownMafiaTeam: null },
          { id: p2, role: Role.CITIZEN, isAlive: true },
          { id: p3, role: Role.DOCTOR, isAlive: true },
        ],
      };
    case 'day2_night_post':
      return {
        phase: Phase.NIGHT,
        round: 2,
        players: [
          { id: p0, role: Role.MAFIA, isAlive: true },
          {
            id: p1,
            role: Role.HACKER,
            isAlive: true,
            knownMafiaTeam: [{ id: p0, nickname: players.find((p) => p.id === p0)?.nickname ?? p0, role: Role.MAFIA }],
          },
          { id: p2, role: Role.CITIZEN, isAlive: true },
          { id: p3, role: Role.DOCTOR, isAlive: true },
        ],
      };
    case 'day2_day_hypnotized':
      return {
        phase: Phase.DAY,
        round: 2,
        players: [
          { id: p0, role: Role.MAFIA, isAlive: true },
          { id: p1, role: Role.CULT_MONK, isAlive: true },
          { id: p2, role: Role.CITIZEN, isAlive: true, isHypnotized: true },
          { id: p3, role: Role.DOCTOR, isAlive: true },
        ],
      };
    case 'vote1_hypnotized':
      return {
        phase: Phase.VOTE1,
        round: 2,
        players: [
          { id: p0, role: Role.MAFIA, isAlive: true },
          { id: p1, role: Role.CULT_MONK, isAlive: true },
          { id: p2, role: Role.CITIZEN, isAlive: true, isHypnotized: true },
          { id: p3, role: Role.DOCTOR, isAlive: true },
        ],
      };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DevPage() {
  const { roomState } = useGameStore();

  const [roomId, setRoomId] = useState(roomState?.id ?? '');
  const [secret, setSecret] = useState(DEV_SECRET);
  const [scenarioJson, setScenarioJson] = useState('{\n  "phase": "NIGHT",\n  "round": 1\n}');
  const [status, setStatus] = useState<string | null>(null);

  function applyScenario(scenario: object) {
    if (!roomId.trim()) {
      setStatus('❌ roomId를 입력하세요');
      return;
    }
    try {
      socket.emit('dev:setScenario', { roomId: roomId.trim(), secret, scenario });
      setStatus('✅ 시나리오 전송됨');
    } catch (e) {
      setStatus(`❌ 오류: ${e}`);
    }
  }

  function handleApply() {
    try {
      const parsed = JSON.parse(scenarioJson);
      applyScenario(parsed);
    } catch {
      setStatus('❌ JSON 파싱 오류');
    }
  }

  function handlePreset(key: string) {
    const players = roomState?.players ?? [];
    const scenario = buildPreset(key, players);
    setScenarioJson(JSON.stringify(scenario, null, 2));
    applyScenario(scenario);
  }

  const panelStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 13,
    background: '#1a1a2e',
    color: '#e0e0e0',
    padding: 16,
    border: '2px solid #ff6b6b',
    borderRadius: 8,
    maxWidth: 560,
    margin: '16px auto',
  };

  return (
    <div style={panelStyle}>
      <h2 style={{ color: '#ff6b6b', marginTop: 0 }}>🛠 Dev Panel — Scenario Setter</h2>

      <label style={{ display: 'block', marginBottom: 4 }}>Room ID</label>
      <input
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="예: ABC123"
        style={{ width: '100%', marginBottom: 8, padding: 4, fontFamily: 'monospace' }}
      />

      <label style={{ display: 'block', marginBottom: 4 }}>DEV_SECRET</label>
      <input
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        type="password"
        style={{ width: '100%', marginBottom: 8, padding: 4, fontFamily: 'monospace' }}
      />

      <label style={{ display: 'block', marginBottom: 4 }}>Scenario JSON</label>
      <textarea
        value={scenarioJson}
        onChange={(e) => setScenarioJson(e.target.value)}
        rows={10}
        style={{ width: '100%', marginBottom: 8, padding: 4, fontFamily: 'monospace', fontSize: 12 }}
      />

      <button
        onClick={handleApply}
        style={{ marginRight: 8, padding: '6px 14px', background: '#ff6b6b', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#fff', fontWeight: 'bold' }}
      >
        ▶ Apply
      </button>

      <hr style={{ borderColor: '#444', margin: '12px 0' }} />

      <p style={{ margin: '0 0 6px', color: '#aaa' }}>프리셋:</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {Object.keys(PRESET_LABEL).map((key) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            style={{ padding: '4px 10px', background: '#16213e', border: '1px solid #4a90d9', borderRadius: 4, cursor: 'pointer', color: '#4a90d9', fontSize: 12 }}
          >
            {PRESET_LABEL[key]}
          </button>
        ))}
      </div>

      {status && (
        <p style={{ marginTop: 10, color: status.startsWith('✅') ? '#6fcf97' : '#eb5757' }}>
          {status}
        </p>
      )}

      <hr style={{ borderColor: '#444', margin: '12px 0' }} />
      <p style={{ color: '#888', fontSize: 11, margin: 0 }}>
        이 패널은 <code>DEV</code> 빌드에서만 표시됩니다.
      </p>
    </div>
  );
}
