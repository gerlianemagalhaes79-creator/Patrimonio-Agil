import React, { useState, useMemo } from 'react';
import { Asset, Sector, UnitInfo, UserProfile } from '../types';
import { formatBRL, formatDate } from '../utils/formatters';
import { executePrintHtml, downloadPrintableHtml, openPrintableInNewWindow } from '../utils/printHelper';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ArrowRightLeft, 
  ShieldCheck, 
  Trash2, 
  Save, 
  Layers, 
  MapPin, 
  Building2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface RoomComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  sector: Sector | { id: string; nome: string; responsavel?: string; responsavelNome?: string; responsavelCargo?: string; sigla?: string } | null;
  unit: { id: string; nome: string; sigla: string; icon?: string; [key: string]: any };
  assets: Asset[];
  currentProfile: UserProfile;
  onConsolidateOfficial: (sectorName: string, protocolo: string, parecer: string) => void;
  onSaveDraftOnly?: (sectorName: string) => void;
  onDiscardDraft?: (sectorName: string) => void;
  hasDraftActive?: boolean;
}

export const RoomComparisonModal: React.FC<RoomComparisonModalProps> = ({
  isOpen,
  onClose,
  sector,
  unit,
  assets,
  currentProfile,
  onConsolidateOfficial,
  onSaveDraftOnly,
  onDiscardDraft,
  hasDraftActive = true,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [protocoloInput, setProtocoloInput] = useState<string>(() => `ASPEC-CONF-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`);
  const [parecerInput, setParecerInput] = useState<string>('Confirmo que a baixa contábil e as transferências de carga desta sala foram lançadas com êxito no sistema ASPEC.');
  const [filterType, setFilterType] = useState<'todos' | 'divergencias'>('todos');

  if (!isOpen || !sector) return null;

  const sectorName = sector.nome;
  const sectorNameNormalized = sectorName.trim().toLowerCase();
  const sectorResp = ('responsavelNome' in sector && sector.responsavelNome) || ('responsavel' in sector && (sector as any).responsavel) || 'Responsável Setorial';
  const sectorCargo = ('responsavelCargo' in sector && (sector as any).responsavelCargo) || 'Responsável pelo Setor';
  const sectorSigla = ('sigla' in sector && (sector as any).sigla) || sector.nome.slice(0, 3).toUpperCase();

  // 1. VERSÃO OFICIAL: "Sala de acordo com o ASPEC"
  // Todos os bens originalmente cadastrados no ASPEC para esta sala (sem os achados fora do ASPEC)
  const aspecOfficialAssets = useMemo(() => {
    return assets.filter(a => {
      if (a.foraDoAspec) return false;
      const originalSetor = (a.setorOriginalAspec || a.setorNome || '').trim().toLowerCase();
      return originalSetor === sectorNameNormalized;
    });
  }, [assets, sectorNameNormalized]);

  // 2. VERSÃO ATUALIZADA: "Sala atualizada fisicamente" (Rascunho de Conferência)
  // Todos os bens localizados fisicamente nesta sala durante a conferência (presentes, remanejados e novos achados)
  const physicalDraftAssets = useMemo(() => {
    return assets.filter(a => {
      const setorEncontrado = (a.auditoria?.setorEncontrado || a.setorNome || '').trim().toLowerCase();
      const isMissing = a.auditoria?.statusDivergencia === 'nao_encontrado';
      // Presente fisicamente nesta sala e não marcado como ausente
      return setorEncontrado === sectorNameNormalized && !isMissing;
    });
  }, [assets, sectorNameNormalized]);

  // Itens ausentes (estavam no ASPEC mas não foram achados fisicamente)
  const missingFromRoom = useMemo(() => {
    return aspecOfficialAssets.filter(a => a.auditoria?.statusDivergencia === 'nao_encontrado');
  }, [aspecOfficialAssets]);

  // Itens remanejados (vindos de outro setor para esta sala)
  const incomingTransfers = useMemo(() => {
    return physicalDraftAssets.filter(a => {
      const original = (a.setorOriginalAspec || a.setorNome || '').trim().toLowerCase();
      return original !== sectorNameNormalized && !a.foraDoAspec;
    });
  }, [physicalDraftAssets, sectorNameNormalized]);

  // Itens novos fora do ASPEC
  const untrackedInRoom = useMemo(() => {
    return physicalDraftAssets.filter(a => a.foraDoAspec);
  }, [physicalDraftAssets]);

  // Totais
  const totalAspecVal = aspecOfficialAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0);
  const totalPhysicalVal = physicalDraftAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0);

  // Confirmação final da Gestora
  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConsolidateOfficial(sectorName, protocoloInput.trim(), parecerInput.trim());
    setShowConfirmModal(false);
    onClose();
  };

  // Gerar impressão comparativa lado a lado
  const generateComparisonPrintableHtml = (): string => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comparativo ASPEC vs. Físico - ${sectorName} - CPSMS</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 16px; color: #0f172a; background: #fff; line-height: 1.3; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .gov { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #334155; }
    .title { font-size: 15px; font-weight: 900; text-transform: uppercase; margin: 3px 0; }
    .sub { font-size: 11px; color: #475569; }
    .info-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 11px; margin-bottom: 12px; }
    .side-by-side { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .column-box { border: 2px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
    .column-header { padding: 8px 12px; font-weight: 900; font-size: 11px; text-transform: uppercase; display: flex; justify-content: space-between; }
    .col-aspec { background: #f1f5f9; color: #1e293b; border-bottom: 2px solid #94a3b8; }
    .col-fisico { background: #ecfdf5; color: #065f46; border-bottom: 2px solid #10b981; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { padding: 5px; text-align: left; background: #f8fafc; border-bottom: 1px solid #cbd5e1; font-weight: bold; }
    td { padding: 5px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .tag-rem { background: #fef3c7; color: #92400e; padding: 1px 4px; border-radius: 3px; font-size: 8.5px; font-weight: bold; }
    .tag-ok { background: #d1fae5; color: #065f46; padding: 1px 4px; border-radius: 3px; font-size: 8.5px; font-weight: bold; }
    .tag-x { background: #fee2e2; color: #991b1b; padding: 1px 4px; border-radius: 3px; font-size: 8.5px; font-weight: bold; }
    .summary-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; font-size: 10.5px; margin-top: 10px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; padding-top: 10px; page-break-inside: avoid; }
    .sign-line { border-top: 1px solid #0f172a; text-align: center; padding-top: 4px; font-size: 10px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="gov">CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS</div>
    <div class="title">COMPARATIVO OFICIAL: SALA NO ASPEC vs. SALA ATUALIZADA FISICAMENTE</div>
    <div class="sub">${unit.nome} · Sala / Setor: <strong>${sectorName}</strong></div>
    <div style="font-size: 9.5px; color: #64748b; font-family: monospace; margin-top: 3px;">
      Emissão: ${dateFormatted} às ${timeFormatted} · Status: RASCUNHO DE CONFERÊNCIA IN LOCO
    </div>
  </div>

  <div class="info-box">
    <div><strong>Responsável Setorial (ASPEC):</strong> ${sectorResp} (${sectorCargo})</div>
    <div><strong>Bens no ASPEC:</strong> ${aspecOfficialAssets.length} (${formatBRL(totalAspecVal)})</div>
    <div><strong>Bens no Físico (Rascunho):</strong> ${physicalDraftAssets.length} (${formatBRL(totalPhysicalVal)})</div>
  </div>

  <div class="side-by-side">
    <!-- COLUNA 1: ASPEC -->
    <div class="column-box">
      <div class="column-header col-aspec">
        <span>1. Sala de acordo com o ASPEC (Oficial)</span>
        <span>${aspecOfficialAssets.length} bens</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 70px;">Tombo</th>
            <th>Descrição do Item</th>
            <th style="width: 70px; text-align: right;">Valor (R$)</th>
            <th style="width: 85px;">Situação Física</th>
          </tr>
        </thead>
        <tbody>
          ${aspecOfficialAssets.map(a => {
            const isMissing = a.auditoria?.statusDivergencia === 'nao_encontrado';
            const isChecked = a.auditoria?.conferido;
            return `
              <tr style="${isMissing ? 'background:#fff1f2;' : ''}">
                <td style="font-family:monospace;font-weight:bold;">${a.tombamento}</td>
                <td>
                  <strong>${a.descricao}</strong>
                  ${a.tomboOrigemSesa ? `<br/><span style="color:#1d4ed8;font-size:8.5px;">SESA: ${a.tomboOrigemSesa}</span>` : ''}
                </td>
                <td style="text-align:right;font-family:monospace;">${formatBRL(a.valorAquisicao || 0)}</td>
                <td>
                  ${isMissing ? '<span class="tag-x">AUSENTE (X)</span>' :
                    isChecked ? '<span class="tag-ok">CONFIRMADO</span>' : '<span style="color:#64748b;">PENDENTE</span>'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- COLUNA 2: FÍSICO -->
    <div class="column-box">
      <div class="column-header col-fisico">
        <span>2. Sala atualizada fisicamente (Rascunho)</span>
        <span>${physicalDraftAssets.length} bens</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 70px;">Tombo</th>
            <th>Descrição do Item</th>
            <th style="width: 70px; text-align: right;">Valor (R$)</th>
            <th style="width: 100px;">Condição / Origem</th>
          </tr>
        </thead>
        <tbody>
          ${physicalDraftAssets.map(a => {
            const isRemanejad = (a.setorOriginalAspec || a.setorNome || '').trim().toLowerCase() !== sectorNameNormalized && !a.foraDoAspec;
            const isUntracked = a.foraDoAspec;
            return `
              <tr style="${isRemanejad ? 'background:#fffbeb;' : isUntracked ? 'background:#fefce8;' : ''}">
                <td style="font-family:monospace;font-weight:bold;">${a.tombamento}</td>
                <td>
                  <strong>${a.descricao}</strong>
                  ${isRemanejad ? `<br/><span class="tag-rem">Origem ASPEC: ${a.setorOriginalAspec || a.setorNome}</span>` : ''}
                  ${isUntracked ? '<br/><span class="tag-rem">⚠️ ACHADO FORA DO ASPEC</span>' : ''}
                </td>
                <td style="text-align:right;font-family:monospace;">${formatBRL(a.valorAquisicao || 0)}</td>
                <td>
                  ${isRemanejad ? '<span class="tag-rem">REMANEJADO</span>' :
                    isUntracked ? '<span class="tag-rem">NOVA INCLUSÃO</span>' : '<span class="tag-ok">PRESENTE</span>'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="summary-card">
    <strong>Resumo das Modificações da Sala:</strong> 
    ${missingFromRoom.length} item(ns) ausentes no ASPEC · 
    ${incomingTransfers.length} item(ns) remanejados provisoriamente de outras salas · 
    ${untrackedInRoom.length} novo(s) bem(ns) fora do ASPEC.
    <br/>
    <em>* A consolidação definitiva e unificação com o ASPEC só é oficializada com a homologação formal da Gestora de Patrimônio.</em>
  </div>

  <div class="signatures">
    <div>
      <div class="sign-line">
        ${sectorResp}<br/>
        Responsável Setorial da Sala — ${sectorCargo}
      </div>
    </div>
    <div>
      <div class="sign-line">
        ${currentProfile.nome || 'Gestora de Patrimônio'}<br/>
        Gestora de Patrimônio — CPSMS
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    executePrintHtml({
      title: `Comparativo ASPEC vs. Físico - ${sectorName}`,
      html: generateComparisonPrintableHtml(),
      filename: `comparativo_aspec_${sectorSigla}`
    });
  };

  const handleDownload = () => {
    downloadPrintableHtml(`comparativo_aspec_vs_fisico_${sectorSigla}_${new Date().toISOString().slice(0, 10)}.html`, generateComparisonPrintableHtml());
  };

  return (
    <div className="fixed inset-0 z-85 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl max-w-6xl w-full flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Top Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono">
                  Comparativo Sala a Sala
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  Rascunho de Conferência
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5 flex items-center gap-2">
                <span>{sectorName}</span>
                <span className="text-xs text-slate-400 font-normal">({unit.sigla})</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Imprimir visualização comparativa lado a lado"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Imprimir Comparativo</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Baixar HTML comparativo"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informative Guidance Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/40 p-3 px-4 border-b border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <strong>Versão em Rascunho de Conferência:</strong> A coluna da direita reflete as alterações levantadas fisicamente. Os dados só se tornam definitivos após a Gestora confirmar que o ASPEC foi atualizado oficialmente, momento em que o rascunho temporário é excluído.
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setFilterType(filterType === 'todos' ? 'divergencias' : 'todos')}
              className="text-[11px] font-bold text-amber-900 dark:text-amber-300 underline cursor-pointer"
            >
              {filterType === 'todos' ? 'Ver apenas divergências' : 'Ver todos os bens'}
            </button>
          </div>
        </div>

        {/* Side-by-side Dual Column Content */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          
          {/* COLUNA 1: "Sala de acordo com o ASPEC" */}
          <div className="flex flex-col rounded-2xl border-2 border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            {/* Header Coluna 1 */}
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  VERSÃO 1: CADASTRO CONTÁBIL
                </span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Sala de acordo com o ASPEC</span>
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block">
                  {aspecOfficialAssets.length} bens
                </span>
                <span className="text-[10.5px] font-mono text-slate-500">
                  {formatBRL(totalAspecVal)}
                </span>
              </div>
            </div>

            {/* Lista de Bens ASPEC */}
            <div className="divide-y divide-slate-200 dark:divide-slate-800 flex-1 overflow-y-auto max-h-[500px]">
              {aspecOfficialAssets.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Nenhum bem cadastrado nesta sala no sistema ASPEC.
                </div>
              ) : (
                aspecOfficialAssets
                  .filter(a => filterType === 'todos' || a.auditoria?.statusDivergencia === 'nao_encontrado')
                  .map(asset => {
                    const isMissing = asset.auditoria?.statusDivergencia === 'nao_encontrado';
                    const isChecked = asset.auditoria?.conferido;

                    return (
                      <div 
                        key={`aspec-${asset.id}`} 
                        className={`p-3 transition-colors ${
                          isMissing ? 'bg-rose-50/70 dark:bg-rose-950/30' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-mono">
                              <strong className="text-slate-900 dark:text-white text-xs">{asset.tombamento}</strong>
                              {asset.tomboOrigemSesa && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                  (SESA: {asset.tomboOrigemSesa})
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mt-0.5">
                              {asset.descricao}
                            </div>
                            <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                              Valor: {formatBRL(asset.valorAquisicao || 0)} · Estado: {asset.estado}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {isMissing ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                                ✗ Ausente no Físico
                              </span>
                            ) : isChecked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                ✓ Presente
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                ⏳ Pendente
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer Coluna 1 */}
            <div className="p-3 bg-slate-100/60 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Carga Contábil Oficial Registrada</span>
              <span>Responsável: <strong>{sector.responsavelNome}</strong></span>
            </div>
          </div>

          {/* COLUNA 2: "Sala atualizada fisicamente" (Rascunho de Conferência) */}
          <div className="flex flex-col rounded-2xl border-2 border-emerald-400 dark:border-emerald-600 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            {/* Header Coluna 2 */}
            <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-950/40 border-b border-emerald-300 dark:border-emerald-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  VERSÃO 2: CONFERÊNCIA IN LOCO (RASCUNHO)
                </span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sala atualizada fisicamente</span>
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 block">
                  {physicalDraftAssets.length} bens
                </span>
                <span className="text-[10.5px] font-mono text-slate-500">
                  {formatBRL(totalPhysicalVal)}
                </span>
              </div>
            </div>

            {/* Lista de Bens Físicos no Rascunho */}
            <div className="divide-y divide-slate-200 dark:divide-slate-800 flex-1 overflow-y-auto max-h-[500px]">
              {physicalDraftAssets.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Nenhum bem conferido fisicamente nesta sala ainda.
                </div>
              ) : (
                physicalDraftAssets
                  .filter(a => {
                    if (filterType === 'todos') return true;
                    const isRemanejad = (a.setorOriginalAspec || a.setorNome || '').trim().toLowerCase() !== sectorNameNormalized;
                    return isRemanejad || a.foraDoAspec;
                  })
                  .map(asset => {
                    const isRemanejad = (asset.setorOriginalAspec || asset.setorNome || '').trim().toLowerCase() !== sectorNameNormalized && !asset.foraDoAspec;
                    const isUntracked = asset.foraDoAspec;

                    return (
                      <div 
                        key={`draft-${asset.id}`}
                        className={`p-3 transition-colors ${
                          isRemanejad ? 'bg-amber-50/70 dark:bg-amber-950/30' : isUntracked ? 'bg-purple-50/70 dark:bg-purple-950/30' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-mono">
                              <strong className="text-slate-900 dark:text-white text-xs">{asset.tombamento}</strong>
                              {asset.tomboOrigemSesa && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                  (SESA: {asset.tomboOrigemSesa})
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mt-0.5">
                              {asset.descricao}
                            </div>
                            <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                              Valor: {formatBRL(asset.valorAquisicao || 0)} · Estado: {asset.estado}
                            </div>

                            {/* Tags de status */}
                            {isRemanejad && (
                              <div className="mt-1 text-[9.5px] text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1">
                                <span>📍 Remanejado (No ASPEC: {asset.setorOriginalAspec || asset.setorNome})</span>
                              </div>
                            )}

                            {isUntracked && (
                              <div className="mt-1 text-[9.5px] text-purple-800 dark:text-purple-300 font-semibold flex items-center gap-1">
                                <span>⚠️ Bem Físico Encontrado Fora do ASPEC</span>
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            {isRemanejad ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                Provisório
                              </span>
                            ) : isUntracked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                                Novo Achado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                Conforme
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer Coluna 2 */}
            <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/40 border-t border-emerald-300 dark:border-emerald-700 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span>Status: <strong>Rascunho de Conferência</strong></span>
              <span>Aguardando comando de confirmação</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (Gestora's official command & Draft Management) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
            <div>
              Divergências apuradas: <strong>{missingFromRoom.length} ausente(s)</strong> · <strong>{incomingTransfers.length} remanejado(s)</strong> · <strong>{untrackedInRoom.length} fora do ASPEC</strong>
            </div>
            <div className="text-[11px] text-slate-500">
              Apenas a confirmação da gestora consolida esses dados como definitivos e exclui o rascunho.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Descartar Rascunho */}
            {onDiscardDraft && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja descartar as alterações deste rascunho e manter a sala de acordo com o ASPEC original?')) {
                    onDiscardDraft(sectorName);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                title="Descartar rascunho temporário"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Descartar Rascunho</span>
              </button>
            )}

            {/* Manter como Rascunho */}
            <button
              type="button"
              onClick={() => {
                if (onSaveDraftOnly) onSaveDraftOnly(sectorName);
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Manter como Rascunho</span>
            </button>

            {/* COMANDO DE CONFIRMAÇÃO OFICIAL DA GESTORA */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-5 py-2.5 text-xs sm:text-sm font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 ring-2 ring-emerald-500/40"
              title="Confirmar que o ASPEC foi atualizado oficialmente e consolidar os dados como definitivos no sistema"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Confirmar Atualização no ASPEC (Consolidar como Definitivo)</span>
            </button>
          </div>
        </div>

      </div>

      {/* MODAL DE CONFIRMAÇÃO FINAL DA GESTORA */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-95 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border-2 border-emerald-500 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                  Comando Oficial da Gestora
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white mt-1 leading-snug">
                  Consolidar Sala "{sectorName}" como Definitiva no Sistema
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Você está prestes a <strong>consolidar como definitivos</strong> os dados físicos desta sala e <strong>excluir o rascunho temporário de conferência</strong>.
            </p>

            <form onSubmit={handleConfirmSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Protocolo / Número de Despacho no ASPEC:
                </label>
                <input
                  type="text"
                  required
                  value={protocoloInput}
                  onChange={(e) => setProtocoloInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Parecer de Homologação:
                </label>
                <textarea
                  rows={2}
                  value={parecerInput}
                  onChange={(e) => setParecerInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200">
                ✓ Ao confirmar, a versão em rascunho será <strong>automaticamente excluída</strong> e o registro definitivo de todos os bens desta sala será consolidado com validade jurídica perante o TCE-CE.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sim, Consolidar como Definitivo e Excluir Rascunho</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
