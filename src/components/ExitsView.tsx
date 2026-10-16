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
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  ListChecks,
  Check,
  Trash2,
  MapPin
} from 'lucide-react';
import { Asset, AssetExit, ExitType, ExitLinkedAsset, UserProfile, UnitInfo, Sector } from '../types';
import { formatBRL, formatDate } from '../utils/formatters';
import { executePrintHtml } from '../utils/printHelper';

interface ExitsViewProps {
  exits: AssetExit[];
  assets: Asset[];
  units: UnitInfo[];
  sectors: Sector[];
  currentProfile: UserProfile;
  onCreateExit: (newExit: Omit<AssetExit, 'id' | 'dataRegistro' | 'status'> & { bens?: ExitLinkedAsset[] }) => void;
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
  const [expandedExitId, setExpandedExitId] = useState<string | null>(null);

  // Form states for New Exit
  const [tipoSaida, setTipoSaida] = useState<ExitType>('devolucao');
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const [assetUnitFilter, setAssetUnitFilter] = useState<string>('all');
  const [destinatario, setDestinatario] = useState<string>('Secretaria da Saúde do Estado do Ceará - SESA');
  const [destinatarioResponsavel, setDestinatarioResponsavel] = useState<string>('');
  const [destinatarioCargo, setDestinatarioCargo] = useState<string>('');
  const [destinatarioDocumento, setDestinatarioDocumento] = useState<string>('');
  const [numeroProcesso, setNumeroProcesso] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('Devolução de bem cedido pelo Estado / Encerramento de comodato');
  const [dataSaida, setDataSaida] = useState<string>(new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState<string>('');

  // Assets that already have an active exit
  const exitedAssetIds = useMemo(() => {
    const set = new Set<string>();
    exits.filter(e => e.status === 'concluida').forEach(e => {
      if (e.bens && e.bens.length > 0) {
        e.bens.forEach(b => { if (b.assetId) set.add(b.assetId); });
      }
      if (e.assetId) set.add(e.assetId);
    });
    // Also include assets with statusSaida !== 'ativo'
    assets.forEach(a => {
      if (a.statusSaida && a.statusSaida !== 'ativo') {
        set.add(a.id);
      }
    });
    return set;
  }, [exits, assets]);

  // Assets available for exit (excluding assets that already have active exit or are in trash)
  const availableAssetsForExit = useMemo(() => {
    const q = assetSearchQuery.toLowerCase().trim();
    const selectedIds = new Set(selectedAssets.map(a => a.id));

    return assets
      .filter(a => !exitedAssetIds.has(a.id) || selectedIds.has(a.id))
      .filter(a => {
        if (assetUnitFilter !== 'all' && a.unidadeId !== assetUnitFilter) return false;
        if (!q) return true;
        const tombo = (a.tombamento || '').toLowerCase();
        const tomboSesa = (a.tomboOrigemSesa || '').toLowerCase();
        const desc = (a.descricao || '').toLowerCase();
        const setor = (a.setorNome || '').toLowerCase();
        const un = (a.unidadeNome || '').toLowerCase();
        return tombo.includes(q) || tomboSesa.includes(q) || desc.includes(q) || setor.includes(q) || un.includes(q);
      })
      .slice(0, 40); // Limit to top 40 for fast interactive picking
  }, [assets, exitedAssetIds, selectedAssets, assetSearchQuery, assetUnitFilter]);

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
        const matchesMain = 
          (e.assetTombamento && e.assetTombamento.toLowerCase().includes(q)) ||
          (e.assetTomboOrigemSesa && e.assetTomboOrigemSesa.toLowerCase().includes(q)) ||
          (e.assetDescricao && e.assetDescricao.toLowerCase().includes(q)) ||
          (e.destinatario && e.destinatario.toLowerCase().includes(q)) ||
          (e.numeroProcesso && e.numeroProcesso.toLowerCase().includes(q)) ||
          (e.motivo && e.motivo.toLowerCase().includes(q));

        if (matchesMain) return true;

        if (e.bens && e.bens.length > 0) {
          return e.bens.some(b => 
            (b.tombamento && b.tombamento.toLowerCase().includes(q)) ||
            (b.tomboOrigemSesa && b.tomboOrigemSesa.toLowerCase().includes(q)) ||
            (b.descricao && b.descricao.toLowerCase().includes(q))
          );
        }

        return false;
      });
  }, [exits, filterType, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const activeExits = exits.filter(e => e.status === 'concluida');
    const devolucoes = activeExits.filter(e => e.tipoSaida === 'devolucao');
    const doacoes = activeExits.filter(e => e.tipoSaida === 'doacao');

    let totalBensDevolvidos = 0;
    let valorTotalDevolvido = 0;
    devolucoes.forEach(e => {
      const bensCount = (e.bens && e.bens.length > 0) ? e.bens.length : 1;
      totalBensDevolvidos += bensCount;
      valorTotalDevolvido += (e.assetValor || 0);
    });

    let totalBensDoados = 0;
    let valorTotalDoado = 0;
    doacoes.forEach(e => {
      const bensCount = (e.bens && e.bens.length > 0) ? e.bens.length : 1;
      totalBensDoados += bensCount;
      valorTotalDoado += (e.assetValor || 0);
    });

    return {
      totalExits: activeExits.length,
      totalBensBaixados: totalBensDevolvidos + totalBensDoados,
      valorTotalBaixado: valorTotalDevolvido + valorTotalDoado,
      devolucoesCount: devolucoes.length,
      totalBensDevolvidos,
      valorTotalDevolvido,
      doacoesCount: doacoes.length,
      totalBensDoados,
      valorTotalDoado,
    };
  }, [exits]);

  // Open modal with pre-configured settings for Devolução or Doação
  const handleOpenNewModal = (type: ExitType = 'devolucao', preselectedAsset?: Asset) => {
    setTipoSaida(type);
    setSelectedAssets(preselectedAsset ? [preselectedAsset] : []);
    setAssetSearchQuery('');
    setAssetUnitFilter('all');
    setDataSaida(new Date().toISOString().slice(0, 10));

    const nextNumber = String(exits.length + 1).padStart(3, '0');
    const ano = new Date().getFullYear();

    if (type === 'devolucao') {
      setDestinatario('Secretaria da Saúde do Estado do Ceará - SESA');
      setMotivo('Devolução formal de bens cedidos pelo Estado / Encerramento de comodato');
      setNumeroProcesso(`OFÍCIO Nº ${nextNumber}/${ano} - CPSMS/SESA`);
    } else {
      setDestinatario('Prefeitura Municipal de Sobral');
      setMotivo('Doação formalizada de bens patrimoniais conforme processo administrativo');
      setNumeroProcesso(`TERMO DE DOAÇÃO Nº ${nextNumber}/${ano} - CPSMS`);
    }

    setDestinatarioResponsavel('');
    setDestinatarioCargo('');
    setDestinatarioDocumento('');
    setObservacoes('');
    setIsNewExitModalOpen(true);
  };

  const toggleSelectAsset = (asset: Asset) => {
    setSelectedAssets(prev => {
      const exists = prev.some(a => a.id === asset.id);
      if (exists) {
        return prev.filter(a => a.id !== asset.id);
      } else {
        return [...prev, asset];
      }
    });
  };

  const handleSelectAllFiltered = () => {
    const unselected = availableAssetsForExit.filter(a => !selectedAssets.some(s => s.id === a.id));
    setSelectedAssets(prev => [...prev, ...unselected]);
  };

  const handleSaveExit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAssets.length === 0) {
      alert('Por favor, selecione ao menos um bem patrimonial para vincular a esta saída.');
      return;
    }
    if (!destinatario.trim()) {
      alert('Por favor, informe o órgão destinatário ou favorecido.');
      return;
    }
    if (!numeroProcesso.trim()) {
      alert('Por favor, informe o número do ofício, processo ou termo de saída.');
      return;
    }

    const linkedBens: ExitLinkedAsset[] = selectedAssets.map(a => ({
      assetId: a.id,
      tombamento: a.tombamento,
      tomboOrigemSesa: a.tomboOrigemSesa,
      descricao: a.descricao,
      valor: a.valorAquisicao || a.valorBrutoContabil || 0,
      origemTombo: a.origemTombo,
      unidadeOrigem: a.unidadeNome,
      setorOrigem: a.setorNome,
      subsetorOrigem: a.subsetorNome,
      estado: a.estado,
      numeroSerie: a.numeroSerie,
    }));

    const primaryAsset = selectedAssets[0];
    const totalValor = linkedBens.reduce((sum, b) => sum + (b.valor || 0), 0);

    onCreateExit({
      assetId: primaryAsset.id,
      assetTombamento: selectedAssets.length === 1 
        ? primaryAsset.tombamento 
        : `${primaryAsset.tombamento} (+${selectedAssets.length - 1} outros)`,
      assetTomboOrigemSesa: primaryAsset.tomboOrigemSesa,
      assetDescricao: selectedAssets.length === 1 
        ? primaryAsset.descricao 
        : `Lote com ${selectedAssets.length} bens patrimoniais (${primaryAsset.descricao} e outros)`,
      assetValor: totalValor,
      assetOrigemTombo: primaryAsset.origemTombo,
      assetUnidadeOrigem: primaryAsset.unidadeNome,
      assetSetorOrigem: primaryAsset.setorNome,
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
      bens: linkedBens,
    });

    setIsNewExitModalOpen(false);
  };

  const handlePrintTerm = (exitItem: AssetExit) => {
    const isDevolucao = exitItem.tipoSaida === 'devolucao';
    const termTitle = isDevolucao
      ? 'TERMO OFICIAL DE ENTREGA E DEVOLUÇÃO DE BENS PATRIMONIAIS A CEDENTE'
      : 'TERMO OFICIAL DE DOAÇÃO DE BENS PATRIMONIAIS';

    // Lista consolidada de bens deste termo
    const itemsList: ExitLinkedAsset[] = (exitItem.bens && exitItem.bens.length > 0)
      ? exitItem.bens
      : [{
          assetId: exitItem.assetId,
          tombamento: exitItem.assetTombamento,
          tomboOrigemSesa: exitItem.assetTomboOrigemSesa,
          descricao: exitItem.assetDescricao,
          valor: exitItem.assetValor,
          origemTombo: exitItem.assetOrigemTombo,
          unidadeOrigem: exitItem.assetUnidadeOrigem,
          setorOrigem: exitItem.assetSetorOrigem,
        }];

    const totalValor = itemsList.reduce((acc, curr) => acc + (curr.valor || 0), 0);

    const rowsHtml = itemsList.map((item, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; page-break-inside: avoid;">
        <td style="border: 1px solid #94a3b8; padding: 6px 8px; text-align: center; font-mono; font-size: 9pt;">${idx + 1}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-family: monospace; font-weight: bold; font-size: 10pt;">
          ${item.tombamento}
          ${item.tomboOrigemSesa ? `<br/><span style="font-size: 8pt; color: #1d4ed8; font-weight: normal;">SESA: ${item.tomboOrigemSesa}</span>` : ''}
        </td>
        <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 9.5pt;">
          <strong>${item.descricao}</strong>
          ${item.numeroSerie ? `<br/><span style="font-size: 8pt; color: #64748b;">Nº Série: ${item.numeroSerie}</span>` : ''}
        </td>
        <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 9pt;">
          ${item.unidadeOrigem}<br/>
          <span style="font-size: 8pt; color: #475569;">Sala: ${item.setorOrigem}</span>
        </td>
        <td style="border: 1px solid #94a3b8; padding: 6px 8px; text-align: center; font-size: 9pt;">
          ${item.estado || 'Bom'}
        </td>
        <td style="border: 1px solid #94a3b8; padding: 6px 8px; text-align: right; font-weight: bold; font-size: 9.5pt; font-family: monospace;">
          ${formatBRL(item.valor || 0)}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; padding: 30px; line-height: 1.5; font-size: 10pt; max-width: 900px; margin: 0 auto;">
        {/* Cabeçalho Oficial */}
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 13pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; color: #0f172a;">
            CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL - CPSMS
          </h2>
          <p style="margin: 3px 0 0 0; font-size: 8.5pt; color: #475569;">
            CNPJ: 13.916.488/0001-40 · POLICLÍNICA BERNARDO FÉLIX & CEO REGIONAL · SOBRAL-CE
          </p>
          <p style="margin: 2px 0 0 0; font-size: 8.5pt; color: #475569;">
            SETOR DE GESTÃO PATRIMONIAL E CONTABILIDADE PÚBLICA
          </p>
          <div style="margin-top: 12px; display: inline-block; background: #f8fafc; padding: 6px 18px; border-radius: 4px; font-weight: bold; font-size: 11pt; border: 1.5px solid #0f172a; text-transform: uppercase;">
            ${termTitle}
          </div>
          <div style="margin-top: 8px; font-size: 9.5pt; font-weight: bold; color: #1e293b; display: flex; justify-content: center; gap: 20px;">
            <span>PROCESSO / DOCUMENTO: <u>${exitItem.numeroProcesso}</u></span>
            <span>DATA DA EFETIVAÇÃO: <u>${formatDate(exitItem.dataSaida)}</u></span>
          </div>
        </div>

        {/* Preâmbulo Legal */}
        <p style="text-align: justify; margin-bottom: 14px; line-height: 1.6;">
          Pelo presente instrumento particular e oficial de baixa patrimonial, o <strong>CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL (CPSMS)</strong>, 
          inscrito no CNPJ sob o nº 13.916.488/0001-40, por intermédio de sua Gerência de Patrimônio, formaliza perante as autoridades competentes a 
          <strong>${isDevolucao ? 'DEVOLUÇÃO DEFINITIVA DE BENS CEDIDOS' : 'DOAÇÃO FORMALIZADA DE BENS PATRIMONIAIS'}</strong> 
          em favor do órgão / favorecido destinatário: <strong>${exitItem.destinatario}</strong>, 
          em estrito cumprimento às normas da Lei Federal nº 4.320/1964 e resoluções do Tribunal de Contas do Estado do Ceará (TCE-CE).
        </p>

        {/* Dados do Destinatário */}
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 9.5pt;">
          <div style="font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; text-transform: uppercase; color: #1e293b;">
            DADOS DO ÓRGÃO / FAVORECIDO RECEPTOR:
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <div><strong>Órgão / Entidade:</strong> ${exitItem.destinatario}</div>
            <div><strong>Responsável Recebedor:</strong> ${exitItem.destinatarioResponsavel || 'Representante Legal do Destinatário'}</div>
            <div><strong>Cargo / Função:</strong> ${exitItem.destinatarioCargo || 'Fiscal de Carga / Representante'}</div>
            <div><strong>Documento / Matrícula:</strong> ${exitItem.destinatarioDocumento || 'Órgão Externo'}</div>
          </div>
          <div style="margin-top: 6px;">
            <strong>Motivação / Fundamentação:</strong> ${exitItem.motivo}
          </div>
          ${exitItem.observacoes ? `<div style="margin-top: 4px; font-style: italic; color: #475569;"><strong>Observações:</strong> ${exitItem.observacoes}</div>` : ''}
        </div>

        {/* Tabela Completa dos Bens */}
        <div style="margin-bottom: 16px;">
          <div style="font-weight: bold; margin-bottom: 6px; font-size: 10pt; text-transform: uppercase; color: #0f172a; display: flex; justify-content: space-between;">
            <span>RELAÇÃO ANALÍTICA DOS BENS PATRIMONIAIS BAIXADOS (${itemsList.length} ITENS)</span>
            <span>TOTAL: ${formatBRL(totalValor)}</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 9pt; border: 1px solid #94a3b8;">
            <thead>
              <tr style="background: #e2e8f0; color: #0f172a; font-weight: bold;">
                <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 5%; text-align: center;">Item</th>
                <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 16%; text-align: left;">Tombo / Plaqueta</th>
                <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 38%; text-align: left;">Descrição do Item</th>
                <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 23%; text-align: left;">Local de Origem Anterior</th>
                <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 8%; text-align: center;">Estado</th>
                <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 10%; text-align: right;">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a;">
                <td colspan="5" style="border: 1px solid #94a3b8; padding: 8px; text-align: right; text-transform: uppercase;">
                  VALOR CONTÁBIL TOTAL DESINCORPORADO (${itemsList.length} BENS):
                </td>
                <td style="border: 1px solid #94a3b8; padding: 8px; text-align: right; font-family: monospace; font-size: 10pt;">
                  ${formatBRL(totalValor)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Cláusula de Baixa e Atualização Manual no ARESPEC / ASPEC */}
        <div style="padding: 12px; background: #fffbeb; border: 1.5px solid #f59e0b; border-radius: 6px; font-size: 9pt; margin-bottom: 24px; text-align: justify;">
          <strong style="color: #92400e; text-transform: uppercase;">CLÁUSULA DE BAIXA CONTÁBIL E ATUALIZAÇÃO NO ARESPEC / ASPEC:</strong>
          <p style="margin: 4px 0 0 0; color: #78350f; line-height: 1.5;">
            Com a lavratura deste instrumento e a formalização da entrega física dos bens acima especificados, 
            <strong>cessa integralmente a responsabilidade de guarda e conservação patrimonial do CPSMS</strong> sobre estes itens. 
            Este documento constitui a <strong>comprovação legal indispensável</strong> para que o Setor de Patrimônio e a Gerência de Contabilidade 
            procedam à <strong>atualização manual de baixa definitiva no sistema oficial ARESPEC / ASPEC</strong>, desonerando os inventários setoriais das unidades de origem 
            e instruindo o relatório anual de prestação de contas do Consórcio perante o Tribunal de Contas do Estado do Ceará (TCE-CE).
          </p>
        </div>

        {/* Assinaturas Formais */}
        <div style="margin-top: 45px; display: flex; justify-content: space-between; text-align: center; font-size: 9.5pt; page-break-inside: avoid;">
          <div style="width: 45%;">
            <div style="border-top: 1.5px solid #0f172a; padding-top: 6px;">
              <strong>${exitItem.registradoPor || 'Gestora de Patrimônio'}</strong><br />
              <span style="font-size: 8.5pt; color: #475569;">Gestão de Patrimônio / CPSMS</span><br />
              <strong>ENTREGADOR / CEDENTE</strong>
            </div>
          </div>
          <div style="width: 45%;">
            <div style="border-top: 1.5px solid #0f172a; padding-top: 6px;">
              <strong>${exitItem.destinatarioResponsavel || 'Representante do Órgão Destinatário'}</strong><br />
              <span style="font-size: 8.5pt; color: #475569;">${exitItem.destinatarioCargo || 'Cargo / Matrícula do Recebedor'}</span><br />
              <strong>RECEBEDOR / DESTINATÁRIO</strong>
            </div>
          </div>
        </div>

        {/* Rodapé e Autenticação */}
        <div style="margin-top: 35px; text-align: center; font-size: 8pt; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
          Emitido eletronicamente via Sistema Integrado de Patrimônio CPSMS em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}.
          · Termo com valor de fé pública para fins de controle interno e auditoria governamental TCE-CE.
        </div>
      </div>
    `;

    executePrintHtml({
      html: htmlContent,
      title: `${termTitle} - ${exitItem.numeroProcesso}`,
      filename: `termo_saida_${exitItem.numeroProcesso.replace(/[^a-zA-Z0-9]/g, '_')}.html`
    });
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <ArrowUpRight className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Saídas Patrimoniais & Baixas do Acervo (Devoluções & Doações)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Registre a desincorporação de bens por <strong>Devolução a Cedentes</strong> (SESA, UFC, Comodatos) ou <strong>Doações</strong> a terceiros e municípios.
              Vincule múltiplos itens em um único registro e emita o <strong>Termo Geral</strong> comprobatório para alimentar manualmente o <strong>ARESPEC</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenNewModal('devolucao')}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
              title="Registrar devolução de bens cedidos pela SESA ou UFC"
            >
              <Truck className="w-4 h-4" />
              <span>+ Nova Devolução</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenNewModal('doacao')}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
              title="Registrar doação formal de bens"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>+ Nova Doação</span>
            </button>
          </div>
        </div>
      </div>

      {/* DUAS CAIXAS ORGANIZADAS: DEVOLUÇÃO E DOAÇÃO (CONFORME SOLICITADO PELO USUÁRIO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CAIXA 1: DEVOLUÇÃO A CEDENTES (SESA / UFC / COMODATOS) */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-blue-950/40 dark:to-slate-900 border-2 border-blue-200 dark:border-blue-900/60 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-sm">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-200/80 dark:bg-blue-900/80 text-blue-900 dark:text-blue-200">
                    Cedentes Públicos
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    Devoluções a Cedentes
                  </h3>
                </div>
              </div>
              <span className="font-mono font-black text-xl text-blue-700 dark:text-blue-300">
                {stats.totalBensDevolvidos} <span className="text-xs font-sans text-slate-500 font-normal">bens</span>
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Equipamentos cedidos pelo <strong>Estado do Ceará (SESA)</strong>, <strong>Universidade Federal do Ceará (UFC)</strong> ou bens com contrato de comodato encerrado que retornam ao proprietário de origem.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-850/80 border border-blue-100 dark:border-blue-900/40">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Termos Emitidos:</span>
                <span className="font-bold text-slate-900 dark:text-white">{stats.devolucoesCount} termo(s)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-850/80 border border-blue-100 dark:border-blue-900/40">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Valor Devolvido:</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">{formatBRL(stats.valorTotalDevolvido)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Destinatários habituais: <strong>SESA</strong>, <strong>UFC</strong>
            </span>
            <button
              type="button"
              onClick={() => handleOpenNewModal('devolucao')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Devolução</span>
            </button>
          </div>
        </div>

        {/* CAIXA 2: DOAÇÕES FORMALIZADAS (MUNICÍPIOS / ENTIDADES) */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/40 dark:to-slate-900 border-2 border-emerald-200 dark:border-emerald-900/60 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-sm">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200">
                    Terceiros & Municípios
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    Doações de Bens
                  </h3>
                </div>
              </div>
              <span className="font-mono font-black text-xl text-emerald-700 dark:text-emerald-300">
                {stats.totalBensDoados} <span className="text-xs font-sans text-slate-500 font-normal">bens</span>
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bens patrimoniais doados para <strong>Prefeituras Consorciadas</strong>, entidades assistenciais ou instituições conveniadas, mediante processo administrativo de desincorporação.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-850/80 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Termos Emitidos:</span>
                <span className="font-bold text-slate-900 dark:text-white">{stats.doacoesCount} termo(s)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-850/80 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Valor Doado:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatBRL(stats.valorTotalDoado)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Destinatários habituais: <strong>Prefeituras</strong>, <strong>Entidades</strong>
            </span>
            <button
              type="button"
              onClick={() => handleOpenNewModal('doacao')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Doação</span>
            </button>
          </div>
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
            placeholder="Buscar por tombo, órgão, processo, sala..."
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
            Nenhuma saída encontrada
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Utilize as caixas acima para formalizar uma <strong>Devolução a Cedente</strong> ou <strong>Doação de Bens</strong>.
            Você poderá selecionar múltiplos bens em um único termo oficial.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExits.map((item) => {
            const isDevolucao = item.tipoSaida === 'devolucao';
            const isCancelled = item.status === 'cancelada';
            const isExpanded = expandedExitId === item.id;
            const itemsCount = (item.bens && item.bens.length > 0) ? item.bens.length : 1;

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

                      {/* Multiple assets badge */}
                      <span className="px-3 py-1 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300 font-bold text-xs border border-purple-300 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{itemsCount} {itemsCount === 1 ? 'bem vinculado' : 'bens vinculados'}</span>
                      </span>

                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Processo: <strong className="text-slate-900 dark:text-white">{item.numeroProcesso}</strong>
                      </span>

                      {item.termoGeradoId && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-emerald-400">
                          {item.termoGeradoId}
                        </span>
                      )}
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
                        Origem Anterior: <strong>{item.assetUnidadeOrigem}</strong>
                        <span className="block text-[11px] text-slate-400">Sala: {item.assetSetorOrigem}</span>
                      </div>
                      <div>
                        Valor Total Baixado: <strong className="text-slate-900 dark:text-white">{formatBRL(item.assetValor)}</strong>
                        <span className="block text-[11px] text-slate-400">Data da Saída: {formatDate(item.dataSaida)}</span>
                      </div>
                    </div>

                    {item.motivo && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 italic bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        "{item.motivo}"
                      </p>
                    )}

                    {/* Accordion Toggle for Linked Assets */}
                    {item.bens && item.bens.length > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setExpandedExitId(isExpanded ? null : item.id)}
                          className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <span>{isExpanded ? 'Ocultar relação dos bens' : `Ver lista detalhada dos ${item.bens.length} bens deste registro`}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => handlePrintTerm(item)}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-102 active:scale-98"
                      title="Imprimir termo oficial de saída com relação completa dos bens para atualização manual no ARESPEC"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Termo Oficial Completo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja cancelar esta saída e reativar todos os ${itemsCount} bem(ns) no inventário ativo?`)) {
                          onCancelExit(item.id);
                        }
                      }}
                      className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                      title="Cancelar saída e voltar todos os bens para o patrimônio ativo"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reverter</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Drawer: Table of Linked Assets */}
                {isExpanded && item.bens && item.bens.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Relação dos {item.bens.length} Bens Baixados</span>
                      <span>Total: {formatBRL(item.assetValor)}</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[11px]">
                            <th className="py-1.5 px-2">#</th>
                            <th className="py-1.5 px-2">Tombo CPSMS</th>
                            <th className="py-1.5 px-2">Tombo SESA</th>
                            <th className="py-1.5 px-2">Descrição</th>
                            <th className="py-1.5 px-2">Origem Anterior</th>
                            <th className="py-1.5 px-2 text-right">Valor (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-750">
                          {item.bens.map((b, idx) => (
                            <tr key={idx} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <td className="py-1.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-1.5 px-2 font-mono font-bold text-slate-900 dark:text-white">{b.tombamento}</td>
                              <td className="py-1.5 px-2 font-mono text-blue-600 dark:text-blue-400">{b.tomboOrigemSesa || '—'}</td>
                              <td className="py-1.5 px-2 font-medium text-slate-800 dark:text-slate-200">{b.descricao}</td>
                              <td className="py-1.5 px-2 text-slate-500">{b.unidadeOrigem} — {b.setorOrigem}</td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatBRL(b.valor || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: REGISTRAR NOVA SAÍDA (COM VÍNCULO DE MÚLTIPLOS BENS) */}
      {isNewExitModalOpen && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl ${
                  tipoSaida === 'devolucao' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300' 
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                }`}>
                  {tipoSaida === 'devolucao' ? <Truck className="w-6 h-6" /> : <HeartHandshake className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black">
                    {tipoSaida === 'devolucao' ? 'Registrar Devolução a Cedente (SESA / UFC)' : 'Registrar Doação de Bens'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Vincule um ou mais bens em um único termo oficial de baixa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewExitModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExit} className="space-y-4 text-xs">
              {/* SELETOR RÁPIDO DO TIPO DE SAÍDA */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  1. Modalidade da Baixa:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTipoSaida('devolucao');
                      setDestinatario('Secretaria da Saúde do Estado do Ceará - SESA');
                      setMotivo('Devolução formal de bens cedidos pelo Estado / Encerramento de comodato');
                      setNumeroProcesso(`OFÍCIO Nº ${String(exits.length + 1).padStart(3, '0')}/${new Date().getFullYear()} - CPSMS/SESA`);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      tipoSaida === 'devolucao'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30 font-bold'
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
                      setMotivo('Doação formalizada de bens patrimoniais conforme processo administrativo');
                      setNumeroProcesso(`TERMO DE DOAÇÃO Nº ${String(exits.length + 1).padStart(3, '0')}/${new Date().getFullYear()} - CPSMS`);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      tipoSaida === 'doacao'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30 font-bold'
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

              {/* SELEÇÃO E VÍNCULO DE MÚLTIPLOS BENS */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-purple-600" />
                    <span>2. Vincular Bens a esta Saída ({selectedAssets.length} selecionado{selectedAssets.length === 1 ? '' : 's'}):</span>
                  </label>

                  {selectedAssets.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedAssets([])}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      Limpar seleção ({selectedAssets.length})
                    </button>
                  )}
                </div>

                {/* Tray of already selected assets */}
                {selectedAssets.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-950 dark:text-purple-200">
                      <span>Bens vinculados a este termo ({selectedAssets.length})</span>
                      <span>Valor total: {formatBRL(selectedAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0))}</span>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-purple-100 dark:divide-purple-900/60">
                      {selectedAssets.map(a => (
                        <div key={a.id} className="pt-1 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{a.tombamento}</span>
                            {a.tomboOrigemSesa && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">SESA: {a.tomboOrigemSesa}</span>
                            )}
                            <span className="truncate text-slate-700 dark:text-slate-300">{a.descricao}</span>
                            <span className="text-[10px] text-slate-400">({a.setorNome})</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {formatBRL(a.valorAquisicao || a.valorBrutoContabil || 0)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSelectAsset(a)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Remover este bem da saída"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search & Unit filter for picking assets */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                  <div className="sm:col-span-8 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={assetSearchQuery}
                      onChange={(e) => setAssetSearchQuery(e.target.value)}
                      placeholder="Buscar bens por tombo, tombo SESA, descrição ou sala..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={assetUnitFilter}
                      onChange={(e) => setAssetUnitFilter(e.target.value)}
                      className="w-full py-2 px-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <option value="all">Todas as Unidades</option>
                      {units.map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Available Assets List with Checkboxes */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {availableAssetsForExit.length === 0 ? (
                    <p className="p-3 text-slate-400 text-center">Nenhum bem ativo encontrado com esses filtros.</p>
                  ) : (
                    <>
                      <div className="p-2 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Exibindo {availableAssetsForExit.length} bens disponíveis</span>
                        <button
                          type="button"
                          onClick={handleSelectAllFiltered}
                          className="font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
                        >
                          + Adicionar todos os {availableAssetsForExit.length} listados
                        </button>
                      </div>

                      {availableAssetsForExit.map(a => {
                        const isSelected = selectedAssets.some(s => s.id === a.id);
                        return (
                          <div
                            key={a.id}
                            onClick={() => toggleSelectAsset(a)}
                            className={`p-2.5 transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected 
                                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 font-medium' 
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                isSelected 
                                  ? 'bg-purple-600 border-purple-600 text-white' 
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-slate-900 dark:text-white">{a.tombamento}</span>
                                  {a.tomboOrigemSesa && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono">
                                      SESA: {a.tomboOrigemSesa}
                                    </span>
                                  )}
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {a.origemTombo.split(' ')[0]}
                                  </span>
                                </div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{a.descricao}</span>
                                <span className="text-[11px] text-slate-400">{a.unidadeNome} · {a.setorNome}</span>
                              </div>
                            </div>

                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 shrink-0">
                              {formatBRL(a.valorAquisicao || a.valorBrutoContabil || 0)}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* DESTINATÁRIO */}
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
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    SESA (Estado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinatario('Universidade Federal do Ceará - UFC')}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    UFC
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinatario('Prefeitura Municipal de Sobral')}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Prefeitura de Sobral
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinatario('Consórcio Público de Saúde / Município Consorciado')}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Município Consorciado
                  </button>
                </div>
              </div>

              {/* NÚMERO DO PROCESSO & DATA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Número do Ofício / Processo de Saída:
                  </label>
                  <input
                    type="text"
                    value={numeroProcesso}
                    onChange={(e) => setNumeroProcesso(e.target.value)}
                    placeholder="Ex: OFÍCIO Nº 124/2026 - CPSMS"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Data da Efetivação da Saída:
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

              {/* RESPONSÁVEL NO DESTINO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Nome do Recebedor no Destino:
                  </label>
                  <input
                    type="text"
                    value={destinatarioResponsavel}
                    onChange={(e) => setDestinatarioResponsavel(e.target.value)}
                    placeholder="Ex: João da Silva (Fiscal de Contrato / Carga)"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Cargo / Matrícula ou Documento:
                  </label>
                  <input
                    type="text"
                    value={destinatarioCargo}
                    onChange={(e) => setDestinatarioCargo(e.target.value)}
                    placeholder="Ex: Gestor de Patrimônio / Matrícula SESA"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              {/* MOTIVO / JUSTIFICATIVA */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Justificativa / Motivo da Saída:
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva a fundamentação legal e o motivo da baixa..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  required
                />
              </div>

              {/* AVISO ARESPEC */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Integração de Documento e Controle para o ARESPEC:</span>
                </div>
                <p className="leading-relaxed">
                  Ao confirmar esta saída, o sistema baixará os <strong>{selectedAssets.length} bem(ns)</strong> do inventário ativo, registrará o histórico completo de destino e emitirá o <strong>Termo Geral Oficial</strong>, o qual servirá como instrumento comprobatório para você efetuar a baixa manual no sistema <strong>ARESPEC</strong>.
                </p>
              </div>

              {/* BOTÕES DE AÇÃO */}
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
                  disabled={selectedAssets.length === 0}
                  className="px-5 py-2.5 text-xs font-black rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white cursor-pointer shadow-lg flex items-center gap-1.5 transition-all"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Confirmar e Registrar Saída ({selectedAssets.length} bens)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
