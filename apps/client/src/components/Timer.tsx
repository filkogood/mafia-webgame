import { useEffect, useState } from 'react';

interface TimerProps {
  seconds: number;
  onExpire?: () => void;
  label?: string;
}

export default function Timer({ seconds, onExpire, label }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const id = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onExpire]);

  const pct = Math.max(0, (remaining / seconds) * 100);
  const color = remaining <= 5 ? '#e74c3c' : remaining <= 15 ? '#f39c12' : '#27ae60';

  return (
    <div style={{ margin: '8px 0' }}>
      {label && (
        <span style={{ marginRight: 8, fontWeight: 'bold' }}>{label}</span>
      )}
      <span style={{ color, fontWeight: 'bold', fontSize: 20 }}>
        {remaining}초
      </span>
      <div
        style={{
          height: 6,
          background: '#eee',
          borderRadius: 3,
          marginTop: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            transition: 'width 1s linear',
          }}
        />
      </div>
    </div>
  );
}
