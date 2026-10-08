import React, { useState, useMemo, useEffect } from 'react';
import { Asset, Sector, UnitInfo, UserProfile, AssetCondition, AssetCategory, TomboOrigin } from '../types';
import { formatBRL, formatDate, exportAssetsToCsv } from '../utils/formatters';
import { generateBarcodeSvg, generateQrSvg } from '../utils/codeGenerators';
import { FilteredAssetsReportModal } from './FilteredAssetsReportModal';
import { 
  Search, 
  Filter, 
  Building2, 
  ArrowLeftRight, 
  QrCode, 
  Printer, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  PlusCircle,
  X,
  ShieldCheck,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  Edit3,
  Save,
  AlertTriangle,
  Truck,
  Tag,
  ShoppingBag,
  ClipboardList
} from 'lucide-react';

export const getFormaAquisicaoBadge = (formaRaw?: string) => {
  const forma = (formaRaw || 'Compra / Pregão').trim();
  const lower = forma.toLowerCase();

  if (lower.includes('cess') || lower.includes('comodat')) {
    return {
      label: forma,
      className: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      badgeDot: 'bg-purple-500'
    };
  }
  if (lower.includes('doa') || lower.includes('doac')) {
    return {
      label: forma,
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      badgeDot: 'bg-emerald-500'
    };
  }
  if (lower.includes('permut') || lower.includes('troca')) {
    return {
      label: forma,
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      badgeDot: 'bg-amber-500'
    };
  }
  if (lower.includes('transf')) {
    return {
      label: forma,
      className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
      badgeDot: 'bg-cyan-500'
    };
  }
  return {
    label: forma,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    badgeDot: 'bg-blue-500'
  };
};

interface AssetsViewProps {
  assets: Asset[];
  sectors: Sector[];
  units: UnitInfo[];
  currentProfile: UserProfile;
  selectedUnitId: string;
  onSelectUnitId: (unitId: string) => void;
  onRequestTransfer: (asset: Asset) => void;
  onAuditAsset: (asset: Asset) => void;
  onOpenNewAssetModal: () => void;
  onOpenSmartImport: () => void;
  onUpdateAsset?: (asset: Asset) => void;
  onOpenMacroMicroReport?: () => void;
}

export const AssetsView: React.FC<AssetsViewProps> = ({
  assets,
  sectors,
  units,
  currentProfile,
  selectedUnitId,
  onSelectUnitId,
  onRequestTransfer,
  onAuditAsset,
  onOpenNewAssetModal,
  onOpenSmartImport,
  onUpdateAsset,
  onOpenMacroMicroReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('all');
  const [selectedTomboOrigin, setSelectedTomboOrigin] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('all');
  const [selectedFormaAquisicao, setSelectedFormaAquisicao] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [inspectingAsset, setInspectingAsset] = useState<Asset | null>(null);
  const [printingPlaqueAsset, setPrintingPlaqueAsset] = useState<Asset | null>(null);
  const [showPrintReportModal, setShowPrintReportModal] = useState<boolean>(false);

  // Editing Asset state
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editTombamento, setEditTombamento] = useState('');
  const [editTomboConsorcio, setEditTomboConsorcio] = useState('');
  const [editTomboOrigemSesa, setEditTomboOrigemSesa] = useState('');
  const [editTomboUfc, setEditTomboUfc] = useState('');
  const [editTomboFcpc, setEditTomboFcpc] = useState('');
  const [editOutrosTombos, setEditOutrosTombos] = useState('');
  const [editDuploTombamento, setEditDuploTombamento] = useState(false);
  const [editForaDoAspec, setEditForaDoAspec] = useState(false);
  const [editDescricao, setEditDescricao] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editDataTombamento, setEditDataTombamento] = useState('');
  const [editDataAquisicao, setEditDataAquisicao] = useState('');
  const [editFormaAquisicao, setEditFormaAquisicao] = useState('');
  const [editOrigemRecurso, setEditOrigemRecurso] = useState('');
  const [editFornecedor, setEditFornecedor] = useState('');
  const [editOrgao, setEditOrgao] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editSubarea, setEditSubarea] = useState('');
  const [editUnidadeId, setEditUnidadeId] = useState('');
  const [editSetorId, setEditSetorId] = useState('');
  const [editSubsetorNome, setEditSubsetorNome] = useState('');
  const [editResponsavelNome, setEditResponsavelNome] = useState('');
  const [editOrigemTombo, setEditOrigemTombo] = useState<TomboOrigin>('CPSMS (Próprio do Consórcio)');
  const [editEstado, setEditEstado] = useState<AssetCondition>('Bom');
  const [editCategoria, setEditCategoria] = useState<AssetCategory>('Equipamentos Médicos & Odontológicos');
  const [editNumeroSerie, setEditNumeroSerie] = useState('');
  const [editNotaFiscal, setEditNotaFiscal] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setEditTombamento(asset.tombamento || '');
    setEditTomboConsorcio(asset.tomboConsorcio || (asset.origemTombo.includes('CPSMS') ? asset.tombamento : ''));
    setEditTomboOrigemSesa(asset.tomboSesa || asset.tomboOrigemSesa || '');
    setEditTomboUfc(asset.tomboUfc || (asset.origemTombo.includes('UFC') ? asset.tombamento : ''));
    setEditTomboFcpc(asset.tomboFcpc || '');
    setEditOutrosTombos(asset.outrosTombos || asset.tomboSecundario || '');
    setEditDuploTombamento(Boolean(asset.duploTombamento || (asset.tomboOrigemSesa && asset.tombamento)));
    setEditForaDoAspec(Boolean(asset.foraDoAspec));
    setEditDescricao(asset.descricao.startsWith('Bem Patrimonial nº') ? '' : asset.descricao);
    setEditValor(asset.valorAquisicao > 0 ? String(asset.valorAquisicao) : '');
    setEditDataTombamento(asset.dataTombamento || '');
    setEditDataAquisicao(asset.dataAquisicao || '');
    setEditFormaAquisicao(asset.formaAquisicao || 'Compra / Pregão');
    setEditOrigemRecurso(asset.origemRecurso || 'Recurso Próprio CPSMS');
    setEditFornecedor(asset.fornecedor || '');
    setEditOrgao(asset.orgao || 'Consórcio Público de Saúde da Microrregião de Sobral (CPSMS)');
    setEditArea(asset.area || asset.setorNome || '');
    setEditSubarea(asset.subarea || asset.subsetorNome || '');
    setEditUnidadeId(asset.unidadeId);
    setEditSetorId(asset.setorId);
    setEditSubsetorNome(asset.subsetorNome || '');
    setEditResponsavelNome(asset.responsavelNome || '');
    setEditOrigemTombo(asset.origemTombo);
    setEditEstado(asset.estado);
    setEditCategoria(asset.categoria);
    setEditNumeroSerie(asset.numeroSerie || '');
    setEditNotaFiscal(asset.notaFiscal || '');
    setEditObservacoes(asset.observacoes || '');
  };

  const handleSaveAssetEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    const unitObj = units.find(u => u.id === editUnidadeId) || units[0];
    const unitSecs = sectors.filter(s => s.unidadeId === unitObj.id);
    const sectorObj = unitSecs.find(s => s.id === editSetorId) || unitSecs[0] || sectors[0];

    const parsedVal = parseFloat(editValor) || 0;

    const updated: Asset = {
      ...editingAsset,
      tombamento: editTombamento.trim() || editingAsset.tombamento,
      tomboConsorcio: editTomboConsorcio.trim() || undefined,
      tomboSesa: editTomboOrigemSesa.trim() || undefined,
      tomboOrigemSesa: editTomboOrigemSesa.trim() || undefined,
      tomboUfc: editTomboUfc.trim() || undefined,
      tomboFcpc: editTomboFcpc.trim() || undefined,
      outrosTombos: editOutrosTombos.trim() || undefined,
      tomboSecundario: editOutrosTombos.trim() || undefined,
      duploTombamento: Boolean(editDuploTombamento || (editTomboOrigemSesa.trim() && editTombamento.trim())),
      foraDoAspec: editForaDoAspec,
      descricao: editDescricao.trim() || editingAsset.descricao,
      valorAquisicao: parsedVal,
      valorResidual: parsedVal,
      valorBrutoContabil: parsedVal,
      valorLiquidoContabil: parsedVal,
      depreciacaoAcumulada: 0,
      dataTombamento: editDataTombamento.trim() || undefined,
      dataAquisicao: editDataAquisicao.trim() || editingAsset.dataAquisicao,
      formaAquisicao: editFormaAquisicao.trim() || 'Compra / Pregão',
      origemRecurso: editOrigemRecurso.trim() || 'Recurso Próprio CPSMS',
      fornecedor: editFornecedor.trim() || 'Fornecedor Cadastrado',
      orgao: editOrgao.trim() || 'Consórcio Público de Saúde da Microrregião de Sobral (CPSMS)',
      area: editArea.trim() || sectorObj.nome,
      subarea: editSubarea.trim() || editSubsetorNome.trim() || 'Geral',
      unidadeId: unitObj.id,
      unidadeNome: unitObj.nome,
      setorId: sectorObj.id,
      setorNome: sectorObj.nome,
      subsetorNome: editSubsetorNome.trim() || sectorObj.subsetores[0]?.nome || 'Geral',
      responsavelNome: editResponsavelNome.trim() || sectorObj.responsavelNome,
      origemTombo: editOrigemTombo,
      estado: editEstado,
      categoria: editCategoria,
      numeroSerie: editNumeroSerie.trim(),
      notaFiscal: editNotaFiscal.trim(),
      observacoes: editObservacoes.trim(),
    };

    onUpdateAsset?.(updated);
    setInspectingAsset(updated);
    setEditingAsset(null);
  };

  // Pagination for large dataset (2,849+ rows)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(24);

  const isLeader = currentProfile.role === 'lider';

  const filteredSectorsList = useMemo(() => {
    if (selectedUnitId === 'all') return sectors;
    return sectors.filter(s => s.unidadeId === selectedUnitId);
  }, [sectors, selectedUnitId]);

  // Helper for accent-insensitive and whitespace-normalized search
  const normalize = (text: string) => {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Comprehensive asset search matcher (lupa inteligente)
  const assetMatchesQuery = (asset: Asset, queryRaw: string): boolean => {
    if (!queryRaw.trim()) return true;
    const query = normalize(queryRaw);
    const queryDigits = queryRaw.replace(/\D/g, '');

    // 1. Exact or partial text match on tombamento
    const tomboNorm = normalize(asset.tombamento);
    if (tomboNorm.includes(query)) return true;

    // Match on Tombo SESA (6 dígitos) or Tombo Secundário (Duplo Tombamento)
    if (asset.tomboOrigemSesa) {
      if (normalize(asset.tomboOrigemSesa).includes(query)) return true;
      const sesaDigits = asset.tomboOrigemSesa.replace(/\D/g, '');
      if (queryDigits.length > 0 && (sesaDigits === queryDigits || sesaDigits.includes(queryDigits))) return true;
    }
    if (asset.tomboSecundario && normalize(asset.tomboSecundario).includes(query)) return true;

    // 2. Numeric tombo match (ignoring leading zeros or formatting)
    // E.g.: user types "184" and tombo is "00184", or user types "00184" and tombo is "184"
    if (queryDigits.length > 0) {
      const tomboDigits = (asset.tombamento || '').replace(/\D/g, '');
      if (tomboDigits.length > 0) {
        if (tomboDigits === queryDigits) return true;
        if (parseInt(tomboDigits, 10) === parseInt(queryDigits, 10)) return true;
        if (tomboDigits.includes(queryDigits)) return true;
        if (queryDigits.includes(tomboDigits)) return true;
      }
    }

    // 3. ASPEC or SGPS codes
    if (asset.codigoASPEC && normalize(asset.codigoASPEC).includes(query)) return true;
    if (asset.codigoSGPS && normalize(asset.codigoSGPS).includes(query)) return true;

    // 4. Description (with accent normalization!)
    if (normalize(asset.descricao).includes(query)) return true;

    // 5. Serial number
    if (asset.numeroSerie && normalize(asset.numeroSerie).includes(query)) return true;

    // 6. Responsible person
    if (normalize(asset.responsavelNome).includes(query)) return true;

    // 7. Sector and subsector/room
    if (normalize(asset.setorNome).includes(query)) return true;
    if (asset.subsetorNome && normalize(asset.subsetorNome).includes(query)) return true;

    // 8. Unit name
    if (normalize(asset.unidadeNome).includes(query)) return true;

    // 9. Invoice / Nota fiscal
    if (asset.notaFiscal && normalize(asset.notaFiscal).includes(query)) return true;

    // 10. Origin (CPSMS, SESA, UFC)
    if (normalize(asset.origemTombo).includes(query)) return true;

    // 11. Fornecedor / Cedente
    if (asset.fornecedor && normalize(asset.fornecedor).includes(query)) return true;

    // 12. Forma de Aquisição
    if (asset.formaAquisicao && normalize(asset.formaAquisicao).includes(query)) return true;

    return false;
  };

  // Unique suppliers extracted from loaded assets with counts
  const uniqueFornecedores = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => {
      const f = (a.fornecedor || '').trim();
      if (f && f !== 'Não informado' && f !== '-' && f !== 'S/N') {
        counts.set(f, (counts.get(f) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [assets]);

  // Unique acquisition forms extracted from loaded assets with counts
  const uniqueFormasAquisicao = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => {
      const forma = (a.formaAquisicao || 'Compra / Pregão').trim();
      counts.set(forma, (counts.get(forma) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [assets]);

  // Global search matches across entire database (ignoring active unit/sector filters)
  const globalMatches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return assets.filter(asset => assetMatchesQuery(asset, searchTerm));
  }, [assets, searchTerm]);

  // Filter logic (combining active filters + search query)
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (selectedUnitId !== 'all' && asset.unidadeId !== selectedUnitId) {
        return false;
      }
      if (selectedSectorId !== 'all' && asset.setorId !== selectedSectorId) {
        return false;
      }
      if (selectedTomboOrigin !== 'all' && asset.origemTombo !== selectedTomboOrigin) {
        return false;
      }
      if (selectedCondition !== 'all' && asset.estado !== selectedCondition) {
        return false;
      }
      if (selectedFornecedor !== 'all' && (asset.fornecedor || 'Fornecedor Cadastrado') !== selectedFornecedor) {
        return false;
      }
      if (selectedFormaAquisicao !== 'all' && (asset.formaAquisicao || 'Compra / Pregão') !== selectedFormaAquisicao) {
        return false;
      }
      if (searchTerm.trim()) {
        return assetMatchesQuery(asset, searchTerm);
      }
      return true;
    });
  }, [assets, selectedUnitId, selectedSectorId, selectedTomboOrigin, selectedCondition, selectedFornecedor, selectedFormaAquisicao, searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedUnitId, selectedSectorId, selectedTomboOrigin, selectedCondition, selectedFornecedor, selectedFormaAquisicao, itemsPerPage]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage) || 1;
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(start, start + itemsPerPage);
  }, [filteredAssets, currentPage, itemsPerPage]);

  const conditions: AssetCondition[] = ['Excelente', 'Bom', 'Regular', 'Ocioso', 'Inservível / Danificado'];
  const tomboOrigins: TomboOrigin[] = [
    'CPSMS (Próprio do Consórcio)',
    'SESA (Governo do Ceará - Cessão/Comodato)',
    'UFC (Universidade Federal do Ceará)',
    'Ministério da Saúde / SUS / Doação',
    'Município Consorciado'
  ];

  return (
    <div className="no-print space-y-5 pb-24">
      {/* Top Filter and Actions Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Database Status Alert */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${assets.length > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {assets.length > 0 ? (
                <>Base Ativa: <strong>{assets.length.toLocaleString('pt-BR')} bens cadastrados</strong> no sistema</>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">
                  Base Vazia: <strong>0 bens carregados</strong> (Aguardando importação da planilha)
                </span>
              )}
            </span>
          </div>

          {assets.length === 0 && (
            <button
              onClick={onOpenSmartImport}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Importar Planilha (2.849 Bens)
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por tombamento (CPSMS/SESA/UFC), descrição, sala ou responsável..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Caderno Balanço Macro ➔ Micro (Consórcio, Poli, CEO) */}
            {onOpenMacroMicroReport && (
              <button
                type="button"
                onClick={onOpenMacroMicroReport}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-all cursor-pointer min-h-[44px] shadow-sm"
                title="Abrir Caderno de Balanço e Inventário Geral por Macro (Consórcio, Poli, CEO) e Micro Localizações"
              >
                <ClipboardList className="w-4 h-4 text-slate-950" />
                <span className="hidden sm:inline">Caderno Balanço Macro/Micro</span>
                <span className="sm:hidden">Balanço</span>
              </button>
            )}

            {/* Imprimir Relatório de Bens Filtrados */}
            <button
              type="button"
              onClick={() => setShowPrintReportModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-lg transition-all cursor-pointer min-h-[44px] shadow-xs"
              title={`Imprimir Relatório Oficial dos ${filteredAssets.length} bens filtrados`}
            >
              <Printer className="w-4 h-4 text-emerald-400 dark:text-white" />
              <span className="hidden sm:inline">Imprimir Relatório</span>
              <span className="sm:hidden">Relatório</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 dark:bg-emerald-750 text-[10px] font-mono">
                {filteredAssets.length}
              </span>
            </button>

            {currentProfile.role === 'gestora' && (
              <>
                <button
                  onClick={onOpenSmartImport}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg transition-colors cursor-pointer min-h-[44px] shadow-xs"
                  title="Importar Planilha de 2.800+ Itens"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Importar Planilha</span>
                </button>

                <button
                  onClick={onOpenNewAssetModal}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer min-h-[44px]"
                >
                  <PlusCircle className="w-4 h-4" />
                  Cadastrar Bem
                </button>
              </>
            )}

            {/* View toggle */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
                title="Plaquetas / Cartões"
              >
                Cartões
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
                title="Planilha / Tabela"
              >
                Tabela
              </button>
            </div>
          </div>
        </div>

        {/* Cross-Filter Notification Banner */}
        {searchTerm.trim() && filteredAssets.length === 0 && globalMatches.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="text-blue-900 dark:text-blue-200">
              💡 O tombo <strong>"{searchTerm}"</strong> foi encontrado no acervo ({globalMatches[0].tombamento} – {globalMatches[0].descricao}), localizado em <strong>{globalMatches[0].unidadeNome}</strong> ({globalMatches[0].setorNome}), mas está oculto pelo filtro atual.
            </div>
            <button
              onClick={() => {
                onSelectUnitId('all');
                setSelectedSectorId('all');
                setSelectedTomboOrigin('all');
                setSelectedCondition('all');
                setSelectedFornecedor('all');
                setSelectedFormaAquisicao('all');
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-md shrink-0 cursor-pointer min-h-[36px]"
            >
              Exibir Bem Encontrado
            </button>
          </div>
        )}

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">Filtrar:</span>
          </div>

          {/* 1. Fornecedor (DESTAQUE PEDIDO PELO USUÁRIO) */}
          <div className="relative">
            <select
              value={selectedFornecedor}
              onChange={(e) => setSelectedFornecedor(e.target.value)}
              className={`py-1.5 pl-2.5 pr-7 text-xs rounded-lg border font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[36px] cursor-pointer max-w-[210px] truncate ${
                selectedFornecedor !== 'all'
                  ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
              title="Filtrar por Fornecedor / Cedente"
            >
              <option value="all">🏢 Fornecedor ({uniqueFornecedores.length > 0 ? `Todos · ${uniqueFornecedores.length}` : 'Todos'})</option>
              {uniqueFornecedores.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.count})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Forma de Aquisição (DESTAQUE PEDIDO PELO USUÁRIO) */}
          <div className="relative">
            <select
              value={selectedFormaAquisicao}
              onChange={(e) => setSelectedFormaAquisicao(e.target.value)}
              className={`py-1.5 pl-2.5 pr-7 text-xs rounded-lg border font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[36px] cursor-pointer max-w-[210px] truncate ${
                selectedFormaAquisicao !== 'all'
                  ? 'bg-blue-100 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-950 dark:text-blue-200 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
              title="Filtrar por Forma de Aquisição (Compra / Pregão, Doação, Cessão, etc.)"
            >
              <option value="all">🏷️ Forma de Aquisição ({uniqueFormasAquisicao.length > 0 ? `Todas · ${uniqueFormasAquisicao.length}` : 'Todas'})</option>
              {uniqueFormasAquisicao.map((fa) => (
                <option key={fa.name} value={fa.name}>
                  {fa.name} ({fa.count})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Unidade */}
          <select
            value={selectedUnitId}
            onChange={(e) => {
              onSelectUnitId(e.target.value);
              setSelectedSectorId('all');
            }}
            className="py-1.5 pl-2.5 pr-7 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[36px] cursor-pointer"
          >
            <option value="all">Todas as Unidades (CPSMS)</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>

          {/* 4. Origem do Tombo */}
          <select
            value={selectedTomboOrigin}
            onChange={(e) => setSelectedTomboOrigin(e.target.value)}
            className="py-1.5 pl-2.5 pr-7 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[36px] cursor-pointer"
          >
            <option value="all">Origem Tombo (Todas)</option>
            {tomboOrigins.map((orig) => (
              <option key={orig} value={orig}>
                {orig}
              </option>
            ))}
          </select>

          {/* 5. Setor */}
          <select
            value={selectedSectorId}
            onChange={(e) => setSelectedSectorId(e.target.value)}
            className="py-1.5 pl-2.5 pr-7 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[36px] cursor-pointer"
          >
            <option value="all">Todos os Setores</option>
            {filteredSectorsList.map((s, idx) => (
              <option key={`assets-sec-${s.id}-${idx}`} value={s.id}>
                {s.nome} ({s.sigla})
              </option>
            ))}
          </select>

          {/* 6. Estado */}
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="py-1.5 pl-2.5 pr-7 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[36px] cursor-pointer"
          >
            <option value="all">Todos os Estados</option>
            {conditions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(selectedUnitId !== 'all' || selectedSectorId !== 'all' || selectedTomboOrigin !== 'all' || selectedCondition !== 'all' || selectedFornecedor !== 'all' || selectedFormaAquisicao !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                onSelectUnitId('all');
                setSelectedSectorId('all');
                setSelectedTomboOrigin('all');
                setSelectedCondition('all');
                setSelectedFornecedor('all');
                setSelectedFormaAquisicao('all');
                setSearchTerm('');
              }}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium ml-auto flex items-center gap-1 cursor-pointer py-1 px-2"
            >
              <X className="w-3.5 h-3.5" />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Active Filters Summary Chips */}
        {(selectedFornecedor !== 'all' || selectedFormaAquisicao !== 'all' || selectedUnitId !== 'all' || selectedTomboOrigin !== 'all' || selectedSectorId !== 'all' || selectedCondition !== 'all') && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-400 font-semibold mr-1">Filtros ativos:</span>
            {selectedFornecedor !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold">
                <Truck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Fornecedor: {selectedFornecedor}
                <button
                  type="button"
                  onClick={() => setSelectedFornecedor('all')}
                  className="hover:text-rose-600 ml-1 p-0.5"
                  title="Remover filtro de fornecedor"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedFormaAquisicao !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 font-bold">
                <Tag className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                Forma: {selectedFormaAquisicao}
                <button
                  type="button"
                  onClick={() => setSelectedFormaAquisicao('all')}
                  className="hover:text-rose-600 ml-1 p-0.5"
                  title="Remover filtro de forma de aquisição"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filteredAssets.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPrintReportModal(true)}
                className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-900 dark:bg-emerald-600 text-white text-[11px] font-bold hover:bg-slate-800 dark:hover:bg-emerald-500 cursor-pointer shadow-2xs transition-colors"
                title="Imprimir relatório oficial deste filtro"
              >
                <Printer className="w-3 h-3 text-emerald-400 dark:text-white" />
                Imprimir este filtro ({filteredAssets.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Header and Pagination Settings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div>
            Exibindo <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{paginatedAssets.length}</span> de <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{filteredAssets.length.toLocaleString('pt-BR')}</span> bens cadastrados
          </div>

          {filteredAssets.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPrintReportModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-md transition-colors cursor-pointer shadow-2xs"
                title="Imprimir relatório oficial dos bens filtrados"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400 dark:text-white" />
                <span>Imprimir Relatório</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const fname = selectedFornecedor !== 'all' 
                    ? `relatorio_fornecedor_${selectedFornecedor.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
                    : selectedFormaAquisicao !== 'all'
                    ? `relatorio_forma_${selectedFormaAquisicao.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
                    : 'relatorio_bens_filtrados';
                  exportAssetsToCsv(filteredAssets, `${fname}_${new Date().toISOString().slice(0, 10)}.csv`);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Exportar estes bens filtrados para planilha Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Exportar CSV</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span>Itens por pág:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold"
            >
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
              <option value={200}>200</option>
            </select>
          </div>

          <div className="tabular-nums">
            Valor somado:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatBRL(filteredAssets.reduce((sum, a) => sum + a.valorAquisicao, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            {assets.length === 0 ? <FileSpreadsheet className="w-7 h-7" /> : <Search className="w-7 h-7 text-slate-400" />}
          </div>

          {assets.length === 0 ? (
            <div className="space-y-2 max-w-lg mx-auto">
              <span className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-full">
                A lupa está 100% funcional!
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                O sistema está com 0 bens cadastrados no momento
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Você ainda não encontrou o tombo porque a sua planilha com os <strong>2.849 bens</strong> ainda precisa ser importada. Como os dados fictícios foram removidos para atender às exigências do TCE-CE, a base aguarda a sua carga real.
              </p>
              <div className="pt-2">
                <button
                  onClick={onOpenSmartImport}
                  className="px-6 py-3 text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer min-h-[46px]"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Importar Minha Planilha do Excel / CSV Agora (2.849 Bens)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-w-lg mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Nenhum bem encontrado com os critérios pesquisados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {searchTerm.trim() ? (
                  <>O termo <strong>"{searchTerm}"</strong> não corresponde a nenhum tombo, plaqueta, descrição ou sala nos {assets.length.toLocaleString('pt-BR')} itens cadastrados.</>
                ) : (
                  <>Nenhum item corresponde aos filtros selecionados (unidade, setor ou origem).</>
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {searchTerm.trim() && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer min-h-[40px]"
                  >
                    Limpar Pesquisa
                  </button>
                )}
                <button
                  onClick={() => {
                    onSelectUnitId('all');
                    setSelectedSectorId('all');
                    setSelectedTomboOrigin('all');
                    setSelectedCondition('all');
                    setSearchTerm('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer min-h-[40px]"
                >
                  Ver Todos os {assets.length.toLocaleString('pt-BR')} Bens
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards View Mode */}
      {viewMode === 'cards' && paginatedAssets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedAssets.map((asset) => {
            const isAudited = asset.auditoria?.conferido;
            const hasDivergence = asset.auditoria?.statusDivergencia === 'setor_divergente';
            const isSesa = asset.origemTombo.includes('SESA');
            const isUfc = asset.origemTombo.includes('UFC');

            return (
              <div
                key={asset.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Plaqueta-style Header */}
                <div 
                  onClick={() => setInspectingAsset(asset)}
                  className="bg-slate-900 text-white p-3.5 flex items-start justify-between gap-3 border-b border-slate-800 cursor-pointer hover:bg-slate-850 transition-colors group"
                  title="Clique para abrir a Ficha Técnica Completa do Bem"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 tracking-wider uppercase font-semibold flex-wrap">
                      <span className={isSesa ? 'text-blue-400 font-bold' : isUfc ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {asset.origemTombo.split(' ')[0]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{asset.unidadeNome.includes('CEO') ? 'CEO' : 'POLICLÍNICA'}</span>
                      {asset.duploTombamento && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold font-sans">
                          🏷️ Plaqueta Dupla
                        </span>
                      )}
                      {asset.foraDoAspec && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-sans">
                          ⚠️ Fora ASPEC
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <div className="text-base sm:text-lg font-mono font-bold tracking-tight text-white tabular-nums group-hover:text-emerald-400 flex items-center gap-1.5 transition-colors">
                        <span>{asset.tombamento}</span>
                        <span className="text-[10px] text-slate-400 font-sans font-normal">(4d)</span>
                      </div>
                      {asset.tomboOrigemSesa && (
                        <div className="text-xs font-mono font-bold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60 flex items-center gap-1">
                          <span className="text-[9px] text-blue-400 font-sans uppercase">SESA:</span>
                          <span>{asset.tomboOrigemSesa}</span>
                          <span className="text-[9px] text-blue-400 font-sans font-normal">(6d)</span>
                        </div>
                      )}
                      <span className="text-[10px] font-sans font-normal text-emerald-400 opacity-80 group-hover:opacity-100 flex items-center gap-0.5 ml-auto">
                        <Eye className="w-3 h-3" /> Ficha
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrintingPlaqueAsset(asset);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
                    title="Visualizar e Imprimir Etiqueta Física"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>

                {/* Card Body */}
                <div 
                  onClick={() => setInspectingAsset(asset)}
                  className="p-4 space-y-3 flex-1 flex flex-col justify-between cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors"
                  title="Clique para abrir detalhes do bem"
                >
                  <div className="space-y-2">
                    {/* Forma de Aquisição & Fornecedor Bar (BEM VISÍVEL) */}
                    <div className="flex items-center gap-1.5 flex-wrap pb-0.5">
                      {(() => {
                        const b = getFormaAquisicaoBadge(asset.formaAquisicao);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${b.className}`}>
                            <span className={`w-2 h-2 rounded-full ${b.badgeDot}`} />
                            <span className="font-extrabold uppercase tracking-wide text-[9px] opacity-75">Forma:</span> {b.label}
                          </span>
                        );
                      })()}

                      {asset.fornecedor && asset.fornecedor !== 'Não informado' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-[210px]" title={`Fornecedor: ${asset.fornecedor}`}>
                          <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{asset.fornecedor}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {asset.descricao && !asset.descricao.startsWith('Bem Patrimonial nº') ? (
                        asset.descricao
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 italic font-normal flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {asset.descricao || 'Sem descrição cadastrada'}
                        </span>
                      )}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{asset.categoria}</span>
                      <span aria-hidden="true">·</span>
                      <span>Estado: <strong className="text-slate-700 dark:text-slate-200">{asset.estado}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>NF: {asset.notaFiscal || 'S/N'}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{asset.setorNome}</span>
                      </div>
                      {asset.subsetorNome && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pl-5 font-semibold">
                          Sala: {asset.subsetorNome}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 pl-5 truncate">
                        Responsável: {asset.responsavelNome}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Valor do Bem</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                        {(asset.valorAquisicao || asset.valorBrutoContabil || 0) > 0 ? (
                          formatBRL(asset.valorAquisicao || asset.valorBrutoContabil || 0)
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">
                            R$ 0,00
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      {isAudited ? (
                        hasDivergence ? (
                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Divergência
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Auditado
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 font-normal">
                          Pendente de auditoria
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-850/60 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setInspectingAsset(asset)}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer min-h-[44px]"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ficha</span>
                  </button>

                  <button
                    onClick={() => onAuditAsset(asset)}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer min-h-[44px]"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Auditar</span>
                  </button>

                  <button
                    onClick={() => onRequestTransfer(asset)}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer min-h-[44px]"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Remanejar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View Mode */}
      {viewMode === 'table' && paginatedAssets.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-3.5">Tombamento</th>
                  <th className="py-3 px-3.5">Origem</th>
                  <th className="py-3 px-3.5">Descrição</th>
                  <th className="py-3 px-3.5">Forma de Aquisição</th>
                  <th className="py-3 px-3.5">Fornecedor</th>
                  <th className="py-3 px-3.5">Unidade & Sala</th>
                  <th className="py-3 px-3.5">Responsável</th>
                  <th className="py-3 px-3.5">Estado</th>
                  <th className="py-3 px-3.5 text-right">Valor (R$)</th>
                  <th className="py-3 px-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedAssets.map((asset) => (
                  <tr 
                    key={asset.id} 
                    onClick={() => setInspectingAsset(asset)}
                    className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    title="Clique para abrir a Ficha Completa do Bem"
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900 dark:text-white tabular-nums group-hover:text-emerald-500">
                      <div className="flex items-center gap-1.5">
                        <span>{asset.tombamento}</span>
                        <span className="text-[10px] text-slate-400 font-sans font-normal">(4d)</span>
                      </div>
                      {asset.tomboOrigemSesa && (
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                          <span className="text-[9px] uppercase font-sans">SESA:</span>
                          <span>{asset.tomboOrigemSesa}</span>
                          <span className="text-[9px] text-slate-400 font-sans font-normal">(6d)</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        {asset.duploTombamento && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-sans font-bold">
                            2 Tombos
                          </span>
                        )}
                        {asset.foraDoAspec && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-sans font-bold">
                            Fora ASPEC
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      {asset.origemTombo.split(' ')[0]}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-900 dark:text-white max-w-xs">
                      <div className="truncate font-semibold">
                        {asset.descricao && !asset.descricao.startsWith('Bem Patrimonial nº') ? (
                          asset.descricao
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 italic font-normal">
                            ⚠️ {asset.descricao || 'Sem descrição cadastrada'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {asset.categoria} · NF: {asset.notaFiscal || 'S/N'}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {(() => {
                        const b = getFormaAquisicaoBadge(asset.formaAquisicao);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${b.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${b.badgeDot}`} />
                            {b.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 max-w-[160px] truncate" title={asset.fornecedor || 'Fornecedor Cadastrado'}>
                      <div className="flex items-center gap-1.5 truncate">
                        <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{asset.fornecedor || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300">
                      <div className="font-semibold">{asset.unidadeNome}</div>
                      <div className="text-[11px] text-slate-500">{asset.area || asset.setorNome} – {asset.subarea || asset.subsetorNome}</div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400">
                      {asset.responsavelNome}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {asset.estado}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {(asset.valorAquisicao || asset.valorBrutoContabil || 0) > 0 ? (
                        formatBRL(asset.valorAquisicao || asset.valorBrutoContabil || 0)
                      ) : (
                        <span className="text-slate-400 font-sans text-[11px]">
                          R$ 0,00
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setInspectingAsset(asset)}
                        className="px-2.5 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        Ficha
                      </button>
                      <button
                        onClick={() => onRequestTransfer(asset)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors"
                      >
                        Remanejar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Página <strong className="text-slate-900 dark:text-white tabular-nums">{currentPage}</strong> de <strong className="text-slate-900 dark:text-white tabular-nums">{totalPages}</strong> ({filteredAssets.length.toLocaleString('pt-BR')} itens)
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Primeira Página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Página Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Próxima Página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Última Página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Asset Detail Drawer / Modal */}
      {inspectingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-t-2xl flex items-start justify-between gap-3 border-b border-slate-800 sticky top-0 z-10">
              <div>
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Ficha de Registro Patrimonial · CPSMS
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Tombamento {inspectingAsset.tombamento} ({inspectingAsset.origemTombo})
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  {inspectingAsset.unidadeNome}
                </div>
              </div>
              <button
                onClick={() => setInspectingAsset(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs sm:text-sm">
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400">Descrição do Bem</label>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                  {inspectingAsset.descricao && !inspectingAsset.descricao.startsWith('Bem Patrimonial nº') ? (
                    inspectingAsset.descricao
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 italic font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      {inspectingAsset.descricao || 'Descrição detalhada não informada'}
                    </span>
                  )}
                </p>
              </div>

              {/* Destaque BEM VISÍVEL: Forma de Aquisição, Fornecedor e Valor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                    <Tag className="w-3 h-3 text-blue-500" />
                    Forma de Aquisição
                  </span>
                  <div>
                    {(() => {
                      const b = getFormaAquisicaoBadge(inspectingAsset.formaAquisicao);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${b.className}`}>
                          <span className={`w-2 h-2 rounded-full ${b.badgeDot}`} />
                          {b.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                    <Truck className="w-3 h-3 text-amber-500" />
                    Fornecedor / Cedente
                  </span>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 truncate" title={inspectingAsset.fornecedor}>
                    <span className="truncate">{inspectingAsset.fornecedor || 'Fornecedor Cadastrado'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                    Valor do Bem (R$)
                  </span>
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                    {(inspectingAsset.valorAquisicao || 0) > 0 ? (
                      formatBRL(inspectingAsset.valorAquisicao)
                    ) : (
                      <span className="text-slate-400 font-normal">R$ 0,00</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data quality callout if description was missing during import */}
              {(!inspectingAsset.descricao || inspectingAsset.descricao.startsWith('Bem Patrimonial nº')) && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Descrição genérica neste tombamento:</span>
                  </div>
                  <ul className="text-amber-800 dark:text-amber-300 text-xs list-disc list-inside space-y-0.5 pl-1">
                    <li>A <strong>descrição do bem</strong> não foi puxada da planilha (ficou genérica).</li>
                  </ul>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(inspectingAsset)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer flex items-center gap-1.5 min-h-[36px]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Digitar Descrição e Valor Manualmente
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInspectingAsset(null);
                        onOpenSmartImport();
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 min-h-[36px]"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Reimportar Planilha com Colunas Corretas
                    </button>
                  </div>
                </div>
              )}

              {/* 15 Official Characteristics Panel */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" />
                    As 15 Características Oficiais do Bem
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Tombo: {inspectingAsset.tombamento}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  {/* 1. Nome do Patrimônio / Nome do Item */}
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      1. Nome do Patrimônio / Nome do Item (ex: Fogão)
                    </span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {inspectingAsset.descricao || 'Item não especificado'}
                    </div>
                  </div>

                  {/* 2. Número do Tombo CPSMS (4 dígitos) */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      2. Número do Tombo Consórcio (4d)
                    </span>
                    <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {inspectingAsset.tombamento}
                    </div>
                  </div>

                  {/* Tombo de Origem SESA (6 dígitos) se houver */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-blue-500 block">
                      Tombo SESA / Estado (6d)
                    </span>
                    <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 mt-0.5">
                      {inspectingAsset.tomboOrigemSesa || (inspectingAsset.tombamento.replace(/\D/g, '').length >= 6 ? inspectingAsset.tombamento : 'Não vinculado')}
                    </div>
                  </div>

                  {/* 3. Data de Tombamento */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      3. Data de Tombamento
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {inspectingAsset.dataTombamento ? formatDate(inspectingAsset.dataTombamento) : <span className="text-slate-400">Não informada</span>}
                    </div>
                  </div>

                  {/* 4. NF caso tenha */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      4. NF (Nota Fiscal)
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {inspectingAsset.notaFiscal || 'S/N'}
                    </div>
                  </div>

                  {/* 5. Estado de Conservação */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      5. Estado de Conservação
                    </span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        inspectingAsset.estado === 'Excelente' ? 'bg-emerald-500' :
                        inspectingAsset.estado === 'Bom' ? 'bg-blue-500' :
                        inspectingAsset.estado === 'Regular' ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`} />
                      {inspectingAsset.estado}
                    </div>
                  </div>

                  {/* 6. Origem do Recurso */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      6. Origem do Recurso
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate" title={inspectingAsset.origemRecurso}>
                      {inspectingAsset.origemRecurso || 'Recurso Próprio CPSMS'}
                    </div>
                  </div>

                  {/* 7. Fornecedor */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block flex items-center gap-1">
                      <Truck className="w-3 h-3 text-amber-500" />
                      7. Fornecedor / Cedente
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate" title={inspectingAsset.fornecedor}>
                      {inspectingAsset.fornecedor || 'Fornecedor Cadastrado'}
                    </div>
                  </div>

                  {/* 8. Órgão */}
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      8. Órgão / Ente Gestor
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {inspectingAsset.orgao || 'Consórcio Público de Saúde da Microrregião de Sobral (CPSMS)'}
                    </div>
                  </div>

                  {/* 9. Área */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      9. Área (Setor / Lotação)
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate" title={inspectingAsset.area || inspectingAsset.setorNome}>
                      {inspectingAsset.area || inspectingAsset.setorNome}
                    </div>
                  </div>

                  {/* 10. Subárea */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      10. Subárea (Sala / Ambiente)
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate" title={inspectingAsset.subarea || inspectingAsset.subsetorNome}>
                      {inspectingAsset.subarea || inspectingAsset.subsetorNome || 'Geral'}
                    </div>
                  </div>

                  {/* 11. Responsável */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      11. Responsável / Detentor
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate" title={inspectingAsset.responsavelNome}>
                      {inspectingAsset.responsavelNome}
                    </div>
                  </div>

                  {/* 12. Data de Aquisição */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      12. Data de Aquisição
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {formatDate(inspectingAsset.dataAquisicao)}
                    </div>
                  </div>

                  {/* 13. Forma de Aquisição (BEM VISÍVEL) */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block flex items-center gap-1">
                      <Tag className="w-3 h-3 text-blue-500" />
                      13. Forma de Aquisição
                    </span>
                    <div className="mt-1">
                      {(() => {
                        const b = getFormaAquisicaoBadge(inspectingAsset.formaAquisicao);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${b.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${b.badgeDot}`} />
                            {b.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 14. Valor do Bem */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      14. Valor do Bem (R$)
                    </span>
                    <div className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5 tabular-nums">
                      {(inspectingAsset.valorAquisicao || inspectingAsset.valorBrutoContabil || 0) > 0 ? (
                        formatBRL(inspectingAsset.valorAquisicao || inspectingAsset.valorBrutoContabil || 0)
                      ) : (
                        <span className="text-slate-400 font-normal">R$ 0,00</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações Complementares da Unidade */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 bg-slate-50/50 dark:bg-slate-850/50">
                <div className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  Unidade e Localização Física
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {inspectingAsset.unidadeNome}
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  Área / Setor: <strong>{inspectingAsset.area || inspectingAsset.setorNome}</strong> · Subárea / Sala: <strong>{inspectingAsset.subarea || inspectingAsset.subsetorNome}</strong>
                </div>
                <div className="text-xs text-slate-500 pt-0.5">
                  Origem Carga: {inspectingAsset.origemTombo} · Categoria: {inspectingAsset.categoria} · Série: {inspectingAsset.numeroSerie || 'Sem número'}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => openEditModal(inspectingAsset)}
                  className="px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 min-h-[44px] cursor-pointer"
                  title="Editar Descrição, Valor, Setor ou Responsável"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Editar Dados do Bem
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const ast = inspectingAsset;
                    setInspectingAsset(null);
                    setPrintingPlaqueAsset(ast);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 min-h-[44px]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Gerar Plaqueta Oficial
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const ast = inspectingAsset;
                    setInspectingAsset(null);
                    onRequestTransfer(ast);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 min-h-[44px]"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Solicitar Transferência
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Plaqueta Modal */}
      {printingPlaqueAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Plaqueta Patrimonial · CPSMS
              </h3>
              <button
                onClick={() => setPrintingPlaqueAsset(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div 
              id="patrimony-plaque-print"
              className="bg-white text-slate-950 border-2 border-slate-900 rounded-xl p-4 shadow-md space-y-3 font-sans"
            >
              <div className="border-b-2 border-slate-900 pb-2 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  CPSMS · CONSÓRCIO PÚBLICO DE SAÚDE DE SOBRAL
                </div>
                <div className="text-xs font-black tracking-tight text-slate-950">
                  {printingPlaqueAsset.unidadeNome.toUpperCase()}
                </div>
                <div className="text-[9px] font-bold text-emerald-800 uppercase mt-0.5">
                  ORIGEM: {printingPlaqueAsset.origemTombo}
                </div>
              </div>

              <div className="text-center py-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">TOMBAMENTO</div>
                <div className="text-2xl font-mono font-black tracking-tight text-slate-950 tabular-nums">
                  {printingPlaqueAsset.tombamento}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 py-1">
                <div 
                  className="w-24 h-24 border border-slate-200 p-1 rounded-sm bg-white"
                  dangerouslySetInnerHTML={{ __html: generateQrSvg(printingPlaqueAsset.tombamento, 88) }}
                />
                <div className="flex-1 space-y-1">
                  <div 
                    className="w-full overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(printingPlaqueAsset.tombamento, 160, 40) }}
                  />
                  <div className="text-[9px] text-slate-600 font-mono text-center">
                    SGPS/ASPEC · SOBRAL-CE
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-800 line-clamp-2 border-t border-slate-300 pt-1.5 font-medium">
                {printingPlaqueAsset.descricao}
              </div>

              <div className="text-[8px] text-slate-500 text-center font-semibold uppercase">
                Proibida a remoção ou transferência sem autorização da Gerência de Patrimônio
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPrintingPlaqueAsset(null)}
                className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg min-h-[44px]"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 min-h-[44px]"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Plaqueta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Editar Bem Patrimonial · Tombo {editingAsset.tombamento}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atualize a descrição, o valor de aquisição e a localização do item
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssetEdit} className="space-y-4 text-xs sm:text-sm">
              {/* Números de Tombamento: Consórcio (4 dígitos) e SESA (6 dígitos) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                      Tombo Consórcio (4 dígitos):
                    </label>
                    <input
                      type="text"
                      required
                      value={editTombamento}
                      onChange={(e) => setEditTombamento(e.target.value)}
                      placeholder="Ex: 0184 ou CPSMS-0184"
                      className="w-full p-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Padrão CPSMS: 4 números</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-blue-700 dark:text-blue-300 block mb-1">
                      Tombo de Origem SESA (6 dígitos):
                    </label>
                    <input
                      type="text"
                      value={editTomboOrigemSesa}
                      onChange={(e) => {
                        setEditTomboOrigemSesa(e.target.value);
                        if (e.target.value.trim()) setEditDuploTombamento(true);
                      }}
                      placeholder="Ex: 102450 (Plaqueta Estadual)"
                      className="w-full p-2 text-xs font-mono font-bold rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Implantação SESA: padrão 6 números</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="text-xs font-bold text-amber-800 dark:text-amber-300 block mb-1">
                      Tombo UFC (se houver):
                    </label>
                    <input
                      type="text"
                      value={editTomboUfc}
                      onChange={(e) => setEditTomboUfc(e.target.value)}
                      placeholder="Ex: UFC-0482 ou 38472"
                      className="w-full p-2 text-xs font-mono font-bold rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Universidade Federal do Ceará</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-purple-800 dark:text-purple-300 block mb-1">
                      Tombo FCPC (se houver):
                    </label>
                    <input
                      type="text"
                      value={editTomboFcpc}
                      onChange={(e) => setEditTomboFcpc(e.target.value)}
                      placeholder="Ex: FCPC-1092"
                      className="w-full p-2 text-xs font-mono font-bold rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Fundação Cearense de Apoio</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Outros Tombos / Retombamentos (Livre):
                  </label>
                  <input
                    type="text"
                    value={editOutrosTombos}
                    onChange={(e) => setEditOutrosTombos(e.target.value)}
                    placeholder="Ex: Tombo Municipal 4410, plaqueta anterior..."
                    className="w-full p-2 text-xs font-mono rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={editDuploTombamento}
                      onChange={(e) => setEditDuploTombamento(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-[11px]">Possui Plaqueta Dupla (4d + 6d)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-amber-800 dark:text-amber-300">
                    <input
                      type="checkbox"
                      checked={editForaDoAspec}
                      onChange={(e) => setEditForaDoAspec(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-[11px]">Item Fora do ASPEC (Achado em Campo)</span>
                  </label>
                </div>
              </div>

              {/* Descrição do Bem */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>* Descrição Completa do Bem (Nome / Especificação):</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Obrigatório</span>
                </label>
                <textarea
                  rows={3}
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  placeholder="Ex: AR CONDICIONADO SPLIT 12.000 BTUS INVERTER PHILCO..."
                  required
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Valor do Bem */}
              <div className="p-3 bg-slate-50 dark:bg-slate-850/80 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Valor do Bem (R$):</span>
                    <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editValor}
                      onChange={(e) => setEditValor(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Unidade e Setor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Unidade de Saúde:
                  </label>
                  <select
                    value={editUnidadeId}
                    onChange={(e) => {
                      const uId = e.target.value;
                      setEditUnidadeId(uId);
                      const unitSecs = sectors.filter(s => s.unidadeId === uId);
                      if (unitSecs.length > 0) {
                        setEditSetorId(unitSecs[0].id);
                        setEditSubsetorNome(unitSecs[0].subsetores[0]?.nome || '');
                        setEditResponsavelNome(unitSecs[0].responsavelNome);
                      }
                    }}
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Setor / Bloco:
                  </label>
                  <select
                    value={editSetorId}
                    onChange={(e) => {
                      const sId = e.target.value;
                      setEditSetorId(sId);
                      const sec = sectors.find(s => s.id === sId);
                      if (sec) {
                        setEditSubsetorNome(sec.subsetores[0]?.nome || '');
                        setEditResponsavelNome(sec.responsavelNome);
                      }
                    }}
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {sectors.filter(s => s.unidadeId === editUnidadeId).map((s, idx) => (
                      <option key={`edit-sec-${s.id}-${idx}`} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sala / Subsetor e Responsável */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Sala / Consultório / Ambiente:
                  </label>
                  <input
                    type="text"
                    value={editSubsetorNome}
                    onChange={(e) => setEditSubsetorNome(e.target.value)}
                    placeholder="Ex: Consultório 02, Recepção..."
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Titular da Carga (Responsável):
                  </label>
                  <input
                    type="text"
                    value={editResponsavelNome}
                    onChange={(e) => setEditResponsavelNome(e.target.value)}
                    placeholder="Nome do servidor responsável"
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Origem e Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Origem do Tombo:
                  </label>
                  <select
                    value={editOrigemTombo}
                    onChange={(e) => setEditOrigemTombo(e.target.value as any)}
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="CPSMS (Próprio do Consórcio)">CPSMS (Próprio do Consórcio)</option>
                    <option value="SESA (Governo do Ceará - Cessão/Comodato)">SESA (Governo do Ceará - Cessão/Comodato)</option>
                    <option value="UFC (Universidade Federal do Ceará)">UFC (Universidade Federal do Ceará)</option>
                    <option value="Ministério da Saúde / SUS / Doação">Ministério da Saúde / SUS / Doação</option>
                    <option value="Município Consorciado">Município Consorciado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Estado de Conservação:
                  </label>
                  <select
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value as any)}
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Excelente">Excelente</option>
                    <option value="Bom">Bom</option>
                    <option value="Regular">Regular</option>
                    <option value="Ocioso">Ocioso</option>
                    <option value="Inservível / Danificado">Inservível / Danificado</option>
                  </select>
                </div>
              </div>

              {/* Datas de Tombamento e Aquisição */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Data de Tombamento:
                  </label>
                  <input
                    type="date"
                    value={editDataTombamento}
                    onChange={(e) => setEditDataTombamento(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Data de Aquisição:
                  </label>
                  <input
                    type="date"
                    value={editDataAquisicao}
                    onChange={(e) => setEditDataAquisicao(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Forma de Aquisição e Origem do Recurso */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Forma de Aquisição:
                  </label>
                  <input
                    type="text"
                    value={editFormaAquisicao}
                    onChange={(e) => setEditFormaAquisicao(e.target.value)}
                    placeholder="Ex: Compra / Pregão, Doação, Cessão..."
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Origem do Recurso:
                  </label>
                  <input
                    type="text"
                    value={editOrigemRecurso}
                    onChange={(e) => setEditOrigemRecurso(e.target.value)}
                    placeholder="Ex: Recurso Próprio CPSMS, Convênio Federal SUS..."
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Fornecedor e Órgão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Fornecedor / Cedente:
                  </label>
                  <input
                    type="text"
                    value={editFornecedor}
                    onChange={(e) => setEditFornecedor(e.target.value)}
                    placeholder="Razão social ou nome do fornecedor"
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Órgão / Ente Gestor:
                  </label>
                  <input
                    type="text"
                    value={editOrgao}
                    onChange={(e) => setEditOrgao(e.target.value)}
                    placeholder="Ex: Consórcio CPSMS, Governo do Estado..."
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Área e Subárea */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Área (Setor de Lotação):
                  </label>
                  <input
                    type="text"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    placeholder="Ex: Bloco Cirúrgico, Ambulatório..."
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Subárea (Ambiente / Sala):
                  </label>
                  <input
                    type="text"
                    value={editSubarea}
                    onChange={(e) => {
                      setEditSubarea(e.target.value);
                      setEditSubsetorNome(e.target.value);
                    }}
                    placeholder="Ex: Consultório 03, Recepção..."
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Número de Série e Nota Fiscal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Número de Série:
                  </label>
                  <input
                    type="text"
                    value={editNumeroSerie}
                    onChange={(e) => setEditNumeroSerie(e.target.value)}
                    placeholder="S/N ou serial do equipamento"
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Nota Fiscal / Termo:
                  </label>
                  <input
                    type="text"
                    value={editNotaFiscal}
                    onChange={(e) => setEditNotaFiscal(e.target.value)}
                    placeholder="Número da NF-e ou Termo"
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px]"
                >
                  <Save className="w-4 h-4" />
                  Salvar Alterações do Bem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Official Filtered Assets Report Modal for Printing */}
      {showPrintReportModal && (
        <FilteredAssetsReportModal
          isOpen={showPrintReportModal}
          onClose={() => setShowPrintReportModal(false)}
          filteredAssets={filteredAssets}
          totalAssetsCount={assets.length}
          currentProfile={currentProfile}
          activeFilters={{
            fornecedor: selectedFornecedor,
            formaAquisicao: selectedFormaAquisicao,
            unitId: selectedUnitId,
            sectorId: selectedSectorId,
            tomboOrigin: selectedTomboOrigin,
            condition: selectedCondition,
            searchTerm: searchTerm,
          }}
          units={units}
          sectors={sectors}
        />
      )}
    </div>
  );
};
