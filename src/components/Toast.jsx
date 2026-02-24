import React, { useEffect } from 'react';

export default function Toast({ message, type = "error", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto close after 4 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "error" ? "bg-red-500/90" : "bg-blue-900/90";
  const icon = type === "error" ? "⚠️" : "ℹ️";

  return (
    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`${bgColor} backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 min-w-[300px]`}>
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 leading-none mb-1">
            System Message
          </p>
          <p className="text-sm font-bold leading-tight">{message}</p>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white font-black text-xs uppercase">Dismiss</button>
      </div>
    </div>
  );
}