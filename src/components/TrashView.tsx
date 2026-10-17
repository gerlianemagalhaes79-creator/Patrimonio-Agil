import React, { useState, useMemo } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  ShieldCheck, 
  Search, 
  Clock, 
  Package, 
  DoorClosed, 
  Info,
  Calendar,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Asset, TrashedAsset, TrashedSector, UserProfile } from '../types';
import { findFalseDuplicateTrashedAssets } from '../utils/assetDeduplication';

interface TrashViewProps {
  trashAssets: TrashedAsset[];
  trashSectors: TrashedSector[];
  activeAssets?: Asset[];
  currentProfile: UserProfile;
  onRestoreAsset: (assetId: string) => void;
  onPermanentlyDeleteAsset: (assetId: string) => void;
  onRestoreSector: (sectorId: string) => void;
  onPermanentlyDeleteSector: (sectorId: string) => void;
  onPurgeExpiredTrash: () => void;
  onEmptyAllTrash?: () => void;
  onExecuteDeduplicationRule?: () => Promise<{ assetsRemoved: number; sectorsMerged: number; assetsRestored: number } | void> | void;
  onRestoreFalseDuplicates?: () => Promise<number | void> | void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const TrashView: React.FC<TrashViewProps> = ({
  trashAssets,
  trashSectors,
  activeAssets = [],
  currentProfile,
  onRestoreAsset,
  onPermanentlyDeleteAsset,
  onRestoreSector,
  onPermanentlyDeleteSector,
  onPurgeExpiredTrash,
  onEmptyAllTrash,
  onExecuteDeduplicationRule,
  onRestoreFalseDuplicates,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'assets' | 'sectors'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExecutingDedup, setIsExecutingDedup] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<TrashedAsset | null>(null);
  const [showConfirmEmptyAll, setShowConfirmEmptyAll] = useState(false);
  const [confirmPermanentDeleteModal, setConfirmPermanentDeleteModal] = useState<{
    type: 'asset' | 'sector';
    id: string;
    name: string;
    daysRemaining: number;
  } | null>(null);

  // Helper to calculate days in trash and remaining days
  const getTrashStatus = (deletedAt: string) => {
    const deletedTime = new Date(deletedAt).getTime();
    const now = Date.now();
    const elapsedMs = Math.max(0, now - deletedTime);
    const daysElapsed = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    const isExpired = elapsedMs >= SEVEN_DAYS_MS;
    const daysRemaining = isExpired ? 0 : Math.max(1, Math.ceil((SEVEN_DAYS_MS - elapsedMs) / (1000 * 60 * 60 * 24)));

    return {
      daysElapsed,
      daysRemaining,
      isExpired,
      formattedDate: new Date(deletedAt).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    };
  };

  // Filtered lists
  const filteredAssets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return trashAssets;
    return trashAssets.filter(item => {
      const a = item.asset;
      return (
        (a.tombamento && a.tombamento.toLowerCase().includes(q)) ||
        (a.tomboOrigemSesa && a.tomboOrigemSesa.toLowerCase().includes(q)) ||
        (a.descricao && a.descricao.toLowerCase().includes(q)) ||
        (a.setorNome && a.setorNome.toLowerCase().includes(q)) ||
        (a.unidadeNome && a.unidadeNome.toLowerCase().includes(q))
      );
    });
  }, [trashAssets, searchQuery]);

  const filteredSectors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return trashSectors;
    return trashSectors.filter(item => {
      const s = item.sector;
      return (
        (s.nome && s.nome.toLowerCase().includes(q)) ||
        (s.unidadeNome && s.unidadeNome.toLowerCase().includes(q)) ||
        (s.responsavelNome && s.responsavelNome.toLowerCase().includes(q))
      );
    });
  }, [trashSectors, searchQuery]);

  // Expired counts
  const expiredAssetsCount = useMemo(() => {
    return trashAssets.filter(item => getTrashStatus(item.deletedAt).isExpired).length;
  }, [trashAssets]);

  const expiredSectorsCount = useMemo(() => {
    return trashSectors.filter(item => getTrashStatus(item.deletedAt).isExpired).length;
  }, [trashSectors]);

  const totalExpiredCount = expiredAssetsCount + expiredSectorsCount;
  const totalTrashCount = trashAssets.length + trashSectors.length;

  const totalAssetsValue = useMemo(() => {
    return trashAssets.reduce((acc, curr) => acc + (curr.asset.valorAquisicao || 0), 0);
  }, [trashAssets]);

  // Identifica bens na lixeira que foram apagados por falsa duplicidade
  const falseDuplicatesList = useMemo(() => {
    if (!activeAssets || activeAssets.length === 0) return [];
    return findFalseDuplicateTrashedAssets(activeAssets, trashAssets);
  }, [activeAssets, trashAssets]);

  const falseDuplicateIds = useMemo(() => {
    return new Set(falseDuplicatesList.map(item => item.asset.id));
  }, [falseDuplicatesList]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleAttemptPermanentDelete = (type: 'asset' | 'sector', id: string, name: string, deletedAt: string) => {
    const status = getTrashStatus(deletedAt);
    setConfirmPermanentDeleteModal({
      type,
      id,
      name,
      daysRemaining: status.daysRemaining,
    });
  };

  const executePermanentDelete = () => {
    if (!confirmPermanentDeleteModal) return;
    if (confirmPermanentDeleteModal.type === 'asset') {
      onPermanentlyDeleteAsset(confirmPermanentDeleteModal.id);
    } else {
      onPermanentlyDeleteSector(confirmPermanentDeleteModal.id);
    }
    setConfirmPermanentDeleteModal(null);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Banner / Explanation of 1-Week Safety Rule */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Lixeira Patrimonial & Quarentena
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Itens apagados permanecem em quarentena de segurança. Você pode <strong className="text-emerald-400 font-bold">restaurar</strong> qualquer item para o patrimônio ativo ou clicar em <strong className="text-rose-400 font-bold">Apagar Definitivo</strong> para expurgá-lo permanentemente da base.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {totalTrashCount > 0 && onEmptyAllTrash && (
              <button
                type="button"
                onClick={() => setShowConfirmEmptyAll(true)}
                className="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
              >
                <Trash2 className="w-4 h-4" />
                <span>Esvaziar Toda a Lixeira ({totalTrashCount})</span>
              </button>
            )}

            {totalExpiredCount > 0 && (
              <button
                type="button"
                onClick={onPurgeExpiredTrash}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar Vencidos ({totalExpiredCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Banner de Proteção contra Falsa Duplicidade */}
      {falseDuplicatesList.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 dark:bg-amber-500/15 border-2 border-amber-500/30 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950 dark:text-amber-200">
                Regra de Proteção Ativa: {falseDuplicatesList.length} bem(ns) foram apagados por engano de duplicidade de sala!
              </h4>
              <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-1 leading-relaxed">
                Identificamos que esses bens foram excluídos com motivo de "duplicidade", porém eles eram o <strong>único exemplar</strong> cadastrado (a aparente duplicidade ocorreu porque a sala apareceu com nomes repetidos, como "004 - COPA" e "COPA").
              </p>
            </div>
          </div>
          {(onRestoreFalseDuplicates || onExecuteDeduplicationRule) && (
            <button
              type="button"
              disabled={isExecutingDedup}
              onClick={async () => {
                setIsExecutingDedup(true);
                try {
                  if (onRestoreFalseDuplicates) {
                    await onRestoreFalseDuplicates();
                  } else if (onExecuteDeduplicationRule) {
                    await onExecuteDeduplicationRule();
                  }
                } finally {
                  setIsExecutingDedup(false);
                }
              }}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isExecutingDedup ? 'Restaurando...' : `Restaurar Automaticamente (${falseDuplicatesList.length})`}</span>
            </button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total na Lixeira</span>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalTrashCount}
          </div>
          <span className="text-[11px] text-slate-400">
            {trashAssets.length} bens · {trashSectors.length} salas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Valor em Quarentena</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {formatBRL(totalAssetsValue)}
          </div>
          <span className="text-[11px] text-slate-400">
            {trashAssets.length} bens patrimoniais
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Salas Excluídas</span>
            <DoorClosed className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {trashSectors.length}
          </div>
          <span className="text-[11px] text-slate-400">
            Ambientes removidos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Aptos para Expurgo</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
            {totalExpiredCount}
          </div>
          <span className="text-[11px] text-slate-400">
            Itens com mais de 7 dias
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Todos ({totalTrashCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('assets')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'assets'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
            }`}
          >
            Bens ({trashAssets.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('sectors')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'sectors'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-amber-600'
            }`}
          >
            Salas ({trashSectors.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por tombo, sala, descrição..."
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Main List */}
      {totalTrashCount === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            A lixeira está vazia
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Nenhum bem ou sala foi excluído. Quando você apagar itens ou salas duplicadas, eles aparecerão aqui para quarentena de 7 dias ou restauração.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* SECTORS (SALAS) */}
          {(filterType === 'all' || filterType === 'sectors') && filteredSectors.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
                <DoorClosed className="w-4 h-4 text-amber-500" />
                <span>Salas e Ambientes Excluídos ({filteredSectors.length})</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredSectors.map((item) => {
                  const status = getTrashStatus(item.deletedAt);
                  const s = item.sector;

                  return (
                    <div
                      key={s.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {s.unidadeNome || 'Policlínica'}
                          </span>
                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                            {s.nome}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Responsável: <strong>{s.responsavelNome}</strong> ({s.responsavelCargo})
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="text-right shrink-0">
                          {status.isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[11px] font-bold border border-rose-300">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Apto para Exclusão</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-300">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{status.daysRemaining}d p/ expirar</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Excluída em: {status.formattedDate}</span>
                        {item.deletedBy && <span>Por: {item.deletedBy}</span>}
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onRestoreSector(s.id)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar Sala</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAttemptPermanentDelete('sector', s.id, s.nome, item.deletedAt)}
                          className="px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors bg-rose-600 hover:bg-rose-500 text-white shadow-xs active:scale-95"
                          title="Excluir definitivamente da base de dados"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Apagar Definitivo</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ASSETS (BENS) */}
          {(filterType === 'all' || filterType === 'assets') && filteredAssets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1 pt-2">
                <Package className="w-4 h-4 text-blue-500" />
                <span>Bens Patrimoniais Excluídos ({filteredAssets.length})</span>
              </h3>

              <div className="space-y-3">
                {filteredAssets.map((item) => {
                  const status = getTrashStatus(item.deletedAt);
                  const a = item.asset;

                  return (
                    <div
                      key={a.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Tombo and Details */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-xl bg-slate-900 text-emerald-400 font-mono font-black text-sm border border-slate-700">
                              {a.tombamento}
                            </span>
                            {a.tomboOrigemSesa && (
                              <span className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-mono font-bold text-xs border border-blue-300">
                                SESA: {a.tomboOrigemSesa}
                              </span>
                            )}
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {a.unidadeNome}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                              Sala: {a.setorNome}
                            </span>
                            {falseDuplicateIds.has(a.id) && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center gap-1 shadow-xs">
                                <AlertTriangle className="w-3 h-3 text-slate-950" />
                                <span>Único exemplar no acervo (Falsa Duplicidade)</span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                            {a.descricao}
                          </h4>

                          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                            <span>Valor: <strong className="text-slate-800 dark:text-slate-200">{formatBRL(a.valorAquisicao || 0)}</strong></span>
                            <span>Responsável: <strong>{a.responsavelNome || 'Geral'}</strong></span>
                            {a.numeroSerie && <span>Nº Série: <strong className="font-mono">{a.numeroSerie}</strong></span>}
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                            <span>Excluído em: <strong>{status.formattedDate}</strong></span>
                            {item.deletedBy && <span>Por: <strong>{item.deletedBy}</strong></span>}
                            {item.reason && <span>Motivo: <em className="text-slate-500">{item.reason}</em></span>}
                          </div>
                        </div>

                        {/* Right: Quarantine Status & Actions */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
                          {status.isExpired ? (
                            <div className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-300 flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-rose-600" />
                              <span>7 Dias Completos · Pronto para Descarte</span>
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span>Quarentena: faltam {status.daysRemaining} dia(s)</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onRestoreAsset(a.id)}
                              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Restaurar Bem</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAttemptPermanentDelete('asset', a.id, `${a.tombamento} - ${a.descricao}`, item.deletedAt)}
                              className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors bg-rose-600 hover:bg-rose-500 text-white shadow-xs active:scale-95"
                              title="Excluir definitivamente da base de dados"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Apagar Definitivo</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Single Permanent Delete */}
      {confirmPermanentDeleteModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black">
                  Confirmar Exclusão Definitiva
                </h4>
                <p className="text-xs text-slate-500">
                  {confirmPermanentDeleteModal.type === 'asset' ? 'Bem Patrimonial' : 'Sala / Setor'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-medium">
                🚨 <strong>Atenção: Ação Irreversível!</strong>
                <br />
                Ao confirmar, este item será permanentemente apagado da base de dados e não poderá mais ser recuperado.
              </div>
              <p>
                Deseja apagar definitivamente agora: <strong>"{confirmPermanentDeleteModal.name}"</strong>?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmPermanentDeleteModal(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={executePermanentDelete}
                className="px-4 py-2.5 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg active:scale-95"
              >
                Sim, Apagar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Empty All Trash */}
      {showConfirmEmptyAll && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border-2 border-rose-300 dark:border-rose-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="p-3 rounded-2xl bg-rose-600 text-white">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-rose-600 dark:text-rose-400">
                  Esvaziar Toda a Lixeira
                </h4>
                <p className="text-xs text-slate-500">
                  Limpeza total de {totalTrashCount} item(ns) em quarentena
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-medium">
                ⚠️ <strong>Atenção: Ação Irreversível!</strong>
                <br />
                Todos os <strong>{totalTrashCount} itens</strong> atualmente na lixeira serão permanentemente eliminados da base de dados e da memória.
              </div>
              <p>
                Tem certeza que deseja apagar definitivamente todos os registros da lixeira agora?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmEmptyAll(false)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  onEmptyAllTrash?.();
                  setShowConfirmEmptyAll(false);
                }}
                className="px-4 py-2.5 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg active:scale-95"
              >
                Sim, Esvaziar Tudo Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
