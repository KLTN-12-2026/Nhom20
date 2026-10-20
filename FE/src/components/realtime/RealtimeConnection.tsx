import { useEffect } from 'react';

import { connectRealtime, disconnectRealtime } from '@/services/socket-client';
import { useAuthStore } from '@/stores/auth.store';

export default function RealtimeConnection() {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    connectRealtime(accessToken);
    return () => disconnectRealtime();
  }, [accessToken]);

  return null;
}
