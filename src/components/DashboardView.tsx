import React from 'react';
import { Asset, Sector, UnitInfo, TransferRequest, UserProfile } from '../types';
import { formatBRL } from '../utils/formatters';
import { NavTab } from './BottomNavigation';
import { 
  Package, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  QrCode, 
  FileText, 
  ArrowRight, 
  TrendingUp, 
  Download, 
  PlusCircle, 
  Building2, 
  Clock, 
  Scale, 
  Sparkles, 
  ShieldCheck, 
  Stethoscope, 
  Smile,
  ShieldAlert,
  ClipboardList,
  Map,
  CheckCheck
} from 'lucide-react';

interface DashboardViewProps {
  assets: Asset[];
  sectors: Sector[];
  units: UnitInfo[];
  transfers: TransferRequest[];
  currentProfile: UserProfile;
  onNavigateTab: (tab: NavTab) => void;
  onSelectUnitFilter: (unitId: string) => void;
  onOpenNewTransfer: () => void;
  onOpenNewAsset: () => void;
  onOpenDataExchange: () => void;
  onOpenSmartImport: () => void;
  onOpenMacroMicroReport?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  assets,
  sectors,
  units,
  transfers,
  currentProfile,
  onNavigateTab,
  onSelectUnitFilter,
  onOpenNewTransfer,
  onOpenNewAsset,
  onOpenDataExchange,
  onOpenSmartImport,
  onOpenMacroMicroReport,
}) => {
  const isLeader = currentProfile.role === 'lider';
  const myUnitId = currentProfile.unidadeId;

  // Filter relevant assets if leader is scoped
  const relevantAssets = isLeader && myUnitId
    ? assets.filter(a => a.unidadeId === myUnitId)
    : assets;

  const totalAssetsCount = relevantAssets.length;
  const totalValue = relevantAssets.reduce((sum, a) => sum + (a.valorAquisicao || 0), 0);

  const auditedCount = relevantAssets.filter(a => a.auditoria?.conferido).length;
  const auditPercent = totalAssetsCount > 0 ? Math.round((auditedCount / totalAssetsCount) * 100) : 0;

  const pendingTransfers = transfers.filter(t => t.status === 'pendente');

  // Setores revisados
  const totalSectorsCount = sectors.length;
  const reviewedSectorsCount = sectors.filter(s => s.revisada).length;

  // Breakdown by Unit with physical audit metrics
  const unitStats = units.map(u => {
    const unitAssets = assets.filter(a => a.unidadeId === u.id);
    const unitVal = unitAssets.reduce((acc, a) => acc + (a.valorAquisicao || 0), 0);
    const unitAudited = unitAssets.filter(a => a.auditoria?.conferido).length;
    const unitAuditPercent = unitAssets.length > 0 ? Math.round((unitAudited / unitAssets.length) * 100) : 0;
    const unitSectors = sectors.filter(s => s.unidadeId === u.id);
    const unitReviewedSectors = unitSectors.filter(s => s.revisada).length;

    return {
      unit: u,
      count: unitAssets.length,
      value: unitVal,
      auditedCount: unitAudited,
      auditPercent: unitAuditPercent,
      sectorsCount: unitSectors.length,
      reviewedSectorsCount: unitReviewedSectors,
      percentage: assets.length > 0 ? Math.round((unitAssets.length / assets.length) * 100) : 0
    };
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Executive Overview Card (Clean, Modern, Uncluttered) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs text-slate-900 dark:text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
            {isLeader ? currentProfile.unidadeNome : 'Gerência de Patrimônio · CPSMS'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Diretrizes do TCE-CE · Exercício 2026
          </span>
        </div>

        <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Olá, {currentProfile.nome.split(' ')[0]}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {isLeader ? (
                <>Painel de controle setorial da <strong>{currentProfile.unidadeNome}</strong>. Visualize a carga patrimonial e submeta solicitações formais de movimentação e conferência para deliberação da Gestora de Patrimônio.</>
              ) : (
                <>Estruturação oficial da Gerência de Patrimônio do <strong>CPSMS</strong>. Controle unificado de ativos da <strong>Policlínica Bernardo Félix da Silva</strong>, <strong>CEO Sobral</strong> e Sede Administrativa.</>
              )}
            </p>
          </div>

          {/* Quick Action Buttons (Barra de Ações Rápidas sem banners duplicados) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenMacroMicroReport && (
              <button
                type="button"
                onClick={onOpenMacroMicroReport}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all cursor-pointer shadow-xs"
                title="Caderno de Vistoria Oficial Sala a Sala com segregação de tombos CPSMS vs SESA"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Caderno de Balanço</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateTab('saneamento')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all cursor-pointer shadow-xs"
              title="Plano de saneamento do passivo de 13 anos e conciliação TCE-CE"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Plano de Saneamento</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('map')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-xl transition-all cursor-pointer"
              title="Visualizar mapa físico interativo das unidades e salas"
            >
              <Map className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Mapa 360°</span>
            </button>
          </div>
        </div>
      </div>

      {/* Initial Empty State Onboarding Card (if assets not added yet) */}
      {totalAssetsCount === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-500/40 p-6 sm:p-8 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-full">
              Passo 1: Carregar Inventário de Bens
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Importe sua Planilha com os Bens Patrimoniais
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              O sistema está estruturado com a <strong>Policlínica Bernardo Félix da Silva</strong>, o <strong>CEO de Sobral</strong> e a <strong>Sede Administrativa</strong>. Carregue seu arquivo do Excel (.xlsx, .xls) ou CSV para preencher todos os bens de uma só vez!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenSmartImport}
              className="px-6 py-3.5 text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-2 cursor-pointer min-h-[48px]"
            >
              <Download className="w-5 h-5" />
              Carregar Minha Planilha do Excel (.xlsx / .xls / .csv)
            </button>

            <button
              onClick={onOpenNewAsset}
              className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl transition-colors flex items-center gap-2 min-h-[48px] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Cadastrar Manualmente
            </button>

            <button
              onClick={() => onNavigateTab('norms')}
              className="px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl transition-colors flex items-center gap-2 min-h-[48px] cursor-pointer"
            >
              <Scale className="w-4 h-4" />
              Normas TCE-CE
            </button>
          </div>
        </div>
      )}

      {/* Pending Transfers Urgent Callout */}
      {pendingTransfers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {currentProfile.role === 'gestora'
                  ? `${pendingTransfers.length} movimentação(ões) aguardando sua deliberação`
                  : `${pendingTransfers.length} pedido(s) de transferência em análise pela Gestora`}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {currentProfile.role === 'gestora'
                  ? 'Líderes de unidades do CPSMS solicitaram remanejamento patrimonial que requer despacho privativo.'
                  : 'Aguarde a validação da Gestora de Patrimônio para emissão do Termo de Cautela e efetivação da carga.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('transfers')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[44px]"
          >
            {currentProfile.role === 'gestora' ? 'Analisar Pedidos' : 'Acompanhar Status'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Key Interactive Metric Cards (Sem duplicações) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div 
          onClick={() => onNavigateTab('assets')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Bens no Inventário</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {totalAssetsCount.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">ativos</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {isLeader ? currentProfile.unidadeNome : 'Policlínica + CEO + Sede'}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Valor Total Tombado</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums truncate">
              {formatBRL(totalValue)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
            Média: {totalAssetsCount > 0 ? formatBRL(totalValue / totalAssetsCount) : 'R$ 0,00'}
          </div>
        </div>

        {/* Metric 3 */}
        <div 
          onClick={() => onNavigateTab('audit')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Auditoria Física</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {auditPercent}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              ({auditedCount}/{totalAssetsCount})
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${auditPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 4 */}
        <div 
          onClick={() => onNavigateTab('transfers')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Transferências</span>
            <ArrowLeftRight className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {pendingTransfers.length}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              pendentes
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {transfers.filter(t => t.status === 'aprovada').length} homologadas no ano
          </div>
        </div>
      </div>

      {/* Two Column Layout: Unidades Operacionais do Consórcio + Painel de Ações e Auditoria */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Unidades do CPSMS */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Unidades Operacionais do Consórcio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Carga patrimonial da Policlínica Bernardo Félix, CEO Sobral e Sede
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onNavigateTab('map')}
                className="text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                title="Abrir mapa visual interativo e acompanhamento sala a sala"
              >
                <Map className="w-3.5 h-3.5" />
                <span>Mapa 360°</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectUnitFilter('all');
                  onNavigateTab('assets');
                }}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline min-h-[36px] flex items-center"
              >
                Ver todos os bens
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {unitStats.map((item) => {
              const isPoli = item.unit.id === 'policlinica';
              const isCeo = item.unit.id === 'ceo';

              return (
                <div
                  key={item.unit.id}
                  onClick={() => {
                    onSelectUnitFilter(item.unit.id);
                    onNavigateTab('audit');
                  }}
                  className="group p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 bg-slate-50/70 dark:bg-slate-850/60 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                        isPoli ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : isCeo ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                      }`}>
                        {isPoli ? <Stethoscope className="w-4 h-4" /> : isCeo ? <Smile className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="font-bold text-sm block text-slate-900 dark:text-white">{item.unit.nome}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.unit.endereco}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">{item.count}</span>
                      <span className="text-slate-400 ml-1 text-xs">itens</span>
                      <div className="font-medium text-slate-600 dark:text-slate-300 tabular-nums text-xs">{formatBRL(item.value)}</div>
                    </div>
                  </div>

                  {/* Progress Bar & Sub-indicators */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Conferência Física: <strong>{item.auditedCount}</strong> de {item.count} bens</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.auditPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.auditPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel Operacional: Status das Vistorias & Ações Oficiais */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Vistorias & Conferência de Salas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Progresso geral dos ambientes auditados
              </p>
            </div>

            {/* Micro Stats */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Salas / Micro-Localizações:</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {reviewedSectorsCount} de {totalSectorsCount} revisadas
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${totalSectorsCount > 0 ? Math.round((reviewedSectorsCount / totalSectorsCount) * 100) : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>{totalSectorsCount - reviewedSectorsCount} salas pendentes</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {totalSectorsCount > 0 ? Math.round((reviewedSectorsCount / totalSectorsCount) * 100) : 0}% concluído
                </span>
              </div>
            </div>

            {/* Ações Rápidas Oficiais */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigateTab('audit')}
                className="w-full p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-300 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Auditar Salas & Emitir Termo ASPEC</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </button>

              {onOpenMacroMicroReport && (
                <button
                  type="button"
                  onClick={onOpenMacroMicroReport}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-slate-500" />
                    <span>Caderno de Vistoria Oficial (PDF)</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigateTab('saneamento')}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>Plano de Saneamento TCE-CE</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={onOpenSmartImport}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>Importar Planilha do ASPEC / Excel</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Exercício 2026 · CPSMS</span>
            <button
              type="button"
              onClick={() => onNavigateTab('norms')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <Scale className="w-3 h-3" />
              <span>Instruções TCE-CE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
