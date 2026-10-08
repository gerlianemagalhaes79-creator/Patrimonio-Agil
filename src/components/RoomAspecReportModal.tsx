import React, { useMemo, useState } from 'react';
import { Asset, Sector, UnitInfo, UserProfile } from '../types';
import { formatBRL, formatDate, downloadCsvFile } from '../utils/formatters';
import { executePrintHtml, downloadPrintableHtml, openPrintableInNewWindow } from '../utils/printHelper';
import { 
  Printer, 
  X, 
  Download, 
  FileCode, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft, 
  PlusCircle, 
  Building2, 
  Tag, 
  FileText,
  ShieldCheck
} from 'lucide-react';

interface RoomAspecReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sector: Sector | { id: string; nome: string; responsavel?: string } | null;
  unit: { id: string; nome: string; sigla: string; icon?: string };
  assets: Asset[];
  currentProfile: UserProfile;
}

export const RoomAspecReportModal: React.FC<RoomAspecReportModalProps> = ({
  isOpen,
  onClose,
  sector,
  unit,
  assets,
  currentProfile,
}) => {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const sectorName = sector?.nome || 'Setor';
  const sectorResponsavel = (sector && 'responsavelNome' in sector) ? sector.responsavelNome : ((sector && 'responsavel' in sector) ? (sector as any).responsavel : '') || '';
  const sectorCargo = (sector && 'responsavelCargo' in sector) ? sector.responsavelCargo : 'Responsável pelo Setor';
  const sectorNameNormalized = sector?.nome ? sector.nome.trim().toLowerCase() : '';

  // 1. Bens que estavam cadastrados no ASPEC nesta sala
  const aspecRegisteredAssets = useMemo(() => {
    if (!sector) return [];
    return assets.filter(a => {
      const sNome = (a.setorNome || '').trim().toLowerCase();
      const sArea = (a.area || '').trim().toLowerCase();
      const sSub = (a.subsetorNome || a.subarea || '').trim().toLowerCase();
      return sNome === sectorNameNormalized || sArea === sectorNameNormalized || sSub === sectorNameNormalized;
    });
  }, [assets, sectorNameNormalized]);

  // 1.1 Bens confirmados presentes (com OK)
  const confirmedPresent = useMemo(() => {
    return aspecRegisteredAssets.filter(a => a.auditoria?.conferido && a.auditoria?.statusDivergencia !== 'nao_encontrado');
  }, [aspecRegisteredAssets]);

  // 1.2 Bens ausentes desta sala (marcados com X)
  const markedMissing = useMemo(() => {
    return aspecRegisteredAssets.filter(a => a.auditoria?.statusDivergencia === 'nao_encontrado');
  }, [aspecRegisteredAssets]);

  // 2. Bens que foram achados fisicamente nesta sala mas estavam no ASPEC em outro lugar (ou fora do ASPEC)
  const physicalFindingsInRoom = useMemo(() => {
    return assets.filter(a => {
      const originalSetor = (a.setorNome || '').trim().toLowerCase();
      const setorEncontrado = (a.auditoria?.setorEncontrado || '').trim().toLowerCase();
      // Encontrado aqui, mas não era daqui no ASPEC
      const isFoundHere = setorEncontrado === sectorNameNormalized;
      const isNotOriginalHere = originalSetor !== sectorNameNormalized;
      return (isFoundHere && isNotOriginalHere) || (a.foraDoAspec && isFoundHere);
    });
  }, [assets, sectorNameNormalized]);

  // Bens sem plaqueta encontrados na sala
  const semPlaquetaItems = useMemo(() => {
    return physicalFindingsInRoom.filter(a => a.semPlaqueta || a.tombamento.startsWith('SEM-TOMBO') || a.tombamento.startsWith('ST-'));
  }, [physicalFindingsInRoom]);

  // Generate Standalone Printable HTML
  const generatePrintableHtml = (): string => {
    const now = new Date();
    const currentDateFormatted = now.toLocaleDateString('pt-BR');
    const currentTimeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo de Vistoria e Espelho ASPEC — ${sectorName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 12mm 12mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; line-height: 1.4; padding: 15px; margin: 0; background: #fff; font-size: 11px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .gov { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #475569; }
    .org { font-size: 13px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 2px; }
    .unit { font-size: 11px; font-weight: bold; color: #2563eb; margin-top: 1px; }
    .title-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 4px; text-align: center; font-weight: 900; font-size: 12px; text-transform: uppercase; margin: 10px 0; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 10px; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; margin-bottom: 12px; }
    .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
    .card { padding: 8px; border-radius: 4px; text-align: center; border: 1px solid #cbd5e1; font-size: 10px; }
    .card-ok { background: #f0fdf4; border-color: #86efac; color: #166534; }
    .card-in { background: #fefce8; border-color: #fde047; color: #854d0e; }
    .card-out { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
    .card-num { font-size: 16px; font-weight: 900; display: block; }
    .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; margin: 14px 0 6px 0; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 10px; }
    th { background: #0f172a; color: white; border: 1px solid #334155; padding: 5px 6px; text-align: left; text-transform: uppercase; font-size: 9px; }
    td { border: 1px solid #cbd5e1; padding: 5px 6px; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .tag-transf { color: #b45309; font-weight: bold; }
    .tag-incluir { color: #047857; font-weight: bold; }
    .tag-apurar { color: #b91c1c; font-weight: bold; }
    .empty-msg { padding: 8px; text-align: center; color: #64748b; font-style: italic; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; font-size: 10px; }
    .signatures { margin-top: 25px; page-break-inside: avoid; }
    .sig-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; text-align: center; font-size: 10px; }
    .sig-line { border-bottom: 1px solid #0f172a; margin-bottom: 6px; padding-bottom: 30px; }
    .no-print { margin-bottom: 12px; display: flex; gap: 8px; justify-content: flex-end; }
    .btn { background: #10b981; color: #0f172a; border: none; padding: 6px 14px; font-weight: bold; border-radius: 4px; cursor: pointer; font-size: 11px; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF (A4)</button>
  </div>

  <div class="header">
    <div class="gov">ESTADO DO CEARÁ · CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS</div>
    <div class="org">GERÊNCIA DE PATRIMÔNIO · COMISSÃO DE INVENTÁRIO 2026</div>
    <div class="unit">${unit.nome.toUpperCase()}</div>
  </div>

  <div class="title-box">
    TERMO DE VISTORIA SALA A SALA & ESPELHO DE ALTERAÇÕES NO ASPEC
  </div>

  <div class="meta-grid">
    <div><strong>Ambiente / Sala:</strong> ${sectorName}</div>
    <div><strong>Unidade Gestora:</strong> ${unit.sigla}</div>
    <div><strong>Data da Vistoria:</strong> ${currentDateFormatted} às ${currentTimeFormatted}</div>
    <div><strong>Responsável pela Vistoria:</strong> ${currentProfile.nome}</div>
    <div><strong>Cargo / Função:</strong> ${currentProfile.cargo || 'Gestora de Patrimônio'}</div>
    <div><strong>Total no ASPEC nesta Sala:</strong> ${aspecRegisteredAssets.length} itens</div>
  </div>

  <div class="summary-cards">
    <div class="card card-ok">
      <span class="card-num">${confirmedPresent.length}</span>
      <strong>BENS CONFORMES (COM OK)</strong><br />
      Presença física confirmada no local. Mantém no ASPEC sem alteração.
    </div>
    <div class="card card-in">
      <span class="card-num">${physicalFindingsInRoom.length}</span>
      <strong>ENTRADAS NO ASPEC NESTA SALA</strong><br />
      Achados físicos na sala. Requer transferência ou inclusão no ASPEC.
    </div>
    <div class="card card-out">
      <span class="card-num">${markedMissing.length}</span>
      <strong>SAÍDAS / NÃO VISTOS (COM X)</strong><br />
      Constavam no documento, mas não estão na sala. Em apuração.
    </div>
  </div>

  <!-- TABELA 1: ENTRADAS / TRANSFERÊNCIAS PARA ESTA SALA -->
  <div class="section-title">
    <span>1. O Que Dar Entrada no ASPEC para esta Sala (Bens Encontrados Fisicamente Aqui)</span>
    <span>${physicalFindingsInRoom.length} item(ns)</span>
  </div>
  ${physicalFindingsInRoom.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th style="width: 75px;">Tombo</th>
          <th style="width: 75px;">SESA (6d)</th>
          <th>Descrição do Bem Físico</th>
          <th style="width: 140px;">Onde Constava no ASPEC</th>
          <th>Ação Exata a Fazer no Sistema ASPEC</th>
        </tr>
      </thead>
      <tbody>
        ${physicalFindingsInRoom.map(a => `
          <tr>
            <td style="font-family: monospace; font-weight: bold;">${a.tombamento}</td>
            <td style="font-family: monospace; color: #1d4ed8;">${a.tomboOrigemSesa || '—'}</td>
            <td>
              <strong>${a.descricao}</strong>
              ${a.semPlaqueta ? '<br /><span style="color:#b45309;font-weight:bold;">[SEM PLAQUETA / NOVO EMPLACAMENTO]</span>' : ''}
              ${a.numeroSerie ? `<br /><span style="color:#64748b;font-size:8.5px;">S/N: ${a.numeroSerie}</span>` : ''}
            </td>
            <td style="background: #fefce8; color: #854d0e; font-weight: 600;">
              ${a.foraDoAspec ? 'NÃO CONSTAVA NO ASPEC' : (a.setorNome || 'Outro Setor')}
            </td>
            <td>
              ${a.foraDoAspec ? `
                <span class="tag-incluir">[INCLUSÃO CONTÁBIL]</span><br />
                Cadastrar no ASPEC com carga no <strong>${sectorName}</strong>.
              ` : `
                <span class="tag-transf">[TRANSFERÊNCIA INTERNA]</span><br />
                Transferir carga no ASPEC: de "<strong>${a.setorNome}</strong>" ➔ para "<strong>${sectorName}</strong>".
              `}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : `
    <div class="empty-msg">Nenhum bem de outra sala ou fora do ASPEC foi encontrado neste ambiente.</div>
  `}

  <!-- TABELA 2: SAÍDAS / BENS COM X (NÃO ENCONTRADOS NESTA SALA) -->
  <div class="section-title" style="margin-top: 16px;">
    <span>2. O Que Retirar ou Apurar no ASPEC desta Sala (Bens que Constavam no Papel mas Não Estão Aqui)</span>
    <span>${markedMissing.length} item(ns)</span>
  </div>
  ${markedMissing.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th style="width: 75px;">Tombo</th>
          <th style="width: 75px;">SESA (6d)</th>
          <th>Descrição do Bem Não Localizado</th>
          <th style="width: 140px;">Situação Cadastral</th>
          <th>Ação Exata a Fazer no Sistema ASPEC</th>
        </tr>
      </thead>
      <tbody>
        ${markedMissing.map(a => `
          <tr>
            <td style="font-family: monospace; font-weight: bold;">${a.tombamento}</td>
            <td style="font-family: monospace; color: #1d4ed8;">${a.tomboOrigemSesa || '—'}</td>
            <td><strong>${a.descricao}</strong></td>
            <td style="background: #fef2f2; color: #991b1b; font-weight: 600;">Lotação Original nesta Sala</td>
            <td>
              <span class="tag-apurar">[EM APURAÇÃO / AGUARDAR OUTRAS SALAS]</span><br />
              NÃO dar baixa agora. Se for encontrado em outra sala durante a vistoria, o sistema gerará a transferência correspondente.
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : `
    <div class="empty-msg">Nenhum bem ficou faltando nesta sala! Todos os itens do documento foram localizados.</div>
  `}

  <!-- TABELA 3: BENS MANTIDOS (OK) -->
  <div class="section-title" style="margin-top: 16px;">
    <span>3. Bens Mantidos Conformes nesta Sala (${confirmedPresent.length} itens)</span>
    <span style="font-size: 9.5px; color: #166534; font-weight: bold;">Dispensa Alteração no ASPEC</span>
  </div>
  <div style="font-size: 9.5px; color: #475569; background: #f8fafc; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 4px; line-height: 1.5;">
    ${confirmedPresent.length > 0 ? confirmedPresent.map(a => `<strong>[${a.tombamento}]</strong> ${a.descricao}`).join(' &nbsp;·&nbsp; ') : 'Nenhum item confirmado ainda.'}
  </div>

  <div class="signatures">
    <div class="sig-grid">
      <div>
        <div class="sig-line"></div>
        <strong>${currentProfile.nome}</strong><br />
        Gestora de Patrimônio / Presidente da Comissão<br />
        CPSMS
      </div>
      <div>
        <div class="sig-line"></div>
        <strong>Setor de Contabilidade / Sistema ASPEC</strong><br />
        Responsável pelo Lançamento das Alterações<br />
        [ &nbsp; ] Lançamentos Executados no ASPEC
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    const html = generatePrintableHtml();
    executePrintHtml({
      title: `Termo de Vistoria e Espelho ASPEC — ${sectorName}`,
      html,
      filename: `termo_aspec_${sectorName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`,
      onStatus: (st) => {
        if (st) {
          setStatusMsg(st.message);
          setTimeout(() => setStatusMsg(null), 5000);
        }
      }
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'Sala / Ambiente',
      'Tipo de Operação no ASPEC',
      'Nº Tombo',
      'Tombo SESA (se houver)',
      'Descrição do Bem',
      'Onde Constava no ASPEC',
      'Onde Está Fisicamente',
      'AÇÃO EXATA A FAZER NO ASPEC'
    ];

    const rows: string[][] = [];

    // Entradas
    physicalFindingsInRoom.forEach(a => {
      rows.push([
        `"${sectorName}"`,
        '"ENTRADA NO ASPEC (TRANSFERÊNCIA / INCLUSÃO)"',
        `"${a.tombamento}"`,
        `"${a.tomboOrigemSesa || ''}"`,
        `"${a.descricao.replace(/"/g, '""')}"`,
        `"${a.foraDoAspec ? 'NÃO CONSTAVA NO ASPEC' : a.setorNome}"`,
        `"${sectorName}"`,
        `"${a.foraDoAspec ? `Incluir no ASPEC com carga em ${sectorName}` : `Transferir carga no ASPEC de ${a.setorNome} para ${sectorName}`}"`
      ]);
    });

    // Saídas
    markedMissing.forEach(a => {
      rows.push([
        `"${sectorName}"`,
        '"SAÍDA NO ASPEC (EM APURAÇÃO / NÃO VISTO)"',
        `"${a.tombamento}"`,
        `"${a.tomboOrigemSesa || ''}"`,
        `"${a.descricao.replace(/"/g, '""')}"`,
        `"${sectorName}"`,
        '"NÃO ENCONTRADO NESTA SALA"',
        '"Em apuração; aguardar vistoria das outras salas antes de baixar no ASPEC"'
      ]);
    });

    const csvContent = headers.join(';') + '\n' + rows.map(r => r.join(';')).join('\n');
    downloadCsvFile(csvContent, `ajustes_aspec_${sectorName.replace(/\s+/g, '_')}.csv`);
    setStatusMsg('Planilha exportada com sucesso!');
    setTimeout(() => setStatusMsg(null), 4000);
  };

  if (!isOpen || !sector) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="printable-modal-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                  {unit.sigla}
                </span>
                <span className="text-xs text-slate-400">Fechamento Sala a Sala</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                Espelho ASPEC: {sectorName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Imprimir termo em folha A4 oficial"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Termo (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Exportar dados para Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {statusMsg && (
          <div className="m-3 p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-xs font-semibold border border-emerald-300 flex items-center justify-between">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg(null)}>✕</button>
          </div>
        )}

        {/* Body */}
        <div className="printable-report-scroll-container overflow-y-auto flex-1 p-4 sm:p-6 space-y-5 text-xs text-slate-800 dark:text-slate-200">
          
          {/* Summary Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20">
              <span className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-400 block">
                {confirmedPresent.length}
              </span>
              <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-xs">
                Bens Mantidos (OK)
              </span>
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300">
                Conformes no ASPEC. Dispensa alteração contábil.
              </span>
            </div>

            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20">
              <span className="text-xl font-mono font-black text-amber-700 dark:text-amber-400 block">
                {physicalFindingsInRoom.length}
              </span>
              <span className="font-bold text-amber-900 dark:text-amber-200 block text-xs">
                Entradas a Lançar no ASPEC
              </span>
              <span className="text-[10px] text-amber-800 dark:text-amber-300">
                Achados físicos que requerem transferência ou inclusão para cá.
              </span>
            </div>

            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/20">
              <span className="text-xl font-mono font-black text-rose-700 dark:text-rose-400 block">
                {markedMissing.length}
              </span>
              <span className="font-bold text-rose-900 dark:text-rose-200 block text-xs">
                Saídas / Não Vistos (com X)
              </span>
              <span className="text-[10px] text-rose-800 dark:text-rose-300">
                Constavam no documento mas não foram vistos nesta sala.
              </span>
            </div>
          </div>

          {/* Section 1: Entradas no ASPEC */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                <span>1. O Que Dar Entrada no ASPEC para esta Sala ({physicalFindingsInRoom.length} itens)</span>
              </h4>
              <span className="text-[10px] text-slate-500">Achados Físicos nesta Localização</span>
            </div>

            {physicalFindingsInRoom.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-750">
                      <th className="p-2.5">Tombo</th>
                      <th className="p-2.5">Descrição do Bem</th>
                      <th className="p-2.5">No ASPEC Pertencia a:</th>
                      <th className="p-2.5">Ação Contábil Exata no ASPEC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {physicalFindingsInRoom.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                        <td className="p-2.5 font-mono font-bold">
                          {a.tombamento}
                          {a.tomboOrigemSesa && (
                            <div className="text-[10px] text-blue-600 font-mono">SESA: {a.tomboOrigemSesa}</div>
                          )}
                        </td>
                        <td className="p-2.5">
                          <strong>{a.descricao}</strong>
                          {a.semPlaqueta && (
                            <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                              [Sem Plaqueta]
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-amber-700 dark:text-amber-400 font-semibold">
                          {a.foraDoAspec ? 'NÃO CONSTAVA NO ASPEC' : a.setorNome}
                        </td>
                        <td className="p-2.5">
                          {a.foraDoAspec ? (
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              Inclusão / Cadastro com carga em "{sector.nome}"
                            </span>
                          ) : (
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              Transferência Interna no ASPEC: de "{a.setorNome}" ➔ para "{sector.nome}"
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 text-center bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-[11px]">
                Nenhum bem de outra sala foi encontrado neste ambiente.
              </div>
            )}
          </div>

          {/* Section 2: Saídas / Marcados com X */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>2. O Que Retirar ou Apurar no ASPEC desta Sala ({markedMissing.length} itens)</span>
              </h4>
              <span className="text-[10px] text-slate-500">Bens com X (Não Vistos Aqui)</span>
            </div>

            {markedMissing.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-750">
                      <th className="p-2.5">Tombo</th>
                      <th className="p-2.5">Descrição do Bem</th>
                      <th className="p-2.5">Situação Atual</th>
                      <th className="p-2.5">Ação Contábil Exata no ASPEC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {markedMissing.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                        <td className="p-2.5 font-mono font-bold text-rose-600">
                          {a.tombamento}
                        </td>
                        <td className="p-2.5 font-semibold">
                          {a.descricao}
                        </td>
                        <td className="p-2.5 text-rose-700 dark:text-rose-400 font-semibold">
                          Não Localizado nesta Sala
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                          <strong>Aguardar término das demais salas.</strong> NÃO dar baixa contábil de imediato.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 text-center bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                ✓ Nenhum bem ausente! Todos os itens do documento foram localizados na sala.
              </div>
            )}
          </div>

          {/* Section 3: Bens Conformes (OK) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Bens Mantidos Conformes nesta Sala ({confirmedPresent.length} itens)</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">100% Corretos no ASPEC</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Estes bens estavam cadastrados no ASPEC exatamente neste ambiente e sua presença foi devidamente confirmada. Não requerem qualquer alteração no sistema contábil.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-500">
            Termo específico da sala <strong>{sector.nome}</strong> pronto para envio ao setor contábil.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Termo Desta Sala</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
