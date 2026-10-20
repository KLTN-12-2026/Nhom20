import { useEffect } from 'react';

import { realtimeSocket } from '@/services/socket-client';

export function useRealtimeEvent<T>(
  event: string,
  listener: (payload: T) => void,
) {
  useEffect(() => {
    realtimeSocket.on(event, listener);
    return () => {
      realtimeSocket.off(event, listener);
    };
  }, [event, listener]);
}
