import React, { useState, useEffect } from 'react';
import { Asset, Sector, UnitInfo, UserProfile, TransferRequest } from '../types';
import { ArrowLeftRight, Building2, MapPin, Scale, X } from 'lucide-react';

interface NewTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transferData: Omit<TransferRequest, 'id' | 'protocolo' | 'status' | 'dataSolicitacao' | 'gestoraNome'>) => void;
  assets: Asset[];
  sectors: Sector[];
  units: UnitInfo[];
  currentProfile: UserProfile;
  preselectedAsset?: Asset | null;
}

export const NewTransferModal: React.FC<NewTransferModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assets,
  sectors,
  units,
  currentProfile,
  preselectedAsset,
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const [destinationUnitId, setDestinationUnitId] = useState<string>('policlinica');
  const [destinationSectorId, setDestinationSectorId] = useState<string>('');
  const [destinationSubsetorName, setDestinationSubsetorName] = useState<string>('');
  const [responsibleName, setResponsibleName] = useState<string>('');
  const [responsibleMatricula, setResponsibleMatricula] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');

  useEffect(() => {
    if (preselectedAsset) {
      setSelectedAssetId(preselectedAsset.id);
    } else if (assets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(assets[0].id);
    }
  }, [preselectedAsset, assets]);

  // Destination sectors for the chosen unit
  const destSectorsList = sectors.filter(s => s.unidadeId === destinationUnitId);

  useEffect(() => {
    if (destSectorsList.length > 0 && (!destinationSectorId || !destSectorsList.some(s => s.id === destinationSectorId))) {
      const firstSec = destSectorsList[0];
      setDestinationSectorId(firstSec.id);
      setResponsibleName(firstSec.responsavelNome);
      setResponsibleMatricula(firstSec.responsavelMatricula);
      setDestinationSubsetorName(firstSec.subsetores[0]?.nome || '');
    }
  }, [destinationUnitId, destSectorsList]);

  const handleSectorChange = (secId: string) => {
    setDestinationSectorId(secId);
    const sec = sectors.find(s => s.id === secId);
    if (sec) {
      setResponsibleName(sec.responsavelNome);
      setResponsibleMatricula(sec.responsavelMatricula);
      setDestinationSubsetorName(sec.subsetores[0]?.nome || '');
    }
  };

  if (!isOpen) return null;

  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  const destSector = sectors.find(s => s.id === destinationSectorId) || destSectorsList[0];
  const destUnit = units.find(u => u.id === destinationUnitId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) {
      alert('Nenhum bem patrimonial selecionado.');
      return;
    }
    if (!destSector || !destUnit) {
      alert('Selecione o setor e unidade de destino.');
      return;
    }
    if (!transferReason.trim()) {
      alert('Informe a justificativa do remanejamento.');
      return;
    }

    onSubmit({
      assetId: selectedAsset.id,
      assetTombamento: selectedAsset.tombamento,
      assetDescricao: selectedAsset.descricao,
      assetOrigemTombo: selectedAsset.origemTombo,
      unidadeOrigem: selectedAsset.unidadeNome,
      setorOrigem: selectedAsset.setorNome,
      subsetorOrigem: selectedAsset.subsetorNome || 'Setor Geral',
      unidadeDestino: destUnit.nome,
      setorDestino: destSector.nome,
      subsetorDestino: destinationSubsetorName || destSector.subsetores[0]?.nome || 'Setor Geral',
      solicitanteNome: currentProfile.nome,
      solicitanteCargo: currentProfile.cargo,
      solicitanteUnidade: currentProfile.unidadeNome || selectedAsset.unidadeNome,
      responsavelDestino: responsibleName || destSector.responsavelNome,
      matriculaResponsavelDestino: responsibleMatricula || destSector.responsavelMatricula,
      motivo: transferReason.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-500 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Solicitar Movimentação de Bem · CPSMS
              </h3>
              <p className="text-[11px] text-slate-500">
                Encaminhamento para homologação da Gestora de Patrimônio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 text-slate-400 hover:text-slate-600 flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* 1. Asset */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Bem Patrimonial a ser Remanejado:
            </label>
            {assets.length === 0 ? (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 text-xs">
                Nenhum bem cadastrado no inventário ainda. Carregue a planilha primeiro.
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={assetSearchQuery}
                  onChange={(e) => setAssetSearchQuery(e.target.value)}
                  placeholder="Digitar tombo ou descrição para filtrar..."
                  className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                />

                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  {assets
                    .filter(a => {
                      if (!assetSearchQuery.trim()) return true;
                      const q = assetSearchQuery.toLowerCase();
                      return a.tombamento.toLowerCase().includes(q) || a.descricao.toLowerCase().includes(q);
                    })
                    .slice(0, 150)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        [{a.origemTombo.split(' ')[0]}] {a.tombamento} — {a.descricao.slice(0, 45)} ({a.unidadeNome.includes('CEO') ? 'CEO' : 'POLICLÍNICA'})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {selectedAsset && (
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                  Tombo: {selectedAsset.tombamento}
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  {selectedAsset.origemTombo.split(' ')[0]}
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {selectedAsset.descricao}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                Local Atual: <strong>{selectedAsset.unidadeNome}</strong> ({selectedAsset.setorNome} – {selectedAsset.subsetorNome})<br />
                Responsável Atual: {selectedAsset.responsavelNome}
              </div>
              {(selectedAsset.origemTombo.includes('SESA') || selectedAsset.origemTombo.includes('UFC')) && (
                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold pt-1 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" />
                  Bem Cedido ({selectedAsset.origemTombo})
                </div>
              )}
            </div>
          )}

          {/* 2. Destination Unit */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Unidade de Destino:
            </label>
            <select
              value={destinationUnitId}
              onChange={(e) => setDestinationUnitId(e.target.value)}
              className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
            >
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {/* 3. Destination Sector & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Setor de Destino:
              </label>
              <select
                value={destinationSectorId}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {destSectorsList.map((s, idx) => (
                  <option key={`transf-sec-${s.id}-${idx}`} value={s.id}>{s.nome} ({s.sigla})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Sala / Subsetor:
              </label>
              <select
                value={destinationSubsetorName}
                onChange={(e) => setDestinationSubsetorName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {destSector?.subsetores.map(sub => (
                  <option key={sub.id} value={sub.nome}>{sub.nome}</option>
                )) || <option value="Geral">Setor Geral</option>}
              </select>
            </div>
          </div>

          {/* 4. Responsible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Servidor Responsável no Destino:
              </label>
              <input
                type="text"
                required
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Matrícula Funcional:
              </label>
              <input
                type="text"
                required
                value={responsibleMatricula}
                onChange={(e) => setResponsibleMatricula(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* 5. Reason */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Justificativa Técnica do Remanejamento:
            </label>
            <textarea
              rows={3}
              required
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Descreva a necessidade assistencial ou administrativa para transferir este ativo..."
              className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={assets.length === 0}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg shadow-sm transition-colors min-h-[44px]"
            >
              Enviar Solicitação para a Gestora
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
