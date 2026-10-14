import React, { useState, useMemo } from 'react';
import { Asset, Sector, UnitInfo, UserProfile } from '../types';
import { formatBRL, formatDate } from '../utils/formatters';
import { executePrintHtml, downloadPrintableHtml } from '../utils/printHelper';
import { doesAssetMatchRoom, doesAssetOfficiallyMatchRoom, doesAssetPhysicallyMatchRoom, getAssetFullLocation, getAssetOfficialRoomName, getAssetUnitId } from '../utils/locationHelper';
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
  const [showConfirmDiscard, setShowConfirmDiscard] = useState<boolean>(false);

  if (!isOpen || !sector) return null;

  const sectorName = sector.nome;
  const sectorNameNormalized = sectorName.trim().toLowerCase();
  const sectorResp = ('responsavelNome' in sector && sector.responsavelNome) || ('responsavel' in sector && (sector as any).responsavel) || 'Responsável Setorial';
  const sectorCargo = ('responsavelCargo' in sector && (sector as any).responsavelCargo) || 'Responsável pelo Setor';
  const sectorSigla = ('sigla' in sector && (sector as any).sigla) || sector.nome.slice(0, 3).toUpperCase();

  // 1. VERSÃO OFICIAL: "Sala de acordo com o ASPEC"
  // Todos os bens cadastrados no ASPEC para esta subárea / sala
  const aspecOfficialAssets = useMemo(() => {
    const targetUnitId = (sector && 'unidadeId' in sector ? (sector as any).unidadeId : '') || unit?.id || '';
    return assets.filter(a => {
      if (a.foraDoAspec) return false;
      if (targetUnitId && getAssetUnitId(a) !== targetUnitId) return false;
      return doesAssetOfficiallyMatchRoom(a, sectorName);
    });
  }, [assets, sectorName, sector, unit]);

  // 2. VERSÃO ATUALIZADA: "Sala atualizada fisicamente" (Conferência In Loco)
  // ESTRITAMENTE os bens que foram SELECIONADOS / CONFERIDOS pelo usuário nesta sala
  const physicalDraftAssets = useMemo(() => {
    return assets.filter(a => {
      if (!a.auditoria?.conferido) return false;
      if (a.auditoria?.statusDivergencia === 'nao_encontrado') return false;
      return doesAssetPhysicallyMatchRoom(a, sectorName);
    });
  }, [assets, sectorName]);

  // Itens ausentes (estavam no ASPEC mas não foram achados fisicamente)
  const missingFromRoom = useMemo(() => {
    return aspecOfficialAssets.filter(a => a.auditoria?.statusDivergencia === 'nao_encontrado');
  }, [aspecOfficialAssets]);

  // Itens remanejados: bens que no ASPEC pertenciam a OUTRA sala e foram trazidos para cá
  const incomingTransfers = useMemo(() => {
    return physicalDraftAssets.filter(a => {
      if (a.foraDoAspec) return false;
      return !doesAssetOfficiallyMatchRoom(a, sectorName);
    });
  }, [physicalDraftAssets, sectorName]);

  // Itens novos fora do ASPEC
  const untrackedInRoom = useMemo(() => {
    return physicalDraftAssets.filter(a => a.foraDoAspec);
  }, [physicalDraftAssets]);

  // Validação: A sala só está 100% OK se TODOS os bens do ASPEC foram conferidos/selecionados pelo usuário
  const isRoomAllOk = 
    aspecOfficialAssets.length > 0 &&
    physicalDraftAssets.length === aspecOfficialAssets.length &&
    aspecOfficialAssets.every(a => a.auditoria?.conferido && a.auditoria?.statusDivergencia !== 'nao_encontrado') &&
    missingFromRoom.length === 0 && 
    incomingTransfers.length === 0 && 
    untrackedInRoom.length === 0;

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

  // Gerar impressão comparativa ou termo regular
  const generateComparisonPrintableHtml = (): string => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // CASO A: SALA 100% OK / CONFORME COM O ASPEC -> TERMO REGULAR
    if (isRoomAllOk) {
      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo de Conferência Patrimonial Regular - ${sectorName} - CPSMS</title>
  <style>
    @page { size: portrait; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; color: #0f172a; background: #fff; line-height: 1.4; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .gov { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #334155; }
    .title { font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 6px 0; color: #065f46; }
    .sub { font-size: 12px; color: #475569; }
    .stamp-box { background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .stamp-title { font-size: 13px; font-weight: 900; color: #065f46; text-transform: uppercase; }
    .stamp-desc { font-size: 11px; color: #047857; margin-top: 2px; }
    .info-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 6px; font-size: 11px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 16px; }
    th { padding: 6px; text-align: left; background: #f1f5f9; border: 1px solid #cbd5e1; font-weight: bold; font-size: 10px; text-transform: uppercase; }
    td { padding: 6px; border: 1px solid #cbd5e1; vertical-align: top; }
    .tag-ok { background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; display: inline-block; }
    .certification { background: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; font-size: 11px; margin: 20px 0; line-height: 1.5; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; page-break-inside: avoid; }
    .sign-line { border-top: 1px solid #0f172a; text-align: center; padding-top: 6px; font-size: 11px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="gov">ESTADO DO CEARÁ · CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL (CPSMS)</div>
    <div class="title">TERMO DE CONFERÊNCIA E CONFORMIDADE PATRIMONIAL REGULAR</div>
    <div class="sub">100% EM CONFORMIDADE COM O SISTEMA ASPEC · EXERCÍCIO 2026</div>
    <div style="font-size: 10px; color: #64748b; font-family: monospace; margin-top: 4px;">
      Emissão: ${dateFormatted} às ${timeFormatted} · Protocolo: ASPEC-REG-${new Date().getFullYear()}/${sectorSigla}
    </div>
  </div>

  <div class="stamp-box">
    <div>
      <div class="stamp-title">✓ SALA ATESTADA 100% REGULARIZADA</div>
      <div class="stamp-desc">Todos os bens patrimoniais cadastrados no ASPEC foram localizados e conferidos fisicamente in loco.</div>
    </div>
    <div style="text-align: right; font-family: monospace; font-weight: bold; color: #065f46;">
      ${aspecOfficialAssets.length} BENS AUDITADOS<br/>
      ${formatBRL(totalAspecVal)}
    </div>
  </div>

  <div class="info-box">
    <div><strong>Unidade Gestora (Área):</strong> ${unit.nome} (${unit.sigla})</div>
    <div><strong>Sala / Subárea Auditada:</strong> 📍 ${sectorName}</div>
    <div><strong>Titular da Carga (Responsável):</strong> ${sectorResp}</div>
    <div><strong>Auditora Responsável:</strong> ${currentProfile.nome} (${currentProfile.cargo || 'Gestora'})</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 80px;">Tombo</th>
        <th style="width: 80px;">SESA (6d)</th>
        <th>Descrição do Bem Patrimonial</th>
        <th style="width: 100px;">Nº Série / Marca</th>
        <th style="width: 75px; text-align: center;">Estado</th>
        <th style="width: 80px; text-align: right;">Valor (R$)</th>
        <th style="width: 95px; text-align: center;">Situação</th>
      </tr>
    </thead>
    <tbody>
      ${aspecOfficialAssets.map(a => `
        <tr>
          <td style="font-family:monospace;font-weight:bold;">${a.tombamento}</td>
          <td style="font-family:monospace;color:#1e40af;">${a.tomboOrigemSesa || '-'}</td>
          <td><strong>${a.descricao}</strong></td>
          <td style="font-family:monospace;font-size:9.5px;">${a.numeroSerie || '-'}</td>
          <td style="text-align:center;">${a.estado}</td>
          <td style="text-align:right;font-family:monospace;">${formatBRL(a.valorAquisicao || 0)}</td>
          <td style="text-align:center;"><span class="tag-ok">✓ 100% CONFORME</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="certification">
    <strong>PARECER CONCLUSIVO DE AUDITORIA:</strong><br/>
    Certificamos para os devidos fins de controle interno, prestação de contas ao Tribunal de Contas do Estado do Ceará (TCE-CE) e inventário anual do CPSMS, que a sala <strong>"${sectorName}"</strong> foi integralmente vistoriada in loco. 
    Todos os <strong>${aspecOfficialAssets.length}</strong> bens constantes da carga patrimonial oficial do sistema ASPEC foram conferidos e confirmados presentes no respectivo cômodo, não sendo apurada nenhuma ausência, remanejamento indevido ou bem sem identificação. A sala encontra-se <strong>100% REGULARIZADA</strong>.
  </div>

  <div class="signatures">
    <div>
      <div class="sign-line">
        ${sectorResp}<br/>
        Responsável Setorial — ${sectorCargo}
      </div>
    </div>
    <div>
      <div class="sign-line">
        ${currentProfile.nome || 'Gestora de Patrimônio'}<br/>
        Gestora de Patrimônio e Bens Móveis — CPSMS
      </div>
    </div>
  </div>
</body>
</html>`;
    }

    // CASO B: SALA COM DIVERGÊNCIAS (AUSÊNCIAS, REMANEJAMENTOS DE OUTRA SALA OU FORA DO ASPEC)
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comparativo ASPEC vs. Físico (Divergências) - ${sectorName} - CPSMS</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 16px; color: #0f172a; background: #fff; line-height: 1.3; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .gov { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #334155; }
    .title { font-size: 15px; font-weight: 900; text-transform: uppercase; margin: 3px 0; color: #9a3412; }
    .sub { font-size: 11px; color: #475569; }
    .info-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 11px; margin-bottom: 12px; }
    .side-by-side { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .column-box { border: 2px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
    .column-header { padding: 8px 12px; font-weight: 900; font-size: 11px; text-transform: uppercase; display: flex; justify-content: space-between; }
    .col-aspec { background: #f1f5f9; color: #1e293b; border-bottom: 2px solid #94a3b8; }
    .col-fisico { background: #fffbeb; color: #92400e; border-bottom: 2px solid #f59e0b; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { padding: 5px; text-align: left; background: #f8fafc; border-bottom: 1px solid #cbd5e1; font-weight: bold; }
    td { padding: 5px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .tag-rem { background: #fef3c7; color: #92400e; padding: 1px 4px; border-radius: 3px; font-size: 8.5px; font-weight: bold; }
    .tag-ok { background: #d1fae5; color: #065f46; padding: 1px 4px; border-radius: 3px; font-size: 8.5px; font-weight: bold; }
    .tag-x { background: #fee2e2; color: #991b1b; padding: 1px 4px; border-radius: 3px; font-size: 8.5px; font-weight: bold; }
    .summary-card { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 8px; font-size: 10.5px; margin-top: 10px; color: #9a3412; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; padding-top: 10px; page-break-inside: avoid; }
    .sign-line { border-top: 1px solid #0f172a; text-align: center; padding-top: 4px; font-size: 10px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="gov">CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS</div>
    <div class="title">RELATÓRIO COMPARATIVO DE DIVERGÊNCIAS (ASPEC vs. CONFERÊNCIA FÍSICA)</div>
    <div class="sub">${unit.nome} · Sala / Subárea: <strong>${sectorName}</strong></div>
    <div style="font-size: 9.5px; color: #64748b; font-family: monospace; margin-top: 3px;">
      Emissão: ${dateFormatted} às ${timeFormatted} · Divergências pendentes de regularização contábil
    </div>
  </div>

  <div class="info-box">
    <div><strong>Responsável Setorial:</strong> ${sectorResp} (${sectorCargo})</div>
    <div><strong>Bens no ASPEC:</strong> ${aspecOfficialAssets.length} (${formatBRL(totalAspecVal)})</div>
    <div><strong>Bens no Físico:</strong> ${physicalDraftAssets.length} (${formatBRL(totalPhysicalVal)})</div>
  </div>

  <div class="side-by-side">
    <!-- COLUNA 1: ASPEC -->
    <div class="column-box">
      <div class="column-header col-aspec">
        <span>1. Cadastro Oficial no ASPEC</span>
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
        <span>2. Conferência Física In Loco</span>
        <span>${physicalDraftAssets.length} bens</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 70px;">Tombo</th>
            <th>Descrição do Item</th>
            <th style="width: 70px; text-align: right;">Valor (R$)</th>
            <th style="width: 130px;">Origem ASPEC / Situação</th>
          </tr>
        </thead>
        <tbody>
          ${physicalDraftAssets.map(a => {
            const isRemanejad = !doesAssetOfficiallyMatchRoom(a, sectorName) && !a.foraDoAspec;
            const isUntracked = a.foraDoAspec;
            const fullLoc = getAssetFullLocation(a);
            const originArea = fullLoc.area;
            const originSubarea = fullLoc.subarea;
            return `
              <tr style="${isRemanejad ? 'background:#fffbeb;' : isUntracked ? 'background:#fefce8;' : ''}">
                <td style="font-family:monospace;font-weight:bold;">${a.tombamento}</td>
                <td>
                  <strong>${a.descricao}</strong>
                  ${isRemanejad ? `<br/><span class="tag-rem">📍 No ASPEC: Área: <strong>${originArea}</strong> · Subárea: <strong>${originSubarea}</strong></span>` : ''}
                  ${isUntracked ? '<br/><span class="tag-rem">⚠️ ACHADO FORA DO ASPEC</span>' : ''}
                </td>
                <td style="text-align:right;font-family:monospace;">${formatBRL(a.valorAquisicao || 0)}</td>
                <td>
                  ${isRemanejad ? '<span class="tag-rem">REMANEJADO</span>' :
                    isUntracked ? '<span class="tag-rem">FORA DO ASPEC</span>' : '<span class="tag-ok">CONFORME</span>'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="summary-card">
    <strong>Divergências Apuradas que Requerem Atualização no ASPEC:</strong><br/>
    • <strong>${missingFromRoom.length}</strong> bem(ns) cadastrados no ASPEC mas não localizados fisicamente (requer baixa/baixa provisória).<br/>
    • <strong>${incomingTransfers.length}</strong> bem(ns) encontrados nesta sala que pertencem oficialmente a outras salas no ASPEC (requer transferência contábil).<br/>
    • <strong>${untrackedInRoom.length}</strong> bem(ns) encontrados sem registro no ASPEC (requer cadastramento/tombamento novo).
  </div>

  <div class="signatures">
    <div>
      <div class="sign-line">
        ${sectorResp}<br/>
        Responsável Setorial — ${sectorCargo}
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
      title: isRoomAllOk ? `Termo de Conformidade Regular - ${sectorName}` : `Comparativo ASPEC vs. Físico - ${sectorName}`,
      html: generateComparisonPrintableHtml(),
      filename: isRoomAllOk ? `termo_regular_${sectorSigla}` : `comparativo_aspec_${sectorSigla}`
    });
  };

  const handleDownload = () => {
    const filename = isRoomAllOk 
      ? `termo_conformidade_regular_${sectorSigla}_${new Date().toISOString().slice(0, 10)}.html`
      : `comparativo_divergencias_${sectorSigla}_${new Date().toISOString().slice(0, 10)}.html`;
    downloadPrintableHtml(filename, generateComparisonPrintableHtml());
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              isRoomAllOk ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
            } shadow-md`}>
              {isRoomAllOk ? <ShieldCheck className="w-6 h-6 stroke-[2.5]" /> : <ArrowRightLeft className="w-6 h-6 stroke-[2.5]" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-full ${
                  isRoomAllOk 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {isRoomAllOk ? '100% Conforme com o ASPEC' : 'Análise Comparativa ASPEC'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {unit.sigla} · Subárea: {sectorName}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white mt-0.5">
                {isRoomAllOk ? `Sala Regularizada: ${sectorName}` : `Conferência da Sala: ${sectorName}`}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Imprimir Termo Oficial / Salvar PDF"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Imprimir Termo</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Baixar Arquivo HTML do Termo"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Baixar HTML</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Guidance Banner */}
        {isRoomAllOk ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 px-4 border-b border-emerald-200 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="leading-tight">
                <strong className="text-sm">✓ Sala 100% de acordo com o cadastro do ASPEC!</strong>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Todos os {aspecOfficialAssets.length} bens cadastrados nesta subárea foram localizados e atestados in loco. Não há ausências, remanejamentos pendentes nem bens sem tombamento.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-mono font-bold text-[11px] border border-emerald-300">
                0 Divergências
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/40 p-3 px-4 border-b border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-tight">
                <strong>Divergências Detectadas na Sala:</strong> A coluna da direita exibe os bens encontrados fisicamente com divergência de sala ou ausentes. Apenas a confirmação da Gestora oficializa a mudança no ASPEC.
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
        )}

        {/* Side-by-side Dual Column Content */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          
          {/* COLUNA 1: "Sala de acordo com o ASPEC" */}
          <div className="flex flex-col rounded-2xl border-2 border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            {/* Header Coluna 1 */}
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  VERSÃO 1: CADASTRO NO ASPEC
                </span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Carga Cadastrada nesta Sala</span>
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
              <span>Carga Oficial no ASPEC</span>
              <span>Responsável: <strong>{sectorResp}</strong></span>
            </div>
          </div>

          {/* COLUNA 2: "Sala atualizada fisicamente" */}
          <div className={`flex flex-col rounded-2xl border-2 overflow-hidden shadow-sm ${
            isRoomAllOk 
              ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 dark:bg-slate-900'
              : 'border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-900'
          }`}>
            {/* Header Coluna 2 */}
            <div className={`p-3.5 border-b flex items-center justify-between ${
              isRoomAllOk
                ? 'bg-emerald-500/15 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                : 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
            }`}>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider block ${
                  isRoomAllOk ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-400'
                }`}>
                  VERSÃO 2: CONFERÊNCIA IN LOCO
                </span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className={`w-4 h-4 ${isRoomAllOk ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span>Sala Conferida Fisicamente</span>
                </h4>
              </div>
              <div className="text-right">
                <span className={`text-xs font-mono font-bold block ${
                  isRoomAllOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                }`}>
                  {physicalDraftAssets.length} bens
                </span>
                <span className="text-[10.5px] font-mono text-slate-500">
                  {formatBRL(totalPhysicalVal)}
                </span>
              </div>
            </div>

            {/* Lista de Bens Físicos */}
            <div className="divide-y divide-slate-200 dark:divide-slate-800 flex-1 overflow-y-auto max-h-[500px]">
              {physicalDraftAssets.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Nenhum bem conferido fisicamente nesta sala ainda.
                </div>
              ) : (
                physicalDraftAssets
                  .filter(a => {
                    if (filterType === 'todos') return true;
                    const isRemanejad = !doesAssetOfficiallyMatchRoom(a, sectorName) && !a.foraDoAspec;
                    return isRemanejad || a.foraDoAspec;
                  })
                  .map(asset => {
                    const isRemanejad = !doesAssetOfficiallyMatchRoom(asset, sectorName) && !asset.foraDoAspec;
                    const isUntracked = asset.foraDoAspec;
                    const fullLoc = getAssetFullLocation(asset);
                    const originArea = fullLoc.area;
                    const originSubarea = fullLoc.subarea;

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

                            {/* Tags de status detalhadas com Área + Subárea */}
                            {isRemanejad && (
                              <div className="mt-1 text-[10px] text-amber-900 dark:text-amber-200 font-semibold bg-amber-100/80 dark:bg-amber-950 p-1.5 rounded-lg border border-amber-300 dark:border-amber-800">
                                📍 <strong>Remanejado de outra sala:</strong><br/>
                                Área: <strong>{originArea}</strong> · Subárea / Sala: <strong>{originSubarea}</strong>
                              </div>
                            )}

                            {isUntracked && (
                              <div className="mt-1 text-[10px] text-purple-900 dark:text-purple-200 font-semibold bg-purple-100/80 dark:bg-purple-950 p-1.5 rounded-lg border border-purple-300 dark:border-purple-800">
                                ⚠️ <strong>Bem Físico Sem Cadastro no ASPEC</strong> (Requer novo tombamento)
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            {isRemanejad ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                Remanejado
                              </span>
                            ) : isUntracked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                                Fora do ASPEC
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-xs">
                                ✓ Conforme
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
            <div className={`p-3 border-t text-[11px] flex items-center justify-between ${
              isRoomAllOk
                ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
            }`}>
              <span>Situação: <strong>{isRoomAllOk ? '100% Conforme e Auditada' : 'Com Alterações Físicas'}</strong></span>
              <span>{isRoomAllOk ? '✓ Pronto para Termo Oficial' : 'Aguardando Validação'}</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
            {isRoomAllOk ? (
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Sala 100% OK: Todos os {aspecOfficialAssets.length} bens conferidos sem nenhuma divergência contábil.</span>
              </div>
            ) : (
              <div>
                Divergências apuradas: <strong>{missingFromRoom.length} ausente(s)</strong> · <strong>{incomingTransfers.length} remanejado(s)</strong> · <strong>{untrackedInRoom.length} fora do ASPEC</strong>
              </div>
            )}
            <div className="text-[11px] text-slate-500">
              {isRoomAllOk 
                ? 'Você pode emitir e imprimir o Termo de Conformidade Regular diretamente.'
                : 'Apenas a confirmação da gestora consolida esses dados como definitivos e exclui o rascunho.'}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isRoomAllOk ? (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2.5 text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2 ring-2 ring-emerald-500/40"
                >
                  <Printer className="w-4 h-4 stroke-[3]" />
                  <span>Emitir Termo de Conformidade Regular (Tudo OK)</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </>
            ) : (
              <>
                {/* Descartar Rascunho */}
                {onDiscardDraft && (
                  !showConfirmDiscard ? (
                    <button
                      type="button"
                      onClick={() => setShowConfirmDiscard(true)}
                      className="px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      title="Descartar rascunho temporário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Descartar Rascunho</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 p-1 bg-rose-50 dark:bg-rose-950/60 rounded-lg border border-rose-300 dark:border-rose-700 text-xs">
                      <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 px-1">Descartar?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDiscardDraft(sectorName);
                          onClose();
                        }}
                        className="px-2 py-1 bg-rose-600 text-white font-bold rounded cursor-pointer text-[11px]"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmDiscard(false)}
                        className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded cursor-pointer text-[11px]"
                      >
                        Não
                      </button>
                    </div>
                  )
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
                  className="px-5 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 ring-2 ring-emerald-500/40"
                  title="Confirmar que as baixas e transferências foram registradas no sistema ASPEC"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar Atualização no ASPEC (Consolidar como Definitivo)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Interno: Despacho e Protocolo de Homologação no ASPEC */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500 text-slate-950 font-black">✓</span>
                <div>
                  <h4 className="text-sm font-black text-slate-950 dark:text-white">
                    Homologação Oficial no ASPEC
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Consolidação da sala <strong>{sectorName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-7 h-7 rounded text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Número do Protocolo / Lote de Baixa ASPEC:
                </label>
                <input
                  type="text"
                  required
                  value={protocoloInput}
                  onChange={(e) => setProtocoloInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Parecer Conclusivo da Gestora:
                </label>
                <textarea
                  required
                  rows={3}
                  value={parecerInput}
                  onChange={(e) => setParecerInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium resize-none leading-relaxed"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
                ⚠️ Ao confirmar, o rascunho de conferência temporário será <strong>excluído</strong> e a sala será gravada como <strong>concluída e regularizada no sistema</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer shadow-md transition-colors"
                >
                  Confirmar e Consolidar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
