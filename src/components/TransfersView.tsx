import React, { useState } from 'react';
import { TransferRequest, Asset, Sector, UnitInfo, UserProfile } from '../types';
import { formatDate, formatDateTime } from '../utils/formatters';
import { 
  ArrowLeftRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  PlusCircle, 
  Building2, 
  UserCheck, 
  FileText,
  AlertTriangle,
  Check,
  X,
  MapPin,
  Scale
} from 'lucide-react';

interface TransfersViewProps {
  transfers: TransferRequest[];
  assets: Asset[];
  sectors: Sector[];
  units: UnitInfo[];
  currentProfile: UserProfile;
  onApproveTransfer: (
    transferId: string, 
    parecer: string, 
    generateTerm: boolean
  ) => void;
  onRejectTransfer: (
    transferId: string, 
    motivoRejeicao: string
  ) => void;
  onOpenNewTransferModal: () => void;
  onViewGeneratedTerm?: (termId: string) => void;
}

export const TransfersView: React.FC<TransfersViewProps> = ({
  transfers,
  assets,
  sectors,
  units,
  currentProfile,
  onApproveTransfer,
  onRejectTransfer,
  onOpenNewTransferModal,
  onViewGeneratedTerm,
}) => {
  const [activeTab, setActiveTab] = useState<'pendente' | 'aprovada' | 'rejeitada' | 'todas'>('pendente');
  const [selectedTransferForApproval, setSelectedTransferForApproval] = useState<TransferRequest | null>(null);
  const [selectedTransferForRejection, setSelectedTransferForRejection] = useState<TransferRequest | null>(null);
  const [approvalParecer, setApprovalParecer] = useState('Transferência homologada pela Gerência de Patrimônio do CPSMS após constatação de conveniência técnica e atendimento ao fluxo regular de saúde.');
  const [generateTermChecked, setGenerateTermChecked] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');

  const isGestora = currentProfile.role === 'gestora';
  const isLeader = currentProfile.role === 'lider';

  const filteredTransfers = transfers.filter((t) => {
    if (activeTab !== 'todas' && t.status !== activeTab) {
      return false;
    }
    return true;
  });

  const pendingCount = transfers.filter((t) => t.status === 'pendente').length;
  const approvedCount = transfers.filter((t) => t.status === 'aprovada').length;
  const rejectedCount = transfers.filter((t) => t.status === 'rejeitada').length;

  return (
    <div className="space-y-5 pb-24">
      {/* Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs ${
        isGestora 
          ? 'bg-slate-900 text-white border-slate-800' 
          : 'bg-blue-900 text-white border-blue-800'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isGestora ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-400/20 text-blue-200'
              }`}>
                {isGestora ? 'Módulo de Deliberação e Homologação · CPSMS' : 'Módulo de Solicitação Setorial'}
              </span>
              <span className="text-xs text-slate-300">Fluxo Rigoroso TCE-CE</span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
              Movimentações & Remanejamentos Patrimoniais
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {isGestora ? (
                <>Como Gestora do Patrimônio do CPSMS, você delibera sobre solicitações da <strong>Policlínica Bernardo Félix</strong> e do <strong>CEO de Sobral</strong>. <strong className="text-emerald-300">Somente após a sua aprovação formal</strong> a carga é transferida no sistema e o Termo de Cautela é emitido.</>
              ) : (
                <>Como Líder Setorial, solicite a transferência de equipamentos ou mobiliários indicando a sala de destino. A carga patrimonial permanece sob sua guarda até que <strong>Maria Gerliane Rocha Magalhães</strong> homologue o pedido.</>
              )}
            </p>
          </div>

          <button
            onClick={onOpenNewTransferModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4" />
            Nova Solicitação
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pendente')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer min-h-[40px] ${
            activeTab === 'pendente'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Aguardando Aprovação</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold tabular-nums">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('aprovada')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer min-h-[40px] ${
            activeTab === 'aprovada'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Homologadas / Efetivadas</span>
          <span className="text-[11px] text-slate-400 tabular-nums">({approvedCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('rejeitada')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer min-h-[40px] ${
            activeTab === 'rejeitada'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>Rejeitadas</span>
          <span className="text-[11px] text-slate-400 tabular-nums">({rejectedCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('todas')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer min-h-[40px] ${
            activeTab === 'todas'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <span>Todas ({transfers.length})</span>
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredTransfers.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-10 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Nenhuma movimentação com o status selecionado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assim que os líderes setoriais demandarem remanejamento de bens, os pedidos aparecerão aqui para o seu despacho.
            </p>
          </div>
        )}

        {filteredTransfers.map((req) => {
          const isPending = req.status === 'pendente';
          const isApproved = req.status === 'aprovada';
          const isRejected = req.status === 'rejeitada';
          const isSesaOrUfc = req.assetOrigemTombo?.includes('SESA') || req.assetOrigemTombo?.includes('UFC');

          return (
            <div
              key={req.id}
              className={`bg-white dark:bg-slate-900 rounded-xl border transition-all overflow-hidden ${
                isPending
                  ? 'border-amber-300 dark:border-amber-800/80 shadow-xs'
                  : isApproved
                  ? 'border-emerald-200 dark:border-emerald-900/60 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 bg-slate-50 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {req.protocolo}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">
                    Solicitado em {formatDateTime(req.dataSolicitacao)}
                  </span>
                </div>

                <div>
                  {isPending && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900/60">
                      <Clock className="w-3.5 h-3.5" />
                      Pendente de Deliberação da Gestora
                    </span>
                  )}
                  {isApproved && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Homologada pela Gestora
                    </span>
                  )}
                  {isRejected && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900/60">
                      <XCircle className="w-3.5 h-3.5" />
                      Indeferida
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Asset details */}
                <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono">
                      Tombamento: {req.assetTombamento}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                      {req.assetOrigemTombo}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {req.assetDescricao}
                  </h4>
                </div>

                {/* SESA / UFC Legal Warning banner */}
                {isSesaOrUfc && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <Scale className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Aviso de Conformidade TCE-CE / Convênio:</strong> Este ativo possui tombamento originário de cessão (<strong>{req.assetOrigemTombo}</strong>). A transferência deve preservar a destinação assistencial do termo de cessão.
                    </div>
                  </div>
                )}

                {/* Origin vs Destination Trajectory */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Origem Atual
                    </span>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {req.unidadeOrigem}
                    </div>
                    <div className="text-slate-700 dark:text-slate-300">
                      {req.setorOrigem} – {req.subsetorOrigem}
                    </div>
                    <div className="text-[11px] text-slate-500 pt-0.5">
                      Solicitante: {req.solicitanteNome} ({req.solicitanteCargo})
                    </div>
                  </div>

                  <div className="space-y-1 sm:border-l sm:border-slate-200 sm:dark:border-slate-800 sm:pl-3">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      Destino Solicitado
                    </span>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {req.unidadeDestino}
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 font-medium">
                      {req.setorDestino} – {req.subsetorDestino}
                    </div>
                    <div className="text-[11px] text-slate-500 pt-0.5">
                      Novo Responsável: <strong>{req.responsavelDestino}</strong> ({req.matriculaResponsavelDestino})
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Justificativa e Necessidade do Serviço Público:</span>
                  <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
                    "{req.motivo}"
                  </p>
                </div>

                {/* Gestora Parecer if decided */}
                {req.dataDecisao && (
                  <div className="text-xs space-y-1 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                    <div className="flex items-center justify-between font-semibold text-emerald-900 dark:text-emerald-300">
                      <span>Despacho da Gestora ({req.gestoraNome}):</span>
                      <span className="text-[11px] text-slate-500 font-normal">{formatDateTime(req.dataDecisao)}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">
                      {req.gestoraParecer}
                    </p>
                    {req.termoGeradoId && onViewGeneratedTerm && (
                      <div className="pt-2">
                        <button
                          onClick={() => onViewGeneratedTerm(req.termoGeradoId!)}
                          className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Visualizar Termo de Transferência e Cautela ({req.termoGeradoId})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Footer */}
                {isPending && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    {isGestora ? (
                      <>
                        <div className="text-xs text-slate-500">
                          Deliberação privativa da Gestora de Patrimônio do CPSMS
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedTransferForRejection(req);
                              setRejectionReason('');
                            }}
                            className="px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            Indeferir
                          </button>

                          <button
                            onClick={() => {
                              setSelectedTransferForApproval(req);
                              setApprovalParecer('Transferência homologada pela Gerência de Patrimônio do CPSMS após constatação de conveniência técnica e atendimento ao fluxo regular de saúde.');
                            }}
                            className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            Homologar e Efetivar
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40 flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>Aguardando análise e parecer da Gestora Maria Gerliane Rocha Magalhães para emissão do Termo de Cautela e atualização no inventário do CPSMS.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Approval Confirmation Modal */}
      {selectedTransferForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Homologar Transferência Patrimonial · CPSMS
                </h3>
              </div>
              <button
                onClick={() => setSelectedTransferForApproval(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono">
                  Tombamento {selectedTransferForApproval.assetTombamento} ({selectedTransferForApproval.assetOrigemTombo})
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedTransferForApproval.assetDescricao}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                  De: <strong>{selectedTransferForApproval.unidadeOrigem} ({selectedTransferForApproval.setorOrigem})</strong><br />
                  Para: <strong>{selectedTransferForApproval.unidadeDestino} ({selectedTransferForApproval.setorDestino} – {selectedTransferForApproval.subsetorDestino})</strong>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Despacho / Parecer Técnico da Gestora:
                </label>
                <textarea
                  rows={3}
                  value={approvalParecer}
                  onChange={(e) => setApprovalParecer(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateTermChecked}
                  onChange={(e) => setGenerateTermChecked(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Gerar automaticamente o <strong>Termo de Transferência e Cautela do CPSMS</strong> para assinatura das partes
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedTransferForApproval(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onApproveTransfer(
                    selectedTransferForApproval.id, 
                    approvalParecer, 
                    generateTermChecked
                  );
                  setSelectedTransferForApproval(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-colors min-h-[44px]"
              >
                Confirmar Homologação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {selectedTransferForRejection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <XCircle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Indeferir Movimentação
                </h3>
              </div>
              <button
                onClick={() => setSelectedTransferForRejection(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Informe o motivo oficial para o indeferimento da transferência do ativo <strong>{selectedTransferForRejection.assetTombamento}</strong>.
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Motivo da Rejeição:
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  placeholder="Ex: Equipamento vinculado a convênio de exclusividade da Policlínica..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedTransferForRejection(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg min-h-[44px]"
              >
                Voltar
              </button>
              <button
                disabled={!rejectionReason.trim()}
                onClick={() => {
                  onRejectTransfer(selectedTransferForRejection.id, rejectionReason);
                  setSelectedTransferForRejection(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors min-h-[44px]"
              >
                Confirmar Indeferimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
