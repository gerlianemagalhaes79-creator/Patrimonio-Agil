import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Sector, UnitInfo, UserProfile } from '../types';
import { formatBRL, formatDate } from '../utils/formatters';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Building2, 
  Layers, 
  Scale, 
  FileCheck, 
  ArrowRight, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  PlusCircle, 
  Trash2, 
  UserCheck, 
  HelpCircle,
  ExternalLink,
  Search,
  Lock,
  Share2,
  Tag,
  ClipboardList,
  ArrowRightLeft
} from 'lucide-react';
import { DiretoriaContabilidadeReportModal } from './DiretoriaContabilidadeReportModal';
import { MacroMicroInventoryReportModal } from './MacroMicroInventoryReportModal';
import { AspecReconciliationModal } from './AspecReconciliationModal';

interface SaneamentoViewProps {
  assets: Asset[];
  sectors: Sector[];
  units: UnitInfo[];
  currentProfile: UserProfile;
  onNavigateToAssets: () => void;
  onNavigateToTransfers: () => void;
  onNavigateToAudit: () => void;
  onUpdateAsset?: (asset: Asset) => void;
  onAddAsset?: (newAsset: Asset) => void;
}

interface StolenAssetRecord {
  id: string;
  itemDescricao: string;
  tombamento: string;
  localOcorrencia: string;
  boNumero: string;
  boDelegacia: string;
  boData: string;
  sindicanciaNumero: string;
  status: 'bo_registrado' | 'sindicancia_aberta' | 'concluida';
  observacoes: string;
}

export const SaneamentoView: React.FC<SaneamentoViewProps> = ({
  assets,
  sectors,
  units,
  currentProfile,
  onNavigateToAssets,
  onNavigateToTransfers,
  onNavigateToAudit,
  onUpdateAsset,
  onAddAsset,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'fases' | 'bo_balanca' | 'sesa_ufc' | 'duplo_tombamento' | 'inserviveis' | 'ex_servidores' | 'minutas'>('fases');
  const [showDiretoriaModal, setShowDiretoriaModal] = useState(false);
  const [showMacroMicroModal, setShowMacroMicroModal] = useState(false);

  // Duplo Tombamento State (Padrão SESA 6 dígitos vs CPSMS 4 dígitos)
  const [selectedAssetForLink, setSelectedAssetForLink] = useState<string>('');
  const [inputTomboSesa, setInputTomboSesa] = useState<string>('');
  const [duploSearchQuery, setDuploSearchQuery] = useState<string>('');
  const [duploFeedback, setDuploFeedback] = useState<string | null>(null);

  // Checklist of the 4 Phases stored in LocalStorage
  const [phaseChecklist, setPhaseChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('cpsms_saneamento_checklist');
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default initial state: user explicitly confirmed the B.O. for the scale is DONE!
    return {
      'fase1_bo_balanca': true, // User confirmed B.O. already registered!
      'fase1_portaria_comissao': false,
      'fase1_reuniao_contadora': false,
      'fase1_marco_zero': false,
      'fase2_vistoria_poli': false,
      'fase2_vistoria_ceo': false,
      'fase2_vistoria_cer_sede': false,
      'fase2_reatribuicao_ex_servidores': false,
      'fase2_novos_termos': false,
      'fase3_triagem_inserviveis': false,
      'fase3_laudo_desfazimento': false,
      'fase3_estorno_sesa_ufc': false,
      'fase3_formalizacao_trocas': false,
      'fase4_relatorio_consolidado': false,
      'fase4_dossie_tce': false,
    };
  });

  useEffect(() => {
    localStorage.setItem('cpsms_saneamento_checklist', JSON.stringify(phaseChecklist));
  }, [phaseChecklist]);

  const toggleTask = (key: string) => {
    setPhaseChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Stolen / Lost Asset Records (Including the Scale with B.O. confirmed)
  const [stolenAssets, setStolenAssets] = useState<StolenAssetRecord[]>(() => {
    try {
      const saved = localStorage.getItem('cpsms_stolen_assets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'stolen-1',
        itemDescricao: 'Balança Antropométrica Mecânica Hospitalar Adulto/Pediátrica',
        tombamento: 'CPSMS-BAL-014',
        localOcorrencia: 'Policlínica Regional Bernardo Félix da Silva (Sobral-CE)',
        boNumero: 'BO-PC-2026/08942-SOBRAL',
        boDelegacia: 'Delegacia Regional de Polícia Civil de Sobral - CE',
        boData: '2026-09-18',
        sindicanciaNumero: 'SIND-CPSMS-003/2026',
        status: 'bo_registrado',
        observacoes: 'Fato antigo pretérito à atual gestão. O item não chegou a entrar no sistema contábil ASPEC; registro mantido apenas para resguardo histórico e documental institucional.'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('cpsms_stolen_assets', JSON.stringify(stolenAssets));
  }, [stolenAssets]);

  // Form for new lost/stolen asset
  const [showNewStolenModal, setShowNewStolenModal] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemTombo, setNewItemTombo] = useState('');
  const [newItemLocal, setNewItemLocal] = useState('Policlínica Regional Bernardo Félix');
  const [newItemBoNum, setNewItemBoNum] = useState('');
  const [newItemBoDelegacia, setNewItemBoDelegacia] = useState('Delegacia Regional de Polícia Civil de Sobral');
  const [newItemBoData, setNewItemBoData] = useState(new Date().toISOString().slice(0, 10));
  const [newItemObs, setNewItemObs] = useState('');

  const handleAddStolen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc.trim()) return;

    const record: StolenAssetRecord = {
      id: `stolen-${Date.now()}`,
      itemDescricao: newItemDesc.trim(),
      tombamento: newItemTombo.trim() || 'S/N - Em Apuração',
      localOcorrencia: newItemLocal.trim(),
      boNumero: newItemBoNum.trim() || 'Em lavratura',
      boDelegacia: newItemBoDelegacia.trim(),
      boData: newItemBoData,
      sindicanciaNumero: `SIND-CPSMS-${new Date().getFullYear()}/${String(Math.floor(100 + Math.random() * 900))}`,
      status: 'bo_registrado',
      observacoes: newItemObs.trim() || 'Ocorrência comunicada para instauração de sindicância e prestação de contas.'
    };

    setStolenAssets(prev => [record, ...prev]);
    setShowNewStolenModal(false);
    setNewItemDesc('');
    setNewItemTombo('');
    setNewItemObs('');
  };

  // Assets belonging to SESA and UFC (Crucial accounting segregation)
  const sesaAssets = useMemo(() => {
    return assets.filter(a => a.origemTombo.includes('SESA'));
  }, [assets]);

  const ufcAssets = useMemo(() => {
    return assets.filter(a => a.origemTombo.includes('UFC'));
  }, [assets]);

  const totalSesaVal = useMemo(() => {
    return sesaAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0);
  }, [sesaAssets]);

  const totalUfcVal = useMemo(() => {
    return ufcAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0);
  }, [ufcAssets]);

  // Unserviceable Assets (Cemitério de Inservíveis)
  const inserviveisAssets = useMemo(() => {
    return assets.filter(a => a.estado === 'Inservível / Danificado' || a.estado === 'Ocioso');
  }, [assets]);

  const totalInserviveisVal = useMemo(() => {
    return inserviveisAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0);
  }, [inserviveisAssets]);

  // Ex-Servidores / Responsible Persons with charges
  const distinctResponsibles = useMemo(() => {
    const map = new Map<string, number>();
    assets.forEach(a => {
      const r = (a.responsavelNome || 'Não informado').trim();
      map.set(r, (map.get(r) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count);
  }, [assets]);

  // Collective transfer state
  const [selectedOldResp, setSelectedOldResp] = useState('');
  const [newRespNome, setNewRespNome] = useState('');
  const [newRespMatricula, setNewRespMatricula] = useState('');
  const [transferFeedback, setTransferFeedback] = useState<string | null>(null);

  const handleBulkReassign = () => {
    if (!selectedOldResp || !newRespNome.trim()) return;

    let count = 0;
    assets.forEach(a => {
      if ((a.responsavelNome || '').trim() === selectedOldResp) {
        count++;
        onUpdateAsset?.({
          ...a,
          responsavelNome: newRespNome.trim(),
          responsavelMatricula: newRespMatricula.trim() || a.responsavelMatricula || 'CPSMS-MAT',
        });
      }
    });

    setTransferFeedback(`Sucesso! ${count} bens que estavam sob a carga de "${selectedOldResp}" foram reatribuídos para "${newRespNome}".`);
    setSelectedOldResp('');
    setNewRespNome('');
    setNewRespMatricula('');
    setTimeout(() => setTransferFeedback(null), 6000);
  };

  // Copy text helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Progress calculation
  const totalTasks = Object.keys(phaseChecklist).length;
  const completedTasks = Object.values(phaseChecklist).filter(Boolean).length;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-6 pb-24">
      {/* Official Mission Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-7 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] sm:text-xs uppercase tracking-wider border border-amber-500/40 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Meta Prioritária: Fiscalização TCE-CE no Final do Ano
                </span>
                <span className="text-xs text-slate-400">Passivo Histórico de 13 Anos</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">
                Plano de Ação e Saneamento Patrimonial · CPSMS
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
                Centro de comando da <strong>Gestora de Patrimônio (Maria Gerliane Rocha Magalhães)</strong> para regularização de descompassos com o <strong>ASPEC</strong>, segregação dos bens da <strong>SESA e UFC</strong>, controle de extravios com B.O., triagem de inservíveis e preparação da auditoria.
              </p>
            </div>

            {/* Overall Progress Badge */}
            <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 sm:text-right shrink-0 min-w-[170px]">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Progresso Geral
              </div>
              <div className="text-2xl font-black font-mono text-amber-400 mt-0.5">
                {progressPercent}%
              </div>
              <div className="text-[11px] text-slate-400">
                {completedTasks} de {totalTasks} ações concluídas
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Quick Stats Pill Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">📋 Extravios Antigos (B.O.):</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> B.O. Registrado
              </span>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">🏛️ Bens SESA / UFC:</span>
              <span className="font-bold text-blue-300 mt-0.5 block">
                {sesaAssets.length + ufcAssets.length} itens ({formatBRL(totalSesaVal + totalUfcVal)})
              </span>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">📦 Cemitério Inservíveis:</span>
              <span className="font-bold text-amber-300 mt-0.5 block">
                {inserviveisAssets.length} itens p/ desfazimento
              </span>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">👥 Cargas Cadastradas:</span>
              <span className="font-bold text-slate-200 mt-0.5 block">
                {distinctResponsibles.length} servidores/detentores
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Navigation Subtabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setActiveSubTab('fases')}
          className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeSubTab === 'fases'
              ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. As 4 Fases & Checklist</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bo_balanca')}
          className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeSubTab === 'bo_balanca'
              ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-emerald-500" />
          <span>2. Arquivo de Extravios Antigos (B.O.)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
            {stolenAssets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('sesa_ufc')}
          className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeSubTab === 'sesa_ufc'
              ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-500" />
          <span>3. Bens SESA & UFC (ASPEC)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono">
            {sesaAssets.length + ufcAssets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('duplo_tombamento')}
          className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeSubTab === 'duplo_tombamento'
              ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Tag className="w-4 h-4 text-emerald-500" />
          <span>4. Duplo Tombamento (4 vs 6 Dígitos)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('inserviveis')}
          className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeSubTab === 'inserviveis'
              ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Trash2 className="w-4 h-4 text-amber-500" />
          <span>5. Cemitério de Inservíveis</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono">
            {inserviveisAssets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ex_servidores')}
          className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeSubTab === 'ex_servidores'
              ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4 text-purple-500" />
          <span>6. Cargas & Ex-Servidores</span>
        </button>

        <button
          onClick={() => setActiveSubTab('minutas')}
          className={`flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeSubTab === 'minutas'
              ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-500" />
          <span>7. Minutas & Modelos Legais</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: AS 4 FASES & CHECKLIST INTERATIVO */}
      {/* ========================================================================= */}
      {activeSubTab === 'fases' && (
        <div className="space-y-6">
          {/* Phase 1 Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-sm">
                  1
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Fase 1: Blindagem Institucional e Marco Zero (Imediato)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Proteger a Gestora de responsabilidades pretéritas e oficializar o início dos trabalhos.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                Em Andamento
              </span>
            </div>

            {/* Destaque Maior: Documento Oficial para Diretora e Contadora */}
            <div className="p-4 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Ofício de Notificação Oficial para a Diretora & Contadora
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Documento formal fundamentado (Marco Zero, reclassificação e segregação dos bens SESA/UFC no ASPEC, duplo tombamento e medidas para o TCE-CE — sem incluir fatos antigos que não entraram no ASPEC).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDiretoriaModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 rounded-lg shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Gerar e Imprimir Documento</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Item Extravios Históricos */}
              <div className="flex items-start gap-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
                <input
                  type="checkbox"
                  checked={phaseChecklist['fase1_bo_balanca']}
                  onChange={() => toggleTask('fase1_bo_balanca')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Arquivo Documental de Extravios Históricos (Fatos Antigos Fora do ASPEC)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300">
                      ✅ Fora do ASPEC · Resguardo Interno
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Histórico antigo e não inserido no ASPEC (como o caso antigo da balança); documentação e B.O. mantidos em arquivo interno apenas para resguardo caso questionado.
                  </p>
                  <button
                    onClick={() => setActiveSubTab('bo_balanca')}
                    className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Ver arquivo de ocorrências antigas →
                  </button>
                </div>
              </div>

              {/* Item Portaria */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={phaseChecklist['fase1_portaria_comissao']}
                  onChange={() => toggleTask('fase1_portaria_comissao')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Publicação da Portaria da Comissão Especial de Inventário
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Solicitar à Diretoria Executiva do CPSMS a publicação de portaria nomeando você e mais 2 servidores de apoio para o inventário geral.
                  </p>
                  <button
                    onClick={() => setActiveSubTab('minutas')}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Ver minuta pronta da Portaria →
                  </button>
                </div>
              </div>

              {/* Item Reunião Contadora */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={phaseChecklist['fase1_reuniao_contadora']}
                  onChange={() => toggleTask('fase1_reuniao_contadora')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Reunião Técnica com a Contadora (Paralisação da Depreciação de Bens SESA/UFC)
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Apresentar a norma do MCASP / TCE-CE comprovando que bens recebidos por cessão de uso pertencem a terceiros e não podem sofrer depreciação no Ativo do consórcio.
                  </p>
                  <button
                    onClick={() => setActiveSubTab('sesa_ufc')}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Gerar dossiê dos bens SESA/UFC para a contadora →
                  </button>
                </div>
              </div>

              {/* Item Relatório de Assunção */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={phaseChecklist['fase1_marco_zero']}
                  onChange={() => toggleTask('fase1_marco_zero')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Protocolar o Relatório Circunstanciado de Assunção de Função (Marco Zero)
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Ofício protocolado na Presidência e Diretoria registrando formalmente o estado em que o patrimônio foi encontrado após 13 anos.
                  </p>
                  <button
                    onClick={() => setActiveSubTab('minutas')}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Ver modelo do Relatório Marco Zero →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 2 Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm">
                  2
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Fase 2: Inventário Físico Sala a Sala & Cargas Funcionais
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Conferência física nas unidades (Policlínica, CEO, CER e Sede) e vinculação de responsáveis atuais.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                Programada
              </span>
            </div>

            {/* Destaque: Caderno de Balanço & Inventário Geral (Macro ➔ Micro) */}
            <div className="p-4 bg-gradient-to-r from-blue-500/15 via-emerald-500/10 to-transparent border border-blue-400/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Caderno de Vistoria Física & Balanço Geral (Macro ➔ Micro)
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Relatório agrupado por Macro-Unidade (Policlínica, CEO, Consórcio) e Micro-Localizações (salas/consultórios) com campos para novos tombos fora do ASPEC.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMacroMicroModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Abrir Caderno de Balanço</span>
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={phaseChecklist['fase2_vistoria_poli']}
                  onChange={() => toggleTask('fase2_vistoria_poli')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Vistoria e Leitura Patrimonial na Policlínica Regional Bernardo Félix
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Conferência sala por sala com identificação de plaquetas, bens sem etiqueta e confronto de locais.
                  </p>
                  <button
                    onClick={onNavigateToAudit}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Abrir Auditoria Sala a Sala →
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={phaseChecklist['fase2_vistoria_ceo']}
                  onChange={() => toggleTask('fase2_vistoria_ceo')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Vistoria e Leitura Patrimonial no CEO Regional Sobral
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Mapeamento dos consultórios odontológicos, equipamentos clínicos e raio-x.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={phaseChecklist['fase2_reatribuicao_ex_servidores']}
                  onChange={() => toggleTask('fase2_reatribuicao_ex_servidores')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Reatribuição de Cargas de Servidores Exonerados / Demitidos
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Transferir a carga dos bens que ainda constam em nome de servidores que saíram para os atuais coordenadores de setor.
                  </p>
                  <button
                    onClick={() => setActiveSubTab('ex_servidores')}
                    className="text-purple-600 dark:text-purple-400 font-bold hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Usar ferramenta de transferência coletiva de servidores →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 3 Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm">
                  3
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Fase 3: Saneamento Contábil, Inservíveis & Trocas Formais
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ajuste no sistema ASPEC, laudo do cemitério de inservíveis e extinção da troca informal.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                Programada
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={phaseChecklist['fase3_triagem_inserviveis']}
                  onChange={() => toggleTask('fase3_triagem_inserviveis')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Triagem e Isolamento do "Cemitério de Inservíveis"
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Separar em depósito fechado os itens quebrados, obsoletos ou irrecuperáveis para emissão do Laudo de Desfazimento.
                  </p>
                  <button
                    onClick={() => setActiveSubTab('inserviveis')}
                    className="text-amber-600 dark:text-amber-400 font-bold hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Ver lista e emitir laudo de inservibilidade →
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={phaseChecklist['fase3_formalizacao_trocas']}
                  onChange={() => toggleTask('fase3_formalizacao_trocas')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Extinção das Trocas Informais (Fluxo de Aprovação Eletrônica)
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Exigir que nenhuma cadeira, computador ou equipamento saia do setor sem que haja a solicitação no sistema e o parecer aprovado pela Gestora.
                  </p>
                  <button
                    onClick={onNavigateToTransfers}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Ir para Módulo de Transferências / Aprovar Trocas →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 4 Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-sm">
                  4
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Fase 4: Dossiê e Prestação de Contas TCE-CE (Reta Final)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Montagem da pasta oficial para entregar aos auditores do TCE-CE na Policlínica.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                Final do Ano
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={phaseChecklist['fase4_dossie_tce']}
                  onChange={() => toggleTask('fase4_dossie_tce')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Consolidação da Pasta Oficial de Fiscalização TCE-CE
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Dossiê impresso contendo: Portaria da Comissão, Relatório de Diagnóstico Inicial, Termos de Cessão SESA/UFC, Laudos de Inservíveis e Relatório Geral de Bens.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: BALANÇA FURTADA & REGISTRO DE BOLETINS DE OCORRÊNCIA */}
      {/* ========================================================================= */}
      {activeSubTab === 'bo_balanca' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300">
                    ✅ Medida Legal Adotada pela Gestora
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Controle de Extravios Históricos & Registros Policiais (Fora do ASPEC)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registro dos boletins de ocorrência policial e sindicâncias para respaldo junto ao TCE-CE e autorização de baixa legal.
                </p>
              </div>

              <button
                onClick={() => setShowNewStolenModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Novo Extravio / B.O.</span>
              </button>
            </div>

            {/* List of Registered Thefts / B.O.s */}
            <div className="space-y-4">
              {stolenAssets.map((record) => (
                <div 
                  key={record.id}
                  className="bg-slate-50 dark:bg-slate-850/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Ocorrência Patrimonial Formalizada
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {record.itemDescricao}
                      </h4>
                      <div className="text-xs text-slate-500">
                        Tombo / Identificador: <strong className="font-mono text-slate-700 dark:text-slate-300">{record.tombamento}</strong> · Local: <strong>{record.localOcorrencia}</strong>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      B.O. Policial Registrado
                    </span>
                  </div>

                  {/* B.O. & Sindicância Data Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Número do B.O.:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {record.boNumero}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Data: {formatDate(record.boData)}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Órgão Policial:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {record.boDelegacia}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-bold">
                        Polícia Civil do Ceará
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Processo / Sindicância:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {record.sindicanciaNumero}
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5 font-semibold">
                        Em Apuração Interna
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                    <strong>Despacho e Observações da Gestora:</strong><br />
                    {record.observacoes}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir Certidão para o TCE-CE</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: BENS SESA & UFC (ALINHAMENTO CONTÁBIL ASPEC) */}
      {/* ========================================================================= */}
      {activeSubTab === 'sesa_ufc' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold border border-blue-300">
                    Ajuste Contábil Urgente no ASPEC
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Bens Cedidos por SESA (Governo do Ceará) e UFC (Universidade Federal)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Segregação patrimonial: bens de terceiros sob guarda não podem sofrer depreciação no Ativo Próprio do consórcio.
                </p>
              </div>

              <button
                onClick={() => onNavigateToAssets()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-900 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <span>Ver na Tabela Completa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Accounting Rule Alert Box */}
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 rounded-xl p-4 text-xs space-y-2 text-blue-950 dark:text-blue-200">
              <div className="font-bold flex items-center gap-1.5 text-sm text-blue-900 dark:text-blue-100">
                <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Orientação Técnica para Apresentar à Contadora:
              </div>
              <p className="leading-relaxed">
                Conforme as <strong>Normas Brasileiras de Contabilidade Aplicadas ao Setor Público (NBC TSP 07 / MCASP)</strong>, equipamentos transferidos por <strong>Termo de Cessão de Uso ou Comodato</strong> continuam de propriedade do ente cedente (Governo do Estado / SESA e UFC).
              </p>
              <p className="leading-relaxed">
                👉 <strong>Consequência no ASPEC:</strong> Esses bens <strong>NÃO devem ser depreciados pelo consórcio</strong>. A depreciação mensal que está sendo lançada deve ser <strong>estornada ou paralisada</strong>, e os itens devem ser reclassificados para <em>Contas de Compensação / Bens de Terceiros sob Guarda</em>.
              </p>
            </div>

            {/* SESA and UFC Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                    Origem: SESA (Governo do Ceará)
                  </span>
                  <span className="font-mono font-bold text-xs bg-blue-100 text-blue-800 dark:bg-blue-950 px-2 py-0.5 rounded">
                    {sesaAssets.length} bens
                  </span>
                </div>
                <div className="text-xl font-mono font-black text-slate-900 dark:text-white">
                  {formatBRL(totalSesaVal)}
                </div>
                <div className="text-[11px] text-slate-500">
                  Cessão de uso para atendimento na Policlínica e CEO.
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">
                    Origem: UFC (Universidade Federal do Ceará)
                  </span>
                  <span className="font-mono font-bold text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 px-2 py-0.5 rounded">
                    {ufcAssets.length} bens
                  </span>
                </div>
                <div className="text-xl font-mono font-black text-slate-900 dark:text-white">
                  {formatBRL(totalUfcVal)}
                </div>
                <div className="text-[11px] text-slate-500">
                  Equipamentos didático-clínicos de Odontologia e Saúde.
                </div>
              </div>
            </div>

            {/* Table of SESA/UFC items */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Relação de Bens Cedidos Identificados ({sesaAssets.length + ufcAssets.length} itens)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Base cadastrada para exclusão da depreciação
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-2.5">Tombo</th>
                      <th className="p-2.5">Origem</th>
                      <th className="p-2.5">Descrição</th>
                      <th className="p-2.5">Forma Aquisição</th>
                      <th className="p-2.5">Unidade / Setor</th>
                      <th className="p-2.5 text-right">Valor Registrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[...sesaAssets, ...ufcAssets].slice(0, 30).map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                        <td className="p-2.5 font-mono font-bold">{a.tombamento}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.origemTombo.includes('SESA') ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {a.origemTombo.split(' ')[0]}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium max-w-xs truncate">{a.descricao}</td>
                        <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">{a.formaAquisicao || 'Cessão / Comodato'}</td>
                        <td className="p-2.5 text-slate-500 text-[11px]">{a.unidadeNome} - {a.setorNome}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{formatBRL(a.valorAquisicao || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: DUPLO TOMBAMENTO (PADRÃO 4 DÍGITOS CPSMS VS 6 DÍGITOS SESA) */}
      {/* ========================================================================= */}
      {activeSubTab === 'duplo_tombamento' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300">
                    Achado Crucial de Auditoria
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Duplo Tombamento: Tombo SESA (6 Dígitos) ↔ Tombo CPSMS (4 Dígitos)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Identificação de equipamentos do Governo do Estado (SESA) com plaqueta original de 6 dígitos que receberam indevidamente plaquetas de 4 dígitos do Consórcio.
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Mapa de Correlação</span>
              </button>
            </div>

            {/* Explanatory Rule Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1.5 text-xs">
                <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 text-sm">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Padrão SESA (Governo do Estado do Ceará): 6 DÍGITOS
                </span>
                <p className="text-blue-950/80 dark:text-blue-200/80 leading-relaxed">
                  Os bens originários do Estado possuem numeração de patrimônio padronizada com <strong>6 dígitos</strong> (ex: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">124589</code>, <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">048291</code>). Plaqueta metálica original do Estado.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5 text-xs">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-sm">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  Padrão CPSMS (Consórcio Público): 4 DÍGITOS
                </span>
                <p className="text-emerald-950/80 dark:text-emerald-200/80 leading-relaxed">
                  Os bens tombados pelo Consórcio CPSMS adotam a sequência de <strong>4 dígitos</strong> (ex: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">1042</code>, <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">0184</code>). Muitos itens da SESA receberam essa plaqueta e foram lançados no ASPEC como compra própria.
                </p>
              </div>
            </div>

            {/* Feedback alert */}
            {duploFeedback && (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-xs font-bold rounded-xl border border-emerald-300 flex items-center justify-between">
                <span>{duploFeedback}</span>
                <button onClick={() => setDuploFeedback(null)}>✕</button>
              </div>
            )}

            {/* Quick Linking Tool Form */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                Vincular Tombo SESA (6 dígitos) a um Tombo do Consórcio (4 dígitos)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                <div className="sm:col-span-6">
                  <label className="font-semibold block mb-1">1. Selecionar Bem pelo Tombo CPSMS ou Descrição:</label>
                  <select
                    value={selectedAssetForLink}
                    onChange={(e) => setSelectedAssetForLink(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  >
                    <option value="">Selecione o bem para vincular...</option>
                    {assets.slice(0, 80).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.tombamento} - {a.descricao.slice(0, 45)}... ({a.setorNome})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="font-semibold block mb-1">2. Tombo SESA Original (6 Dígitos):</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="Ex: 124589"
                    value={inputTomboSesa}
                    onChange={(e) => setInputTomboSesa(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-blue-900 dark:text-blue-300"
                  />
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="button"
                    disabled={!selectedAssetForLink || !inputTomboSesa.trim()}
                    onClick={() => {
                      const target = assets.find(a => a.id === selectedAssetForLink);
                      if (target && inputTomboSesa.trim()) {
                        onUpdateAsset?.({
                          ...target,
                          tomboOrigemSesa: inputTomboSesa.trim(),
                          duploTombamento: true,
                          observacoes: target.observacoes 
                            ? `${target.observacoes} | Duplo tombamento identificado: SESA nº ${inputTomboSesa.trim()}`
                            : `Duplo tombamento identificado: SESA nº ${inputTomboSesa.trim()}`
                        });
                        setDuploFeedback(`Vínculo gravado com sucesso! Tombo SESA "${inputTomboSesa.trim()}" associado ao bem "${target.tombamento}".`);
                        setSelectedAssetForLink('');
                        setInputTomboSesa('');
                        setTimeout(() => setDuploFeedback(null), 5000);
                      }
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    Salvar Vínculo
                  </button>
                </div>
              </div>
            </div>

            {/* List and Search of Linked & 6-digit Assets */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Relação de Bens com Identificação de Duplo Tombamento ou 6 Dígitos
                </span>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por 4 ou 6 dígitos..."
                    value={duploSearchQuery}
                    onChange={(e) => setDuploSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200">
                      <th className="p-2.5">Tombo CPSMS (4 dígitos)</th>
                      <th className="p-2.5">Tombo SESA (6 dígitos)</th>
                      <th className="p-2.5">Descrição do Bem</th>
                      <th className="p-2.5">Unidade / Setor</th>
                      <th className="p-2.5">Origem Real</th>
                      <th className="p-2.5 text-right">Valor Registrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {assets
                      .filter(a => {
                        const cleanTombo = a.tombamento.replace(/\D/g, '');
                        const hasSesa = Boolean(a.tomboOrigemSesa || a.origemTombo.includes('SESA') || cleanTombo.length >= 6);
                        if (!hasSesa) return false;
                        if (duploSearchQuery.trim()) {
                          const q = duploSearchQuery.toLowerCase();
                          return a.tombamento.toLowerCase().includes(q) || 
                                 (a.tomboOrigemSesa || '').toLowerCase().includes(q) ||
                                 a.descricao.toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .slice(0, 40)
                      .map(a => {
                        const cleanTombo = a.tombamento.replace(/\D/g, '');
                        const isSixDigitPrimary = cleanTombo.length >= 6;

                        return (
                          <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                            <td className="p-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {isSixDigitPrimary ? (a.tomboSecundario || 'Retombado') : a.tombamento}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-blue-700 dark:text-blue-400">
                              {isSixDigitPrimary ? a.tombamento : (a.tomboOrigemSesa || '6 dígitos (SESA)')}
                            </td>
                            <td className="p-2.5 font-medium max-w-xs truncate">{a.descricao}</td>
                            <td className="p-2.5 text-slate-500 text-[11px]">{a.unidadeNome} - {a.setorNome}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                SESA / Estado (Cessão)
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold">{formatBRL(a.valorAquisicao || 0)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: CEMITÉRIO DE INSERVÍVEIS */}
      {/* ========================================================================= */}
      {activeSubTab === 'inserviveis' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300">
                    Desfazimento & Baixa Legal
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Cemitério de Inservíveis (Bens Danificados ou Obsoletos)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Triagem e laudo técnico para instruir processo de leilão, doação ou descarte com baixa contábil aprovada pelo TCE-CE.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Emitir Laudo de Baixa TCE-CE</span>
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total de Bens Danificados:</span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {inserviveisAssets.length} <span className="text-xs font-normal text-slate-500">itens</span>
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Valor Histórico Acumulado:</span>
                <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
                  {formatBRL(totalInserviveisVal)}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Destinação Prevista:</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                  Leilão Público ou Descarte Ecológico
                </span>
              </div>
            </div>

            {/* List */}
            {inserviveisAssets.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                Nenhum bem marcado como "Inservível / Danificado" na base ativa no momento.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-2.5">Tombo</th>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5">Setor / Local</th>
                        <th className="p-2.5">Estado</th>
                        <th className="p-2.5 text-right">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {inserviveisAssets.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                          <td className="p-2.5 font-mono font-bold">{a.tombamento}</td>
                          <td className="p-2.5 font-medium">{a.descricao}</td>
                          <td className="p-2.5 text-slate-500">{a.unidadeNome} - {a.setorNome}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              {a.estado}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">{formatBRL(a.valorAquisicao || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: CARGAS & EX-SERVIDORES */}
      {/* ========================================================================= */}
      {activeSubTab === 'ex_servidores' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-xs font-bold border border-purple-300">
                Regularização de Responsabilidade Funcional
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Reatribuição Coletiva de Cargas (Ex-Servidores para Chefes Atuais)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transfira em lote todos os bens que ainda estão no nome de servidores exonerados para o coordenador atual do setor.
              </p>
            </div>

            {transferFeedback && (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{transferFeedback}</span>
              </div>
            )}

            {/* Reassignment Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  1. Servidor Anterior / Ex-Servidor:
                </label>
                <select
                  value={selectedOldResp}
                  onChange={(e) => setSelectedOldResp(e.target.value)}
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="">Selecione o servidor...</option>
                  {distinctResponsibles.map(r => (
                    <option key={r.nome} value={r.nome}>
                      {r.nome} ({r.count} bens)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  2. Novo Responsável (Chefe / Coordenador):
                </label>
                <input
                  type="text"
                  value={newRespNome}
                  onChange={(e) => setNewRespNome(e.target.value)}
                  placeholder="Nome completo do novo detentor"
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  3. Matrícula Funcional:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRespMatricula}
                    onChange={(e) => setNewRespMatricula(e.target.value)}
                    placeholder="Matrícula"
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleBulkReassign}
                    disabled={!selectedOldResp || !newRespNome.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer shrink-0 transition-colors"
                  >
                    Transferir Todos
                  </button>
                </div>
              </div>
            </div>

            {/* Resistance Guidance */}
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs space-y-1 text-amber-950 dark:text-amber-200">
              <span className="font-bold flex items-center gap-1 text-amber-900 dark:text-amber-100">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Dica Legal contra Resistência de Servidores em Assinar a Carga:
              </span>
              <p>
                O servidor público tem <strong>dever funcional</strong> de zelar pelos bens da sua repartição (Lei Federal nº 8.112/90, Art. 116). Caso haja recusa imotivada, a Gestora e uma testemunha lavram a <em>Certidão de Recusa e Vistoria</em>, e a Diretoria Executiva homologa a carga ex-officio, notificando a chefia imediata.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 6: MINUTAS & MODELOS LEGAIS PRONTOS */}
      {/* ========================================================================= */}
      {activeSubTab === 'minutas' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300">
                Documentos Administrativos Prontos para Impressão
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Minutas de Portarias e Relatórios para a Diretoria do CPSMS
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Textos jurídicos fundamentados para você copiar, assinar e protocolar imediatamente.
              </p>
            </div>

            {/* Minuta 1: Portaria */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  1. Minuta de Portaria: Comissão Especial de Inventário Patrimonial
                </h4>
                <button
                  onClick={() => handleCopy(`PORTARIA CPSMS Nº 042/2026\n\nINSTITUI A COMISSÃO ESPECIAL DE LEVANTAMENTO, REGULARIZAÇÃO E INVENTÁRIO PATRIMONIAL DO CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL (CPSMS) E DÁ OUTRAS PROVIDÊNCIAS.\n\nA Diretoria Executiva do CPSMS, no uso de suas atribuições legais e estatutárias, e considerando a necessidade de consolidação do acervo de bens móveis e equipamentos da Policlínica Regional Bernardo Félix da Silva, do Centro de Especialidades Odontológicas (CEO Sobral), do CER e da Base Administrativa, visando à prestação de contas junto ao Tribunal de Contas do Estado do Ceará (TCE-CE);\n\nRESOLVE:\n\nArt. 1º - Fica instituída a Comissão Especial de Inventário Físico e Financeiro dos Bens Patrimoniais do CPSMS, composta pelos seguintes membros:\nI - Maria Gerliane Rocha Magalhães - Presidente da Comissão / Gestora de Patrimônio;\nII - [Nome do Servidor 2] - Membro;\nIII - [Nome do Servidor 3] - Membro.\n\nArt. 2º - Compete à Comissão realizar a conferência física sala a sala, identificar divergências, lavrar termos de responsabilidade atualizados e emitir laudos de desfazimento de bens inservíveis.\n\nArt. 3º - Esta Portaria entra em vigor na data de sua publicação.\n\nSobral - CE, [Data Atual].\n\n________________________________________\nDIRETORIA EXECUTIVA DO CPSMS`, 'portaria')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  {copiedKey === 'portaria' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'portaria' ? 'Copiado!' : 'Copiar Minuta'}</span>
                </button>
              </div>
              <pre className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
{`PORTARIA CPSMS Nº 042/2026

INSTITUI A COMISSÃO ESPECIAL DE LEVANTAMENTO, REGULARIZAÇÃO E INVENTÁRIO PATRIMONIAL DO CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL (CPSMS) E DÁ OUTRAS PROVIDÊNCIAS.

A Diretoria Executiva do CPSMS, no uso de suas atribuições legais e estatutárias, e considerando a necessidade de consolidação do acervo de bens móveis e equipamentos da Policlínica Regional Bernardo Félix da Silva, do Centro de Especialidades Odontológicas (CEO Sobral), do CER e da Base Administrativa, visando à prestação de contas junto ao Tribunal de Contas do Estado do Ceará (TCE-CE);

RESOLVE:

Art. 1º - Fica instituída a Comissão Especial de Inventário Físico e Financeiro dos Bens Patrimoniais do CPSMS, composta pelos seguintes membros:
I - Maria Gerliane Rocha Magalhães - Presidente da Comissão / Gestora de Patrimônio;
II - [Nome do Servidor 2] - Membro;
III - [Nome do Servidor 3] - Membro.

Art. 2º - Compete à Comissão realizar a conferência física sala a sala, identificar divergências, lavrar termos de responsabilidade atualizados e emitir laudos de desfazimento de bens inservíveis.

Art. 3º - Esta Portaria entra em vigor na data de sua publicação.

Sobral - CE, ${new Date().toLocaleDateString('pt-BR')}.

________________________________________
DIRETORIA EXECUTIVA DO CPSMS`}
              </pre>
            </div>

            {/* Minuta 2: Marco Zero */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  2. Relatório Circunstanciado de Assunção de Função (Marco Zero / Blindagem)
                </h4>
                <button
                  onClick={() => handleCopy(`OFÍCIO / RELATÓRIO CIRCUNSTANCIADO DE ASSUNÇÃO DE FUNÇÃO Nº 01/2026\n\nÀ Presidência e Diretoria Executiva do CPSMS\nAssunto: Diagnóstico Inicial e Marco Zero da Gestão Patrimonial\n\nSenhores Diretores,\n\nNa qualidade de Gestora de Patrimônio recém-designada, venho, pelo presente instrumento, registrar formalmente o diagnóstico preliminar da base patrimonial do CPSMS, consolidado após constatação de um período de aproximadamente 13 anos sem comissão permanente e inventário periódico.\n\n1. Foram identificados descompassos históricos entre o acervo físico e o sistema contábil ASPEC;\n2. Constatou-se a presença de equipamentos cedidos pela SESA e UFC que necessitam de reclassificação para contas de controle, evitando distorções contábeis e retenção indevida de depreciação;\n3. Foram identificados casos de duplo tombamento (plaquetas SESA de 6 dígitos e CPSMS de 4 dígitos) para retificação contábil;\n4. Está em andamento o plano de ação para regularização de cargas de servidores desligados e triagem de inservíveis para a fiscalização do TCE-CE.\n\nNestes termos, pede-se juntada aos autos para os devidos fins de direito e comprovação de marco inicial de gestão.\n\nSobral - CE, [Data].\n\n________________________________________\nMaria Gerliane Rocha Magalhães\nGestora de Patrimônio - CPSMS`, 'marco_zero')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  {copiedKey === 'marco_zero' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'marco_zero' ? 'Copiado!' : 'Copiar Relatório'}</span>
                </button>
              </div>
              <pre className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
{`OFÍCIO / RELATÓRIO CIRCUNSTANCIADO DE ASSUNÇÃO DE FUNÇÃO Nº 01/2026

À Presidência e Diretoria Executiva do CPSMS
Assunto: Diagnóstico Inicial e Marco Zero da Gestão Patrimonial

Senhores Diretores,

Na qualidade de Gestora de Patrimônio recém-designada, venho, pelo presente instrumento, registrar formalmente o diagnóstico preliminar da base patrimonial do CPSMS, consolidado após constatação de um período de aproximadamente 13 anos sem comissão permanente e inventário periódico.

1. Foram identificados descompassos históricos entre o acervo físico e o sistema contábil ASPEC;
2. Constatou-se a presença de equipamentos cedidos pela SESA e UFC que necessitam de reclassificação para contas de controle, evitando distorções contábeis e retenção indevida de depreciação;
3. Foram identificados casos de duplo tombamento (plaquetas SESA de 6 dígitos e CPSMS de 4 dígitos) para retificação contábil;
4. Está em andamento o plano de ação para regularização de cargas de servidores desligados e triagem de inservíveis para a fiscalização do TCE-CE.

Nestes termos, pede-se juntada aos autos para os devidos fins de direito e comprovação de marco inicial de gestão.

Sobral - CE, ${new Date().toLocaleDateString('pt-BR')}.

________________________________________
Maria Gerliane Rocha Magalhães
Gestora de Patrimônio - CPSMS`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Novo Extravio / B.O. */}
      {showNewStolenModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Registrar Nova Ocorrência / Bem Extraviado
              </h3>
              <button
                onClick={() => setShowNewStolenModal(false)}
                className="w-7 h-7 rounded text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStolen} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Descrição do Bem Extraviado:</label>
                <input
                  type="text"
                  required
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Ex: Monitor Cardíaco, Cadeira de Rodas..."
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Nº do Tombo (se houver):</label>
                  <input
                    type="text"
                    value={newItemTombo}
                    onChange={(e) => setNewItemTombo(e.target.value)}
                    placeholder="Ex: 004128"
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Local da Ocorrência:</label>
                  <input
                    type="text"
                    value={newItemLocal}
                    onChange={(e) => setNewItemLocal(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Nº do Boletim de Ocorrência:</label>
                  <input
                    type="text"
                    value={newItemBoNum}
                    onChange={(e) => setNewItemBoNum(e.target.value)}
                    placeholder="Ex: BO-PC-2026/..."
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Data do B.O.:</label>
                  <input
                    type="date"
                    value={newItemBoData}
                    onChange={(e) => setNewItemBoData(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Delegacia da Polícia Civil:</label>
                <input
                  type="text"
                  value={newItemBoDelegacia}
                  onChange={(e) => setNewItemBoDelegacia(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Observações da Sindicância:</label>
                <textarea
                  rows={2}
                  value={newItemObs}
                  onChange={(e) => setNewItemObs(e.target.value)}
                  placeholder="Informações adicionais para a comissão e TCE-CE"
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewStolenModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Salvar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Relatório Oficial para Diretora & Contadora */}
      {showDiretoriaModal && (
        <DiretoriaContabilidadeReportModal
          isOpen={showDiretoriaModal}
          onClose={() => setShowDiretoriaModal(false)}
          assets={assets}
          currentProfile={currentProfile}
          stolenRecord={stolenAssets[0]}
        />
      )}

      {/* Modal: Caderno de Balanço & Inventário Geral (Macro ➔ Micro) */}
      {showMacroMicroModal && (
        <MacroMicroInventoryReportModal
          isOpen={showMacroMicroModal}
          onClose={() => setShowMacroMicroModal(false)}
          assets={assets}
          units={units}
          sectors={sectors}
          currentProfile={currentProfile}
          onAddAsset={onAddAsset}
          onUpdateAsset={onUpdateAsset}
        />
      )}
    </div>
  );
};
