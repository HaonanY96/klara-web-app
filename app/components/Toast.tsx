'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { generateId } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      iconColor: 'text-emerald-500',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      iconColor: 'text-rose-500',
    },
    info: {
      icon: Info,
      bg: 'bg-stone-50',
      border: 'border-stone-200',
      text: 'text-stone-700',
      iconColor: 'text-stone-500',
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      className={`
        pointer-events-auto
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border
        ${config.bg} ${config.border}
        animate-in slide-in-from-bottom-2 fade-in duration-200
        max-w-sm w-full
      `}
    >
      <Icon size={18} className={config.iconColor} />
      <span className={`flex-1 text-sm font-medium ${config.text}`}>
        {toast.message}
      </span>
      <button
        onClick={onClose}
        className={`${config.iconColor} hover:opacity-70 transition-opacity`}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default ToastProvider;

