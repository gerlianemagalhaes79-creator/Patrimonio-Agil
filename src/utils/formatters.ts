import { Asset } from '../types';

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const parts = dateString.split(' ')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch {
    // fallback
  }
  return dateString;
}

export function formatDateTime(dateTimeString?: string): string {
  if (!dateTimeString) return '—';
  try {
    const [datePart, timePart] = dateTimeString.split(' ');
    if (datePart && timePart) {
      const p = datePart.split('-');
      if (p.length === 3) {
        return `${p[2]}/${p[1]}/${p[0]} às ${timePart}`;
      }
    }
  } catch {
    // fallback
  }
  return dateTimeString;
}

export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAssetsToCsv(assets: Asset[], customFilename?: string): void {
  const headers = [
    'Número do Tombo',
    'Nome do Patrimônio / Item',
    'Data de Tombamento',
    'Data de Aquisição',
    'Forma de Aquisição',
    'Valor (R$)',
    'Nota Fiscal (NF)',
    'Estado de Conservação',
    'Origem do Recurso',
    'Origem do Tombo (CPSMS/SESA/UFC)',
    'Fornecedor / Cedente',
    'Órgão',
    'Área / Setor',
    'Subárea / Sala',
    'Responsável',
    'Matrícula',
    'Categoria',
    'Nº Série',
    'Cód. ASPEC',
    'Cód. SGPS',
    'Auditado?',
    'Status Divergência'
  ];

  const rows = assets.map(a => [
    `"${a.tombamento}"`,
    `"${(a.descricao || '').replace(/"/g, '""')}"`,
    `"${a.dataTombamento || a.dataAquisicao || ''}"`,
    `"${a.dataAquisicao || ''}"`,
    `"${a.formaAquisicao || 'Compra / Pregão'}"`,
    (a.valorAquisicao || a.valorBrutoContabil || a.valorResidual || 0).toFixed(2),
    `"${a.notaFiscal || 'S/N'}"`,
    `"${a.estado}"`,
    `"${a.origemRecurso || 'Recurso Próprio CPSMS'}"`,
    `"${a.origemTombo}"`,
    `"${(a.fornecedor || '').replace(/"/g, '""')}"`,
    `"${a.orgao || a.unidadeNome}"`,
    `"${a.area || a.setorNome}"`,
    `"${a.subarea || a.subsetorNome || ''}"`,
    `"${a.responsavelNome}"`,
    `"${a.responsavelMatricula || ''}"`,
    `"${a.categoria}"`,
    `"${a.numeroSerie || ''}"`,
    `"${a.codigoASPEC || ''}"`,
    `"${a.codigoSGPS || ''}"`,
    a.auditoria?.conferido ? 'SIM' : 'NÃO',
    `"${a.auditoria?.statusDivergencia || 'pendente'}"`
  ]);

  const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const filename = customFilename || `bens_patrimoniais_cpsms_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsvFile(csvContent, filename);
}

export function exportAuditReportCsv(assets: Asset[]): void {
  const headers = [
    'Tombamento',
    'Origem Tombo',
    'Descrição',
    'Unidade Cadastrada',
    'Setor Cadastrado',
    'Sala Cadastrada',
    'Status Auditoria',
    'Unidade Encontrada',
    'Setor Encontrado',
    'Data Conferência',
    'Auditor Responsável',
    'Laudo / Observações'
  ];

  const rows = assets.map(a => [
    `"${a.tombamento}"`,
    `"${a.origemTombo}"`,
    `"${(a.descricao || '').replace(/"/g, '""')}"`,
    `"${a.unidadeNome}"`,
    `"${a.setorNome}"`,
    `"${a.subsetorNome || ''}"`,
    a.auditoria?.conferido 
      ? (a.auditoria.statusDivergencia === 'setor_divergente' ? 'LOCAL DIVERGENTE' : 'CONFORME')
      : 'NÃO CONFERIDO',
    `"${a.auditoria?.unidadeEncontrada || a.unidadeNome}"`,
    `"${a.auditoria?.setorEncontrado || a.setorNome}"`,
    `"${a.auditoria?.dataConferencia || 'Pendente'}"`,
    `"${a.auditoria?.responsavelConferencia || '—'}"`,
    `"${(a.auditoria?.observacaoAuditoria || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  downloadCsvFile(csvContent, `relatorio_auditoria_cpsms_tce_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Robust currency parser supporting Brazilian (R$ 1.500,50, 1.500, 1500,00),
 * US (1,500.50), raw numbers, Excel serial formats, and strings from ASPEC/SGPS.
 */
export function parseCurrencyValue(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  let str = String(val).trim();
  if (!str) return 0;

  // Check if enclosed in parentheses or starts with negative sign e.g. (1.500,00) or -1.500
  const isNegative = str.includes('(') || str.startsWith('-');

  // Remove currency symbol, letters, and non-numeric except , . -
  str = str.replace(/R\$/gi, '').replace(/[^\d,.-]/g, '').trim();
  str = str.replace(/^-/, '');
  if (!str) return 0;

  // Case 1: Has both dot and comma
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Brazilian format: 1.500,50 or 1.250.000,00 -> 1500.50
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,500.50 -> 1500.50
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Only comma: 1500,50 -> 1500.50
    str = str.replace(',', '.');
  } else if (str.includes('.')) {
    // Only dot: e.g. 1500.50 (float) or 1.500 (thousands in PT-BR)
    const parts = str.split('.');
    if (parts.length > 2) {
      // Multiple dots: 1.500.000 -> 1500000
      str = parts.join('');
    } else if (parts.length === 2) {
      // If exactly 3 digits after the dot (e.g. 1.500 or 15.000 or 250.000)
      // In Brazil, thousands separator is dot. Decimal cents are 2 digits.
      if (parts[1].length === 3 && parts[0].length >= 1 && parts[0].length <= 3) {
        str = parts[0] + parts[1];
      }
    }
  }

  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

