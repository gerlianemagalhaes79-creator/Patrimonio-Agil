import React, { useState, useMemo } from 'react';
import { 
  ArrowUpRight, 
  Plus, 
  Search, 
  FileText, 
  Printer, 
  RotateCcw, 
  Package, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Info, 
  X,
  Truck,
  HeartHandshake,
  ExternalLink,
  ShieldCheck,
  User,
  AlertCircle
} from 'lucide-react';
import { Asset, AssetExit, ExitType, UserProfile, UnitInfo, Sector } from '../types';
import { formatBRL, formatDate } from '../utils/formatters';
import { executePrintHtml } from '../utils/printHelper';

interface ExitsViewProps {
  exits: AssetExit[];
  assets: Asset[];
  units: UnitInfo[];
  sectors: Sector[];
  currentProfile: UserProfile;
  onCreateExit: (newExit: Omit<AssetExit, 'id' | 'dataRegistro' | 'status'>) => void;
  onCancelExit: (exitId: string) => void;
}

export const ExitsView: React.FC<ExitsViewProps> = ({
  exits,
  assets,
  units,
  sectors,
  currentProfile,
  onCreateExit,
  onCancelExit,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'devolucao' | 'doacao'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewExitModalOpen, setIsNewExitModalOpen] = useState(false);
  const [viewingExitTerm, setViewingExitTerm] = useState<AssetExit | null>(null);

  // Form states for New Exit
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const [tipoSaida, setTipoSaida] = useState<ExitType>('devolucao');
  const [destinatario, setDestinatario] = useState<string>('Secretaria da Saúde do Estado do Ceará - SESA');
  const [destinatarioResponsavel, setDestinatarioResponsavel] = useState<string>('');
  const [destinatarioCargo, setDestinatarioCargo] = useState<string>('');
  const [destinatarioDocumento, setDestinatarioDocumento] = useState<string>('');
  const [numeroProcesso, setNumeroProcesso] = useState<string>(`OFÍCIO Nº ${String(exits.length + 1).padStart(3, '0')}/${new Date().getFullYear()} - CPSMS`);
  const [motivo, setMotivo] = useState<string>('Devolução de bem cedido pelo Estado / Encerramento de comodato');
  const [dataSaida, setDataSaida] = useState<string>(new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState<string>('');

  // Selected asset for modal
  const selectedAsset = useMemo(() => {
    return assets.find(a => a.id === selectedAssetId) || null;
  }, [assets, selectedAssetId]);

  // Assets available for exit (excluding assets that already have active exit)
  const availableAssetsForExit = useMemo(() => {
    const exitedAssetIds = new Set(exits.filter(e => e.status === 'concluida').map(e => e.assetId));
    const q = assetSearchQuery.toLowerCase().trim();

    return assets
      .filter(a => !exitedAssetIds.has(a.id))
      .filter(a => {
        if (!q) return true;
        return (
          (a.tombamento && a.tombamento.toLowerCase().includes(q)) ||
          (a.tomboOrigemSesa && a.tomboOrigemSesa.toLowerCase().includes(q)) ||
          (a.descricao && a.descricao.toLowerCase().includes(q)) ||
          (a.setorNome && a.setorNome.toLowerCase().includes(q)) ||
          (a.unidadeNome && a.unidadeNome.toLowerCase().includes(q))
        );
      })
      .slice(0, 25); // Limit to top 25 for fast selection
  }, [assets, exits, assetSearchQuery]);

  // Filtered Exits
  const filteredExits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return exits
      .filter(e => {
        if (filterType === 'all') return true;
        return e.tipoSaida === filterType;
      })
      .filter(e => {
        if (!q) return true;
        return (
          e.assetTombamento.toLowerCase().includes(q) ||
          (e.assetTomboOrigemSesa && e.assetTomboOrigemSesa.toLowerCase().includes(q)) ||
          e.assetDescricao.toLowerCase().includes(q) ||
          e.destinatario.toLowerCase().includes(q) ||
          e.numeroProcesso.toLowerCase().includes(q) ||
          e.motivo.toLowerCase().includes(q)
        );
      });
  }, [exits, filterType, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const activeExits = exits.filter(e => e.status === 'concluida');
    const devolucoes = activeExits.filter(e => e.tipoSaida === 'devolucao');
    const doacoes = activeExits.filter(e => e.tipoSaida === 'doacao');
    const valorTotal = activeExits.reduce((acc, curr) => acc + (curr.assetValor || 0), 0);

    return {
      total: activeExits.length,
      devolucoesCount: devolucoes.length,
      doacoesCount: doacoes.length,
      valorTotal,
    };
  }, [exits]);

  const handleOpenNewModal = (preselectedAsset?: Asset) => {
    if (preselectedAsset) {
      setSelectedAssetId(preselectedAsset.id);
      if (preselectedAsset.origemTombo?.includes('SESA') || preselectedAsset.tomboOrigemSesa) {
        setTipoSaida('devolucao');
        setDestinatario('Secretaria da Saúde do Estado do Ceará - SESA');
        setMotivo('Devolução de equipamento cedido pelo Estado (SESA)');
      } else if (preselectedAsset.origemTombo?.includes('UFC')) {
        setTipoSaida('devolucao');
        setDestinatario('Universidade Federal do Ceará - UFC');
        setMotivo('Devolução de bem vinculado à UFC');
      }
    } else {
      setSelectedAssetId('');
      setAssetSearchQuery('');
    }
    setNumeroProcesso(`OFÍCIO Nº ${String(exits.length + 1).padStart(3, '0')}/${new Date().getFullYear()} - CPSMS`);
    setIsNewExitModalOpen(true);
  };

  const handleSaveExit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) {
      alert('Por favor, selecione o bem patrimonial que saiu.');
      return;
    }
    if (!destinatario.trim()) {
      alert('Por favor, informe o órgão destinatário ou favorecido.');
      return;
    }
    if (!numeroProcesso.trim()) {
      alert('Por favor, informe o número do ofício ou processo de saída.');
      return;
    }

    onCreateExit({
      assetId: selectedAsset.id,
      assetTombamento: selectedAsset.tombamento,
      assetTomboOrigemSesa: selectedAsset.tomboOrigemSesa,
      assetDescricao: selectedAsset.descricao,
      assetValor: selectedAsset.valorAquisicao || selectedAsset.valorBrutoContabil || 0,
      assetOrigemTombo: selectedAsset.origemTombo,
      assetUnidadeOrigem: selectedAsset.unidadeNome,
      assetSetorOrigem: selectedAsset.setorNome,
      tipoSaida,
      destinatario: destinatario.trim(),
      destinatarioResponsavel: destinatarioResponsavel.trim() || undefined,
      destinatarioCargo: destinatarioCargo.trim() || undefined,
      destinatarioDocumento: destinatarioDocumento.trim() || undefined,
      numeroProcesso: numeroProcesso.trim(),
      motivo: motivo.trim(),
      dataSaida: dataSaida || new Date().toISOString().slice(0, 10),
      registradoPor: currentProfile.nome || 'Gestora de Patrimônio',
      observacoes: observacoes.trim() || undefined,
    });

    setIsNewExitModalOpen(false);
  };

  const handlePrintTerm = (exitItem: AssetExit) => {
    const isDevolucao = exitItem.tipoSaida === 'devolucao';
    const termTitle = isDevolucao
      ? 'TERMO OFICIAL DE ENTREGA E DEVOLUÇÃO DE BEM PATRIMONIAL'
      : 'TERMO OFICIAL DE DOAÇÃO DE BEM PATRIMONIAL';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #111; padding: 25px; line-height: 1.5; font-size: 11pt;">
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 13pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">
            CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL - CPSMS
          </h2>
          <p style="margin: 3px 0 0 0; font-size: 9pt; color: #475569;">
            CNPJ: 13.916.488/0001-40 · GESTÃO PATRIMONIAL E CONTABILIDADE
          </p>
          <div style="margin-top: 10px; display: inline-block; background: #f1f5f9; padding: 4px 14px; border-radius: 4px; font-weight: bold; font-size: 11pt; border: 1px solid #cbd5e1;">
            ${termTitle}
          </div>
          <p style="margin: 6px 0 0 0; font-size: 9.5pt; font-weight: bold; color: #1e293b;">
            PROCESSO / DOCUMENTO: ${exitItem.numeroProcesso} · DATA DE REGISTRO: ${formatDate(exitItem.dataSaida)}
          </p>
        </div>

        <p style="text-align: justify; margin-bottom: 15px;">
          Pelo presente instrumento, o <strong>CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL (CPSMS)</strong>, 
          por meio de seu Setor de Gestão Patrimonial, formaliza a <strong>${isDevolucao ? 'DEVOLUÇÃO' : 'DOAÇÃO'}</strong> 
          do bem patrimonial abaixo discriminado em favor do órgão / favorecido destinatário: 
          <strong>${exitItem.destinatario}</strong>.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt;">
          <tr style="background-color: #f8fafc;">
            <th colspan="2" style="border: 1px solid #94a3b8; padding: 6px; text-align: left; background: #e2e8f0; font-weight: bold;">
              ESPECIFICAÇÕES TÉCNICAS DO BEM PATRIMONIAL
            </th>
          </tr>
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px; width: 35%; font-weight: bold;">Número do Tombo / Plaqueta:</td>
            <td style="border: 1px solid #94a3b8; padding: 6px; font-family: monospace; font-weight: bold; font-size: 11pt;">
              ${exitItem.assetTombamento} ${exitItem.assetTomboOrigemSesa ? `(Tombo SESA: ${exitItem.assetTomboOrigemSesa})` : ''}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px; font-weight: bold;">Descrição do Item:</td>
            <td style="border: 1px solid #94a3b8; padding: 6px;">${exitItem.assetDescricao}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px; font-weight: bold;">Origem do Tombo:</td>
            <td style="border: 1px solid #94a3b8; padding: 6px;">${exitItem.assetOrigemTombo}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px; font-weight: bold;">Local de Lotação Anterior:</td>
            <td style="border: 1px solid #94a3b8; padding: 6px;">${exitItem.assetUnidadeOrigem} — Sala: ${exitItem.assetSetorOrigem}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px; font-weight: bold;">Valor Patrimonial Registrado:</td>
            <td style="border: 1px solid #94a3b8; padding: 6px; font-weight: bold;">${formatBRL(exitItem.assetValor)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px; font-weight: bold;">Motivação / Fundamentação:</td>
            <td style="border: 1px solid #94a3b8; padding: 6px;">${exitItem.motivo}</td>
          </tr>
        </table>

        <div style="margin-top: 15px; padding: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 9pt;">
          <strong>CLÁUSULA DE BAIXA E RESPONSABILIDADE:</strong>
          <p style="margin: 4px 0 0 0; text-align: justify;">
            Com a lavratura deste termo e a respectiva entrega física do bem, cessa a guarda patrimonial do CPSMS sobre o equipamento, 
            ficando a Contabilidade e o setor de Patrimônio autorizados a registrar a respectiva baixa ou exclusão da carga ativa no sistema ASPEC, 
            em estrita observância às normas do Tribunal de Contas do Estado do Ceará (TCE-CE).
          </p>
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-size: 9.5pt;">
          <div style="width: 45%;">
            <div style="border-top: 1px solid #333; padding-top: 5px;">
              <strong>${exitItem.registradoPor}</strong><br />
              Gestora de Patrimônio / CPSMS<br />
              Entregador / Cedente
            </div>
          </div>
          <div style="width: 45%;">
            <div style="border-top: 1px solid #333; padding-top: 5px;">
              <strong>${exitItem.destinatarioResponsavel || 'Representante do Órgão'}</strong><br />
              ${exitItem.destinatario}<br />
              Recebedor / Favorecido
            </div>
          </div>
        </div>

        <div style="margin-top: 30px; text-align: center; font-size: 8pt; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
          Documento emitido eletronicamente via Sistema Integrado de Patrimônio CPSMS em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}.
        </div>
      </div>
    `;

    executePrintHtml({
      html: htmlContent,
      title: `${termTitle} - ${exitItem.assetTombamento}`,
      filename: `termo_saida_${exitItem.assetTombamento}.html`
    });
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Banner & Action */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <ArrowUpRight className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Saídas Patrimoniais (Devoluções & Doações)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Registre com formalidade os bens que saíram por <strong className="text-purple-300">Devolução</strong> (bens cedidos pelo Estado/SESA, UFC ou comodato encerrado) ou por <strong className="text-emerald-300">Doação</strong> formalizada.
              Cada saída gera termo oficial com protocolo e documenta a baixa contábil.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenNewModal()}
            className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 shrink-0 cursor-pointer hover:scale-102 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Nova Saída</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total de Saídas</span>
            <ArrowUpRight className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {stats.total}
          </div>
          <span className="text-[11px] text-slate-400">
            {stats.devolucoesCount} devoluções · {stats.doacoesCount} doações
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Devoluções (Cedentes)</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
            {stats.devolucoesCount}
          </div>
          <span className="text-[11px] text-slate-400">
            SESA, UFC, Comodatos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Doações Formalizadas</span>
            <HeartHandshake className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {stats.doacoesCount}
          </div>
          <span className="text-[11px] text-slate-400">
            Entidades e Municípios
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Valor Total Baixado</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {formatBRL(stats.valorTotal)}
          </div>
          <span className="text-[11px] text-slate-400">
            Baixa do acervo ativo
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Todas ({exits.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('devolucao')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'devolucao'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
            }`}
          >
            Devoluções ({exits.filter(e => e.tipoSaida === 'devolucao').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('doacao')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'doacao'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
            }`}
          >
            Doações ({exits.filter(e => e.tipoSaida === 'doacao').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por tombo, órgão, processo..."
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Main List of Exits */}
      {filteredExits.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
            <ArrowUpRight className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Nenhuma saída registrada
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Quando houver bens devolvidos à SESA/UFC ou doados a terceiros, clique em <strong>"+ Registrar Nova Saída"</strong> para formalizar a entrega e gerar o termo oficial.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExits.map((item) => {
            const isDevolucao = item.tipoSaida === 'devolucao';
            const isCancelled = item.status === 'cancelada';

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all shadow-xs space-y-3 ${
                  isCancelled
                    ? 'bg-slate-50 dark:bg-slate-850 border-slate-200 opacity-60'
                    : isDevolucao
                    ? 'bg-white dark:bg-slate-850 border-blue-200 dark:border-blue-900/50'
                    : 'bg-white dark:bg-slate-850 border-emerald-200 dark:border-emerald-900/50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                        isDevolucao 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300'
                      }`}>
                        {isDevolucao ? 'Devolução a Cedente' : 'Doação Formalizada'}
                      </span>

                      <span className="px-3 py-1 rounded-xl bg-slate-900 text-emerald-400 font-mono font-black text-sm border border-slate-700">
                        {item.assetTombamento}
                      </span>

                      {item.assetTomboOrigemSesa && (
                        <span className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-mono font-bold text-xs border border-blue-300">
                          SESA: {item.assetTomboOrigemSesa}
                        </span>
                      )}

                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Processo: <strong className="text-slate-800 dark:text-slate-200">{item.numeroProcesso}</strong>
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      {item.assetDescricao}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                      <div>
                        Destinatário: <strong className="text-slate-900 dark:text-white">{item.destinatario}</strong>
                        {item.destinatarioResponsavel && <span className="block text-[11px] text-slate-400">Resp: {item.destinatarioResponsavel}</span>}
                      </div>
                      <div>
                        Origem: <strong>{item.assetUnidadeOrigem}</strong>
                        <span className="block text-[11px] text-slate-400">Sala: {item.assetSetorOrigem}</span>
                      </div>
                      <div>
                        Valor Baixado: <strong className="text-slate-900 dark:text-white">{formatBRL(item.assetValor)}</strong>
                        <span className="block text-[11px] text-slate-400">Data Saída: {formatDate(item.dataSaida)}</span>
                      </div>
                    </div>

                    {item.motivo && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 pt-1 italic bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        "{item.motivo}"
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => handlePrintTerm(item)}
                      className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      title="Imprimir termo formal de saída e entrega"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Termo Oficial</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja cancelar esta saída e reativar o bem tombo "${item.assetTombamento}" no inventário ativo?`)) {
                          onCancelExit(item.id);
                        }
                      }}
                      className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                      title="Cancelar saída e voltar o bem para o patrimônio ativo"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reverter</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Registrar Nova Saída */}
      {isNewExitModalOpen && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black">Registrar Saída de Bem</h4>
                  <p className="text-xs text-slate-500">Devolução a cedente (SESA/UFC) ou doação formal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewExitModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExit} className="space-y-4 text-xs">
              {/* STEP 1: Select Asset */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  1. Selecione o Bem que Saiu:
                </label>

                {!selectedAsset ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={assetSearchQuery}
                        onChange={(e) => setAssetSearchQuery(e.target.value)}
                        placeholder="Pesquise por tombo, descrição ou sala..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-850">
                      {availableAssetsForExit.length === 0 ? (
                        <p className="p-3 text-slate-400 text-center">Nenhum bem encontrado com esse termo.</p>
                      ) : (
                        availableAssetsForExit.map(a => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setSelectedAssetId(a.id);
                              if (a.origemTombo?.includes('SESA') || a.tomboOrigemSesa) {
                                setTipoSaida('devolucao');
                                setDestinatario('Secretaria da Saúde do Estado do Ceará - SESA');
                                setMotivo('Devolução de equipamento cedido pelo Estado (SESA)');
                              } else if (a.origemTombo?.includes('UFC')) {
                                setTipoSaida('devolucao');
                                setDestinatario('Universidade Federal do Ceará - UFC');
                                setMotivo('Devolução de bem vinculado à UFC');
                              }
                            }}
                            className="w-full text-left p-2.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-slate-900 dark:text-white mr-1.5">{a.tombamento}</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{a.descricao}</span>
                              <span className="block text-[11px] text-slate-400">{a.unidadeNome} · {a.setorNome}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 shrink-0">
                              {formatBRL(a.valorAquisicao || 0)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-purple-950 dark:text-purple-300">
                          {selectedAsset.tombamento}
                        </span>
                        {selectedAsset.tomboOrigemSesa && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                            SESA: {selectedAsset.tomboOrigemSesa}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.2 rounded bg-purple-200/60 text-purple-900">
                          {selectedAsset.origemTombo}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white">{selectedAsset.descricao}</p>
                      <p className="text-slate-500 text-[11px]">
                        Lotação: {selectedAsset.unidadeNome} — {selectedAsset.setorNome} · Valor: {formatBRL(selectedAsset.valorAquisicao || 0)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedAssetId('')}
                      className="px-2.5 py-1 text-xs font-semibold text-purple-700 hover:text-purple-900 dark:text-purple-300 underline cursor-pointer"
                    >
                      Trocar
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 2: Tipo de Saída */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  2. Tipo de Saída:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTipoSaida('devolucao');
                      setDestinatario('Secretaria da Saúde do Estado do Ceará - SESA');
                      setMotivo('Devolução de bem cedido pelo Estado / Encerramento de comodato');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      tipoSaida === 'devolucao'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>Devolução a Cedente</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal block">
                      Retorno de bem cedido pela SESA, UFC ou comodato
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTipoSaida('doacao');
                      setDestinatario('Prefeitura Municipal de Sobral');
                      setMotivo('Doação formalizada de bem patrimonial');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      tipoSaida === 'doacao'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs">
                      <HeartHandshake className="w-4 h-4 text-emerald-600" />
                      <span>Doação de Bem</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal block">
                      Doação a terceiros, municípios consorciados ou entidades
                    </span>
                  </button>
                </div>
              </div>

              {/* STEP 3: Destinatário */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  3. Órgão / Entidade Destinatária:
                </label>
                <input
                  type="text"
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  placeholder="Ex: Secretaria da Saúde do Estado do Ceará - SESA"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium"
                  required
                />
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] text-slate-400">Sugestões rápidas:</span>
                  <button
                    type="button"
                    onClick={() => setDestinatario('Secretaria da Saúde do Estado do Ceará - SESA')}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 cursor-pointer"
                  >
                    SESA (Estado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinatario('Universidade Federal do Ceará - UFC')}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 cursor-pointer"
                  >
                    UFC
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinatario('Prefeitura Municipal de Sobral')}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 cursor-pointer"
                  >
                    Prefeitura
                  </button>
                </div>
              </div>

              {/* STEP 4: Processo & Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Número do Ofício / Processo:
                  </label>
                  <input
                    type="text"
                    value={numeroProcesso}
                    onChange={(e) => setNumeroProcesso(e.target.value)}
                    placeholder="Ex: OFÍCIO Nº 124/2026 - CPSMS"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Data da Saída:
                  </label>
                  <input
                    type="date"
                    value={dataSaida}
                    onChange={(e) => setDataSaida(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    required
                  />
                </div>
              </div>

              {/* STEP 5: Responsável que recebeu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Nome do Recebedor no Destino (opcional):
                  </label>
                  <input
                    type="text"
                    value={destinatarioResponsavel}
                    onChange={(e) => setDestinatarioResponsavel(e.target.value)}
                    placeholder="Nome de quem recebeu o bem"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Cargo / Matrícula do Recebedor:
                  </label>
                  <input
                    type="text"
                    value={destinatarioCargo}
                    onChange={(e) => setDestinatarioCargo(e.target.value)}
                    placeholder="Ex: Fiscal de Contrato / Matrícula"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              {/* STEP 6: Motivo */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Justificativa / Motivo da Saída:
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva o motivo da devolução ou doação..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewExitModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedAsset}
                  className="px-5 py-2.5 text-xs font-black rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Confirmar e Registrar Saída</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
