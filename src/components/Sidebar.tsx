import React, { useState } from 'react';
import { NavTab } from './BottomNavigation';
import { UserProfile } from '../types';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  CheckSquare, 
  FileText, 
  Scale, 
  ShieldAlert, 
  ClipboardList, 
  FileSpreadsheet, 
  QrCode, 
  PlusCircle,
  Database,
  Shield, 
  UserCheck, 
  ChevronDown, 
  Layers, 
  Cloud,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingTransfersCount: number;
  totalAssetsCount: number;
  onOpenMacroMicroReport: () => void;
  onOpenSmartImport: () => void;
  onOpenQuickScan: () => void;
  onOpenNewAsset?: () => void;
  onOpenNewTransfer?: () => void;
  onOpenDataExchange?: () => void;
  currentProfile: UserProfile;
  availableProfiles: UserProfile[];
  onSelectProfile: (profile: UserProfile) => void;
  firebaseStatus?: 'connected' | 'connecting' | 'offline';
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingTransfersCount,
  totalAssetsCount,
  onOpenMacroMicroReport,
  onOpenSmartImport,
  onOpenQuickScan,
  onOpenNewAsset,
  onOpenNewTransfer,
  onOpenDataExchange,
  currentProfile,
  availableProfiles,
  onSelectProfile,
  firebaseStatus = 'connected',
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Standardized Main Navigation Tabs
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Painel Geral',
      badge: null,
      icon: LayoutDashboard,
      iconColor: 'text-emerald-600',
    },
    {
      id: 'assets' as NavTab,
      label: 'Bens Patrimoniais',
      badge: totalAssetsCount > 0 ? `${totalAssetsCount.toLocaleString('pt-BR')}` : null,
      icon: Package,
      iconColor: 'text-blue-600',
    },
    {
      id: 'audit' as NavTab,
      label: 'Auditoria & Vistoria',
      badge: 'Sala a Sala',
      badgeStyle: 'neutral',
      icon: CheckSquare,
      iconColor: 'text-teal-600',
    },
    {
      id: 'transfers' as NavTab,
      label: 'Transferências de Carga',
      badge: pendingTransfersCount > 0 ? `${pendingTransfersCount} pendente${pendingTransfersCount > 1 ? 's' : ''}` : null,
      badgeStyle: pendingTransfersCount > 0 ? 'warning' : 'neutral',
      icon: ArrowLeftRight,
      iconColor: 'text-amber-600',
    },
    {
      id: 'terms' as NavTab,
      label: 'Termos de Responsabilidade',
      badge: null,
      icon: FileText,
      iconColor: 'text-indigo-600',
    },
    {
      id: 'saneamento' as NavTab,
      label: 'Plano TCE-CE (Passivo)',
      badge: '13 Anos',
      badgeStyle: 'neutral',
      icon: ShieldAlert,
      iconColor: 'text-rose-600',
    },
    {
      id: 'norms' as NavTab,
      label: 'Normas & Legislação',
      badge: null,
      icon: Scale,
      iconColor: 'text-violet-600',
    },
  ];

  // Standardized Quick Actions
  const actionItems = [
    {
      id: 'balanco',
      label: 'Caderno de Balanço',
      tag: 'Macro/Micro',
      icon: ClipboardList,
      iconColor: 'text-emerald-700',
      action: onOpenMacroMicroReport,
    },
    {
      id: 'import',
      label: 'Importar Planilha',
      tag: 'Excel / CSV',
      icon: FileSpreadsheet,
      iconColor: 'text-teal-700',
      action: onOpenSmartImport,
    },
    ...(onOpenNewAsset ? [{
      id: 'new-asset',
      label: 'Cadastrar Novo Bem',
      tag: 'Tombamento',
      icon: PlusCircle,
      iconColor: 'text-blue-700',
      action: onOpenNewAsset,
    }] : []),
    ...(onOpenNewTransfer ? [{
      id: 'new-transfer',
      label: 'Solicitar Transferência',
      tag: 'Mudança',
      icon: ArrowLeftRight,
      iconColor: 'text-amber-700',
      action: onOpenNewTransfer,
    }] : []),
    {
      id: 'scan',
      label: 'Escanear Plaqueta',
      tag: 'QR Code',
      icon: QrCode,
      iconColor: 'text-indigo-700',
      action: onOpenQuickScan,
    },
    ...(onOpenDataExchange ? [{
      id: 'data-exchange',
      label: 'Backup & Banco de Dados',
      tag: 'Exportar/Restaurar',
      icon: Database,
      iconColor: 'text-slate-700',
      action: onOpenDataExchange,
    }] : []),
  ];

  const handleNavClick = (tabId: NavTab) => {
    onSelectTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const handleActionClick = (action: () => void) => {
    action();
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Standardized Left Sidebar - Luminous Clean Light Style */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-white text-slate-800 border-r border-slate-200 
        flex flex-col justify-between select-none shadow-lg lg:shadow-none transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:z-10
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top: Branding and System Identity */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <Layers className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-tight truncate">
                  Patrimônio CPSMS
                </h1>
                <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                  Policlínica & CEO · Sobral
                </p>
              </div>
            </div>

            {/* Close Button on Mobile */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Connection Status indicator - Clean, steady pill (NO blinking!) */}
          <div className="mt-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                firebaseStatus === 'connected' ? 'bg-emerald-500' :
                firebaseStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
              <span className="text-slate-700 font-medium">
                {firebaseStatus === 'connected' ? 'Cloud Firestore Ativo' :
                 firebaseStatus === 'connecting' ? 'Sincronizando...' : 'Modo Offline'}
              </span>
            </div>
            <Cloud className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Center: Standardized Vertical Navigation List (Um abaixo do outro no lado esquerdo) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Main Navigation Group */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navegação Principal
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full h-10 px-2.5 rounded-xl flex items-center justify-between gap-2.5 text-left 
                      transition-all cursor-pointer text-xs
                      ${isActive
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold shadow-2xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent font-medium'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`
                        text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0
                        ${item.badgeStyle === 'warning'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }
                      `}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Access Tools & Actions Group */}
          <div className="pt-2 border-t border-slate-100">
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ações & Ferramentas
            </div>

            <div className="space-y-1">
              {actionItems.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleActionClick(act.action)}
                    className="w-full h-10 px-2.5 rounded-xl flex items-center justify-between gap-2.5 text-left text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer text-xs font-medium"
                    title={act.label}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon className={`w-3.5 h-3.5 ${act.iconColor}`} />
                      </div>
                      <span className="truncate">{act.label}</span>
                    </div>
                    {act.tag && (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                        {act.tag}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom: Standardized User Profile Box (Clean, Light) */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-white hover:bg-slate-50 text-left transition-colors border border-slate-200 shadow-2xs cursor-pointer"
              aria-label="Perfil do usuário"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  currentProfile.role === 'gestora'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {currentProfile.role === 'gestora' ? (
                    <Shield className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-blue-700" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {currentProfile.nome}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate font-medium">
                    {currentProfile.role === 'gestora' ? 'Gestora do Patrimônio' : currentProfile.cargo}
                  </div>
                </div>
              </div>

              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                profileDropdownOpen ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Trocar Perfil de Acesso
                </div>
                {availableProfiles.map((p) => {
                  const isSelected = p.id === currentProfile.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelectProfile(p);
                        setProfileDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                        p.role === 'gestora' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {p.role === 'gestora' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-900">{p.nome}</div>
                        <div className="text-[9px] text-slate-500 truncate">
                          {p.role === 'gestora' ? 'Gestora' : p.cargo}
                        </div>
                      </div>
                      {isSelected && <span className="text-emerald-600 font-bold text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
