import React from 'react';
import { LayoutDashboard, Package, ArrowLeftRight, QrCode, FileText, Scale, ShieldAlert } from 'lucide-react';

export type NavTab = 'dashboard' | 'assets' | 'transfers' | 'audit' | 'terms' | 'norms' | 'saneamento';

interface BottomNavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingTransfersCount: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
  pendingTransfersCount,
}) => {
  const tabs = [
    {
      id: 'dashboard' as NavTab,
      label: 'Painel',
      icon: LayoutDashboard,
    },
    {
      id: 'assets' as NavTab,
      label: 'Bens',
      icon: Package,
    },
    {
      id: 'transfers' as NavTab,
      label: 'Trocas',
      icon: ArrowLeftRight,
      badge: pendingTransfersCount > 0 ? pendingTransfersCount : undefined,
    },
    {
      id: 'audit' as NavTab,
      label: 'Auditoria',
      icon: QrCode,
    },
    {
      id: 'terms' as NavTab,
      label: 'Termos',
      icon: FileText,
    },
    {
      id: 'saneamento' as NavTab,
      label: 'Saneamento',
      icon: ShieldAlert,
    },
    {
      id: 'norms' as NavTab,
      label: 'Normas',
      icon: Scale,
    },
  ];

  return (
    <nav className="no-print fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
      <div className="max-w-xl mx-auto grid grid-cols-7 h-16 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer select-none ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150 ${isActive ? 'scale-110' : ''}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-slate-950 px-1 shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] mt-1 tracking-tight truncate max-w-[58px] ${isActive ? 'font-bold text-emerald-800' : 'font-medium text-slate-600'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-emerald-600" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
