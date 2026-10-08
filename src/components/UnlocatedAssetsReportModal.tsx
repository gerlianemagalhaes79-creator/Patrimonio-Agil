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
  ShieldAlert, 
  AlertTriangle, 
  Scale, 
  CheckCircle2, 
  HelpCircle, 
  Building2, 
  FileText,
  ShieldCheck,
  Search
} from 'lucide-react';

interface UnlocatedAssetsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  units: UnitInfo[];
  sectors: Sector[];
  currentProfile: UserProfile;
  initialUnitId?: string;
}

export const UnlocatedAssetsReportModal: React.FC<UnlocatedAssetsReportModalProps> = ({
  isOpen,
  onClose,
  assets,
  units,
  sectors,
  currentProfile,
  initialUnitId = 'policlinica',
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const currentUnit = units.find(u => u.id === selectedUnitId) || units[0] || {
    id: 'policlinica',
    nome: 'Policlínica Regional Bernardo Félix da Silva',
    sigla: 'Policlínica',
    cnpj: '12.345.678/0001-90',
    endereco: 'Sobral - CE',
    cidade: 'Sobral',
    telefone: '(88) 3677-0000',
    diretorNome: 'Diretoria Executiva',
    diretorCargo: 'Diretor Executivo',
    anoExercicio: 2026,
    totalBens: 0,
    valorTotal: 0
  };

  // Filtrar todos os bens do ASPEC pertencentes a esta unidade
  const unitAssets = useMemo(() => {
    return assets.filter(a => {
      if (selectedUnitId === 'policlinica') {
        return a.unidadeId === 'policlinica' || a.unidadeNome.toLowerCase().includes('poli');
      }
      if (selectedUnitId === 'ceo') {
        return a.unidadeId === 'ceo' || a.unidadeNome.toLowerCase().includes('ceo');
      }
      if (selectedUnitId === 'sede-cpsms') {
        return a.unidadeId === 'sede-cpsms' || a.unidadeNome.toLowerCase().includes('sede');
      }
      if (selectedUnitId === 'cer') {
        return a.unidadeId === 'cer' || a.unidadeNome.toLowerCase().includes('cer');
      }
      return true;
    });
  }, [assets, selectedUnitId]);

  // Total de bens conferidos na unidade
  const auditedCount = useMemo(() => {
    return unitAssets.filter(a => a.auditoria?.conferido).length;
  }, [unitAssets]);

  const auditCoveragePercent = useMemo(() => {
    return unitAssets.length > 0 ? Math.round((auditedCount / unitAssets.length) * 100) : 0;
  }, [unitAssets, auditedCount]);

  // Identificar bens NÃO LOCALIZADOS:
  // São os bens do ASPEC desta unidade que:
  // 1. Foram expressamente marcados como 'nao_encontrado'
  // 2. E NÃO foram localizados em nenhuma outra sala da unidade (ou de outra unidade)
  const unlocatedAssets = useMemo(() => {
    return unitAssets.filter(a => {
      if (a.foraDoAspec) return false;
      // Marcado como não encontrado
      const isMarkedMissing = a.auditoria?.statusDivergencia === 'nao_encontrado';
      // Checar se não foi achado em outra sala
      const foiAchadoEmOutroLugar = a.auditoria?.statusDivergencia === 'setor_divergente' && a.auditoria?.conferido;
      return isMarkedMissing && !foiAchadoEmOutroLugar;
    });
  }, [unitAssets]);

  // Filtrar pela busca
  const displayedUnlocated = useMemo(() => {
    if (!searchQuery.trim()) return unlocatedAssets;
    const q = searchQuery.toLowerCase();
    return unlocatedAssets.filter(a => 
      a.tombamento.toLowerCase().includes(q) ||
      (a.tomboOrigemSesa || '').toLowerCase().includes(q) ||
      a.descricao.toLowerCase().includes(q) ||
      a.setorNome.toLowerCase().includes(q) ||
      a.responsavelNome.toLowerCase().includes(q)
    );
  }, [unlocatedAssets, searchQuery]);

  // Valor total dos não localizados
  const totalValorHistorico = useMemo(() => {
    return displayedUnlocated.reduce((acc, a) => acc + (a.valorAquisicao || a.valorBrutoContabil || 0), 0);
  }, [displayedUnlocated]);

  const totalValorResidual = useMemo(() => {
    return displayedUnlocated.reduce((acc, a) => acc + (a.valorResidual || a.valorLiquidoContabil || 0), 0);
  }, [displayedUnlocated]);

  // Standalone Printable HTML
  const generatePrintableHtml = (): string => {
    const now = new Date();
    const currentDateFormatted = now.toLocaleDateString('pt-BR');
    const currentTimeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo Circunstanciado de Bens Não Localizados — ${currentUnit.sigla} · TCE-CE</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 12mm 12mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; line-height: 1.4; padding: 15px; margin: 0; background: #fff; font-size: 10.5px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .gov { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #475569; }
    .org { font-size: 13px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 2px; }
    .unit { font-size: 11px; font-weight: bold; color: #b91c1c; margin-top: 1px; }
    .title-box { background: #fef2f2; border: 1.5px solid #ef4444; padding: 8px 12px; border-radius: 4px; text-align: center; font-weight: 900; font-size: 12px; text-transform: uppercase; margin: 10px 0; color: #991b1b; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 9.5px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px; margin-bottom: 12px; }
    .legal-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 8px 10px; font-size: 9.5px; margin-bottom: 12px; line-height: 1.5; color: #78350f; }
    .text-content { text-align: justify; line-height: 1.6; margin-bottom: 12px; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; margin: 10px 0; }
    th { background: #0f172a; color: white; border: 1px solid #334155; padding: 5px 6px; text-align: left; text-transform: uppercase; font-size: 8.5px; }
    td { border: 1px solid #cbd5e1; padding: 5px 6px; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .totals-row td { background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a; }
    .signatures { margin-top: 28px; page-break-inside: avoid; }
    .sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center; font-size: 9.5px; }
    .sig-line { border-bottom: 1px solid #0f172a; margin-bottom: 6px; padding-bottom: 25px; }
    .no-print { margin-bottom: 12px; display: flex; gap: 8px; justify-content: flex-end; }
    .btn { background: #dc2626; color: #fff; border: none; padding: 7px 16px; font-weight: bold; border-radius: 4px; cursor: pointer; font-size: 11px; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️ Imprimir Termo de Apuração (A4 / PDF)</button>
  </div>

  <div class="header">
    <div class="gov">ESTADO DO CEARÁ · CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS</div>
    <div class="org">COMISSÃO ESPECIAL DE REGULARIZAÇÃO E INVENTÁRIO PATRIMONIAL</div>
    <div class="unit">${currentUnit.nome.toUpperCase()} · CONTROLE INTERNO / TCE-CE</div>
  </div>

  <div class="title-box">
    TERMO CIRCUNSTANCIADO DE VISTORIA GERAL & APURAÇÃO DE BENS NÃO LOCALIZADOS Nº 01/${now.getFullYear()}
  </div>

  <div class="meta-grid">
    <div><strong>Unidade Vistoriada:</strong> ${currentUnit.sigla}</div>
    <div><strong>Cobertura do Inventário:</strong> ${auditCoveragePercent}% (${auditedCount}/${unitAssets.length} bens)</div>
    <div><strong>Total de Ausências:</strong> ${unlocatedAssets.length} tombo(s)</div>
    <div><strong>Data do Termo:</strong> ${currentDateFormatted} às ${currentTimeFormatted}</div>
  </div>

  <div class="legal-box">
    <strong>FUNDAMENTAÇÃO LEGAL E PROCESSUAL:</strong><br />
    Em conformidade com a <strong>Lei Federal nº 4.320/1964</strong> (arts. 94 a 96), as Instruções Normativas e Resoluções do <strong>Tribunal de Contas do Estado do Ceará (TCE-CE)</strong>, o Estatuto e o Regimento Interno do Consórcio Público de Saúde da Microrregião de Sobral (CPSMS).
  </div>

  <div class="text-content">
    <p>
      Aos <strong>${currentDateFormatted}</strong>, a Presidente da Comissão Especial de Inventário Patrimonial do CPSMS, servidora <strong>${currentProfile.nome}</strong>, juntamente com os membros designados, no uso de suas atribuições legais, vem por meio deste instrumento lavrar o presente <strong>TERMO CIRCUNSTANCIADO DE APURAÇÃO PRELIMINAR DE BENS NÃO LOCALIZADOS</strong>, certificando que:
    </p>
    <p>
      1. Foi realizado o procedimento rigoroso de <strong>inventário físico in loco, sala a sala e setor por setor</strong> nas dependências da unidade <strong>${currentUnit.nome}</strong>.
    </p>
    <p>
      2. Concluída a varredura e o cruzamento geral dos dados físicos com a base contábil do Sistema ASPEC, <strong>NÃO FORAM ENCONTRADOS</strong> em nenhuma dependência da unidade os bens patrimoniais discriminados na tabela a seguir, embora constassem formalmente ativos nos registros contábeis históricos.
    </p>
    <p>
      3. Diante da não localização física dos referidos itens, <strong>a Gestão de Patrimônio formaliza a presente ocorrência, resguardando a atual administração de qualquer responsabilidade ou omissão processual</strong>, e encaminha os autos à <strong>Diretoria Executiva</strong> e ao <strong>Controle Interno do CPSMS</strong> para as seguintes providências regulamentares:
    </p>
    <ul style="margin: 4px 0 10px 18px; padding: 0;">
      <li><strong>Notificação Formal</strong> dos servidores anteriormente cadastrados como detentores da carga patrimonial para prestarem esclarecimentos no prazo regulamentar;</li>
      <li><strong>Abertura de Procedimento Administrativo Sumário / Sindicância</strong> para apurar eventual extravio, dano ou alienação pretérita sem baixa contábil;</li>
      <li><strong>Ajuste Contábil Provisório</strong> no Sistema ASPEC, registrando a situação em contas de compensação e controle até o desfecho processual definitivo, sem baixa patrimonial temerária.</li>
    </ul>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 70px;">Tombo</th>
        <th style="width: 70px;">SESA (6d)</th>
        <th>Descrição Completa do Bem</th>
        <th style="width: 130px;">Última Sala no ASPEC</th>
        <th style="width: 120px;">Último Responsável</th>
        <th style="width: 80px; text-align: right;">Valor Histórico</th>
      </tr>
    </thead>
    <tbody>
      ${displayedUnlocated.map(a => `
        <tr>
          <td style="font-family: monospace; font-weight: bold; color: #b91c1c;">${a.tombamento}</td>
          <td style="font-family: monospace; color: #1d4ed8;">${a.tomboOrigemSesa || '—'}</td>
          <td>
            <strong>${a.descricao}</strong>
            ${a.numeroSerie ? `<br /><span style="font-size: 8px; color: #64748b;">S/N: ${a.numeroSerie}</span>` : ''}
          </td>
          <td>${a.setorNome || 'Não Especificado'}</td>
          <td>${a.responsavelNome || 'Não Informado'}</td>
          <td style="text-align: right; font-family: monospace;">${formatBRL(a.valorAquisicao || a.valorBrutoContabil || 0)}</td>
        </tr>
      `).join('')}
      <tr class="totals-row">
        <td colspan="5" style="text-align: right; text-transform: uppercase;">Totalização dos Bens Ausentes (${displayedUnlocated.length} itens):</td>
        <td style="text-align: right; font-family: monospace; color: #b91c1c;">${formatBRL(totalValorHistorico)}</td>
      </tr>
    </tbody>
  </table>

  <div class="text-content" style="margin-top: 14px;">
    <p>
      E, para que produza os seus efeitos jurídicos e processuais perante o <strong>Tribunal de Contas do Estado do Ceará (TCE-CE)</strong> e aos órgãos de controle competentes, lavrou-se o presente Termo, que segue devidamente assinado.
    </p>
  </div>

  <div class="signatures">
    <div class="sig-grid">
      <div>
        <div class="sig-line"></div>
        <strong>${currentProfile.nome}</strong><br />
        Presidente da Comissão de Inventário<br />
        Gestora de Patrimônio · CPSMS
      </div>
      <div>
        <div class="sig-line"></div>
        <strong>Controle Interno do CPSMS</strong><br />
        Auditoria & Conformidade<br />
        [ &nbsp; ] Ciente para Averiguação
      </div>
      <div>
        <div class="sig-line"></div>
        <strong>Diretoria Executiva do CPSMS</strong><br />
        Autorização e Despacho Processual<br />
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
      title: `Termo Circunstanciado de Bens Não Localizados — ${currentUnit.sigla}`,
      html,
      filename: `termo_nao_localizados_${currentUnit.sigla.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`,
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
      'Unidade',
      'Nº Tombo',
      'Tombo SESA',
      'Descrição do Bem',
      'Última Sala Cadastrada no ASPEC',
      'Último Responsável Cadastrado',
      'Valor Histórico (R$)',
      'Valor Residual (R$)',
      'Situação Processual'
    ];

    const rows = displayedUnlocated.map(a => [
      `"${currentUnit.sigla}"`,
      `"${a.tombamento}"`,
      `"${a.tomboOrigemSesa || ''}"`,
      `"${a.descricao.replace(/"/g, '""')}"`,
      `"${a.setorNome || ''}"`,
      `"${a.responsavelNome || ''}"`,
      (a.valorAquisicao || a.valorBrutoContabil || 0).toFixed(2).replace('.', ','),
      (a.valorResidual || a.valorLiquidoContabil || 0).toFixed(2).replace('.', ','),
      '"NÃO LOCALIZADO IN LOCO - ENCAMINHADO PARA AVERIGUAÇÃO / SINDICÂNCIA"'
    ]);

    const csvContent = headers.join(';') + '\n' + rows.map(r => r.join(';')).join('\n');
    downloadCsvFile(csvContent, `bens_nao_localizados_${currentUnit.sigla.replace(/\s+/g, '_')}.csv`);
    setStatusMsg('Planilha exportada com sucesso!');
    setTimeout(() => setStatusMsg(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="printable-modal-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300">
                    Blindagem Processual TCE-CE
                  </span>
                  <span className="text-xs text-slate-400">Apuração de Bens Não Localizados</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                  <span>Termo Circunstanciado de Bens Não Localizados</span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Imprimir termo oficial para despachar com a Diretoria"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Termo TCE-CE</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Exportar planilha"
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

          {/* Unidade Selector */}
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
            <span className="text-slate-500 font-bold">Unidade do Consórcio:</span>
            {units.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedUnitId(u.id)}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                  selectedUnitId === u.id
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {u.sigla}
              </button>
            ))}
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
        <div className="printable-report-scroll-container overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
          
          {/* Important Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-1.5">
            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 text-xs sm:text-sm">
              <Scale className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Por que este documento protege você juridicamente perante o TCE-CE?</span>
            </div>
            <p className="text-xs text-amber-950 dark:text-amber-300 leading-relaxed">
              Ao emitir este Termo no fechamento da <strong>{currentUnit.sigla}</strong>, você formaliza que a Gestão de Patrimônio <u>cumpriu o dever de vistoriar todas as salas</u>. O termo certifica que os bens não foram achados fisicamente e <strong>solicita formalmente a abertura de apuração / sindicância pela Diretoria Executiva</strong>, isentando a sua comissão de omissão de bens desaparecidos em exercícios anteriores.
            </p>
          </div>

          {/* Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <span className="text-slate-400 text-[10px] block">Unidade Selecionada:</span>
              <strong className="text-slate-900 dark:text-white block mt-0.5 text-xs truncate">{currentUnit.sigla}</strong>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <span className="text-slate-400 text-[10px] block">Cobertura de Vistoria:</span>
              <strong className="text-emerald-600 block mt-0.5 text-xs">{auditCoveragePercent}% auditado</strong>
            </div>

            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
              <span className="text-rose-700 dark:text-rose-300 text-[10px] block">Bens Não Localizados:</span>
              <strong className="text-rose-700 dark:text-rose-400 block mt-0.5 text-sm font-mono font-black">
                {unlocatedAssets.length} bens
              </strong>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <span className="text-slate-400 text-[10px] block">Valor Histórico Acumulado:</span>
              <strong className="text-slate-900 dark:text-white block mt-0.5 text-xs font-mono">
                {formatBRL(totalValorHistorico)}
              </strong>
            </div>
          </div>

          {/* Search bar inside list */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
              <span>Relação Nominal dos Bens para Despacho e Apuração ({displayedUnlocated.length} itens)</span>
            </h4>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por tombo, sala ou nome..."
                className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Table */}
          {displayedUnlocated.length > 0 ? (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-850 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-750">
                    <th className="p-2.5">Tombo</th>
                    <th className="p-2.5">SESA (6d)</th>
                    <th className="p-2.5">Descrição do Bem Não Localizado</th>
                    <th className="p-2.5">Última Sala no ASPEC</th>
                    <th className="p-2.5">Último Detentor de Carga</th>
                    <th className="p-2.5 text-right">Valor Histórico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedUnlocated.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                      <td className="p-2.5 font-mono font-bold text-rose-600">
                        {a.tombamento}
                      </td>
                      <td className="p-2.5 font-mono text-blue-600">
                        {a.tomboOrigemSesa || '—'}
                      </td>
                      <td className="p-2.5">
                        <strong className="text-slate-900 dark:text-white">{a.descricao}</strong>
                        {a.numeroSerie && a.numeroSerie !== '-' && (
                          <div className="text-[10px] text-slate-400 font-mono">S/N: {a.numeroSerie}</div>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">
                        {a.setorNome || '—'}
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">
                        {a.responsavelNome || '—'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatBRL(a.valorAquisicao || a.valorBrutoContabil || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Nenhum bem não localizado com os filtros selecionados na {currentUnit.sigla}!
              </p>
              <p className="text-[11px] text-slate-400">
                Conforme você for auditando as salas da unidade e marcando eventuais ausências com [X], elas aparecerão aqui automaticamente para compor o termo de apuração final.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-500">
            Documento de proteção processual do CPSMS emitido em conformidade com o <strong>TCE-CE</strong>.
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
              disabled={displayedUnlocated.length === 0}
              className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-lg cursor-pointer shadow-xs ${
                displayedUnlocated.length > 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Gerar Termo Circunstanciado (A4)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
