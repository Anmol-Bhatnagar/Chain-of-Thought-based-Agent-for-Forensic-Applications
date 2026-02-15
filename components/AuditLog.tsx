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
      // Min width 240px, Max width 600px
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
            <div className="[writing-mode:vertical-rl] rotate-180 text-xs font-mono font-bold text-slate-500 tracking-widest uppercase flex-1 flex items-center gap