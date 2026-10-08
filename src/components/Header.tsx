import React from 'react';
import { NavTab } from './BottomNavigation';
import { PerformanceTimer } from './PerformanceTimer';
import { 
  Menu,
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  CheckSquare,
  FileText,
  ShieldAlert,
  Scale
} from 'lucide-react';

interface HeaderProps {
  activeTab: NavTab;
  onOpenMobileMenu?: () => void;
  pendingTransfersCount?: number;
  firebaseStatus?: 'connected' | 'connecting' | 'offline';
  lastQueryDurationMs?: number;
  totalAssetsCount?: number;
  isProcessing?: boolean;
}

const TAB_INFO: Record<NavTab, { title: string; subtitle: string; icon: React.ElementType }> = {
  dashboard: {
    title: 'Painel Geral de Gestão',
    subtitle: 'Visão executiva e balanço patrimonial consolidado',
    icon: LayoutDashboard,
  },
  assets: {
    title: 'Bens Patrimoniais',
    subtitle: 'Inventário geral, busca analítica e filtros por unidade',
    icon: Package,
  },
  transfers: {
    title: 'Transferências de Carga',
    subtitle: 'Movimentações internas entre setores e autorizações',
    icon: ArrowLeftRight,
  },
  audit: {
    title: 'Auditoria & Vistoria Sala a Sala',
    subtitle: 'Conferência física in loco (OK / X / Bens fora do ASPEC)',
    icon: CheckSquare,
  },
  terms: {
    title: 'Termos de Responsabilidade',
    subtitle: 'Emissão formal, assinatura e guarda de termos de guarda',
    icon: FileText,
  },
  saneamento: {
    title: 'Plano de Saneamento TCE-CE',
    subtitle: 'Regularização do passivo histórico de 13 anos e conciliação',
    icon: ShieldAlert,
  },
  norms: {
    title: 'Legislação & Normas do TCE-CE',
    subtitle: 'Resoluções, decretos estaduais e jurisprudência aplicável',
    icon: Scale,
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  firebaseStatus = 'connected',
  lastQueryDurationMs = 24,
  totalAssetsCount = 0,
  isProcessing = false,
}) => {
  const activeInfo = TAB_INFO[activeTab] || TAB_INFO.dashboard;
  const ActiveIcon = activeInfo.icon;

  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      <div className="px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu Toggle + Breadcrumb / Module Title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger button on Mobile only */}
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Module Title & Subtitle */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <ActiveIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">
                {activeInfo.title}
              </h2>
              <p className="text-[11px] text-slate-500 truncate leading-none mt-0.5 hidden sm:block">
                {activeInfo.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Performance Timer (Stopwatch + Latency) & Sync Status Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Visible Performance & Processing Timer */}
          <PerformanceTimer
            lastQueryDurationMs={lastQueryDurationMs}
            totalAssetsCount={totalAssetsCount}
            isProcessing={isProcessing}
          />

          {/* Cloud Sync Status Indicator */}
          <div 
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700"
            title="Conexão com a nuvem"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              firebaseStatus === 'connected' ? 'bg-emerald-500' :
              firebaseStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            <span className="font-medium text-[11px] hidden md:inline">
              {firebaseStatus === 'connected' ? 'Sincronizado' :
               firebaseStatus === 'connecting' ? 'Conectando...' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
