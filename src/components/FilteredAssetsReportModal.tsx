import React, { useState, useMemo } from 'react';
import { Asset, Sector, UnitInfo, UserProfile } from '../types';
import { formatBRL, formatDate, exportAssetsToCsv } from '../utils/formatters';
import { getFormaAquisicaoBadge } from './AssetsView';
import { 
  Printer, 
  X, 
  FileSpreadsheet, 
  Download,
  Filter, 
  Building2, 
  Calendar, 
  User, 
  DollarSign, 
  ArrowUpDown,
  CheckCircle2,
  Tag,
  Truck,
  ShieldCheck,
  FileText,
  AlertCircle,
  Info
} from 'lucide-react';

interface FilteredAssetsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredAssets: Asset[];
  totalAssetsCount: number;
  currentProfile: UserProfile;
  activeFilters: {
    fornecedor: string;
    formaAquisicao: string;
    unitId: string;
    sectorId: string;
    tomboOrigin: string;
    condition: string;
    searchTerm: string;
  };
  units: UnitInfo[];
  sectors: Sector[];
}

export const FilteredAssetsReportModal: React.FC<FilteredAssetsReportModalProps> = ({
  isOpen,
  onClose,
  filteredAssets,
  totalAssetsCount,
  currentProfile,
  activeFilters,
  units,
  sectors,
}) => {
  const [sortBy, setSortBy] = useState<'tombamento' | 'descricao' | 'valorDesc' | 'valorAsc' | 'formaAquisicao' | 'fornecedor' | 'setor'>('tombamento');
  const [reportType, setReportType] = useState<'analitico' | 'sintetico'>('analitico');
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [itemsLimit, setItemsLimit] = useState<'all' | '50' | '100' | '200'>('all');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // Emission metadata
  const emissionDate = useMemo(() => {
    const now = new Date();
    return {
      dateFormatted: now.toLocaleDateString('pt-BR'),
      timeFormatted: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      protocol: `REL-CPSMS-${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`
    };
  }, []);

  // Names of active filter entities
  const unitLabel = useMemo(() => {
    if (activeFilters.unitId === 'all') return 'Todas as Unidades (Consórcio CPSMS)';
    return units.find(u => u.id === activeFilters.unitId)?.nome || activeFilters.unitId;
  }, [activeFilters.unitId, units]);

  const sectorLabel = useMemo(() => {
    if (activeFilters.sectorId === 'all') return 'Todos os Setores';
    return sectors.find(s => s.id === activeFilters.sectorId)?.nome || activeFilters.sectorId;
  }, [activeFilters.sectorId, sectors]);

  // Sort assets according to selected option
  const sortedAssets = useMemo(() => {
    const list = [...filteredAssets];
    list.sort((a, b) => {
      switch (sortBy) {
        case 'tombamento': {
          const numA = parseInt(a.tombamento.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.tombamento.replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) return numA - numB;
          return a.tombamento.localeCompare(b.tombamento, 'pt-BR');
        }
        case 'descricao':
          return a.descricao.localeCompare(b.descricao, 'pt-BR');
        case 'valorDesc':
          return (b.valorAquisicao || 0) - (a.valorAquisicao || 0);
        case 'valorAsc':
          return (a.valorAquisicao || 0) - (b.valorAquisicao || 0);
        case 'formaAquisicao':
          return (a.formaAquisicao || '').localeCompare(b.formaAquisicao || '', 'pt-BR');
        case 'fornecedor':
          return (a.fornecedor || '').localeCompare(b.fornecedor || '', 'pt-BR');
        case 'setor':
          return (a.setorNome || '').localeCompare(b.setorNome || '', 'pt-BR');
        default:
          return 0;
      }
    });

    if (itemsLimit !== 'all') {
      const limit = parseInt(itemsLimit, 10);
      return list.slice(0, limit);
    }
    return list;
  }, [filteredAssets, sortBy, itemsLimit]);

  // Statistics for this specific filtered subset
  const totalValue = useMemo(() => {
    return sortedAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0);
  }, [sortedAssets]);

  const formaAquisicaoBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; totalVal: number }>();
    sortedAssets.forEach(a => {
      const forma = (a.formaAquisicao || 'Compra / Pregão').trim();
      const cur = map.get(forma) || { count: 0, totalVal: 0 };
      cur.count += 1;
      cur.totalVal += (a.valorAquisicao || a.valorBrutoContabil || 0);
      map.set(forma, cur);
    });
    return Array.from(map.entries())
      .map(([forma, data]) => ({ forma, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [sortedAssets]);

  const fornecedoresCount = useMemo(() => {
    const set = new Set<string>();
    sortedAssets.forEach(a => {
      if (a.fornecedor && a.fornecedor !== 'Não informado' && a.fornecedor !== '-') {
        set.add(a.fornecedor.trim());
      }
    });
    return set.size;
  }, [sortedAssets]);

  // Generates complete, beautiful self-contained HTML for printing and downloading
  const generateStandaloneHtml = (): string => {
    const rowsHtml = sortedAssets.map((asset, index) => {
      const val = asset.valorAquisicao || asset.valorBrutoContabil || 0;
      return `
        <tr>
          <td style="text-align:center;font-size:10px;color:#64748b;font-family:monospace;">${index + 1}</td>
          <td style="font-family:monospace;font-weight:bold;white-space:nowrap;">
            ${asset.tombamento}
            <div style="font-size:9px;color:#64748b;font-family:sans-serif;">${asset.origemTombo.split(' ')[0]}</div>
          </td>
          <td style="font-weight:500;">
            ${(asset.descricao || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            ${asset.numeroSerie && asset.numeroSerie !== '-' ? `<div style="font-size:9px;color:#64748b;font-family:monospace;">S/N: ${asset.numeroSerie}</div>` : ''}
          </td>
          <td style="font-weight:bold;color:#1e3a8a;">${asset.formaAquisicao || 'Compra / Pregão'}</td>
          <td style="font-weight:600;color:#334155;">${(asset.fornecedor || 'Fornecedor Cadastrado').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          <td style="font-size:10px;">
            <div style="font-weight:bold;color:#0f172a;">${asset.setorNome}</div>
            ${asset.subsetorNome ? `<div style="color:#64748b;">${asset.subsetorNome}</div>` : ''}
            <div style="font-size:9px;color:#94a3b8;">${asset.unidadeNome}</div>
          </td>
          <td style="text-align:right;font-family:monospace;font-weight:bold;white-space:nowrap;">
            ${val > 0 ? formatBRL(val) : 'R$ 0,00'}
          </td>
          <td style="text-align:center;font-weight:600;font-size:10px;">${asset.estado}</td>
          ${reportType === 'analitico' ? `<td style="font-size:10px;color:#475569;">${asset.responsavelNome}</td>` : ''}
        </tr>
      `;
    }).join('');

    const formaBreakdownHtml = formaAquisicaoBreakdown.map(item => `
      <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:2px 0;font-size:11px;">
        <span style="font-weight:600;">${item.forma}</span>
        <span style="font-weight:bold;">${item.count} <span style="font-size:10px;font-weight:normal;color:#64748b;">(${formatBRL(item.totalVal)})</span></span>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Bens Patrimoniais - CPSMS</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #0f172a; background: #fff; }
    .print-bar { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: white; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
    .btn { background: #10b981; color: #0f172a; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .btn-close { background: #334155; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; font-family: Georgia, serif; }
    .header .gov { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #334155; letter-spacing: 1px; }
    .header .org { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 2px; }
    .header .unit { font-size: 11px; color: #475569; }
    .header .title { display: inline-block; font-size: 16px; font-weight: 900; text-transform: uppercase; background: #f1f5f9; padding: 6px 16px; border: 1px solid #cbd5e1; border-radius: 4px; margin-top: 10px; }
    .meta-bar { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 8px; }
    .filters-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 16px; font-size: 11px; }
    .filters-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 6px; }
    .filter-item { background: #fff; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 4px; }
    .filter-lbl { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600; display: block; }
    .filter-val { font-weight: bold; color: #0f172a; }
    .metrics-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .metric-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
    .metric-dark { background: #0f172a; color: #fff; border-color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 6px; text-align: left; font-size: 11px; font-weight: bold; }
    td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; font-weight: bold; }
    .signatures { margin-top: 30px; page-break-inside: avoid; font-family: Georgia, serif; }
    .sig-decl { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; font-size: 11px; font-family: sans-serif; line-height: 1.5; margin-bottom: 30px; }
    .sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; text-align: center; font-size: 11px; }
    .sig-line { border-bottom: 1px solid #0f172a; margin-bottom: 8px; padding-bottom: 40px; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print print-bar">
    <div>
      <strong>CPSMS · Visualizador de Impressão</strong> · ${sortedAssets.length} itens selecionados
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
      <button class="btn-close" onclick="window.close()">✖ Fechar</button>
    </div>
  </div>

  <div class="header">
    <div class="gov">ESTADO DO CEARÁ · GOVERNO DO ESTADO DO CEARÁ</div>
    <div class="org">CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS</div>
    <div class="unit">POLICLÍNICA REGIONAL BERNARDO FÉLIX DA SILVA & CEO REGIONAL SOBRAL</div>
    <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">
      GERÊNCIA DE PATRIMÔNIO E BENS MÓVEIS · CONTROLE E PRESTAÇÃO DE CONTAS
    </div>
    <div>
      <div class="title">RELATÓRIO DE BENS PATRIMONIAIS ${activeFilters.fornecedor !== 'all' ? 'POR FORNECEDOR' : activeFilters.formaAquisicao !== 'all' ? 'POR FORMA DE AQUISIÇÃO' : 'GERENCIAL'}</div>
    </div>
    <div class="meta-bar">
      <div><strong>Protocolo:</strong> ${emissionDate.protocol}</div>
      <div><strong>Emissão:</strong> ${emissionDate.dateFormatted} às ${emissionDate.timeFormatted}</div>
      <div><strong>Emitido por:</strong> ${currentProfile.nome} (${currentProfile.cargo || 'Gestora de Patrimônio'})</div>
    </div>
  </div>

  <div class="filters-box">
    <div style="font-weight:bold;text-transform:uppercase;font-size:11px;color:#334155;">
      Parâmetros e Filtros Aplicados (${sortedAssets.length} de ${totalAssetsCount} bens totais)
    </div>
    <div class="filters-grid">
      <div class="filter-item">
        <span class="filter-lbl">🏢 Fornecedor</span>
        <span class="filter-val">${activeFilters.fornecedor !== 'all' ? activeFilters.fornecedor : 'Todos os Fornecedores'}</span>
      </div>
      <div class="filter-item">
        <span class="filter-lbl">🏷️ Forma de Aquisição</span>
        <span class="filter-val">${activeFilters.formaAquisicao !== 'all' ? activeFilters.formaAquisicao : 'Todas as Formas'}</span>
      </div>
      <div class="filter-item">
        <span class="filter-lbl">🏥 Unidade</span>
        <span class="filter-val">${unitLabel}</span>
      </div>
      <div class="filter-item">
        <span class="filter-lbl">📍 Setor / Lotação</span>
        <span class="filter-val">${sectorLabel}</span>
      </div>
      <div class="filter-item">
        <span class="filter-lbl">🏛️ Origem Tombo</span>
        <span class="filter-val">${activeFilters.tomboOrigin !== 'all' ? activeFilters.tomboOrigin : 'Todas as Origens'}</span>
      </div>
      <div class="filter-item">
        <span class="filter-lbl">🔍 Estado Conservação</span>
        <span class="filter-val">${activeFilters.condition !== 'all' ? activeFilters.condition : 'Todos os Estados'}</span>
      </div>
      ${activeFilters.searchTerm ? `
      <div class="filter-item" style="grid-column: span 2;">
        <span class="filter-lbl">🔎 Termo de Busca</span>
        <span class="filter-val">"${activeFilters.searchTerm}"</span>
      </div>` : ''}
    </div>
  </div>

  <div class="metrics-row">
    <div class="metric-card metric-dark">
      <div style="font-size:10px;text-transform:uppercase;font-weight:bold;color:#94a3b8;">Valor Total do Acervo Filtrado</div>
      <div style="font-size:20px;font-family:monospace;font-weight:900;color:#34d399;margin-top:2px;">${formatBRL(totalValue)}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Média por bem: <strong style="color:#fff;">${sortedAssets.length > 0 ? formatBRL(totalValue / sortedAssets.length) : 'R$ 0,00'}</strong></div>
    </div>
    <div class="metric-card">
      <div style="font-size:10px;text-transform:uppercase;font-weight:bold;color:#64748b;">Total de Itens Listados</div>
      <div style="font-size:20px;font-family:monospace;font-weight:900;color:#0f172a;margin-top:2px;">${sortedAssets.length} <span style="font-size:12px;font-weight:normal;color:#64748b;">bens</span></div>
      <div style="font-size:10px;color:#64748b;margin-top:2px;">${fornecedoresCount} fornecedores identificados</div>
    </div>
    <div class="metric-card">
      <div style="font-size:10px;text-transform:uppercase;font-weight:bold;color:#64748b;margin-bottom:4px;">Formas de Aquisição Presentes</div>
      ${formaBreakdownHtml}
    </div>
  </div>

  <table>
    <thead>
      <tr style="background:#f1f5f9;border-bottom:2px solid #0f172a;">
        <th style="width:30px;text-align:center;">#</th>
        <th style="width:100px;">Tombamento</th>
        <th>Descrição do Bem Patrimonial</th>
        <th style="width:120px;background:#eff6ff;color:#1e3a8a;">Forma Aquisição</th>
        <th style="width:140px;background:#fef3c7;color:#78350f;">Fornecedor / Cedente</th>
        <th style="width:160px;">Unidade / Setor</th>
        <th style="width:95px;text-align:right;">Valor (R$)</th>
        <th style="width:70px;text-align:center;">Estado</th>
        ${reportType === 'analitico' ? `<th style="width:120px;">Responsável</th>` : ''}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr style="background:#f1f5f9;border-top:2px solid #0f172a;">
        <td colspan="${reportType === 'analitico' ? 6 : 5}" style="text-align:right;font-weight:bold;text-transform:uppercase;padding:8px;">
          TOTAL GERAL DO RELATÓRIO (${sortedAssets.length} itens listados):
        </td>
        <td style="text-align:right;font-family:monospace;font-weight:900;font-size:12px;padding:8px;">
          ${formatBRL(totalValue)}
        </td>
        <td colspan="${reportType === 'analitico' ? 2 : 1}" style="text-align:center;font-size:10px;color:#64748b;padding:8px;">
          100% conferidos
        </td>
      </tr>
    </tfoot>
  </table>

  ${includeSignatures ? `
  <div class="signatures">
    <div class="sig-decl">
      <strong>DECLARAÇÃO DE CONFORMIDADE E PRESTAÇÃO DE CONTAS:</strong><br />
      Certifico para os devidos fins de controle interno, inventário e prestação de contas aos órgãos fiscalizadores (Tribunal de Contas do Estado do Ceará — TCE-CE e Controladoria) que os bens relacionados no presente documento conferem com a base patrimonial oficial do Consórcio Público de Saúde da Microrregião de Sobral (CPSMS) sob responsabilidade desta gerência na data de sua emissão.
    </div>

    <div class="sig-grid">
      <div>
        <div class="sig-line"></div>
        <div style="font-weight:bold;">${currentProfile.nome}</div>
        <div style="font-size:10px;color:#64748b;">Gestora de Patrimônio</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div style="font-weight:bold;">Direção Administrativa e Financeira</div>
        <div style="font-size:10px;color:#64748b;">CPSMS · Gestão Regional de Saúde</div>
        <div style="font-size:9px;color:#94a3b8;font-family:monospace;">Homologação e Controle</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div style="font-weight:bold;">Responsável pelo Setor / Unidade</div>
        <div style="font-size:10px;color:#64748b;">Conferência Física e Detenção</div>
        <div style="font-size:9px;color:#94a3b8;font-family:monospace;">Visto do Fiel Depositário</div>
      </div>
    </div>

    <div style="text-align:center;font-size:9px;color:#94a3b8;font-family:monospace;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px;">
      Sistema de Gestão Patrimonial CPSMS · Cód. Verificação: ${emissionDate.protocol} · Impresso em ${emissionDate.dateFormatted} às ${emissionDate.timeFormatted}
    </div>
  </div>` : ''}

  <script>
    window.addEventListener('load', function() {
      // Auto-trigger print dialog after render
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print error:', e);
        }
      }, 350);
    });
  </script>
</body>
</html>`;
  };

  // Robust print execution with hidden iframe and direct fallback
  const handlePrint = () => {
    setIsPrinting(true);
    setStatusMessage({ text: 'Abrindo o diálogo de impressão do relatório...', type: 'info' });

    // Method 1: Hidden iframe print (prevents iframe sandbox modal blocking)
    try {
      const existing = document.getElementById('cpsms-report-print-frame');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'cpsms-report-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(generateStandaloneHtml());
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setIsPrinting(false);
            setStatusMessage({ text: 'Comando de impressão enviado com sucesso!', type: 'success' });
            setTimeout(() => setStatusMessage(null), 4000);
          } catch (e) {
            console.warn('Iframe print error, falling back to direct window.print', e);
            fallbackDirectPrint();
          }
        }, 350);
        return;
      }
    } catch (err) {
      console.warn('Hidden iframe print creation failed:', err);
    }

    fallbackDirectPrint();
  };

  const fallbackDirectPrint = () => {
    try {
      window.focus();
      window.print();
      setIsPrinting(false);
      setStatusMessage({ text: 'Comando de impressão executado no navegador!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e) {
      console.error('Direct window.print failed:', e);
      setIsPrinting(false);
      // Fallback: automatically download HTML ready-to-print file
      handleDownloadHtml();
      setStatusMessage({ 
        text: 'A impressão direta foi restringida pelo navegador. O relatório pronto para imprimir foi baixado automaticamente!', 
        type: 'warning' 
      });
      setTimeout(() => setStatusMessage(null), 7000);
    }
  };

  // Instant one-click download of the complete self-contained printable report
  const handleDownloadHtml = () => {
    const htmlContent = generateStandaloneHtml();
    const filenameFilter = activeFilters.fornecedor !== 'all' 
      ? `relatorio_bens_fornecedor_${activeFilters.fornecedor.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : activeFilters.formaAquisicao !== 'all'
      ? `relatorio_bens_forma_${activeFilters.formaAquisicao.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : 'relatorio_bens_filtrados_cpsms';
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenameFilter}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setStatusMessage({ 
      text: 'Relatório HTML baixado com sucesso! Ao abrir este arquivo no seu navegador (Chrome/Edge), a janela de impressão abrirá automaticamente.', 
      type: 'success' 
    });
    setTimeout(() => setStatusMessage(null), 6000);
  };

  const handleExportCsv = () => {
    const filenameFilter = activeFilters.fornecedor !== 'all' 
      ? `relatorio_bens_fornecedor_${activeFilters.fornecedor.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : activeFilters.formaAquisicao !== 'all'
      ? `relatorio_bens_forma_${activeFilters.formaAquisicao.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : 'relatorio_bens_filtrados_cpsms';
    exportAssetsToCsv(sortedAssets, `${filenameFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    setStatusMessage({ text: 'Planilha CSV exportada com sucesso!', type: 'success' });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="printable-modal-overlay fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="printable-modal-card bg-white dark:bg-slate-900 text-slate-950 dark:text-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[96vh] flex flex-col border border-slate-200 dark:border-slate-800 my-auto">
        
        {/* Modal Top Control Bar (Screen only - HIDDEN IN PRINT) */}
        <div className="no-print p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/80 rounded-t-2xl space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Printer className="w-5 h-5 text-emerald-400 dark:text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Imprimir Relatório de Bens Filtrados</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700">
                    {sortedAssets.length} {sortedAssets.length === 1 ? 'bem' : 'bens'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Relatório oficial parametrizado conforme a filtragem ativa (Fornecedor, Forma de Aquisição, Unidade, Setor e Busca).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Botão Baixar HTML com Auto-Print */}
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded-lg transition-colors cursor-pointer min-h-[42px]"
                title="Baixar arquivo HTML formatado para abrir e imprimir diretamente em qualquer navegador"
              >
                <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Baixar HTML p/ Imprimir</span>
                <span className="sm:hidden">Baixar HTML</span>
              </button>

              {/* Botão Exportar CSV */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg transition-colors cursor-pointer min-h-[42px]"
                title="Exportar planilha Excel/CSV com os bens filtrados"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Exportar Planilha (CSV)</span>
                <span className="sm:hidden">CSV</span>
              </button>

              {/* Botão Imprimir Direto */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 rounded-lg shadow-md transition-all cursor-pointer min-h-[42px] disabled:opacity-50"
              >
                <Printer className="w-4 h-4 text-emerald-400 dark:text-slate-950" />
                <span>{isPrinting ? 'Preparando...' : 'Imprimir Agora'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status Notification Banner */}
          {statusMessage && (
            <div className={`p-2.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                : statusMessage.type === 'warning'
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                : 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-800'
            }`}>
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              <button 
                onClick={() => setStatusMessage(null)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Guidance Tip */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200">
            <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Instrução para Impressão / PDF:</strong> Clique em <strong>"Imprimir Agora"</strong> para abrir o diálogo de impressão do navegador. Caso o navegador ou ambiente bloqueie o diálogo direto, use o botão <strong>"Baixar HTML p/ Imprimir"</strong> — ele salva o laudo oficial que, ao ser aberto em nova aba do Chrome ou Edge, dispara a impressão automaticamente sem nenhum bloqueio!
            </div>
          </div>

          {/* Report Customization Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            {/* Ordenar por */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500 font-medium shrink-0">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer truncate"
              >
                <option value="tombamento">Nº Tombamento</option>
                <option value="descricao">Descrição (A-Z)</option>
                <option value="valorDesc">Maior Valor (R$)</option>
                <option value="valorAsc">Menor Valor (R$)</option>
                <option value="formaAquisicao">Forma de Aquisição</option>
                <option value="fornecedor">Fornecedor / Cedente</option>
                <option value="setor">Setor / Localização</option>
              </select>
            </div>

            {/* Formato / Layout */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500 font-medium shrink-0">Layout:</span>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer truncate"
              >
                <option value="analitico">Analítico Completo (Com todas as colunas)</option>
                <option value="sintetico">Sintético Otimizado (Mais compacto)</option>
              </select>
            </div>

            {/* Limite de Bens */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 font-medium shrink-0">Quantidade:</span>
              <select
                value={itemsLimit}
                onChange={(e) => setItemsLimit(e.target.value as any)}
                className="w-full bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer truncate"
              >
                <option value="all">Todos os bens ({filteredAssets.length} itens)</option>
                <option value="50">Primeiros 50 itens</option>
                <option value="100">Primeiros 100 itens</option>
                <option value="200">Primeiros 200 itens</option>
              </select>
            </div>

            {/* Checkbox de Assinaturas Oficiais */}
            <label className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                Assinaturas TCE-CE
              </span>
            </label>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="printable-report-scroll-container overflow-y-auto p-4 sm:p-8 space-y-6 flex-1 bg-white text-slate-950 font-sans">
          
          {/* Printable Document Container (Styled cleanly for A4 Paper & Web Preview) */}
          <div className="max-w-5xl mx-auto space-y-6 text-slate-950">
            
            {/* 1. Official Government Header */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1 font-serif">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                ESTADO DO CEARÁ · GOVERNO DO ESTADO DO CEARÁ
              </div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-950">
                CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS
              </div>
              <div className="text-[11px] font-medium text-slate-700">
                POLICLÍNICA REGIONAL BERNARDO FÉLIX DA SILVA & CENTRO DE ESPECIALIDADES ODONTOLÓGICAS (CEO SOBRAL)
              </div>
              <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest pt-0.5">
                GERÊNCIA DE PATRIMÔNIO E BENS MÓVEIS · CONTROLE E PRESTAÇÃO DE CONTAS
              </div>

              <div className="pt-3">
                <h1 className="text-base sm:text-lg font-black uppercase tracking-normal text-slate-950 bg-slate-100 py-1.5 px-3 rounded inline-block border border-slate-300">
                  RELATÓRIO DE BENS PATRIMONIAIS {activeFilters.fornecedor !== 'all' ? 'POR FORNECEDOR' : activeFilters.formaAquisicao !== 'all' ? 'POR FORMA DE AQUISIÇÃO' : 'GERENCIAL'}
                </h1>
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 font-sans pt-2 border-t border-slate-200 mt-2">
                <div>
                  <strong>Protocolo:</strong> <span className="font-mono">{emissionDate.protocol}</span>
                </div>
                <div>
                  <strong>Emissão:</strong> {emissionDate.dateFormatted} às {emissionDate.timeFormatted}
                </div>
                <div>
                  <strong>Emitido por:</strong> {currentProfile.nome} ({currentProfile.cargo || 'Gestora de Patrimônio'})
                </div>
              </div>
            </div>

            {/* Empty state alert if no items matched */}
            {sortedAssets.length === 0 && (
              <div className="p-8 text-center bg-slate-50 border border-slate-300 rounded-xl space-y-2">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">
                  Nenhum bem patrimonial localizado para o filtro selecionado
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Ajuste os filtros de fornecedor, forma de aquisição, unidade ou termo de busca na tela principal para gerar o relatório com os itens desejados.
                </p>
              </div>
            )}

            {sortedAssets.length > 0 && (
              <>
                {/* 2. Active Filters Manifest Box (DESTAQUE PARA FORNECEDOR E FORMA DE AQUISIÇÃO) */}
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-slate-600" />
                      Critérios e Parâmetros da Filtragem Aplicada
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600">
                      {sortedAssets.length} de {totalAssetsCount.toLocaleString('pt-BR')} bens no acervo total
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-1.5 bg-white rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-medium uppercase">🏢 Fornecedor:</span>
                      <span className="font-bold text-slate-900 truncate block" title={activeFilters.fornecedor}>
                        {activeFilters.fornecedor !== 'all' ? activeFilters.fornecedor : 'Todos os Fornecedores'}
                      </span>
                    </div>

                    <div className="p-1.5 bg-white rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-medium uppercase">🏷️ Forma de Aquisição:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {activeFilters.formaAquisicao !== 'all' ? activeFilters.formaAquisicao : 'Todas as Formas'}
                      </span>
                    </div>

                    <div className="p-1.5 bg-white rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-medium uppercase">🏥 Unidade:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {unitLabel}
                      </span>
                    </div>

                    <div className="p-1.5 bg-white rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-medium uppercase">📍 Setor / Lotação:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {sectorLabel}
                      </span>
                    </div>

                    <div className="p-1.5 bg-white rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-medium uppercase">🏛️ Origem Tombo:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {activeFilters.tomboOrigin !== 'all' ? activeFilters.tomboOrigin : 'Todas as Origens'}
                      </span>
                    </div>

                    <div className="p-1.5 bg-white rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-medium uppercase">🔍 Estado Conservação:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {activeFilters.condition !== 'all' ? activeFilters.condition : 'Todos os Estados'}
                      </span>
                    </div>

                    {activeFilters.searchTerm && (
                      <div className="p-1.5 bg-white rounded border border-slate-200 col-span-2">
                        <span className="text-slate-500 block text-[10px] font-medium uppercase">🔎 Termo de Busca:</span>
                        <span className="font-bold text-slate-900 truncate block">
                          "{activeFilters.searchTerm}"
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Summary Metrics & Forma de Aquisição Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Financial Box */}
                  <div className="p-3 bg-slate-900 text-white rounded-lg space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Valor Total do Acervo Filtrado
                    </div>
                    <div className="text-xl font-mono font-black tabular-nums text-emerald-400">
                      {formatBRL(totalValue)}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Média por bem:</span>
                      <span className="font-semibold text-white">
                        {sortedAssets.length > 0 ? formatBRL(totalValue / sortedAssets.length) : 'R$ 0,00'}
                      </span>
                    </div>
                  </div>

                  {/* Counts Box */}
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600">
                      Total de Itens Listados
                    </div>
                    <div className="text-xl font-mono font-black tabular-nums text-slate-900">
                      {sortedAssets.length} <span className="text-xs font-normal text-slate-600 font-sans">bens</span>
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {fornecedoresCount} {fornecedoresCount === 1 ? 'fornecedor identificado' : 'fornecedores identificados'}
                    </div>
                  </div>

                  {/* Forma de Aquisição Breakdown */}
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg space-y-1.5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-700 flex items-center justify-between">
                      <span>Formas de Aquisição Presentes</span>
                      <Tag className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                      {formaAquisicaoBreakdown.map((item) => (
                        <div key={item.forma} className="flex items-center justify-between text-[11px] border-b border-slate-200/60 pb-0.5">
                          <span className="font-semibold text-slate-800 truncate pr-2">
                            {item.forma}
                          </span>
                          <span className="tabular-nums font-bold text-slate-900 shrink-0">
                            {item.count} <span className="text-[10px] text-slate-500 font-normal">({formatBRL(item.totalVal)})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Official Report Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 px-0.5 font-semibold">
                    <span>Relação Descritiva e Discriminada dos Bens</span>
                    <span>Ordenado por: {sortBy}</span>
                  </div>

                  <table className="printable-report-table w-full text-left border-collapse text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-900 font-bold text-[11px]">
                        <th className="py-2 px-2 border-r border-slate-300 text-center w-8">#</th>
                        <th className="py-2 px-2.5 border-r border-slate-300 w-24">Tombamento</th>
                        <th className="py-2 px-2.5 border-r border-slate-300">Descrição do Bem Patrimonial</th>
                        <th className="py-2 px-2 border-r border-slate-300 w-28 bg-blue-50/60 font-black text-blue-950">
                          Forma Aquisição
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-300 w-32 bg-amber-50/60 font-black text-amber-950">
                          Fornecedor / Cedente
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-300 w-36">Unidade / Setor</th>
                        <th className="py-2 px-2.5 border-r border-slate-300 text-right w-24">Valor (R$)</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-center w-18">Estado</th>
                        {reportType === 'analitico' && (
                          <th className="py-2 px-2 w-28">Responsável</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedAssets.map((asset, index) => {
                        const badge = getFormaAquisicaoBadge(asset.formaAquisicao);
                        const val = asset.valorAquisicao || asset.valorBrutoContabil || 0;

                        return (
                          <tr 
                            key={asset.id} 
                            className={`hover:bg-slate-50 transition-colors ${index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                          >
                            <td className="py-1.5 px-2 border-r border-slate-200 text-center text-slate-500 font-mono text-[10px]">
                              {index + 1}
                            </td>
                            <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap text-[11px]">
                              <div>{asset.tombamento}</div>
                              <div className="text-[9px] font-sans text-slate-500 uppercase tracking-tight">
                                {asset.origemTombo.split(' ')[0]}
                              </div>
                            </td>
                            <td className="py-1.5 px-2.5 border-r border-slate-200 font-medium text-slate-900 leading-snug">
                              <div>{asset.descricao}</div>
                              {asset.numeroSerie && asset.numeroSerie !== '-' && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  S/N: {asset.numeroSerie}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-200 text-[11px]">
                              <span className="font-bold text-slate-900 block leading-tight">
                                {asset.formaAquisicao || 'Compra / Pregão'}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 border-r border-slate-200 text-[11px] text-slate-800">
                              <span className="font-semibold block truncate max-w-[130px]" title={asset.fornecedor}>
                                {asset.fornecedor || 'Fornecedor Cadastrado'}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 border-r border-slate-200 text-[10px] text-slate-700 leading-tight">
                              <div className="font-bold text-slate-900 truncate max-w-[140px]">{asset.setorNome}</div>
                              {asset.subsetorNome && (
                                <div className="text-slate-500 truncate max-w-[140px]">{asset.subsetorNome}</div>
                              )}
                              <div className="text-[9px] text-slate-400 truncate">{asset.unidadeNome}</div>
                            </td>
                            <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              {val > 0 ? formatBRL(val) : 'R$ 0,00'}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-200 text-center text-[10px] font-semibold text-slate-800">
                              {asset.estado}
                            </td>
                            {reportType === 'analitico' && (
                              <td className="py-1.5 px-2 text-[10px] text-slate-600 truncate max-w-[110px]" title={asset.responsavelNome}>
                                {asset.responsavelNome}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-950 text-xs">
                        <td colSpan={reportType === 'analitico' ? 6 : 5} className="py-2.5 px-3 border-r border-slate-300 text-right uppercase tracking-wider">
                          TOTAL GERAL DO RELATÓRIO ({sortedAssets.length} itens listados):
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono font-black text-sm text-slate-950 tabular-nums whitespace-nowrap">
                          {formatBRL(totalValue)}
                        </td>
                        <td colSpan={reportType === 'analitico' ? 2 : 1} className="py-2.5 px-2 text-center text-slate-600 text-[10px]">
                          100% dos itens conferidos
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 5. Official Declarations & Signature Blocks (TCE-CE Standard) */}
                {includeSignatures && (
                  <div className="pt-6 space-y-8 font-serif">
                    <div className="p-3 bg-slate-50 border border-slate-300 rounded text-[11px] leading-relaxed text-slate-800 font-sans">
                      <strong>DECLARAÇÃO DE CONFORMIDADE E PRESTAÇÃO DE CONTAS:</strong><br />
                      Certifico para os devidos fins de controle interno, inventário e prestação de contas aos órgãos fiscalizadores (Tribunal de Contas do Estado do Ceará — TCE-CE e Controladoria) que os bens relacionados no presente documento conferem com a base patrimonial oficial do Consórcio Público de Saúde da Microrregião de Sobral (CPSMS) sob responsabilidade desta gerência na data de sua emissão.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-center text-xs text-slate-900">
                      <div className="space-y-1">
                        <div className="border-b border-slate-900 pb-8 mx-auto w-4/5" />
                        <div className="font-bold text-slate-950 pt-1">
                          {currentProfile.nome}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          Gestora de Patrimônio
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="border-b border-slate-900 pb-8 mx-auto w-4/5" />
                        <div className="font-bold text-slate-950 pt-1">
                          Direção Administrativa e Financeira
                        </div>
                        <div className="text-[10px] text-slate-600">
                          CPSMS · Gestão Regional de Saúde
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          Homologação e Controle
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="border-b border-slate-900 pb-8 mx-auto w-4/5" />
                        <div className="font-bold text-slate-950 pt-1">
                          Responsável pelo Setor / Unidade
                        </div>
                        <div className="text-[10px] text-slate-600">
                          Conferência Física e Detenção
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          Visto do Fiel Depositário
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-center text-slate-400 font-mono pt-4 border-t border-slate-200">
                      Sistema de Gestão Patrimonial CPSMS · Cód. Verificação: {emissionDate.protocol} · Impresso em {emissionDate.dateFormatted} às {emissionDate.timeFormatted}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

        </div>

        {/* Modal Bottom Actions (Screen only - HIDDEN IN PRINT) */}
        <div className="no-print p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Dica: selecione <strong>"Paisagem (Landscape)"</strong> na janela de impressão para melhor distribuição das colunas.
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-lg transition-colors cursor-pointer min-h-[40px]"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer min-h-[40px]"
            >
              <Download className="w-4 h-4" />
              <span>Baixar HTML (Auto-Print)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 rounded-lg shadow-md transition-all cursor-pointer min-h-[40px] disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-emerald-400 dark:text-slate-950" />
              <span>{isPrinting ? 'Preparando...' : 'Imprimir Agora'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
