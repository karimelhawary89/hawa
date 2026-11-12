import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const value: ToastContextValue = {
    showToast,
    success: (m) => showToast(m, 'success'),
    error: (m) => showToast(m, 'error'),
    info: (m) => showToast(m, 'info'),
    warning: (m) => showToast(m, 'warning'),
  };

  const iconColor: Record<ToastType, string> = {
    success: 'text-[#27ae60]',
    error: 'text-[#e74c3c]',
    warning: 'text-[#e67e22]',
    info: 'text-[#4a90d9]',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Top-right RTL toast stack */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="nm-modal px-4 py-3 flex items-center gap-3 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {t.type === 'success' && <CheckCircle2 className={`w-5 h-5 shrink-0 ${iconColor.success}`} />}
            {t.type === 'error' && <AlertTriangle className={`w-5 h-5 shrink-0 ${iconColor.error}`} />}
            {t.type === 'warning' && <AlertTriangle className={`w-5 h-5 shrink-0 ${iconColor.warning}`} />}
            {t.type === 'info' && <Info className={`w-5 h-5 shrink-0 ${iconColor.info}`} />}
            <span className="text-sm font-semibold text-[#2d3748] flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="nm-icon-btn w-7 h-7 flex items-center justify-center text-[#718096]"
              aria-label="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
