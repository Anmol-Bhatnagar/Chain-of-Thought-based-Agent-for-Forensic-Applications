import React from 'react';
import { Home, Clock, Settings, Shield, PlusCircle } from 'lucide-react';

interface NavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNewCase: () => void;
  currentMode: string;
}

const NavBar: React.FC<NavBarProps> = ({ activeTab, setActiveTab, onNewCase, currentMode }) => {
  const menuItems = [
    { id: 'home', label: 'Active Investigation', icon: <Home className="w-5 h-5" /> },
    { id: 'history', label: 'Case Archives', icon: <Clock className="w-5 h-5" /> },
    { id: 'settings', label: 'System Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const getModeColor = () => {
      switch(currentMode) {
          case 'insurance': return 'bg-emerald-500';
          case 'customer_care': return 'bg-amber-500';
          default: return 'bg-cyan-500';
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 w-64 fixed left-0 top-0 bottom-0 z-20">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-cyan-400" />
            <div>
            <h1 className="font-bold text-slate-100 tracking-tight">KSHURA</h1>
            <p className="text-[10px] text-slate-500 tracking-wider">FORENSIC CORE</p>
            </div>
        </div>

        {/* Current Mode Indicator */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-2.5 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${getModeColor()} shadow-[0_0_8px_currentColor]`}></div>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Active Mode</span>
            </div>
            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">
                {currentMode.replace('_', ' ')}
            </span>
        </div>
      </div>

      <div className="px-3 pt-6 pb-2">
        <button
            onClick={onNewCase}
            className="w-full flex items-center gap-2 justify-center bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-bold text-sm shadow-lg shadow-cyan-900/20 transition-all active:scale-95"
        >
            <PlusCircle className="w-4 h-4" />
            NEW CASE
        </button>
      </div>

      <div className="flex-1 py-4 space-y-2 px-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50 shadow-lg shadow-cyan-900/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NavBar;
