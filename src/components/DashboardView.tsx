import React from 'react';
import { Asset, Sector, UnitInfo, TransferRequest, UserProfile, TomboOrigin } from '../types';
import { formatBRL } from '../utils/formatters';
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
  ClipboardList
} from 'lucide-react';

interface DashboardViewProps {
  assets: Asset[];
  sectors: Sector[];
  units: UnitInfo[];
  transfers: TransferRequest[];
  currentProfile: UserProfile;
  onNavigateTab: (tab: 'dashboard' | 'assets' | 'transfers' | 'audit' | 'terms' | 'norms' | 'saneamento') => void;
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
  const totalResidualValue = relevantAssets.reduce((sum, a) => sum + (a.valorResidual || 0), 0);

  const auditedCount = relevantAssets.filter(a => a.auditoria?.conferido).length;
  const auditPercent = totalAssetsCount > 0 ? Math.round((auditedCount / totalAssetsCount) * 100) : 0;

  const pendingTransfers = transfers.filter(t => t.status === 'pendente');

  // Breakdown by Unit
  const unitStats = units.map(u => {
    const unitAssets = assets.filter(a => a.unidadeId === u.id);
    const unitVal = unitAssets.reduce((acc, a) => acc + (a.valorAquisicao || 0), 0);
    return {
      unit: u,
      count: unitAssets.length,
      value: unitVal,
      percentage: assets.length > 0 ? Math.round((unitAssets.length / assets.length) * 100) : 0
    };
  });

  // Breakdown by Tombo Origin (Vital for TCE-CE)
  const tomboOrigins: TomboOrigin[] = [
    'CPSMS (Próprio do Consórcio)',
    'SESA (Governo do Ceará - Cessão/Comodato)',
    'UFC (Universidade Federal do Ceará)',
    'Ministério da Saúde / SUS / Doação',
    'Município Consorciado'
  ];

  const originStats = tomboOrigins.map(origin => {
    const originAssets = relevantAssets.filter(a => a.origemTombo === origin);
    return {
      origin,
      count: originAssets.length,
      value: originAssets.reduce((acc, a) => acc + (a.valorAquisicao || 0), 0),
      percentage: relevantAssets.length > 0 ? Math.round((originAssets.length / relevantAssets.length) * 100) : 0
    };
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Executive Overview Card (Clean, Light, Luminous - No duplicate top buttons) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 uppercase tracking-wider">
            {isLeader ? currentProfile.unidadeNome : 'Gerência de Patrimônio · CPSMS'}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Diretrizes do TCE-CE · Exercício 2026
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-3">
          Olá, {currentProfile.nome.split(' ')[0]}!
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
          {isLeader ? (
            <>Painel de controle setorial da <strong>{currentProfile.unidadeNome}</strong>. Visualize a carga patrimonial e submeta solicitações formais de movimentação e conferência para deliberação da Gestora Maria Gerliane Rocha Magalhães.</>
          ) : (
            <>Estruturação oficial da Gerência de Patrimônio do <strong>CPSMS</strong>. Controle unificado de ativos da <strong>Policlínica Bernardo Félix da Silva</strong>, <strong>CEO Sobral</strong> e Sede Administrativa, com segregação de bens CPSMS, SESA e UFC.</>
          )}
        </p>

        {/* Executive Snapshot Highlights (Clean Light Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Total de Bens</div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              {totalAssetsCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Ativos cadastrados</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Valor do Acervo</div>
            <div className="text-lg sm:text-xl font-bold text-emerald-700 mt-0.5">
              {formatBRL(totalValue)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Valor bruto contábil</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Auditoria Física</div>
            <div className="text-lg sm:text-xl font-bold text-teal-700 mt-0.5">
              {auditPercent}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{auditedCount} de {totalAssetsCount} conferidos</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Transferências</div>
            <div className="text-lg sm:text-xl font-bold text-amber-700 mt-0.5">
              {pendingTransfers.length} pendente{pendingTransfers.length !== 1 ? 's' : ''}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Aguardando parecer</div>
          </div>
        </div>
      </div>

      {/* Banner 1: Caderno de Balanço Geral por Macro (Consórcio, Poli, CEO) e Micro Localização */}
      <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                Inventário Físico & Balanço 2026
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Conferência Geral por Macro (Consórcio, Policlínica e CEO) e Micro Localizações
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Emita o <strong>Caderno de Vistoria Oficial</strong> para conferir sala a sala onde cada bem está alocado, com segregação de <strong>tombos CPSMS (4 dígitos)</strong> vs <strong>SESA (6 dígitos)</strong> e espaço pautado para anotar ou cadastrar na hora qualquer bem <strong>fora do ASPEC</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenMacroMicroReport ? (
            <button
              onClick={onOpenMacroMicroReport}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Gerar Relatório de Balanço</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigateTab('audit')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <span>Ir para Auditoria</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Banner Especial: Plano de Saneamento TCE-CE (Passivo de 13 Anos) */}
      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                Auditoria TCE-CE no Final do Ano
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Plano de Ação & Saneamento do Passivo Histórico (13 Anos)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Gestão de contingências críticas: segregação de bens da <strong>SESA e UFC</strong> (paralisação de depreciação indevida no ASPEC), regularização de duplo tombamento, ex-servidores e laudo do cemitério de inservíveis.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('saneamento')}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
        >
          <span>Abrir Plano de Saneamento</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Initial Empty State Onboarding Card (if Gerliane hasn't added assets yet) */}
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
              Importe sua Planilha com os 2.849 Bens Patrimoniais
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              O sistema está 100% limpo e pronto, estruturado com a <strong>Policlínica Bernardo Félix da Silva</strong>, o <strong>CEO de Sobral</strong> e a <strong>Sede Administrativa</strong>. Carregue seu arquivo do Excel (.xlsx, .xls) ou CSV para preencher todos os bens de uma só vez!
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
                  : 'Aguarde a validação da Gestora Maria Gerliane Rocha Magalhães para emissão do Termo de Cautela e efetivação da carga.'}
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

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div 
          onClick={() => onNavigateTab('assets')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Bens no Inventário</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {totalAssetsCount}
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
            Média por item: {totalAssetsCount > 0 ? formatBRL(totalValue / totalAssetsCount) : 'R$ 0,00'}
          </div>
        </div>

        {/* Metric 3 */}
        <div 
          onClick={() => onNavigateTab('audit')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Auditoria TCE-CE</span>
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
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
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

      {/* Two Column Layout: Unidades do CPSMS + Origem do Tombo (TCE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Unidades do CPSMS */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                Unidades Operacionais do Consórcio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Carga patrimonial da Policlínica Bernardo Félix e do CEO
              </p>
            </div>
            <button
              onClick={() => {
                onSelectUnitFilter('all');
                onNavigateTab('assets');
              }}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline min-h-[44px] flex items-center"
            >
              Ver acervo
            </button>
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
                    onNavigateTab('assets');
                  }}
                  className="group p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 ${
                        isPoli ? 'bg-blue-500/20 text-blue-500' : isCeo ? 'bg-emerald-500/20 text-emerald-500' : 'bg-purple-500/20 text-purple-500'
                      }`}>
                        {isPoli ? <Stethoscope className="w-3.5 h-3.5" /> : isCeo ? <Smile className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className="truncate max-w-[210px] sm:max-w-xs">{item.unit.nome}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">{item.count}</span>
                      <span className="text-slate-400 ml-1">itens</span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="font-medium text-slate-600 dark:text-slate-300 tabular-nums">{formatBRL(item.value)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all duration-500 group-hover:bg-emerald-400"
                      style={{ width: `${Math.max(item.percentage, totalAssetsCount === 0 ? 0 : 5)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    <span className="truncate">{item.unit.endereco}</span>
                    <span className="tabular-nums font-medium">{item.percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Origem do Tombo (Exigência do TCE-CE: Segregação CPSMS vs SESA vs UFC) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Segregação por Origem do Tombo
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-semibold border border-emerald-500/30">
                TCE-CE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Classificação contábil de propriedade dos bens móveis
            </p>
          </div>

          <div className="space-y-3">
            {originStats.map((item) => {
              const isSesa = item.origin.includes('SESA');
              const isUfc = item.origin.includes('UFC');
              const isCpsms = item.origin.includes('CPSMS');

              return (
                <div key={item.origin} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isCpsms ? 'bg-emerald-500' : isSesa ? 'bg-blue-500' : isUfc ? 'bg-amber-500' : 'bg-slate-400'
                      }`} />
                      <span className="truncate">{item.origin}</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums shrink-0">
                      {item.count} <span className="text-slate-400 font-normal text-[11px]">({item.percentage}%)</span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full ${
                        isCpsms ? 'bg-emerald-500' : isSesa ? 'bg-blue-500' : isUfc ? 'bg-amber-500' : 'bg-slate-400'
                      }`} 
                      style={{ width: `${item.percentage}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex items-start gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Importante para Prestação de Contas:</strong> O Tribunal de Contas (TCE-CE) veda registrar bens com tombo SESA ou UFC como receita de capital do CPSMS; devem figurar em contas de compensação.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
