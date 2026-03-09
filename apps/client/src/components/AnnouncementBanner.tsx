import { useGameStore } from '../store/gameStore';

export default function AnnouncementBanner() {
  const { announcements } = useGameStore();
  if (announcements.length === 0) return null;

  return (
    <div
      style={{
        background: '#2c3e50',
        color: '#ecf0f1',
        padding: '8px 12px',
        borderRadius: 4,
        marginBottom: 12,
        maxHeight: 100,
        overflowY: 'auto',
      }}
    >
      {announcements.slice(-5).map((msg, i) => (
        <div key={i} style={{ fontSize: 13, lineHeight: 1.6 }}>
          {msg}
        </div>
      ))}
    </div>
  );
}
