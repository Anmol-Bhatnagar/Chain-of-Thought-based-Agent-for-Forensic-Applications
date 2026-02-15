import React, { useEffect, useRef, useState } from 'react';
import { AuditLogEntry } from '../types';
import { ShieldAlert, ShieldCheck, Info, Activity, ChevronRight, ChevronLeft } from 'lucide-react';

interface AuditLogProps {
  logs: AuditLogEntry[];
  width: number;
  isOpen: boolean;
  onToggle: () => void;
  onResize: (width: number) => void;
}

const AuditLog: React.FC<AuditLogProps> = ({ logs, width, isOpen, onToggle, onResize }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (isOpen) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (startX - moveEvent.clientX);

      if (newWidth >= 240 && newWidth <= 600) {
        onResize(newWidth);
      }
    };

    const stopDrag = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.cursor = 'col-resize';
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'success': return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'warning': return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      case 'error': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      default: return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  if (!isOpen) {
    return (
        <div className="fixed right-0 top-0 bottom-0 z-10 bg-slate-950 border-l border-slate-800 w-12 flex flex-col items-center py-4 transition-all duration-300 shadow-xl">
            <button
                onClick={onToggle}
                className="p-2 bg-slate-900 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 mb-4 transition-colors"
                title="Expand Audit Log"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="[writing-mode:vertical-rl] rotate-180 text-xs font-mono font-bold text-slate-500 tracking-widest uppercase flex-1 flex items-center gap-4 cursor-pointer hover:text-slate-300 transition-colors" onClick={onToggle}>
                <div className="flex items-center gap-2">
                   <Activity className="w-4 h-4 animate-pulse-slow rotate-90" />
                   <span>Audit Log Stream</span>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div
        className="fixed right-0 top-0 bottom-0 z-10 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col"
        style={{ width: width }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={startResizing}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-cyan-500/50 z-20 group flex items-center justify-center -translate-x-1/2"
      >
          <div className="h-8 w-1 bg-slate-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 flex-shrink-0">
        <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-cyan-500 animate-pulse-slow" />
            <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase truncate">Agent Audit Log</h2>
        </div>
        <button
            onClick={onToggle}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 hover:bg-slate-800 rounded"
            title="Minimize"
        >
            <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {logs.length === 0 && (
          <div className="text-slate-500 italic text-center mt-10">Waiting for case initialization...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="mt-0.5 flex-shrink-0">{getIcon(log.status)}</div>
            <div className="min-w-0">
              <div className="text-slate-500 text-[10px] mb-0.5">{log.timestamp}</div>
              <div className="text-slate-200 font-medium break-words">{log.action}</div>
              <div className="text-slate-400 leading-relaxed break-words">{log.details}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default AuditLog;
