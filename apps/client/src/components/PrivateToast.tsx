import { useEffect, useRef, useState } from 'react';
import socket from '../socket';

interface ToastEntry {
  id: number;
  message: string;
}

export default function PrivateToast() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    const handler = ({ message }: { message: string }) => {
      const id = ++counterRef.current;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };

    socket.on('private_toast', handler);
    return () => {
      socket.off('private_toast', handler);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: '#2c3e50',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          🔒 {t.message}
        </div>
      ))}
    </div>
  );
}
