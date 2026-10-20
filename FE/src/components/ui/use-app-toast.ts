import { useContext } from 'react';

import { ToastContext } from './app-toast-context';

export function useAppToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useAppToast phải được dùng bên trong AppToastProvider');
  }
  return context;
}
