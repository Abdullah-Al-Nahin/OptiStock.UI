// src/components/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove the toast after 3.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const success = (msg) => addToast(msg, 'success');
  const error = (msg) => addToast(msg, 'error');
  const warning = (msg) => addToast(msg, 'warning');

  // Replace the return block in ToastProvider with this:
return (
  <ToastContext.Provider value={{ success, error, warning }}>
    {children}
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-toast-in toast-glass flex flex-col overflow-hidden rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border min-w-[320px] pointer-events-auto
            ${toast.type === 'success' ? 'border-[#4ade80]/30' :
              toast.type === 'error' ? 'border-[#f87171]/30' :
              'border-[#fbbf24]/30'}`}
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl
              ${toast.type === 'success' ? 'bg-[#4ade80]/10' :
                toast.type === 'error' ? 'bg-[#f87171]/10' :
                'bg-[#fbbf24]/10'}`}>
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '⚠️'}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black tracking-widest opacity-40">
                {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Warning'}
              </span>
              <span className="text-sm font-bold text-[#dde6f0]">{toast.message}</span>
            </div>
          </div>
          
          {/* Animated Progress Bar */}
          <div 
            className={`h-1 animate-progress
              ${toast.type === 'success' ? 'bg-[#4ade80]' :
                toast.type === 'error' ? 'bg-[#f87171]' :
                'bg-[#fbbf24]'}`}
          />
        </div>
      ))}
    </div>
  </ToastContext.Provider>
);
};