import React, { useState, useMemo } from 'react';
import { Asset, Sector, UnitInfo, UserProfile } from '../types';
import { formatBRL, formatDate, downloadCsvFile } from '../utils/formatters';
import { executePrintHtml, downloadPrintableHtml, openPrintableInNewWindow } from '../utils/printHelper';
import { 
  Printer, 
  X, 
  Download, 
  FileCode, 
  ExternalLink, 
  Search, 
  AlertTriangle, 
  ArrowRightLeft, 
  PlusCircle, 
  CheckCircle2, 
  HelpCircle, 
  Building2, 
  Layers, 
  Sparkles,
  Info
} from 'lucide-react';

interface AspecReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  sectors: Sector[];
  currentProfile: UserProfile;
}

type ReconciliationFilter = 'todos' | 'remanejamentos' | 'faltando_sala' | 'fora_aspec' | 'casamentos';

export const AspecReconciliationModal: React.FC<AspecReconciliationModalProps> = ({
  isOpen,
  onClose,
  assets,
  sectors,
  currentProfile,
}) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const [activeTabFilter, setActiveTabFilter] = useState<ReconciliationFilter>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Available Units
  const availableUnits: { id: string; nome: string; sigla: string }[] = [
    { id: 'all', nome: 'Todas as Unidades do Consórcio', sigla: 'Geral CPSMS' },
    { id: 'policlinica', nome: 'Policlínica Regional Bernardo Félix da Silva', sigla: 'Policlínica' },
    { id: 'ceo', nome: 'CEO – Centro de Especialidades Odontológicas Regional', sigla: 'CEO Sobral' },
    { id: 'sede-cpsms', nome: 'Sede Administrativa do Consórcio CPSMS', sigla: 'Sede CPSMS' },
    { id: 'cer', nome: 'CER – Centro Especializado em Reabilitação', sigla: 'CER' },
  ];

  // Filter assets by selected unit
  const filteredByUnitAssets = useMemo(() => {
    if (selectedUnit === 'all') return assets;
    return assets.filter(a => {
      if (selectedUnit === 'policlinica') return a.unidadeId === 'policlinica' || a.unidadeNome.toLowerCase().includes('poli');
      if (selectedUnit === 'ceo') return a.unidadeId === 'ceo' || a.unidadeNome.toLowerCase().includes('ceo');
      if (selectedUnit === 'sede-cpsms') return a.unidadeId === 'sede-cpsms' || a.unidadeNome.toLowerCase().includes('sede');
      if (selectedUnit === 'cer') return a.unidadeId === 'cer' || a.unidadeNome.toLowerCase().includes('cer');
      return true;
    });
  }, [assets, selectedUnit]);

  // Distinct sectors available for the current unit
  const distinctSectors = useMemo(() => {
    const set = new Set<string>();
    filteredByUnitAssets.forEach(a => {
      if (a.setorNome) set.add(a.setorNome.trim());
      if (a.auditoria?.setorEncontrado) set.add(a.auditoria.setorEncontrado.trim());
    });
    return Array.from(set).sort();
  }, [filteredByUnitAssets]);

  // Categorize ASPEC Alterations
  // 1. Remanejamentos no ASPEC: Bens encontrados em sala diferente da cadastrada
  const remanejamentos = useMemo(() => {
    return filteredByUnitAssets.filter(a => {
      if (a.foraDoAspec) return false;
      const originalSetor = (a.setorNome || '').trim().toLowerCase();
      const setorEncontrado = (a.auditoria?.setorEncontrado || '').trim().toLowerCase();
      return (
        (a.auditoria?.statusDivergencia === 'setor_divergente' || (setorEncontrado && setorEncontrado !== originalSetor)) &&
        a.auditoria?.conferido
      );
    });
  }, [filteredByUnitAssets]);

  // 2. Faltando na Sala no ASPEC: Bens que o ASPEC diz que estão na sala, mas não foram vistos nela
  const faltandoNaSala = useMemo(() => {
    return filteredByUnitAssets.filter(a => {
      if (a.foraDoAspec) return false;
      return a.auditoria?.statusDivergencia === 'nao_encontrado';
    });
  }, [filteredByUnitAssets]);

  // 3. Fora do ASPEC: Bens físicos encontrados que não estão no sistema contábil
  const foraDoAspec = useMemo(() => {
    return filteredByUnitAssets.filter(a => a.foraDoAspec);
  }, [filteredByUnitAssets]);

  // 4. Casamentos Cruzados (Cross-matches): O bem que faltava na Sala A foi localizado na Sala B!
  const casamentos = useMemo(() => {
    const list: { asset: Asset; salaOriginalAspec: string; salaOndeFoiAchado: string }[] = [];
    remanejamentos.forEach(a => {
      const original = a.setorNome || 'Setor Não Informado';
      const real = a.auditoria?.setorEncontrado || 'Outra Sala';
      list.push({
        asset: a,
        salaOriginalAspec: original,
        salaOndeFoiAchado: real
      });
    });
    return list;
  }, [remanejamentos]);

  // Quick lookup result for field check
  const lookupResult = useMemo(() => {
    if (!lookupQuery.trim()) return null;
    const q = lookupQuery.trim().toLowerCase();
    const match = assets.find(a => 
      a.tombamento.toLowerCase() === q || 
      a.tombamento.toLowerCase().includes(q) ||
      (a.tomboOrigemSesa && a.tomboOrigemSesa.toLowerCase() === q)
    );
    return match || null;
  }, [assets, lookupQuery]);

  // Filtered list to display in table
  const displayedItems = useMemo(() => {
    let list: {
      asset: Asset;
      tipo: 'remanejamento' | 'faltando' | 'fora_aspec' | 'casamento';
      acaoAspec: string;
      salaAspec: string;
      salaReal: string;
    }[] = [];

    if (activeTabFilter === 'casamentos') {
      casamentos.forEach(c => {
        list.push({
          asset: c.asset,
          tipo: 'casamento',
          acaoAspec: `🎯 CASAMENTO CONFIRMADO: O bem constava no ASPEC no setor "${c.salaOriginalAspec}", mas foi achado e conferido na sala "${c.salaOndeFoiAchado}". NÃO houve perda! Ação no ASPEC: Transferência Interna de Carga de "${c.salaOriginalAspec}" para "${c.salaOndeFoiAchado}".`,
          salaAspec: c.salaOriginalAspec,
          salaReal: c.salaOndeFoiAchado
        });
      });
    } else if (activeTabFilter === 'remanejamentos') {
      remanejamentos.forEach(a => {
        list.push({
          asset: a,
          tipo: 'remanejamento',
          acaoAspec: `Transferir carga no ASPEC: de "${a.setorNome}" ➔ para "${a.auditoria?.setorEncontrado || 'Sala Encontrada'}"`,
          salaAspec: a.setorNome || '—',
          salaReal: a.auditoria?.setorEncontrado || '—'
        });
      });
    } else if (activeTabFilter === 'todos') {
      remanejamentos.forEach(a => {
        list.push({
          asset: a,
          tipo: 'remanejamento',
          acaoAspec: `Transferir carga no ASPEC: de "${a.setorNome}" ➔ para "${a.auditoria?.setorEncontrado || 'Sala Encontrada'}"`,
          salaAspec: a.setorNome || '—',
          salaReal: a.auditoria?.setorEncontrado || '—'
        });
      });
    }

    if (activeTabFilter === 'todos' || activeTabFilter === 'faltando_sala') {
      faltandoNaSala.forEach(a => {
        // Verificar se esse bem já foi achado em outra sala
        const jaAchado = remanejamentos.some(r => r.id === a.id);
        if (!jaAchado) {
          list.push({
            asset: a,
            tipo: 'faltando',
            acaoAspec: `Aguardar término do inventário nas outras salas antes de dar baixa; verificar se está em trânsito.`,
            salaAspec: a.setorNome || '—',
            salaReal: 'NÃO LOCALIZADO NA SALA'
          });
        }
      });
    }

    if (activeTabFilter === 'todos' || activeTabFilter === 'fora_aspec') {
      foraDoAspec.forEach(a => {
        list.push({
          asset: a,
          tipo: 'fora_aspec',
          acaoAspec: `Cadastrar / Incluir no ASPEC como incorporação de bem físico na sala "${a.setorNome}".`,
          salaAspec: 'NÃO CONSTAVA NO ASPEC',
          salaReal: a.setorNome || a.auditoria?.setorEncontrado || '—'
        });
      });
    }

    // Filter by sector if selected
    if (selectedSectorFilter !== 'all') {
      const s = selectedSectorFilter.toLowerCase();
      list = list.filter(item => 
        item.salaAspec.toLowerCase() === s || 
        item.salaReal.toLowerCase() === s
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.asset.tombamento.toLowerCase().includes(q) ||
        item.asset.descricao.toLowerCase().includes(q) ||
        (item.asset.tomboOrigemSesa || '').toLowerCase().includes(q) ||
        item.salaAspec.toLowerCase().includes(q) ||
        item.salaReal.toLowerCase().includes(q) ||
        item.acaoAspec.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeTabFilter, remanejamentos, faltandoNaSala, foraDoAspec, selectedSectorFilter, searchQuery]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'Nº Tombo CPSMS',
      'Tombo SESA (se houver)',
      'Descrição do Bem',
      'Origem do Tombo',
      'Unidade',
      'Sala Cadastrada no ASPEC',
      'Sala Física Onde Está Realmente',
      'Tipo de Divergência',
      'AÇÃO EXATA A FAZER NO ASPEC',
      'Valor Histórico (R$)',
      'Responsável do Bem'
    ];

    const rows = displayedItems.map(item => {
      const tipoLabel = 
        item.tipo === 'casamento' ? 'Casamento Cruzado (Localizado)' :
        item.tipo === 'remanejamento' ? 'Remanejamento de Sala' :
        item.tipo === 'faltando' ? 'Falta na Sala Original' :
        'Bem Fora do ASPEC (Inclusão)';

      return [
        `"${item.asset.tombamento}"`,
        `"${item.asset.tomboOrigemSesa || ''}"`,
        `"${item.asset.descricao.replace(/"/g, '""')}"`,
        `"${item.asset.origemTombo}"`,
        `"${item.asset.unidadeNome}"`,
        `"${item.salaAspec}"`,
        `"${item.salaReal}"`,
        `"${tipoLabel}"`,
        `"${item.acaoAspec.replace(/"/g, '""')}"`,
        (item.asset.valorAquisicao || item.asset.valorBrutoContabil || 0).toFixed(2).replace('.', ','),
        `"${item.asset.responsavelNome}"`
      ];
    });

    const csvContent = headers.join(';') + '\n' + rows.map(r => r.join(';')).join('\n');
    downloadCsvFile(csvContent, `espelho_alteracoes_aspec_${new Date().toISOString().slice(0, 10)}.csv`);
    setStatusMsg('Planilha de conciliação ASPEC gerada com sucesso!');
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // Generate Standalone Printable HTML
  const generatePrintableHtml = (): string => {
    const now = new Date();
    const currentDateFormatted = now.toLocaleDateString('pt-BR');
    const currentTimeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Espelho de Conciliação Físico vs ASPEC - CPSMS</title>
  <style>
    @page { size: A4 landscape; margin: 12mm 12mm 12mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; line-height: 1.4; padding: 15px; margin: 0; background: #fff; font-size: 11px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .gov { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #475569; }
    .org { font-size: 13px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 2px; }
    .unit { font-size: 10px; color: #64748b; }
    .title-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 4px; text-align: center; font-weight: 900; font-size: 12px; text-transform: uppercase; margin: 10px 0; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 10px; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; margin-bottom: 12px; }
    .guidance-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 10px; font-size: 10px; margin-bottom: 12px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px; }
    th { background: #0f172a; color: white; border: 1px solid #334155; padding: 5px 6px; text-align: left; font-size: 9.5px; text-transform: uppercase; }
    td { border: 1px solid #cbd5e1; padding: 5px 6px; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .tag-remanejamento { color: #b45309; font-weight: bold; }
    .tag-faltando { color: #b91c1c; font-weight: bold; }
    .tag-fora { color: #047857; font-weight: bold; }
    .signatures { margin-top: 28px; page-break-inside: avoid; }
    .sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; font-size: 10px; }
    .sig-line { border-bottom: 1px solid #0f172a; margin-bottom: 6px; padding-bottom: 25px; }
    .no-print { margin-bottom: 15px; display: flex; gap: 10px; justify-content: flex-end; }
    .btn { background: #10b981; color: #0f172a; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 12px; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  </div>

  <div class="header">
    <div class="gov">ESTADO DO CEARÁ · CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS</div>
    <div class="org">GERÊNCIA DE PATRIMÔNIO · CONTROLE INTERNO</div>
    <div class="unit">POLICLÍNICA REGIONAL BERNARDO FÉLIX DA SILVA & CEO REGIONAL SOBRAL</div>
  </div>

  <div class="title-box">
    ESPELHO DE CONCILIAÇÃO FÍSICO VS ASPEC — MAPA DE AJUSTES CONTÁBEIS E REMANEJAMENTOS SALA A SALA
  </div>

  <div class="meta-grid">
    <div><strong>Data de Emissão:</strong> ${currentDateFormatted} às ${currentTimeFormatted}</div>
    <div><strong>Responsável pela Vistoria:</strong> ${currentProfile.nome}</div>
    <div><strong>Unidade Selecionada:</strong> ${availableUnits.find(u => u.id === selectedUnit)?.sigla || 'Geral'}</div>
    <div><strong>Total de Apurações:</strong> ${displayedItems.length} registros</div>
  </div>

  <div class="guidance-box">
    <strong>INSTRUÇÃO TÉCNICA PARA O SETOR DE CONTABILIDADE (SISTEMA ASPEC):</strong><br />
    1. <strong>Trocas Informais / Remanejamentos:</strong> O bem continua existindo no patrimônio, porém fisicamente alocado em sala diversa. Ação no ASPEC: <u>Transferência Interna de Carga / Movimentação</u>.<br />
    2. <strong>Bens Não Localizados na Sala:</strong> Ficam em apuração até o término do inventário de todas as unidades, visto que grande parte é encontrada em outras salas no decorrer da vistoria.<br />
    3. <strong>Bens Físicos Fora do ASPEC:</strong> Itens físicos identificados em campo sem cadastro prévio no ASPEC. Ação: <u>Inclusão / Tombamento Novo ou Registro em Contas de Compensação (se cedido por SESA/UFC)</u>.
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 80px;">Tombo</th>
        <th style="width: 80px;">SESA (6d)</th>
        <th>Descrição do Item</th>
        <th style="width: 140px;">Sala no ASPEC</th>
        <th style="width: 140px;">Sala Onde Foi Visto</th>
        <th>O que Alterar no ASPEC (Ação Contábil)</th>
        <th style="width: 85px; text-align: right;">Valor (R$)</th>
      </tr>
    </thead>
    <tbody>
      ${displayedItems.map(item => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${item.asset.tombamento}</td>
          <td style="font-family: monospace; color: #1d4ed8;">${item.asset.tomboOrigemSesa || '—'}</td>
          <td>
            <strong>${item.asset.descricao}</strong><br />
            <span style="font-size: 8.5px; color: #64748b;">${item.asset.origemTombo} · ${item.asset.responsavelNome}</span>
          </td>
          <td style="background: #fef2f2; color: #991b1b; font-weight: 600;">${item.salaAspec}</td>
          <td style="background: #f0fdf4; color: #166534; font-weight: bold;">${item.salaReal}</td>
          <td>
            <span class="${item.tipo === 'remanejamento' ? 'tag-remanejamento' : item.tipo === 'faltando' ? 'tag-faltando' : 'tag-fora'}">
              [${item.tipo === 'remanejamento' ? 'REMANEJAR' : item.tipo === 'faltando' ? 'EM APURAÇÃO' : 'INCLUIR'}]
            </span>
            ${item.acaoAspec}
          </td>
          <td style="text-align: right; font-family: monospace;">${formatBRL(item.asset.valorAquisicao || item.asset.valorBrutoContabil || 0)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-grid">
      <div>
        <div class="sig-line"></div>
        <strong>${currentProfile.nome}</strong><br />
        Gestora de Patrimônio<br />
        CPSMS
      </div>
      <div>
        <div class="sig-line"></div>
        <strong>Contadora Geral do CPSMS</strong><br />
        Setor Contábil / Sistema ASPEC<br />
        [  ] Ciente para Ajustes no Sistema
      </div>
      <div>
        <div class="sig-line"></div>
        <strong>Diretoria Executiva do CPSMS</strong><br />
        Homologação e Autorização<br />
        CPSMS
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    const html = generatePrintableHtml();
    executePrintHtml({
      title: 'Espelho de Conciliação Físico vs ASPEC',
      html,
      filename: `espelho_aspec_${new Date().toISOString().slice(0, 10)}.html`,
      onStatus: (status) => {
        if (status) {
          setStatusMsg(status.message);
          setTimeout(() => setStatusMsg(null), 6000);
        }
      }
    });
  };

  const handleDownloadHtml = () => {
    const html = generatePrintableHtml();
    downloadPrintableHtml(`espelho_aspec_${new Date().toISOString().slice(0, 10)}.html`, html);
    setStatusMsg('Arquivo HTML para impressão baixado com sucesso!');
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleOpenInNewTab = () => {
    const html = generatePrintableHtml();
    const win = openPrintableInNewWindow(html);
    if (!win) {
      handleDownloadHtml();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="printable-modal-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Espelho de Conciliação Físico vs ASPEC</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                    O Que Alterar no ASPEC
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visualização comparativa para orientar a contabilidade sem alterar ou apagar dados da base atual.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Imprimir espelho para entregar à contabilidade"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Espelho (A4)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Exportar dados para Excel / CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Exportar Planilha</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
                title="Baixar arquivo HTML"
              >
                <FileCode className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
                title="Abrir em Nova Aba"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {statusMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-xs font-medium border border-emerald-300 flex items-center justify-between">
              <span>{statusMsg}</span>
              <button onClick={() => setStatusMsg(null)}>✕</button>
            </div>
          )}

          {/* Practical Guidance Box */}
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 text-xs text-blue-950 dark:text-blue-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-300">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Como resolver as divergências encontradas sem desespero:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] pt-1">
              <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-amber-700 dark:text-amber-400 block">1. Trocas Informais de Sala:</span>
                O bem existe no ASPEC, mas foi movido. <strong>Ação no ASPEC:</strong> Realizar apenas <em>Transferência Interna de Carga</em> para a sala onde ele foi encontrado. Não é baixa!
              </div>
              <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-rose-700 dark:text-rose-400 block">2. Faltando na Sala:</span>
                O documento dizia que estava na sala, mas você não viu. <strong>Ação no ASPEC:</strong> <em>Não dê baixa agora!</em> Em 90% dos casos, ele foi achado em outra sala durante a vistoria.
              </div>
              <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block">3. Bem Físico Fora do ASPEC:</span>
                O bem está na sala, mas não tem tombo ou é placa SESA não lançada. <strong>Ação no ASPEC:</strong> Realizar <em>Inclusão / Cadastro de Imobilizado ou Conta de Controle</em>.
              </div>
            </div>
          </div>

          {/* Quick Tombo Lookup Bar (Ferramenta de Campo) */}
          <div className="p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Consulte qualquer tombo que encontrar na sala (ex: 0142 ou tombo SESA)..."
                className="w-full bg-transparent border-none text-xs text-white placeholder-slate-400 focus:outline-hidden"
              />
              {lookupQuery && (
                <button onClick={() => setLookupQuery('')} className="text-slate-400 hover:text-white text-xs px-2">Limpar</button>
              )}
            </div>

            {lookupQuery && lookupResult && (
              <div className="text-xs font-semibold px-3 py-1 rounded bg-slate-800 border border-slate-700 flex items-center gap-2 shrink-0">
                <span>Tombo <strong>{lookupResult.tombamento}</strong>:</span>
                <span className="text-amber-300">No ASPEC pertence a: <u>{lookupResult.setorNome}</u> ({lookupResult.unidadeNome})</span>
              </div>
            )}

            {lookupQuery && !lookupResult && (
              <div className="text-xs font-semibold px-3 py-1 rounded bg-rose-950 text-rose-300 border border-rose-800 shrink-0">
                ⚠️ Tombo não localizado no ASPEC (Trata-se de bem físico para inclusão).
              </div>
            )}
          </div>
        </div>

        {/* Filters and Metric Cards */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTabFilter('remanejamentos')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTabFilter === 'remanejamentos'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                <span className="font-bold flex items-center gap-1">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Remanejar no ASPEC
                </span>
                <span className="font-mono font-black text-sm">{remanejamentos.length}</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Estavam em outra sala no ASPEC</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('faltando_sala')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTabFilter === 'faltando_sala'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20'
                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                <span className="font-bold flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Faltando na Sala
                </span>
                <span className="font-mono font-black text-sm">{faltandoNaSala.length}</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Não vistos na sala de origem</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('fora_aspec')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTabFilter === 'fora_aspec'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                <span className="font-bold flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5" /> Incluir no ASPEC
                </span>
                <span className="font-mono font-black text-sm">{foraDoAspec.length}</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Bens físicos fora do ASPEC</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('casamentos')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTabFilter === 'casamentos'
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20'
                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-purple-700 dark:text-purple-400">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Casamentos Cruzados
                </span>
                <span className="font-mono font-black text-sm">{casamentos.length}</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Faltava em A, achado em B!</span>
            </button>
          </div>

          {/* Unit, Sector & Text Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Unit Select */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold">Unidade:</span>
                <select
                  value={selectedUnit}
                  onChange={(e) => {
                    setSelectedUnit(e.target.value);
                    setSelectedSectorFilter('all');
                  }}
                  className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                >
                  {availableUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.sigla}</option>
                  ))}
                </select>
              </div>

              {/* Sector Select */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold">Sala / Setor:</span>
                <select
                  value={selectedSectorFilter}
                  onChange={(e) => setSelectedSectorFilter(e.target.value)}
                  className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold max-w-xs"
                >
                  <option value="all">Todas as Salas ({distinctSectors.length})</option>
                  {distinctSectors.map((s, idx) => (
                    <option key={`distinct-sec-${s}-${idx}`} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Tab Filter Button: Todos */}
              <button
                type="button"
                onClick={() => setActiveTabFilter('todos')}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                  activeTabFilter === 'todos' 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Ver Todas ({remanejamentos.length + faltandoNaSala.length + foraDoAspec.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por tombo, descrição..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

        </div>

        {/* Data Table */}
        <div className="printable-report-scroll-container overflow-y-auto flex-1 p-4 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-850 font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-750">
                  <th className="p-3">Tombo</th>
                  <th className="p-3">Descrição do Bem</th>
                  <th className="p-3">📍 Setor no ASPEC</th>
                  <th className="p-3">📍 Setor Encontrado (Real)</th>
                  <th className="p-3">📋 O Que Alterar no ASPEC</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedItems.map((item, idx) => (
                  <tr key={`${item.asset.id}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                    <td className="p-3 align-top">
                      <div className="font-mono font-black text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 inline-block">
                        {item.asset.tombamento}
                      </div>
                      {item.asset.tomboOrigemSesa && (
                        <div className="text-[10px] font-mono text-blue-700 dark:text-blue-300 font-bold mt-1">
                          SESA: {item.asset.tomboOrigemSesa}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.asset.origemTombo.split(' ')[0]}
                      </div>
                    </td>

                    <td className="p-3 align-top max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white leading-tight">
                        {item.asset.descricao}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        {item.asset.numeroSerie && item.asset.numeroSerie !== '-' && (
                          <span>S/N: <strong className="font-mono">{item.asset.numeroSerie}</strong></span>
                        )}
                        <span>Resp: <strong>{item.asset.responsavelNome}</strong></span>
                      </div>
                    </td>

                    <td className="p-3 align-top">
                      <div className="p-1.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 font-medium">
                        {item.salaAspec}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.asset.unidadeNome}
                      </div>
                    </td>

                    <td className="p-3 align-top">
                      <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold">
                        {item.salaReal}
                      </div>
                    </td>

                    <td className="p-3 align-top">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.tipo === 'casamento'
                            ? 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-400'
                            : item.tipo === 'remanejamento'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                            : item.tipo === 'faltando'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                        }`}>
                          {item.tipo === 'casamento' && <Sparkles className="w-3 h-3 text-purple-600" />}
                          {item.tipo === 'remanejamento' && <ArrowRightLeft className="w-3 h-3" />}
                          {item.tipo === 'faltando' && <HelpCircle className="w-3 h-3" />}
                          {item.tipo === 'fora_aspec' && <PlusCircle className="w-3 h-3" />}
                          <span>
                            {item.tipo === 'casamento' ? 'Casamento Cruzado' : item.tipo === 'remanejamento' ? 'Remanejar Carga' : item.tipo === 'faltando' ? 'Em Apuração' : 'Inclusão Nova'}
                          </span>
                        </span>
                        <p className="text-[11px] text-slate-800 dark:text-slate-200 leading-snug">
                          {item.acaoAspec}
                        </p>
                      </div>
                    </td>

                    <td className="p-3 align-top text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatBRL(item.asset.valorAquisicao || item.asset.valorBrutoContabil || 0)}
                    </td>
                  </tr>
                ))}

                {displayedItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          Nenhuma pendência ou alteração encontrada com os filtros selecionados.
                        </p>
                        <p className="text-[11px]">
                          Conforme você for conferindo as salas e marcando divergências ou achados, elas aparecerão aqui automaticamente.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            Mostrando <strong>{displayedItems.length}</strong> alterações mapeadas para levar à contadora do CPSMS.
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
              <span>Imprimir Espelho de Alterações</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
