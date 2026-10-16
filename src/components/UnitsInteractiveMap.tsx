import React, { useState, useMemo } from 'react';
import { Asset, Sector, UnitInfo, UserProfile, TrashedAsset, TrashedSector } from '../types';
import { formatBRL, formatDate } from '../utils/formatters';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  CheckCheck,
  AlertTriangle, 
  Search, 
  Plus, 
  Filter, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Clock, 
  Eye, 
  Package, 
  DollarSign, 
  User, 
  Sparkles,
  ChevronRight,
  Compass,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { NewLocationModal } from './NewLocationModal';
import { buildUnitSubareas, getAssetUnitId, normalizeLoc } from '../utils/locationHelper';
import { downloadAspecRoomPdf } from '../utils/aspecPdfGenerator';

interface UnitsInteractiveMapProps {
  assets: Asset[];
  sectors: Sector[];
  units: UnitInfo[];
  currentProfile: UserProfile;
  onNavigateToAuditRoom: (unitId: string, sectorName: string) => void;
  onConcludeRoom: (sectorIdOrName: string) => void;
  onAddNewLocation: (newSector: Sector) => void;
  onDeleteSector?: (sectorIdOrName: string, reason?: string) => void;
  trashAssets?: TrashedAsset[];
  trashSectors?: TrashedSector[];
}

export const UnitsInteractiveMap: React.FC<UnitsInteractiveMapProps> = ({
  assets,
  sectors,
  units,
  currentProfile,
  onNavigateToAuditRoom,
  onConcludeRoom,
  onAddNewLocation,
  onDeleteSector,
  trashAssets = [],
  trashSectors = [],
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('policlinica');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'concluidas' | 'em_andamento' | 'pendentes' | 'divergencias'>('todos');
  const [selectedBlockFilter, setSelectedBlockFilter] = useState<string>('todos');
  const [isNewLocationModalOpen, setIsNewLocationModalOpen] = useState<boolean>(false);
  const [previewSectorId, setPreviewSectorId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [hideEmptyRooms, setHideEmptyRooms] = useState<boolean>(true);
  const [sectorToDelete, setSectorToDelete] = useState<Sector | null>(null);
  const [deleteSectorReason, setDeleteSectorReason] = useState<string>('Sala duplicada ou criada por engano');

  // Garante de forma blindada que nenhum bem na lixeira seja computado ou exibido no mapa
  const activeAssets = useMemo(() => {
    const trashedIds = new Set<string>();
    if (trashAssets && trashAssets.length > 0) {
      trashAssets.forEach(t => {
        if (t?.asset?.id) trashedIds.add(t.asset.id);
      });
    }
    try {
      const savedTrash = localStorage.getItem('cpsms_trash_assets');
      if (savedTrash) {
        const parsed = JSON.parse(savedTrash);
        if (Array.isArray(parsed)) {
          parsed.forEach((t: any) => {
            if (t?.asset?.id) trashedIds.add(t.asset.id);
          });
        }
      }
    } catch {
      // ignore
    }

    if (trashedIds.size === 0) return assets;
    return assets.filter(a => !trashedIds.has(a.id));
  }, [assets, trashAssets]);

  // Garante de forma blindada que nenhuma sala na lixeira apareça no mapa
  const activeSectors = useMemo(() => {
    const trashedSecIds = new Set<string>();
    const trashedSecNames = new Set<string>();
    if (trashSectors && trashSectors.length > 0) {
      trashSectors.forEach(t => {
        if (t?.sector?.id) trashedSecIds.add(t.sector.id);
        if (t?.sector?.nome) trashedSecNames.add(normalizeLoc(t.sector.nome));
      });
    }
    try {
      const savedTrashSectors = localStorage.getItem('cpsms_trash_sectors');
      if (savedTrashSectors) {
        const parsed = JSON.parse(savedTrashSectors);
        if (Array.isArray(parsed)) {
          parsed.forEach((t: any) => {
            if (t?.sector?.id) trashedSecIds.add(t.sector.id);
            if (t?.sector?.nome) trashedSecNames.add(normalizeLoc(t.sector.nome));
          });
        }
      }
    } catch {
      // ignore
    }

    if (trashedSecIds.size === 0 && trashedSecNames.size === 0) return sectors;
    return sectors.filter(s => !trashedSecIds.has(s.id) && !trashedSecNames.has(normalizeLoc(s.nome)));
  }, [sectors, trashSectors]);

  // Unidade Selecionada
  const activeUnit = units.find(u => u.id === selectedUnitId) || units[0];

  // Lista oficial e completa de SALAS / SUBÁREAS da Unidade com bens alocados
  // No ASPEC: Área = Unidade (ex: 004 - CEO Sobral) e Subárea = Sala (ex: 004 - COPA)
  const allSubareasWithStats = useMemo(() => {
    return buildUnitSubareas(selectedUnitId as any, activeSectors, activeAssets);
  }, [selectedUnitId, activeSectors, activeAssets]);

  // Lista de salas filtrada para exibição (com controle de salas vazias)
  const sectorsWithStats = useMemo(() => {
    if (hideEmptyRooms) {
      return allSubareasWithStats.filter(s => s.totalCount > 0 || s.revisada || s.id.startsWith('sec-custom-'));
    }
    return allSubareasWithStats;
  }, [allSubareasWithStats, hideEmptyRooms]);

  // Lista de Blocos únicos para a unidade selecionada
  const availableBlocks = useMemo(() => {
    const set = new Set<string>();
    sectorsWithStats.forEach(s => {
      if (s.bloco) set.add(s.bloco);
    });
    return Array.from(set);
  }, [sectorsWithStats]);

  // Filtros aplicados sobre as salas
  const filteredSectors = useMemo(() => {
    return sectorsWithStats.filter(s => {
      if (selectedBlockFilter !== 'todos' && s.bloco !== selectedBlockFilter) {
        return false;
      }

      if (statusFilter === 'concluidas' && s.visualStatus !== 'concluida') return false;
      if (statusFilter === 'em_andamento' && s.visualStatus !== 'em_andamento') return false;
      if (statusFilter === 'pendentes' && s.visualStatus !== 'pendente') return false;
      if (statusFilter === 'divergencias' && s.visualStatus !== 'divergencia') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.nome.toLowerCase().includes(q);
        const matchesSigla = s.sigla.toLowerCase().includes(q);
        const matchesResp = (s.responsavelNome || '').toLowerCase().includes(q);
        const matchesBlock = (s.bloco || '').toLowerCase().includes(q);
        return matchesName || matchesSigla || matchesResp || matchesBlock;
      }

      return true;
    });
  }, [sectorsWithStats, selectedBlockFilter, statusFilter, searchQuery]);

  // Agrupamento das salas filtradas por Bloco/Prédio
  const groupedByBlock = useMemo(() => {
    const map = new Map<string, typeof filteredSectors>();
    filteredSectors.forEach(sector => {
      const blockKey = sector.bloco || 'Prédio Principal';
      if (!map.has(blockKey)) {
        map.set(blockKey, []);
      }
      map.get(blockKey)!.push(sector);
    });
    return Array.from(map.entries());
  }, [filteredSectors]);

  // Métricas Consolidadas da Unidade Atual
  const unitStats = useMemo(() => {
    const totalSalas = sectorsWithStats.length;
    const concluidas = sectorsWithStats.filter(s => s.visualStatus === 'concluida').length;
    const emAndamento = sectorsWithStats.filter(s => s.visualStatus === 'em_andamento').length;
    const divergencias = sectorsWithStats.filter(s => s.visualStatus === 'divergencia').length;
    const pendentes = sectorsWithStats.filter(s => s.visualStatus === 'pendente').length;
    const totalBens = sectorsWithStats.reduce((sum, s) => sum + s.totalCount, 0);
    const conferidosBens = sectorsWithStats.reduce((sum, s) => sum + s.checkedCount, 0);
    const totalValor = sectorsWithStats.reduce((sum, s) => sum + s.totalVal, 0);
    const percGeral = totalSalas > 0 ? Math.round((concluidas / totalSalas) * 100) : 0;

    return {
      totalSalas,
      concluidas,
      emAndamento,
      divergencias,
      pendentes,
      totalBens,
      conferidosBens,
      totalValor,
      percGeral,
    };
  }, [sectorsWithStats]);

  // Função Concluir Sala
  const handleTriggerConcludeRoom = (sectorId: string, sectorName: string) => {
    onConcludeRoom(sectorId);
    
    // Baixar automaticamente o PDF oficial da sala
    const targetSector = activeSectors.find(s => s.id === sectorId || s.nome.trim().toLowerCase() === sectorName.trim().toLowerCase());
    const currentUnit = units.find(u => u.id === selectedUnitId) || units[0];
    let pdfRes: { filename: string; isAllOk: boolean } | null = null;
    try {
      pdfRes = downloadAspecRoomPdf({
        sector: targetSector || { id: sectorId, nome: sectorName },
        unit: currentUnit,
        assets: activeAssets,
        currentProfile
      });
    } catch (e) {
      console.warn('PDF download err in map:', e);
    }

    if (pdfRes) {
      setActionFeedback(`Sucesso! A sala "${sectorName}" foi concluída e o PDF (${pdfRes.filename}) foi baixado automaticamente!`);
    } else {
      setActionFeedback(`Sucesso! A sala "${sectorName}" foi marcada como revisada. Todos os itens foram consolidados e o mapa visual foi atualizado.`);
    }
    setTimeout(() => setActionFeedback(null), 6000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Top Banner & Title */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 shrink-0">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                Acompanhamento Espacial em Tempo Real
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                Inventário Físico Sala a Sala
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mt-1">
              Mapa Visual das Unidades de Saúde
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Navegue pelos prédios e blocos da <strong>Policlínica (POLI)</strong>, <strong>CEO</strong> e <strong>CPSMS</strong> com monitoramento visual do inventário e conclusão de salas.
            </p>
          </div>
        </div>

        {/* Action Button: Cadastrar Nova Localização Física */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsNewLocationModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ring-2 ring-emerald-500/30"
            title="Adicionar novo prédio, bloco, pavimento, consultório ou sala ao mapa"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Cadastrar Nova Localização</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {actionFeedback && (
        <div className="p-3.5 bg-emerald-500 text-slate-950 rounded-xl shadow-md font-bold text-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="p-1 font-mono hover:opacity-75 cursor-pointer">✕</button>
        </div>
      )}

      {/* Unit Selector Bar (POLICLÍNICA / CEO / CPSMS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {units.map((unit) => {
          const isSelected = selectedUnitId === unit.id;
          const uRooms = buildUnitSubareas(unit.id as any, activeSectors, activeAssets);
          const uConcluidas = uRooms.filter(s => s.visualStatus === 'concluida').length;
          const uPerc = uRooms.length > 0 ? Math.round((uConcluidas / uRooms.length) * 100) : 0;

          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => {
                setSelectedUnitId(unit.id);
                setSelectedBlockFilter('todos');
              }}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {unit.sigla}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1 line-clamp-1">
                    {unit.nome}
                  </h3>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {unit.municipio}
                  </div>
                </div>
                
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              {/* Progress Bar & Sala counts */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[10.5px] text-slate-500">Progresso do Inventário</span>
                  <span className="font-bold text-slate-900 dark:text-white">{uPerc}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${uPerc}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>{uRooms.length} subáreas mapeadas</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{uConcluidas} revisadas</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Context Banner: Estrutura ASPEC (Área = Unidade / Subárea = Sala Física) */}
      <div className="p-4 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 dark:from-slate-850 dark:via-slate-800 dark:to-slate-850 border-2 border-emerald-300 dark:border-emerald-700/60 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-mono font-black text-xs shrink-0 shadow-xs">
            {selectedUnitId === 'ceo' ? 'ÁREA 004' : selectedUnitId === 'policlinica' ? 'ÁREA 001' : 'ÁREA 002'}
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap text-sm">
              <span>Unidade (Área no ASPEC):</span>
              <span className="font-black text-emerald-800 dark:text-emerald-300 underline decoration-emerald-400 underline-offset-2">
                {activeUnit.nome}
              </span>
            </div>
            <div className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-0.5">
              Uma localização é composta de <strong>Área ({selectedUnitId === 'ceo' ? '004 - CEO Sobral' : activeUnit.sigla})</strong> + <strong>Subárea (Sala / Consultório)</strong>. Abaixo estão todas as subáreas com seus respectivos bens físicos alocados.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-mono font-black text-xs border border-emerald-300 dark:border-emerald-700">
            {sectorsWithStats.length} Subáreas Físicas Exibidas
          </span>
        </div>
      </div>

      {/* Executive Unit Dashboard Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total de Salas</span>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
            {unitStats.totalSalas}
          </div>
          <span className="text-[10px] text-slate-500">Mapeadas nesta unidade</span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Concluídas / Revisadas</span>
          <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5">
            <CheckCheck className="w-4 h-4" />
            <span>{unitStats.concluidas}</span>
          </div>
          <span className="text-[10px] text-emerald-600">{unitStats.percGeral}% concluído</span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">Em Andamento</span>
          <div className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-400 font-mono mt-0.5">
            {unitStats.emAndamento}
          </div>
          <span className="text-[10px] text-amber-600">Com conferência ativa</span>
        </div>

        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
          <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">Com Divergências</span>
          <div className="text-base sm:text-lg font-black text-rose-700 dark:text-rose-400 font-mono mt-0.5">
            {unitStats.divergencias}
          </div>
          <span className="text-[10px] text-rose-600">Requer conciliação</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Bens Alocados</span>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
            {unitStats.totalBens}
          </div>
          <span className="text-[10px] text-slate-500">{unitStats.conferidosBens} conferidos</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Patrimonial</span>
          <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5 truncate">
            {formatBRL(unitStats.totalValor)}
          </div>
          <span className="text-[10px] text-slate-500">Carga sob gestão</span>
        </div>
      </div>

      {/* Filters & Interactive Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer whitespace-nowrap transition-colors ${
              statusFilter === 'todos' 
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-xs' 
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Todas ({unitStats.totalSalas})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('concluidas')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1 ${
              statusFilter === 'concluidas' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Revisadas ({unitStats.concluidas})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('em_andamento')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer whitespace-nowrap transition-colors ${
              statusFilter === 'em_andamento' 
                ? 'bg-amber-500 text-slate-950 shadow-xs' 
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            Em Andamento ({unitStats.emAndamento})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('divergencias')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer whitespace-nowrap transition-colors ${
              statusFilter === 'divergencias' 
                ? 'bg-rose-600 text-white shadow-xs' 
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100'
            }`}
          >
            Divergências ({unitStats.divergencias})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pendentes')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer whitespace-nowrap transition-colors ${
              statusFilter === 'pendentes' 
                ? 'bg-slate-400 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            Pendentes ({unitStats.pendentes})
          </button>
        </div>

        {/* Right: Block Filter Dropdown + Empty Rooms Toggle + Search Box */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setHideEmptyRooms(!hideEmptyRooms)}
            className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 text-[11px] ${
              hideEmptyRooms
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
            title="Ocultar salas que não possuem bens alocados para focar apenas nas salas com inventário ativo"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{hideEmptyRooms ? 'Ocultando Salas Sem Bens' : 'Exibir Todas as Salas'}</span>
          </button>

          {availableBlocks.length > 1 && (
            <select
              value={selectedBlockFilter}
              onChange={(e) => setSelectedBlockFilter(e.target.value)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium cursor-pointer max-w-[170px] truncate"
            >
              <option value="todos">Todos os Blocos</option>
              {availableBlocks.map((blk, i) => (
                <option key={i} value={blk}>{blk}</option>
              ))}
            </select>
          )}

          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar sala, sigla, tombo..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* VISUAL MAP: RENDERED BLOCK BY BLOCK */}
      <div className="space-y-6">
        {groupedByBlock.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Nenhuma sala encontrada para os filtros selecionados
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tente redefinir os filtros ou cadastre uma nova sala clicando em "+ Cadastrar Nova Localização".
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('todos');
                setSelectedBlockFilter('todos');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          groupedByBlock.map(([blockName, blockSectors], blockIndex) => {
            const blockTotal = blockSectors.length;
            const blockConcluidas = blockSectors.filter(s => s.visualStatus === 'concluida').length;
            const blockPerc = blockTotal > 0 ? Math.round((blockConcluidas / blockTotal) * 100) : 0;

            return (
              <div 
                key={`block-${blockIndex}`}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 shadow-xs"
              >
                {/* Block Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <Layers className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white leading-tight">
                        {blockName}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {blockSectors.length} sala(s) mapeada(s) neste setor arquitetônico
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {blockConcluidas} de {blockTotal} revisadas
                      </span>
                      <div className="w-32 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${blockPerc}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spatial Grid of Rooms */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {blockSectors.map((sector) => {
                    const isConcluida = sector.visualStatus === 'concluida';
                    const isEmAndamento = sector.visualStatus === 'em_andamento';
                    const isDivergencia = sector.visualStatus === 'divergencia';

                    return (
                      <div
                        key={sector.id}
                        className={`rounded-2xl border-2 p-4 flex flex-col justify-between transition-all relative overflow-hidden group ${
                          isConcluida
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-600 shadow-sm'
                            : isDivergencia
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-400 dark:border-rose-700'
                            : isEmAndamento
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-400 dark:border-amber-600'
                            : 'bg-slate-50/60 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        {/* Top: Status Badge + Sigla */}
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                              {sector.sigla}
                            </span>

                            {isConcluida ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-xs">
                                <CheckCheck className="w-3 h-3 stroke-[3]" />
                                <span>Revisada</span>
                              </span>
                            ) : isDivergencia ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Divergência</span>
                              </span>
                            ) : isEmAndamento ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Em Andamento</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                Pendente
                              </span>
                            )}
                          </div>

                          {/* Room Title */}
                          <h4 className="text-sm font-black text-slate-950 dark:text-white leading-snug line-clamp-2">
                            {sector.nome}
                          </h4>

                          {/* Responsável */}
                          {sector.responsavelNome && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{sector.responsavelNome}</span>
                            </div>
                          )}

                          {/* Floor / Pavimento info */}
                          {sector.andar && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Pavimento: {sector.andar}
                            </div>
                          )}
                        </div>

                        {/* Middle: Progress and Asset Counts */}
                        <div className="my-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {sector.totalCount} {sector.totalCount === 1 ? 'bem' : 'bens'} ({formatBRL(sector.totalVal)})
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">
                              {sector.checkedCount}/{sector.totalCount} ({sector.percent}%)
                            </span>
                          </div>

                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                isConcluida ? 'bg-emerald-500' : isDivergencia ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${sector.percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Bottom Actions for this Room */}
                        <div className="space-y-1.5 pt-1">
                          {/* FUNÇÃO: CONCLUIR SALA */}
                          {!isConcluida ? (
                            <button
                              type="button"
                              onClick={() => handleTriggerConcludeRoom(sector.id, sector.nome)}
                              className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5"
                              title="Marcar sala como revisada, consolidar todos os itens verificados e atualizar o mapa geral"
                            >
                              <CheckCheck className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Concluir Sala</span>
                            </button>
                          ) : (
                            <div className="py-1 px-2 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-bold text-[10.5px] flex items-center justify-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Sala Revisada no Inventário</span>
                            </div>
                          )}

                          {/* Quick Navigation to Audit Vistoria */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onNavigateToAuditRoom(sector.unidadeId, sector.nome)}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] cursor-pointer transition-colors flex items-center justify-center gap-1"
                            >
                              <span>Vistoriar</span>
                              <ChevronRight className="w-3 h-3 text-slate-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setPreviewSectorId(previewSectorId === sector.id ? null : sector.id)}
                              className="py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px] cursor-pointer"
                              title="Ver lista de bens alocados nesta sala"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {onDeleteSector && (
                              <button
                                type="button"
                                onClick={() => {
                                  const fullSector = sectors.find(s => s.id === sector.id || s.nome === sector.nome) || {
                                    id: sector.id,
                                    nome: sector.nome,
                                    sigla: sector.nome.slice(0, 8),
                                    unidadeId: sector.unidadeId,
                                    unidadeNome: activeUnit.nome,
                                    responsavelNome: sector.responsavelNome || 'Geral',
                                    responsavelCargo: sector.responsavelCargo || 'Detentor',
                                    responsavelMatricula: 'CPSMS',
                                    subsetores: [],
                                  };
                                  setSectorToDelete(fullSector);
                                  setDeleteSectorReason('Sala duplicada ou criada por engano');
                                }}
                                className="py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 text-[11px] cursor-pointer transition-colors"
                                title="Mover sala para a Lixeira"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Assets Preview Drawer */}
                        {previewSectorId === sector.id && (
                          <div className="mt-3 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-lg text-[11px] space-y-1.5 animate-in fade-in duration-100">
                            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-100 dark:border-slate-800">
                              <span>Bens da Sala ({sector.roomAssets.length})</span>
                              <button onClick={() => setPreviewSectorId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                              {sector.roomAssets.length === 0 ? (
                                <p className="text-slate-400 py-1">Nenhum bem registrado nesta sala.</p>
                              ) : (
                                sector.roomAssets.map(asset => (
                                  <div key={asset.id} className="pt-1 flex items-center justify-between gap-1">
                                    <div className="min-w-0">
                                      <span className="font-mono font-bold text-slate-900 dark:text-white mr-1">{asset.tombamento}</span>
                                      <span className="truncate text-slate-600 dark:text-slate-300">{asset.descricao}</span>
                                    </div>
                                    <span className={`text-[9.5px] px-1 py-0.2 rounded font-bold shrink-0 ${
                                      asset.auditoria?.conferido ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                      {asset.auditoria?.conferido ? '✓' : '…'}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Cadastro de Nova Localização Física */}
      {isNewLocationModalOpen && (
        <NewLocationModal
          isOpen={isNewLocationModalOpen}
          onClose={() => setIsNewLocationModalOpen(false)}
          units={units}
          onSaveLocation={(newSec) => {
            onAddNewLocation(newSec);
            setActionFeedback(`Nova localização física "${newSec.nome}" (${newSec.sigla}) adicionada ao mapa com sucesso!`);
            setTimeout(() => setActionFeedback(null), 6000);
          }}
          currentProfile={currentProfile}
          defaultUnitId={selectedUnitId}
        />
      )}

      {/* Modal: Confirmar Exclusão de Sala do Mapa */}
      {sectorToDelete && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black">Mover Sala para a Lixeira</h4>
                <p className="text-xs text-slate-500">Quarentena segura de 7 dias</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  {activeUnit.nome}
                </span>
                <h5 className="font-black text-sm text-slate-900 dark:text-white">{sectorToDelete.nome}</h5>
                <p className="text-slate-400">Responsável: {sectorToDelete.responsavelNome}</p>
              </div>

              <p className="leading-relaxed">
                A sala será removida do mapa e movida para a <strong>Lixeira</strong>. Os bens vinculados continuarão no patrimônio geral. A sala poderá ser restaurada a qualquer momento nos próximos 7 dias.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo da exclusão da sala:
                </label>
                <select
                  value={deleteSectorReason}
                  onChange={(e) => setDeleteSectorReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Sala duplicada ou criada por engano">Sala duplicada ou criada por engano</option>
                  <option value="Ambiente desativado na unidade">Ambiente desativado na unidade</option>
                  <option value="Nome incorreto / reconfiguração de setores">Nome incorreto / reconfiguração de setores</option>
                  <option value="Outro motivo">Outro motivo</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSectorToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSector && sectorToDelete) {
                    onDeleteSector(sectorToDelete.id || sectorToDelete.nome, deleteSectorReason);
                    setActionFeedback(`A sala "${sectorToDelete.nome}" foi movida para a Lixeira com quarentena de 7 dias.`);
                    setTimeout(() => setActionFeedback(null), 5000);
                    setSectorToDelete(null);
                  }
                }}
                className="px-4 py-2.5 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Mover Sala para Lixeira</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
