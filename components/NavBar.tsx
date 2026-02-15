import React from 'react';
import { Home, Clock, Settings, Shield, PlusCircle } from 'lucide-react';

interface NavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNewCase: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ activeTab, setActiveTab, onNewCase }) => {
  const menuItems = [
    { id: 'home', label: 'Active Investigation', icon: <Home className="w-5 h-5" /> },
    { id: 'history', label: 'Case Archives', icon: <Clock className="w-5 h-5" /> },
    { id: 'settings', label: 'System Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 w-64 fixed left-0 top-0 bottom-0 z-20">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <Shield className="w-8 h-8 text-cyan-400" />
        <div>
          <h1 className="font-bold text-slate-100 tracking-tight">SENTINEL</h1>
          <p className="text-[10px] text-slate-500 tracking-wider">FORENSIC CORE</p>
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

      <div className="p-4 border-t border-slate-800 text-xs text-slate-600 text-center font-mono">
        v2.4.1 STABLE
      </div>
    </div>
  );
};

export default NavBar;
