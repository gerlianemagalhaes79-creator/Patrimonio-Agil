import React, { useState, useMemo } from 'react';
import { Asset, Sector, UserProfile } from '../types';
import { 
  X, 
  Users, 
  UserCheck, 
  Check, 
  Sparkles, 
  Save, 
  Building2, 
  Search, 
  Tag, 
  ShieldCheck,
  CheckCircle2,
  User,
  ArrowRight
} from 'lucide-react';

interface RoomResponsiblesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sector: Sector | { id: string; nome: string; responsavel?: string; responsavelNome?: string; responsavelCargo?: string; responsavelOriginalAspec?: string } | null;
  unit: { id: string; nome: string; sigla: string };
  assets: Asset[];
  currentProfile: UserProfile;
  onSaveResponsibles: (updates: { assetId: string; responsavelNome: string; responsavelCargo?: string }[]) => void;
  onUpdateSectorLeader?: (newLeaderName: string, newLeaderCargo?: string) => void;
}

export const RoomResponsiblesModal: React.FC<RoomResponsiblesModalProps> = ({
  isOpen,
  onClose,
  sector,
  unit,
  assets,
  currentProfile,
  onSaveResponsibles,
  onUpdateSectorLeader,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [batchNameInput, setBatchNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const sectorName = sector?.nome || 'Sala';
  const originalLeaderName = (sector && 'responsavelOriginalAspec' in sector && sector.responsavelOriginalAspec)
    ? sector.responsavelOriginalAspec
    : ((sector && 'responsavelNome' in sector) 
        ? sector.responsavelNome 
        : ((sector && 'responsavel' in sector) ? (sector as any).responsavel : '')) || 'Líder do Setor';

  const sectorLeaderName = (sector && 'responsavelNome' in sector) 
    ? sector.responsavelNome 
    : ((sector && 'responsavel' in sector) ? (sector as any).responsavel : '') || originalLeaderName;

  const [roomLeaderInput, setRoomLeaderInput] = useState(sectorLeaderName);
  const [roomLeaderCargoInput, setRoomLeaderCargoInput] = useState((sector && 'responsavelCargo' in sector ? sector.responsavelCargo : '') || 'Responsável Setorial');

  const isLeaderChanged = Boolean(
    roomLeaderInput.trim() && 
    originalLeaderName && 
    roomLeaderInput.trim().toLowerCase() !== originalLeaderName.trim().toLowerCase()
  );

  // State local com mapeamento assetId -> responsavelNome
  const [responsiblesMap, setResponsiblesMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    assets.forEach(a => {
      map[a.id] = a.responsavelNome || sectorLeaderName || 'Não atribuído';
    });
    return map;
  });

  // Re-inicializa se a lista de assets mudar
  React.useEffect(() => {
    const map: Record<string, string> = {};
    assets.forEach(a => {
      map[a.id] = a.responsavelNome || sectorLeaderName || 'Não atribuído';
    });
    setResponsiblesMap(map);
  }, [assets, sectorLeaderName]);

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const q = searchQuery.toLowerCase();
    return assets.filter(a => 
      a.tombamento.toLowerCase().includes(q) ||
      a.descricao.toLowerCase().includes(q) ||
      (a.responsavelNome || '').toLowerCase().includes(q) ||
      (responsiblesMap[a.id] || '').toLowerCase().includes(q)
    );
  }, [assets, searchQuery, responsiblesMap]);

  if (!isOpen) return null;

  const handleSetIndividual = (assetId: string, name: string) => {
    setResponsiblesMap(prev => ({
      ...prev,
      [assetId]: name
    }));
  };

  const handleApplyBatchToAll = () => {
    if (!batchNameInput.trim()) return;
    const cleanName = batchNameInput.trim();
    const newMap: Record<string, string> = { ...responsiblesMap };
    assets.forEach(a => {
      newMap[a.id] = cleanName;
    });
    setResponsiblesMap(newMap);
    setSavedFeedback(`Nome "${cleanName}" aplicado a todos os ${assets.length} bens da sala!`);
    setTimeout(() => setSavedFeedback(null), 4000);
  };

  const handleApplyLeaderToAll = () => {
    if (!roomLeaderInput.trim()) return;
    const cleanName = roomLeaderInput.trim();
    const newMap: Record<string, string> = { ...responsiblesMap };
    assets.forEach(a => {
      newMap[a.id] = cleanName;
    });
    setResponsiblesMap(newMap);
    setSavedFeedback(`Líder "${cleanName}" aplicado a todos os bens da sala!`);
    setTimeout(() => setSavedFeedback(null), 4000);
  };

  const handleApplyBatchOnlyEmpty = () => {
    if (!batchNameInput.trim()) return;
    const cleanName = batchNameInput.trim();
    const newMap: Record<string, string> = { ...responsiblesMap };
    let count = 0;
    assets.forEach(a => {
      if (!newMap[a.id] || newMap[a.id] === 'Não atribuído' || newMap[a.id] === 'Responsável Setorial') {
        newMap[a.id] = cleanName;
        count++;
      }
    });
    setResponsiblesMap(newMap);
    setSavedFeedback(`Aplicado a ${count} bens que estavam sem responsável definido.`);
    setTimeout(() => setSavedFeedback(null), 4000);
  };

  const handleSaveAll = () => {
    setIsSaving(true);

    // 1. Salva líder da sala se alterado ou fornecido
    if (onUpdateSectorLeader && roomLeaderInput.trim()) {
      onUpdateSectorLeader(roomLeaderInput.trim(), roomLeaderCargoInput.trim());
    }

    // 2. Salva responsáveis individuais por equipamento
    const effectiveDefaultLeader = roomLeaderInput.trim() || sectorLeaderName;
    const updates = assets.map(a => ({
      assetId: a.id,
      responsavelNome: (responsiblesMap[a.id] || a.responsavelNome || effectiveDefaultLeader).trim(),
    }));

    onSaveResponsibles(updates);
    setIsSaving(false);
    setSavedFeedback('✓ Responsáveis e Líder atualizados com sucesso no sistema!');
    setTimeout(() => {
      setSavedFeedback(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-mono tracking-wider">
                  Controle de Carga Individual
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {unit.sigla} · Exercício 2026
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-white mt-1">
                Atribuição de Responsáveis por Bem — {sectorName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina o servidor individual que detém a posse de cada equipamento (computador, mesa, armário compartilhado ou diretor).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {savedFeedback && (
          <div className="px-5 py-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-b border-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedFeedback}</span>
          </div>
        )}

        {/* Card: LÍDER GERAL DA SALA / SETOR */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-850 dark:to-emerald-950/30 border-b border-teal-200 dark:border-teal-800/60 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-600 text-white shrink-0 shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Líder / Responsável Geral da Sala</span>
                  {isLeaderChanged ? (
                    <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-mono shadow-xs animate-pulse">
                      ⚠️ Alteração no ASPEC Obrigatória
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                      Carga Atual no ASPEC
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Líder original no ASPEC: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{originalLeaderName}</strong>
                </p>
              </div>
            </div>

            {isLeaderChanged && (
              <button
                type="button"
                onClick={() => {
                  setRoomLeaderInput(originalLeaderName);
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
              >
                Restaurar Líder do ASPEC
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nome do Líder Atual (Vistoria Física in loco):
              </label>
              <input
                type="text"
                value={roomLeaderInput}
                onChange={(e) => setRoomLeaderInput(e.target.value)}
                placeholder="Ex: Dr. Ricardo, Diretor do CEO, Novo Líder..."
                className={`w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border font-bold ${
                  isLeaderChanged 
                    ? 'border-amber-400 dark:border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/20' 
                    : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Cargo / Função do Líder:
              </label>
              <input
                type="text"
                value={roomLeaderCargoInput}
                onChange={(e) => setRoomLeaderCargoInput(e.target.value)}
                placeholder="Ex: Coordenador Clínico, Chefe de Setor, Diretor Geral..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {isLeaderChanged ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <span className="text-base shrink-0">⚠️</span>
              <div className="space-y-1">
                <p className="font-bold">
                  ATENÇÃO: Mudança de Liderança Registrada!
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  Ao salvar, o <strong>Termo Oficial emitido ao Concluir a Sala</strong> apontará expressamente que o Setor Contábil do Consórcio <strong>TEM QUE ALTERAR O LÍDER DESTA SALA NO SISTEMA ASPEC</strong> de "<u>{originalLeaderName}</u>" para "<u>{roomLeaderInput}</u>".
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span>Para alterar o líder desta sala, basta digitar o novo nome no campo acima.</span>
              <button
                type="button"
                onClick={handleApplyLeaderToAll}
                className="font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
              >
                Atribuir Líder a todos os {assets.length} bens
              </button>
            </div>
          )}
        </div>

        {/* Batch Assignment & Quick Helper Toolbar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Preenchimento Rápido em Lote (Atribuir a múltiplos bens de uma vez):
              </label>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  value={batchNameInput}
                  onChange={(e) => setBatchNameInput(e.target.value)}
                  placeholder="Ex: Diretor Geral, Dr. Ricardo, Servidor Usuário..."
                  className="w-full sm:max-w-md px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                />
                <button
                  type="button"
                  onClick={handleApplyBatchToAll}
                  className="px-3.5 py-2 text-xs font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                  title="Aplica este nome a todos os bens da sala"
                >
                  Aplicar a Todos ({assets.length})
                </button>
                <button
                  type="button"
                  onClick={handleApplyBatchOnlyEmpty}
                  className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer whitespace-nowrap text-slate-700 dark:text-slate-300"
                  title="Aplica apenas aos bens sem responsável definido"
                >
                  Apenas aos Pendentes
                </button>
              </div>
            </div>

            {/* Quick Suggestions Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 block w-full lg:w-auto">Sugestões rápidas:</span>
              {sectorLeaderName && sectorLeaderName !== 'Líder do Setor' && (
                <button
                  type="button"
                  onClick={() => setBatchNameInput(sectorLeaderName)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer hover:bg-emerald-100"
                >
                  👤 Líder ({sectorLeaderName.split(' ')[0]})
                </button>
              )}
              <button
                type="button"
                onClick={() => setBatchNameInput('Diretor Geral')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100"
              >
                🏛️ Diretor Geral (Jardim / Áreas Coletivas)
              </button>
              <button
                type="button"
                onClick={() => setBatchNameInput(currentProfile.nome)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100"
              >
                🧑‍💼 {currentProfile.nome.split(' ')[0]} (Eu)
              </button>
              <button
                type="button"
                onClick={() => setBatchNameInput(`Uso Coletivo / ${sectorLeaderName || 'Liderança'}`)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100"
              >
                👥 Armário / Uso Coletivo
              </button>
            </div>
          </div>

          {/* Search Filter in Room Assets */}
          <div className="relative pt-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 mt-0.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por plaqueta, nome do bem (ex: computador, mesa, armário)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            />
          </div>
        </div>

        {/* Table of Assets with Editable Responsibles */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
              Nenhum bem encontrado com o filtro informado.
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const currentVal = responsiblesMap[asset.id] || asset.responsavelNome || '';
              const isComputerOrTech = asset.categoria === 'TI & Informática' || asset.descricao.toLowerCase().includes('computador') || asset.descricao.toLowerCase().includes('monitor') || asset.descricao.toLowerCase().includes('notebook');
              const isDeskOrTable = asset.descricao.toLowerCase().includes('mesa') || asset.descricao.toLowerCase().includes('cadeira');
              const isCabinet = asset.descricao.toLowerCase().includes('armario') || asset.descricao.toLowerCase().includes('gaveteiro') || asset.descricao.toLowerCase().includes('arquivo');

              return (
                <div
                  key={asset.id}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-white dark:bg-slate-850 transition-colors shadow-2xs space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-slate-900 text-emerald-400 border border-slate-700">
                        {asset.tombamento}
                      </span>
                      {asset.tomboOrigemSesa && (
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">
                          SESA: {asset.tomboOrigemSesa}
                        </span>
                      )}
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {asset.descricao}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {asset.categoria}
                      </span>
                      {isComputerOrTech && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          💻 Individual (Servidor)
                        </span>
                      )}
                      {isCabinet && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          🗄️ Coletivo (Líder)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Input Row with Direct Suggestions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex-1 flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Responsável:</span>
                      </label>
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => handleSetIndividual(asset.id, e.target.value)}
                        placeholder="Nome do servidor responsável pelo bem..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    {/* Quick Picker Buttons per item */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSetIndividual(asset.id, sectorLeaderName)}
                        className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 cursor-pointer"
                        title="Atribuir ao Líder do Setor"
                      >
                        Líder
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetIndividual(asset.id, 'Diretor Geral')}
                        className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 cursor-pointer"
                        title="Atribuir ao Diretor Geral"
                      >
                        Diretor
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetIndividual(asset.id, currentProfile.nome)}
                        className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 cursor-pointer"
                        title="Atribuir a Mim"
                      >
                        Eu
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Save Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Total de <strong>{assets.length}</strong> bens nesta sala prontos para homologação de guarda.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-2.5 text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ring-2 ring-emerald-500/40"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar Responsáveis dos Bens</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
