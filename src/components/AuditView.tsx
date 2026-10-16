import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Asset, Sector, UnitInfo, UserProfile, AssetCondition, TrashedAsset } from '../types';
import { formatBRL, formatDate, formatDateTime, exportAuditReportCsv } from '../utils/formatters';
import { executePrintHtml, downloadPrintableHtml, openPrintableInNewWindow } from '../utils/printHelper';
import { getAssetDeduplicationKey, countDuplicateAssets, countDuplicateSectors, findFalseDuplicateTrashedAssets } from '../utils/assetDeduplication';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Printer, 
  Download, 
  ShieldCheck, 
  FileCheck2, 
  Check, 
  X, 
  Scale, 
  ChevronRight, 
  ArrowLeft, 
  QrCode, 
  Camera, 
  User, 
  Tag, 
  Layers, 
  HelpCircle,
  Clock,
  Plus,
  ClipboardList,
  FileCode,
  ArrowRightLeft,
  Sparkles,
  Lightbulb,
  FileText,
  ShieldAlert,
  CheckCheck,
  Barcode,
  LayoutGrid,
  List,
  ChevronDown,
  CheckSquare,
  Users,
  UserCheck,
  Edit3,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { MacroMicroInventoryReportModal } from './MacroMicroInventoryReportModal';
import { AspecReconciliationModal } from './AspecReconciliationModal';
import { InventorySolutionsGuideModal } from './InventorySolutionsGuideModal';
import { RoomAspecReportModal } from './RoomAspecReportModal';
import { UnlocatedAssetsReportModal } from './UnlocatedAssetsReportModal';
import { AspecOfficializationModal } from './AspecOfficializationModal';
import { RoomComparisonModal } from './RoomComparisonModal';
import { RoomResponsiblesModal } from './RoomResponsiblesModal';
import { NewLocationModal } from './NewLocationModal';
import { getAssetUnitId, getAssetRoomName, doesAssetMatchRoom, isUnitName, buildUnitSubareas, getAssetFullLocation, doesAssetOfficiallyMatchRoom, doesAssetPhysicallyMatchRoom, normalizeLoc } from '../utils/locationHelper';
import { downloadAspecRoomPdf } from '../utils/aspecPdfGenerator';

interface AuditViewProps {
  assets: Asset[];
  sectors: Sector[];
  units: UnitInfo[];
  currentProfile: UserProfile;
  initialUnitId?: string;
  initialSectorName?: string;
  onUpdateAudit: (
    assetId: string,
    data: {
      conferido: boolean;
      statusDivergencia: 'conforme' | 'setor_divergente' | 'nao_encontrado' | 'estado_alterado';
      novoEstado?: AssetCondition;
      unidadeEncontrada?: string;
      setorEncontrado?: string;
      subsetorEncontrado?: string;
      setorOriginalAspec?: string;
      unidadeOriginalAspec?: string;
      divergenciaConfirmada?: boolean;
      observacaoAuditoria: string;
      responsavelConferencia: string;
    }
  ) => void;
  onNavigateToAsset?: (assetId: string) => void;
  onAddAsset?: (newAsset: Asset) => void;
  onUpdateAsset?: (asset: Asset) => void;
  onConsolidateRoom?: (sectorName: string, protocolo: string, parecer: string) => void;
  onRecordQueryDuration?: (durationMs: number) => void;
  onConcludeRoom?: (sectorIdOrName: string, explicitRoomName?: string) => void;
  onReopenRoom?: (sectorIdOrName: string, explicitRoomName?: string) => void;
  onUpdateSector?: (sectorIdOrName: string, updates: Partial<Sector>) => void;
  onAddNewLocation?: (newSector: Sector) => void;
  onResetAllAudits?: () => void;
  onDeleteAsset?: (assetId: string, reason?: string) => void;
  onDeleteSector?: (sectorIdOrName: string, reason?: string) => void;
  onExecuteDeduplicationRule?: () => Promise<{ assetsRemoved: number; sectorsMerged: number; assetsRestored: number } | void> | void;
  trashAssets?: TrashedAsset[];
  onNavigateToTrash?: () => void;
}

export const AuditView: React.FC<AuditViewProps> = ({
  assets,
  sectors,
  units,
  currentProfile,
  initialUnitId,
  initialSectorName,
  onUpdateAudit,
  onNavigateToAsset,
  onAddAsset,
  onUpdateAsset,
  onConsolidateRoom,
  onRecordQueryDuration,
  onConcludeRoom,
  onReopenRoom,
  onUpdateSector,
  onAddNewLocation,
  onResetAllAudits,
  onDeleteAsset,
  onDeleteSector,
  onExecuteDeduplicationRule,
  trashAssets = [],
  onNavigateToTrash,
}) => {
  // Tab: Default is 'salas' (Salas & Setores - exactly as requested: no camera / QR code blocking on open!)
  const [activeTab, setActiveTab] = useState<'salas' | 'divergencias' | 'conciliacao' | 'relatorio' | 'scanner'>('salas');
  const [showMacroMicroModal, setShowMacroMicroModal] = useState<boolean>(false);
  const [showAspecReconciliationModal, setShowAspecReconciliationModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showRoomAspecModal, setShowRoomAspecModal] = useState<boolean>(false);
  const [showUnlocatedModal, setShowUnlocatedModal] = useState<boolean>(false);
  const [showDeduplicationModal, setShowDeduplicationModal] = useState<boolean>(false);
  const [isDeduplicating, setIsDeduplicating] = useState<boolean>(false);
  const [dedupResult, setDedupResult] = useState<{ assetsRemoved: number; sectorsMerged: number; assetsRestored: number } | null>(null);
  const [roomNewSemPlaqueta, setRoomNewSemPlaqueta] = useState<boolean>(false);
  const [roomNewForaDoAspec, setRoomNewForaDoAspec] = useState<boolean>(false);
  const [isNewLocationModalOpen, setIsNewLocationModalOpen] = useState<boolean>(false);
  const [roomFilterStatus, setRoomFilterStatus] = useState<'all' | 'conferidas' | 'pendentes'>('all');

  // Delete modals states
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [deleteAssetReason, setDeleteAssetReason] = useState<string>('Duplicidade no cadastro da sala');
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState<boolean>(false);
  const [deleteRoomReason, setDeleteRoomReason] = useState<string>('Sala duplicada ou criada por engano');

  // Contagem inteligente de duplicidades e falsas exclusões
  const falseDuplicatesCount = useMemo(() => {
    if (!trashAssets || trashAssets.length === 0) return 0;
    return findFalseDuplicateTrashedAssets(assets, trashAssets).length;
  }, [assets, trashAssets]);

  const duplicateSectorsCount = useMemo(() => {
    return countDuplicateSectors(sectors);
  }, [sectors]);

  const { duplicatesCount: duplicateAssetsCount } = useMemo(() => {
    return countDuplicateAssets(assets);
  }, [assets]);

  const totalPotentialDuplicates = duplicateSectorsCount + duplicateAssetsCount + falseDuplicatesCount;

  // Verificação para o modal de exclusão: se o bem sendo excluído é exemplar único ou possui cópias reais
  const assetCopiesInSystem = useMemo(() => {
    if (!assetToDelete) return 0;
    const key = getAssetDeduplicationKey(assetToDelete);
    return assets.filter(a => getAssetDeduplicationKey(a) === key).length;
  }, [assetToDelete, assets]);

  // Side-by-side Dual Version Comparison Modal & Room Conference Draft States
  const [showRoomComparisonModal, setShowRoomComparisonModal] = useState<boolean>(false);
  const [activeComparingSector, setActiveComparingSector] = useState<any | null>(null);
  const [roomSaveFeedback, setRoomSaveFeedback] = useState<string | null>(null);

  // Active Drafts per Sector (Persisted in localStorage)
  const [roomDrafts, setRoomDrafts] = useState<Record<string, { updatedAt: string; count: number }>>(() => {
    try {
      const saved = localStorage.getItem('cpsms_room_drafts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Officially Consolidated Rooms (Persisted in localStorage)
  const [consolidatedRooms, setConsolidatedRooms] = useState<Record<string, { protocolo: string; parecer: string; data: string }>>(() => {
    try {
      const saved = localStorage.getItem('cpsms_room_consolidated');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Officially Reviewed Rooms (Persisted in localStorage for permanent OK display)
  const [reviewedRooms, setReviewedRooms] = useState<Record<string, { revisada: boolean; dataRevisao?: string; responsavelRevisao?: string; nome?: string; id?: string }>>(() => {
    try {
      const saved = localStorage.getItem('cpsms_reviewed_rooms');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Cross-sector foreign tombo check states inside current room
  const [foreignTomboInput, setForeignTomboInput] = useState<string>('');
  const [foreignTomboFeedback, setForeignTomboFeedback] = useState<{
    type: 'found_other' | 'not_in_aspec' | 'belongs_here' | 'success';
    asset?: Asset;
    message: string;
  } | null>(null);

  // Room Responsibles Assignment Modal & Inline Editing State
  const [showRoomResponsiblesModal, setShowRoomResponsiblesModal] = useState<boolean>(false);
  const [showEditSectorLeaderModal, setShowEditSectorLeaderModal] = useState<boolean>(false);
  const [newSectorLeaderInput, setNewSectorLeaderInput] = useState<string>('');
  const [newSectorCargoInput, setNewSectorCargoInput] = useState<string>('');
  const [editingAssetResponsibleId, setEditingAssetResponsibleId] = useState<string | null>(null);
  const [inlineResponsibleInput, setInlineResponsibleInput] = useState<string>('');

  // Hierarchy Selection State:
  // Step 1: Selected Unit (Default to initialUnitId or policlinica)
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId || 'policlinica');
  // Step 2: Selected Sector (When clicked, opens the room and shows everything inside it!)
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
    }
  }, [initialUnitId]);

  // Search queries
  const [sectorSearchQuery, setSectorSearchQuery] = useState('');
  const [roomAssetSearchQuery, setRoomAssetSearchQuery] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState<'todos' | 'pendentes' | 'conferidos' | 'divergentes'>('todos');

  // Room inspection ergonomic settings
  const [inspectionLayout, setInspectionLayout] = useState<'ergonomic' | 'compact'>('ergonomic');
  const [showRoomExtraDocsMenu, setShowRoomExtraDocsMenu] = useState(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<{
    type: 'success' | 'warning' | 'info';
    tombo: string;
    nome: string;
    detalhes?: string;
  } | null>(null);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // Quick Modal: Add Untracked Asset while inside this specific room
  const [showAddRoomAssetModal, setShowAddRoomAssetModal] = useState(false);
  const [roomNewTombo, setRoomNewTombo] = useState('');
  const [roomNewTomboSesa, setRoomNewTomboSesa] = useState('');
  const [roomNewDescricao, setRoomNewDescricao] = useState('');
  const [roomNewEstado, setRoomNewEstado] = useState<AssetCondition>('Bom');
  const [roomNewSerial, setRoomNewSerial] = useState('');
  const [roomNewFornecedor, setRoomNewFornecedor] = useState('');
  const [roomNewValor, setRoomNewValor] = useState('');
  const [matchedExistingAsset, setMatchedExistingAsset] = useState<Asset | null>(null);

  // Modal / Confirmação de Divergência de Setor
  const [pendingDivergenceConfirmation, setPendingDivergenceConfirmation] = useState<{
    asset: Asset;
    targetRoom: string;
    targetUnit: string;
  } | null>(null);
  const [assetToOfficialize, setAssetToOfficialize] = useState<Asset | null>(null);
  const [showResetAllConfirmModal, setShowResetAllConfirmModal] = useState(false);

  // Camera / Optional Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Overall Coverage Stats
  const totalAssets = assets.length;
  const auditedAssets = assets.filter(a => a.auditoria?.conferido);
  const auditedCount = auditedAssets.length;
  const coveragePercent = totalAssets > 0 ? Math.round((auditedCount / totalAssets) * 100) : 0;
  const divergentAssets = assets.filter(a => a.auditoria?.statusDivergencia === 'setor_divergente' || a.auditoria?.statusDivergencia === 'nao_encontrado');

  // ASPEC Alteration Counts
  const remanejamentosCount = useMemo(() => {
    return assets.filter(a => 
      !a.foraDoAspec && 
      (a.auditoria?.statusDivergencia === 'setor_divergente' || (a.auditoria?.setorEncontrado && a.auditoria?.setorEncontrado.trim().toLowerCase() !== (a.setorNome || '').trim().toLowerCase())) &&
      a.auditoria?.conferido
    ).length;
  }, [assets]);

  const faltandoNaSalaCount = useMemo(() => {
    return assets.filter(a => !a.foraDoAspec && a.auditoria?.statusDivergencia === 'nao_encontrado').length;
  }, [assets]);

  const foraDoAspecCount = useMemo(() => {
    return assets.filter(a => a.foraDoAspec).length;
  }, [assets]);

  // Available Units with ASPEC Area codes
  const availableUnits = useMemo(() => {
    return [
      { id: 'policlinica', nome: 'Policlínica Regional Bernardo Félix da Silva', sigla: 'Policlínica', areaCode: 'Área 001', icon: '🏥' },
      { id: 'ceo', nome: 'CEO – Centro de Especialidades Odontológicas', sigla: 'CEO Sobral', areaCode: 'Área 004', icon: '🦷' },
      { id: 'sede-cpsms', nome: 'Consórcio CPSMS (Sede Administrativa)', sigla: 'Sede CPSMS', areaCode: 'Área 002', icon: '🏛️' },
      { id: 'cer', nome: 'CER – Centro Especializado em Reabilitação', sigla: 'CER', areaCode: 'Área 003', icon: '♿' },
    ];
  }, []);

  const activeUnitInfo = useMemo(() => {
    return availableUnits.find(u => u.id === selectedUnitId) || availableUnits[0];
  }, [availableUnits, selectedUnitId]);

  // Assets belonging to currently selected Unit (identifica por unidadeId ou Área no ASPEC)
  const unitAssets = useMemo(() => {
    return assets.filter(a => getAssetUnitId(a) === selectedUnitId);
  }, [assets, selectedUnitId]);

  // Distinct Rooms (Subáreas no ASPEC) for the selected Unit (Área no ASPEC)
  const allUnitSectorsList = useMemo(() => {
    return buildUnitSubareas(selectedUnitId as any, sectors, assets).map(s => {
      const revData = 
        reviewedRooms[s.nome] || 
        reviewedRooms[normalizeLoc(s.nome)] || 
        (s.id ? reviewedRooms[s.id] : undefined) ||
        (s.id ? reviewedRooms[normalizeLoc(s.id)] : undefined);

      const isConferida = Boolean(
        s.revisada ||
        (s.totalCount > 0 && s.checkedCount === s.totalCount) ||
        s.percent === 100 ||
        consolidatedRooms[s.nome] ||
        (revData && revData.revisada !== false)
      );

      return {
        id: s.id,
        nome: s.nome,
        responsavel: s.responsavelNome,
        responsavelCargo: s.responsavelCargo,
        responsavelOriginalAspec: s.responsavelOriginalAspec,
        liderAlterado: s.liderAlterado,
        dataAlteracaoLider: s.dataAlteracaoLider,
        revisada: isConferida,
        dataRevisao: revData?.dataRevisao,
        responsavelRevisao: revData?.responsavelRevisao,
        bloco: s.bloco,
        assetsCount: s.totalCount,
        checkedCount: isConferida ? s.totalCount : s.checkedCount,
        pendingCount: isConferida ? 0 : Math.max(0, s.totalCount - s.checkedCount),
        totalVal: s.totalVal,
        percent: isConferida ? 100 : s.percent
      };
    });
  }, [sectors, assets, selectedUnitId, reviewedRooms, consolidatedRooms]);

  // Contadores para o cabeçalho e filtros (Todas / Conferidas / Pendentes)
  const roomStats = useMemo(() => {
    const total = allUnitSectorsList.length;
    const conferidas = allUnitSectorsList.filter(s => s.revisada).length;
    const pendentes = total - conferidas;
    return { total, conferidas, pendentes };
  }, [allUnitSectorsList]);

  // Lista filtrada por status e pesquisa
  const unitSectorsList = useMemo(() => {
    let list = allUnitSectorsList;

    if (roomFilterStatus === 'conferidas') {
      list = list.filter(s => s.revisada);
    } else if (roomFilterStatus === 'pendentes') {
      list = list.filter(s => !s.revisada);
    }

    if (sectorSearchQuery.trim()) {
      const q = sectorSearchQuery.toLowerCase();
      list = list.filter(s => s.nome.toLowerCase().includes(q) || (s.responsavel || '').toLowerCase().includes(q));
    }
    return list;
  }, [allUnitSectorsList, roomFilterStatus, sectorSearchQuery]);

  // Synchronize initialSectorName when passed from Caderno de Balanço or external links
  useEffect(() => {
    if (initialSectorName && unitSectorsList.length > 0) {
      const targetLower = initialSectorName.trim().toLowerCase();
      const found = unitSectorsList.find(s => 
        s.nome.trim().toLowerCase() === targetLower ||
        s.id === initialSectorName
      );
      if (found) {
        setSelectedSectorId(found.id);
      }
    }
  }, [initialSectorName, unitSectorsList]);

  // Selected Sector Details & Assets (procura na lista completa para nunca fechar a sala ao conferir itens)
  const activeSector = useMemo(() => {
    if (!selectedSectorId) return null;
    const targetNorm = normalizeLoc(selectedSectorId);
    
    // 1. Procura na lista completa de salas da unidade
    const foundInAll = allUnitSectorsList.find(s => 
      s.id === selectedSectorId || 
      normalizeLoc(s.id) === targetNorm ||
      normalizeLoc(s.nome) === targetNorm ||
      s.nome.trim().toLowerCase() === selectedSectorId.toLowerCase()
    );
    if (foundInAll) return foundInAll;

    // 2. Procura na lista filtrada
    const foundInFiltered = unitSectorsList.find(s => 
      s.id === selectedSectorId || 
      normalizeLoc(s.id) === targetNorm ||
      normalizeLoc(s.nome) === targetNorm
    );
    if (foundInFiltered) return foundInFiltered;

    // 3. Fallback: setores cadastrados na unidade (ex: nova sala recém-adicionada)
    const baseSec = sectors.find(s => 
      (s.id === selectedSectorId || normalizeLoc(s.nome) === targetNorm) &&
      (s.unidadeId === selectedUnitId || !selectedUnitId)
    );
    if (baseSec) {
      return {
        id: baseSec.id,
        nome: baseSec.nome,
        sigla: baseSec.sigla,
        unidadeId: baseSec.unidadeId as any,
        unidadeNome: baseSec.unidadeNome,
        responsavel: baseSec.responsavelNome,
        responsavelCargo: baseSec.responsavelCargo,
        responsavelOriginalAspec: baseSec.responsavelOriginalAspec,
        liderAlterado: baseSec.liderAlterado,
        dataAlteracaoLider: baseSec.dataAlteracaoLider,
        bloco: baseSec.bloco,
        andar: baseSec.andar,
        revisada: baseSec.revisada || false,
        dataRevisao: undefined,
        responsavelRevisao: undefined,
        assetsCount: 0,
        checkedCount: 0,
        pendingCount: 0,
        totalVal: 0,
        percent: 0
      };
    }

    return null;
  }, [allUnitSectorsList, unitSectorsList, sectors, selectedSectorId, selectedUnitId]);

  const activeSectorAssets = useMemo(() => {
    if (!activeSector) return [];
    // Filtra estritamente os bens ativos alocados na Subárea selecionada (exclui bens baixados/devolvidos/doados)
    let list = unitAssets.filter(a => (!a.statusSaida || a.statusSaida === 'ativo') && doesAssetMatchRoom(a, activeSector.nome));

    if (roomStatusFilter === 'pendentes') {
      list = list.filter(a => !a.auditoria?.conferido);
    } else if (roomStatusFilter === 'conferidos') {
      list = list.filter(a => a.auditoria?.conferido);
    } else if (roomStatusFilter === 'divergentes') {
      list = list.filter(a => a.auditoria?.statusDivergencia === 'setor_divergente' || a.auditoria?.statusDivergencia === 'nao_encontrado');
    }

    if (roomAssetSearchQuery.trim()) {
      const q = roomAssetSearchQuery.toLowerCase();
      list = list.filter(a => 
        a.tombamento.toLowerCase().includes(q) || 
        a.descricao.toLowerCase().includes(q) ||
        (a.numeroSerie || '').toLowerCase().includes(q) ||
        (a.subarea || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [unitAssets, activeSector, roomStatusFilter, roomAssetSearchQuery]);

  // Quick Action: Confirm Presence of a single Asset
  const handleQuickConfirm = (asset: Asset) => {
    onUpdateAudit(asset.id, {
      conferido: true,
      statusDivergencia: 'conforme',
      unidadeEncontrada: activeUnitInfo.nome,
      setorEncontrado: activeSector?.nome || asset.setorNome,
      subsetorEncontrado: asset.subsetorNome,
      observacaoAuditoria: 'Presença conferida no setor durante vistoria física in loco.',
      responsavelConferencia: currentProfile.nome
    });
    markRoomAsDraft(activeSector?.nome);
    setLastScannedFeedback({
      type: 'success',
      tombo: asset.tombamento,
      nome: asset.descricao,
      detalhes: `Conferido em ${activeSector?.nome || 'sala'} por ${currentProfile.nome}`
    });
    setTimeout(() => setLastScannedFeedback(null), 6000);
  };

  // Quick Action: Mark Missing / Divergence
  const handleMarkMissing = (asset: Asset) => {
    onUpdateAudit(asset.id, {
      conferido: true,
      statusDivergencia: 'nao_encontrado',
      unidadeEncontrada: activeUnitInfo.nome,
      setorEncontrado: activeSector?.nome || asset.setorNome,
      observacaoAuditoria: 'Não visto nesta sala (em apuração nas outras salas). Cadastro original no ASPEC preservado.',
      responsavelConferencia: currentProfile.nome
    });
    markRoomAsDraft(activeSector?.nome);
  };

  // Quick Action: Undo confirmation
  const handleUndoAudit = (asset: Asset) => {
    onUpdateAudit(asset.id, {
      conferido: false,
      statusDivergencia: 'conforme',
      observacaoAuditoria: '',
      responsavelConferencia: ''
    });
    markRoomAsDraft(activeSector?.nome);
  };

  // Batch Action: Confirm All Pending Assets in this Room
  const handleConfirmAllInSector = () => {
    if (!activeSector) return;
    const pendingList = unitAssets.filter(a => {
      return doesAssetMatchRoom(a, activeSector.nome) && !a.auditoria?.conferido;
    });

    if (pendingList.length === 0) return;

    pendingList.forEach(asset => {
      onUpdateAudit(asset.id, {
        conferido: true,
        statusDivergencia: 'conforme',
        unidadeEncontrada: activeUnitInfo.nome,
        setorEncontrado: activeSector.nome,
        subsetorEncontrado: asset.subsetorNome || activeSector.nome,
        observacaoAuditoria: `Conferência da sala ${activeSector.nome} realizada pela Gestora de Patrimônio.`,
        responsavelConferencia: currentProfile.nome
      });
    });

    setBulkFeedback(`Sucesso! Todos os ${pendingList.length} bens pendentes do setor "${activeSector.nome}" foram conferidos.`);
    setTimeout(() => setBulkFeedback(null), 5000);
  };

  // Concluir Sala & Baixar Automaticamente o PDF Oficial (Físico vs ASPEC)
  const handleConcludeRoomWithPdf = () => {
    if (!activeSector) return;

    // 1. Marcar sala como concluída/revisada no estado principal mantendo estritamente os bens selecionados pelo usuário
    if (onConcludeRoom) {
      onConcludeRoom(activeSector.id || activeSector.nome, activeSector.nome);
    }

    // 3. Persistência imediata e garantida no localStorage e estado local
    const revData = {
      revisada: true,
      dataRevisao: new Date().toISOString(),
      responsavelRevisao: currentProfile.nome,
      nome: activeSector.nome,
      id: activeSector.id
    };
    try {
      const raw = localStorage.getItem('cpsms_reviewed_rooms');
      const reviewedMap = raw ? JSON.parse(raw) : {};
      reviewedMap[activeSector.nome] = revData;
      reviewedMap[normalizeLoc(activeSector.nome)] = revData;
      if (activeSector.id) {
        reviewedMap[activeSector.id] = revData;
        reviewedMap[normalizeLoc(activeSector.id)] = revData;
      }
      localStorage.setItem('cpsms_reviewed_rooms', JSON.stringify(reviewedMap));

      setReviewedRooms(prev => ({
        ...prev,
        [activeSector.nome]: revData,
        [normalizeLoc(activeSector.nome)]: revData,
        ...(activeSector.id ? { [activeSector.id]: revData } : {})
      }));

      // Remove rascunho se houver
      const draftsRaw = localStorage.getItem('cpsms_room_drafts');
      if (draftsRaw) {
        const drafts = JSON.parse(draftsRaw);
        delete drafts[activeSector.nome];
        localStorage.setItem('cpsms_room_drafts', JSON.stringify(drafts));
        setRoomDrafts(drafts);
      }
    } catch (e) {
      console.warn('Erro ao persistir sala revisada no localStorage:', e);
    }

    // Adiciona aos registros consolidados
    setConsolidatedRooms(prev => {
      const next = {
        ...prev,
        [activeSector.nome]: {
          protocolo: `ASPEC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          parecer: 'Auditado e conferido 100% in loco com download de espelho contábil',
          data: new Date().toISOString()
        }
      };
      try {
        localStorage.setItem('cpsms_room_consolidated', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });

    // 4. Gerar e baixar imediatamente o arquivo PDF oficial com o confronto Físico vs ASPEC
    let pdfResult: { filename: string; isAllOk: boolean } | null = null;
    let detectedLeaderChange: { originalLeader: string; newLeader: string; newCargo?: string } | undefined = undefined;
    try {
      const rawChanges = localStorage.getItem('cpsms_room_leader_changes');
      if (rawChanges) {
        try {
          const parsed = JSON.parse(rawChanges);
          const found = parsed[activeSector.nome] || parsed[activeSector.id] || parsed[normalizeLoc(activeSector.nome)];
          if (found && found.newLeader && found.originalLeader && found.newLeader.trim().toLowerCase() !== found.originalLeader.trim().toLowerCase()) {
            detectedLeaderChange = {
              originalLeader: found.originalLeader,
              newLeader: found.newLeader,
              newCargo: found.newCargo
            };
          }
        } catch (e) {}
      }

      if (!detectedLeaderChange && activeSector.liderAlterado && activeSector.responsavelOriginalAspec) {
        detectedLeaderChange = {
          originalLeader: activeSector.responsavelOriginalAspec,
          newLeader: activeSector.responsavel || (activeSector as any).responsavelNome || '',
          newCargo: activeSector.responsavelCargo
        };
      }

      pdfResult = downloadAspecRoomPdf({
        sector: activeSector,
        unit: activeUnitInfo,
        assets,
        currentProfile,
        leaderChange: detectedLeaderChange
      });
    } catch (err) {
      console.error('Erro ao gerar/baixar PDF oficial da sala:', err);
    }

    // 5. Feedback detalhado com status de conformidade
    if (pdfResult) {
      let statusTitle = pdfResult.isAllOk
        ? '✓ SALA 100% DE ACORDO COM O ASPEC'
        : '⚠️ DIVERGÊNCIAS REGISTRADAS (ENTRADAS / SAÍDAS)';

      if (detectedLeaderChange || activeSector.liderAlterado) {
        statusTitle += ' · ⚠️ LÍDER ALTERADO: TERMO NOTIFICA A CONTABILIDADE QUE NO ASPEC TEM QUE ALTERAR O LÍDER!';
      }

      setBulkFeedback(
        `Sala "${activeSector.nome}" concluída com sucesso! ${statusTitle}. O arquivo PDF oficial (${pdfResult.filename}) foi baixado automaticamente com o espelho contábil!`
      );
    } else {
      setBulkFeedback(
        `Sucesso! A sala "${activeSector.nome}" foi marcada como revisada. Todos os itens foram consolidados e o status visual do Mapa Geral foi atualizado!`
      );
    }
    setTimeout(() => setBulkFeedback(null), 8000);
  };

  // Ação Rápida e Direta: Marcar Sala como Conferida (OK) no Inventário
  const handleMarkRoomOk = (targetSectorObj?: any) => {
    const sect = targetSectorObj || activeSector;
    if (!sect) return;

    // 1. Marcar sala no estado principal preservando as escolhas do usuário
    if (onConcludeRoom) {
      onConcludeRoom(sect.id || sect.nome, sect.nome);
    }

    // 3. Persistência imediata e garantida no localStorage e estado local
    const revData = {
      revisada: true,
      dataRevisao: new Date().toISOString(),
      responsavelRevisao: currentProfile.nome,
      nome: sect.nome,
      id: sect.id
    };

    try {
      const raw = localStorage.getItem('cpsms_reviewed_rooms');
      const reviewedMap = raw ? JSON.parse(raw) : {};
      reviewedMap[sect.nome] = revData;
      reviewedMap[normalizeLoc(sect.nome)] = revData;
      if (sect.id) {
        reviewedMap[sect.id] = revData;
        reviewedMap[normalizeLoc(sect.id)] = revData;
      }
      localStorage.setItem('cpsms_reviewed_rooms', JSON.stringify(reviewedMap));

      setReviewedRooms(prev => ({
        ...prev,
        [sect.nome]: revData,
        [normalizeLoc(sect.nome)]: revData,
        ...(sect.id ? { [sect.id]: revData } : {})
      }));

      // Remove de rascunhos se houver
      const draftsRaw = localStorage.getItem('cpsms_room_drafts');
      if (draftsRaw) {
        const drafts = JSON.parse(draftsRaw);
        delete drafts[sect.nome];
        localStorage.setItem('cpsms_room_drafts', JSON.stringify(drafts));
        setRoomDrafts(drafts);
      }
    } catch (e) {
      console.warn('Erro ao salvar sala conferida:', e);
    }

    setBulkFeedback(`✅ Sala "${sect.nome}" marcada como CONFERIDA (OK)! Status salvo com sucesso e permanente.`);
    setTimeout(() => setBulkFeedback(null), 5000);
  };

  // Reabrir sala para nova conferência / Desmarcar OK
  const handleUnmarkRoomOk = (targetSectorObj?: any) => {
    const sect = targetSectorObj || activeSector;
    if (!sect) return;

    if (onReopenRoom) {
      onReopenRoom(sect.id || sect.nome, sect.nome);
    }

    try {
      const raw = localStorage.getItem('cpsms_reviewed_rooms');
      if (raw) {
        const reviewedMap = JSON.parse(raw);
        delete reviewedMap[sect.nome];
        delete reviewedMap[normalizeLoc(sect.nome)];
        if (sect.id) {
          delete reviewedMap[sect.id];
          delete reviewedMap[normalizeLoc(sect.id)];
        }
        localStorage.setItem('cpsms_reviewed_rooms', JSON.stringify(reviewedMap));
      }

      setReviewedRooms(prev => {
        const next = { ...prev };
        delete next[sect.nome];
        delete next[normalizeLoc(sect.nome)];
        if (sect.id) delete next[sect.id];
        return next;
      });
    } catch (e) {
      console.warn('Erro ao reabrir sala:', e);
    }

    setBulkFeedback(`Sala "${sect.nome}" reaberta para conferência.`);
    setTimeout(() => setBulkFeedback(null), 5000);
  };

  // Mark room as having an active physical conference draft
  const markRoomAsDraft = (secName?: string) => {
    if (!secName) return;
    setRoomDrafts(prev => {
      const next = {
        ...prev,
        [secName]: {
          updatedAt: new Date().toISOString(),
          count: (prev[secName]?.count || 0) + 1
        }
      };
      try {
        localStorage.setItem('cpsms_room_drafts', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  };

  // Salvar Alterações da Sala -> Abre Comparativo Lado a Lado (ASPEC vs Físico)
  const handleSaveRoomChanges = (targetSector?: any) => {
    const sect = targetSector || activeSector;
    if (!sect) return;
    const t0 = performance.now();

    const secName = sect.nome;
    const countChecked = activeSectorAssets.filter(a => a.auditoria?.conferido || a.auditoria?.statusDivergencia).length;

    const nextDrafts = {
      ...roomDrafts,
      [secName]: {
        updatedAt: new Date().toISOString(),
        count: countChecked || 1
      }
    };
    setRoomDrafts(nextDrafts);
    try {
      localStorage.setItem('cpsms_room_drafts', JSON.stringify(nextDrafts));
    } catch (e) {
      console.warn(e);
    }

    setActiveComparingSector(sect);
    setShowRoomComparisonModal(true);

    if (onRecordQueryDuration) {
      onRecordQueryDuration(performance.now() - t0);
    }
  };

  // Comando de Confirmação da Gestora: ASPEC foi atualizado oficialmente!
  // Consolida dados como definitivos no sistema e exclui a versão temporária em rascunho
  const handleConsolidateOfficial = (sectorName: string, protocolo: string, parecer: string) => {
    const t0 = performance.now();

    // 1. Invocar consolidação definitiva no sistema
    if (onConsolidateRoom) {
      onConsolidateRoom(sectorName, protocolo, parecer);
    } else {
      const secLower = sectorName.trim().toLowerCase();
      assets.forEach(a => {
        const aEncontrado = (a.auditoria?.setorEncontrado || '').trim().toLowerCase();
        const aOrig = (a.setorOriginalAspec || a.setorNome || '').trim().toLowerCase();
        const isMissing = a.auditoria?.statusDivergencia === 'nao_encontrado';

        if (aEncontrado === secLower && !isMissing) {
          if (onUpdateAsset) {
            onUpdateAsset({
              ...a,
              setorNome: sectorName,
              setorOriginalAspec: sectorName,
              statusRegularizacaoAspec: 'oficializado',
              foraDoAspec: false,
              auditoria: {
                ...a.auditoria,
                conferido: true,
                statusDivergencia: 'conforme',
                statusRegularizacaoAspec: 'oficializado',
                dataOficializacaoAspec: new Date().toISOString(),
                setorEncontrado: sectorName,
                observacaoAuditoria: `[CONSOLIDADO DEFINITIVO NO ASPEC] Atualização homologada pela Gestora sob Despacho ASPEC nº ${protocolo} em ${new Date().toLocaleDateString('pt-BR')}. Rascunho temporário excluído.`
              }
            });
          }
        } else if (aOrig === secLower && isMissing) {
          if (onUpdateAsset) {
            onUpdateAsset({
              ...a,
              statusRegularizacaoAspec: 'oficializado',
              auditoria: {
                ...a.auditoria,
                statusRegularizacaoAspec: 'oficializado',
                dataOficializacaoAspec: new Date().toISOString(),
                observacaoAuditoria: `[BAIXA/REGULARIZAÇÃO NO ASPEC] Ausência física homologada sob Despacho ASPEC nº ${protocolo} em ${new Date().toLocaleDateString('pt-BR')}. Parecer: ${parecer}`
              }
            });
          }
        }
      });
    }

    // 2. EXCLUIR VERSÃO TEMPORÁRIA EM RASCUNHO
    setRoomDrafts(prev => {
      const next = { ...prev };
      delete next[sectorName];
      try {
        localStorage.setItem('cpsms_room_drafts', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });

    // 3. REGISTRAR SALA COMO CONSOLIDADA DEFINITIVAMENTE NO SISTEMA
    setConsolidatedRooms(prev => {
      const next = {
        ...prev,
        [sectorName]: {
          protocolo,
          parecer,
          data: new Date().toISOString()
        }
      };
      try {
        localStorage.setItem('cpsms_room_consolidated', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });

    setRoomSaveFeedback(`Sala "${sectorName}" consolidada como definitiva com sucesso! Versão temporária em rascunho excluída após confirmação oficial no ASPEC (Despacho: ${protocolo}).`);
    setTimeout(() => setRoomSaveFeedback(null), 8000);

    if (onRecordQueryDuration) {
      onRecordQueryDuration(performance.now() - t0);
    }
  };

  // Descartar rascunho temporário
  const handleDiscardDraft = (sectorName: string) => {
    setRoomDrafts(prev => {
      const next = { ...prev };
      delete next[sectorName];
      try {
        localStorage.setItem('cpsms_room_drafts', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
    setRoomSaveFeedback(`Rascunho temporário da sala "${sectorName}" descartado. Mantida a carga contábil original do ASPEC.`);
    setTimeout(() => setRoomSaveFeedback(null), 5000);
  };

  // Manter como rascunho de conferência
  const handleSaveDraftOnly = (sectorName: string) => {
    setRoomSaveFeedback(`Alterações da sala "${sectorName}" salvas no rascunho de conferência. Aguardando comando da gestora para atualização oficial no ASPEC.`);
    setTimeout(() => setRoomSaveFeedback(null), 5000);
  };

  // Live lookup: Automatically pull all asset specifications when entering tombo
  const handleTomboLookup = (tomboVal: string, sesaVal: string) => {
    const cleanT = tomboVal.trim().toLowerCase();
    const cleanS = sesaVal.trim().toLowerCase();
    if (!cleanT && !cleanS) {
      setMatchedExistingAsset(null);
      return;
    }

    const digitsT = cleanT.replace(/\D/g, '');
    const digitsS = cleanS.replace(/\D/g, '');

    const match = assets.find(a => {
      const tVal = a.tombamento.toLowerCase();
      const cVal = (a.tomboConsorcio || '').toLowerCase();
      const sVal = (a.tomboSesa || a.tomboOrigemSesa || '').toLowerCase();
      const uVal = (a.tomboUfc || '').toLowerCase();
      const fVal = (a.tomboFcpc || '').toLowerCase();
      const oVal = (a.outrosTombos || a.tomboSecundario || '').toLowerCase();

      // Direct string matches
      const matchesT = cleanT && (tVal === cleanT || cVal === cleanT || sVal === cleanT || uVal === cleanT || fVal === cleanT || oVal === cleanT);
      const matchesS = cleanS && (sVal === cleanS || tVal === cleanS);
      if (matchesT || matchesS) return true;

      // Numeric digit matching (e.g., '0184' matches '184', 'CPSMS-0184', etc.)
      if (digitsT && digitsT.length >= 2) {
        const tDig = tVal.replace(/\D/g, '');
        const cDig = cVal.replace(/\D/g, '');
        const sDig = sVal.replace(/\D/g, '');
        if ((tDig && (tDig === digitsT || parseInt(tDig, 10) === parseInt(digitsT, 10))) ||
            (cDig && (cDig === digitsT || parseInt(cDig, 10) === parseInt(digitsT, 10))) ||
            (sDig && (sDig === digitsT || parseInt(sDig, 10) === parseInt(digitsT, 10)))) {
          return true;
        }
      }

      if (digitsS && digitsS.length >= 2) {
        const sDig = sVal.replace(/\D/g, '');
        const tDig = tVal.replace(/\D/g, '');
        if ((sDig && (sDig === digitsS || parseInt(sDig, 10) === parseInt(digitsS, 10))) ||
            (tDig && (tDig === digitsS || parseInt(tDig, 10) === parseInt(digitsS, 10)))) {
          return true;
        }
      }

      return false;
    });

    if (match) {
      setMatchedExistingAsset(match);
      // Puxar automaticamente todos os dados e especificações cadastrais
      setRoomNewDescricao(match.descricao);
      setRoomNewEstado(match.estado);
      setRoomNewSerial(match.numeroSerie && match.numeroSerie !== '-' ? match.numeroSerie : '');
      setRoomNewFornecedor(match.fornecedor && match.fornecedor !== '-' ? match.fornecedor : '');
      setRoomNewValor(String(match.valorAquisicao || match.valorBrutoContabil || ''));
      if (match.tomboOrigemSesa || match.tomboSesa) {
        setRoomNewTomboSesa(match.tomboOrigemSesa || match.tomboSesa || '');
      }
      if (match.tomboConsorcio) {
        setRoomNewTombo(match.tomboConsorcio);
      }
    } else {
      setMatchedExistingAsset(null);
    }
  };

  // Confirm modifying asset location to current room with provisional record
  const handleConfirmDivergentLocation = (asset: Asset, targetRoom: string, targetUnit: string) => {
    const originalSetor = asset.setorOriginalAspec || asset.setorNome;
    const originalUnidade = asset.unidadeOriginalAspec || asset.unidadeNome;
    const targetUnitId = (activeSector && 'unidadeId' in activeSector ? (activeSector as any).unidadeId : '') || activeUnitInfo.id;

    const updated: Asset = {
      ...asset,
      unidadeId: targetUnitId as any,
      unidadeNome: activeUnitInfo.nome,
      area: activeUnitInfo.nome,
      setorId: activeSector?.id || asset.setorId,
      setorNome: targetRoom,
      subarea: targetRoom,
      subsetorNome: targetRoom,
      setorOriginalAspec: originalSetor,
      unidadeOriginalAspec: originalUnidade,
      statusRegularizacaoAspec: 'provisorio',
      auditoria: {
        ...asset.auditoria,
        conferido: true,
        statusDivergencia: 'setor_divergente',
        statusRegularizacaoAspec: 'provisorio',
        gestoraConfirmouAspec: false,
        unidadeEncontrada: targetUnit,
        setorEncontrado: targetRoom,
        subsetorEncontrado: targetRoom,
        setorOriginalAspec: originalSetor,
        unidadeOriginalAspec: originalUnidade,
        divergenciaConfirmada: true,
        dataConferencia: new Date().toISOString().slice(0, 16).replace('T', ' '),
        responsavelConferencia: currentProfile.nome,
        observacaoAuditoria: `[LOCALIZAÇÃO PROVISÓRIA NO CADERNO DE BALANÇO] Bem localizado fisicamente na sala "${targetRoom}", porém registrado no sistema ASPEC no setor "${originalSetor}". Aguardando confirmação de baixa/mudança definitiva no sistema ASPEC pela Gestora.`
      }
    };

    if (onUpdateAsset) {
      onUpdateAsset(updated);
    } else {
      onUpdateAudit(asset.id, {
        conferido: true,
        statusDivergencia: 'setor_divergente',
        unidadeEncontrada: targetUnit,
        setorEncontrado: targetRoom,
        subsetorEncontrado: targetRoom,
        setorOriginalAspec: originalSetor,
        unidadeOriginalAspec: originalUnidade,
        divergenciaConfirmada: true,
        observacaoAuditoria: updated.auditoria.observacaoAuditoria || '',
        responsavelConferencia: currentProfile.nome
      });
    }

    markRoomAsDraft(targetRoom);
    setPendingDivergenceConfirmation(null);
    setShowAddRoomAssetModal(false);
    setForeignTomboFeedback(null);
    setForeignTomboInput('');
    setRoomNewTombo('');
    setRoomNewTomboSesa('');
    setRoomNewDescricao('');
    setRoomNewSerial('');
    setRoomNewFornecedor('');
    setRoomNewValor('');
    setMatchedExistingAsset(null);
    setBulkFeedback(`Localização provisória registrada! Item "${asset.descricao}" (${asset.tombamento}) alocado com sucesso na sala "${targetRoom}".`);
    setTimeout(() => setBulkFeedback(null), 8000);
  };

  // Officialization Handler: Gestora gives official OK after confirming definitive baixa in ASPEC
  const handleConfirmOfficialization = (asset: Asset, protocolo: string, parecer: string) => {
    const targetRoom = asset.auditoria?.setorEncontrado || asset.setorNome;
    const targetUnit = asset.auditoria?.unidadeEncontrada || asset.unidadeNome;

    const updated: Asset = {
      ...asset,
      setorNome: targetRoom,
      subsetorNome: targetRoom,
      area: targetRoom,
      subarea: targetRoom,
      unidadeNome: targetUnit,
      statusRegularizacaoAspec: 'oficializado',
      auditoria: {
        ...asset.auditoria,
        conferido: true,
        statusDivergencia: 'setor_divergente',
        statusRegularizacaoAspec: 'oficializado',
        gestoraConfirmouAspec: true,
        dataOficializacaoAspec: new Date().toISOString(),
        protocoloOficializacaoAspec: protocolo,
        responsavelOficializacaoAspec: currentProfile.nome || 'Gestora de Patrimônio',
        observacaoAuditoria: `Mudança definitiva homologada no ASPEC pela Gestora (${currentProfile.nome || 'Gestora de Patrimônio'}). Dados unificados definitivamente no setor "${targetRoom}". Protocolo: ${protocolo}. ${parecer}`
      }
    };

    if (onUpdateAsset) {
      onUpdateAsset(updated);
    } else {
      onUpdateAudit(asset.id, {
        conferido: true,
        statusDivergencia: 'setor_divergente',
        unidadeEncontrada: targetUnit,
        setorEncontrado: targetRoom,
        subsetorEncontrado: targetRoom,
        setorOriginalAspec: updated.auditoria.setorOriginalAspec,
        unidadeOriginalAspec: updated.auditoria.unidadeOriginalAspec,
        divergenciaConfirmada: true,
        observacaoAuditoria: updated.auditoria.observacaoAuditoria || '',
        responsavelConferencia: currentProfile.nome
      });
    }

    setBulkFeedback(`OK Oficial confirmado pela Gestora! Baixa processada no ASPEC e dados unificados com sucesso na sala "${targetRoom}".`);
    setTimeout(() => setBulkFeedback(null), 8000);
  };

  // Batch & Individual update of asset responsibles
  const handleSaveRoomResponsibles = (updates: { assetId: string; responsavelNome: string; responsavelCargo?: string }[]) => {
    updates.forEach(u => {
      const existingAsset = assets.find(a => a.id === u.assetId);
      if (existingAsset) {
        const updated: Asset = {
          ...existingAsset,
          responsavelNome: u.responsavelNome,
          responsavelCargo: u.responsavelCargo || existingAsset.responsavelCargo,
        };
        if (onUpdateAsset) {
          onUpdateAsset(updated);
        }
      }
    });
    setBulkFeedback(`Sucesso! Responsáveis pelos bens da sala "${activeSector?.nome}" atualizados e salvos.`);
    setTimeout(() => setBulkFeedback(null), 5000);
  };

  // Update Leader of this specific Room / Sector
  const handleUpdateSectorLeader = (newLeaderName: string, newLeaderCargo?: string) => {
    if (!activeSector) return;
    const cleanLeader = newLeaderName.trim();
    if (!cleanLeader) return;

    // Identifica o líder original no ASPEC
    const originalLeader = activeSector.responsavelOriginalAspec || activeSector.responsavel || 'Não definido no ASPEC';
    const isActuallyChanged = originalLeader.trim().toLowerCase() !== cleanLeader.toLowerCase();

    // 1. Salva em cpsms_room_leader_changes no localStorage
    try {
      const raw = localStorage.getItem('cpsms_room_leader_changes');
      const map = raw ? JSON.parse(raw) : {};
      const changeEntry = {
        originalLeader: originalLeader,
        newLeader: cleanLeader,
        newCargo: newLeaderCargo || activeSector.responsavelCargo || 'Responsável Setorial',
        changedAt: new Date().toISOString(),
        changedBy: currentProfile.nome,
        sectorName: activeSector.nome,
        sectorId: activeSector.id
      };
      map[activeSector.nome] = changeEntry;
      if (activeSector.id) {
        map[activeSector.id] = changeEntry;
      }
      map[normalizeLoc(activeSector.nome)] = changeEntry;
      localStorage.setItem('cpsms_room_leader_changes', JSON.stringify(map));
    } catch (e) {
      console.warn('Erro ao salvar cpsms_room_leader_changes:', e);
    }

    // 2. Chama onUpdateSector para atualizar o estado principal
    if (onUpdateSector) {
      onUpdateSector(activeSector.id || activeSector.nome, {
        responsavelNome: cleanLeader,
        responsavelCargo: newLeaderCargo || activeSector.responsavelCargo || 'Responsável Setorial',
        responsavelOriginalAspec: originalLeader,
        liderAlterado: isActuallyChanged,
        dataAlteracaoLider: new Date().toISOString()
      });
    }

    // 3. Atualiza os bens da sala para o novo líder
    const updates = activeSectorAssets.map(a => ({
      assetId: a.id,
      responsavelNome: (!a.responsavelNome || a.responsavelNome === originalLeader || a.responsavelNome === 'Não atribuído' || a.responsavelNome === 'Responsável Setorial')
        ? cleanLeader
        : a.responsavelNome,
      responsavelCargo: newLeaderCargo || a.responsavelCargo
    }));
    handleSaveRoomResponsibles(updates);

    setShowEditSectorLeaderModal(false);
    setBulkFeedback(
      isActuallyChanged
        ? `Líder da sala "${activeSector.nome}" alterado para "${cleanLeader}". ATENÇÃO: Ao Concluir a Sala, o Termo oficial notificará que NO ASPEC TEM QUE ALTERAR O LÍDER!`
        : `Líder da sala mantido como "${cleanLeader}".`
    );
    setTimeout(() => setBulkFeedback(null), 8000);
  };

  const handleSaveInlineResponsible = (asset: Asset) => {
    if (!inlineResponsibleInput.trim()) {
      setEditingAssetResponsibleId(null);
      return;
    }
    const updated: Asset = {
      ...asset,
      responsavelNome: inlineResponsibleInput.trim(),
    };
    if (onUpdateAsset) {
      onUpdateAsset(updated);
    }
    setEditingAssetResponsibleId(null);
    setBulkFeedback(`Responsável pelo tombo ${asset.tombamento} definido para "${inlineResponsibleInput.trim()}"!`);
    setTimeout(() => setBulkFeedback(null), 4000);
  };

  // Quick Action: Save an Untracked Asset found while inspecting this room
  const handleSaveRoomUntrackedAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSector) return;
    if (!roomNewDescricao.trim() && !matchedExistingAsset) return;

    // Se o bem já existia no banco/ASPEC ou se foi digitado tombo existente
    let targetExisting = matchedExistingAsset;
    if (!targetExisting && (roomNewTombo.trim() || roomNewTomboSesa.trim())) {
      const cleanT = roomNewTombo.trim().toLowerCase();
      const digitsT = cleanT.replace(/\D/g, '');
      const cleanS = roomNewTomboSesa.trim().toLowerCase();
      const digitsS = cleanS.replace(/\D/g, '');

      targetExisting = assets.find(a => {
        const tVal = a.tombamento.toLowerCase();
        const cVal = (a.tomboConsorcio || '').toLowerCase();
        const sVal = (a.tomboSesa || a.tomboOrigemSesa || '').toLowerCase();
        if (cleanT && (tVal === cleanT || cVal === cleanT)) return true;
        if (cleanS && (sVal === cleanS || tVal === cleanS)) return true;
        if (digitsT && digitsT.length >= 2) {
          const tDig = tVal.replace(/\D/g, '');
          const cDig = cVal.replace(/\D/g, '');
          if ((tDig && (tDig === digitsT || parseInt(tDig, 10) === parseInt(digitsT, 10))) ||
              (cDig && (cDig === digitsT || parseInt(cDig, 10) === parseInt(digitsT, 10)))) return true;
        }
        if (digitsS && digitsS.length >= 2) {
          const sDig = sVal.replace(/\D/g, '');
          if (sDig && (sDig === digitsS || parseInt(sDig, 10) === parseInt(digitsS, 10))) return true;
        }
        return false;
      }) || null;
    }

    if (targetExisting) {
      const belongsHere = doesAssetOfficiallyMatchRoom(targetExisting, activeSector.nome);
      if (!belongsHere) {
        // Disparar confirmação de modificação de setor obrigatória
        setShowAddRoomAssetModal(false);
        setPendingDivergenceConfirmation({
          asset: targetExisting,
          targetRoom: activeSector.nome,
          targetUnit: activeUnitInfo.nome
        });
        return;
      } else {
        // Já pertencia a esta sala no ASPEC
        handleQuickConfirm(targetExisting);
        setShowAddRoomAssetModal(false);
        setRoomNewTombo('');
        setRoomNewTomboSesa('');
        setRoomNewDescricao('');
        setRoomNewSerial('');
        setRoomNewFornecedor('');
        setRoomNewValor('');
        setRoomNewForaDoAspec(false);
        setMatchedExistingAsset(null);
        setBulkFeedback(`Item "${targetExisting.descricao}" conferido com sucesso nesta sala!`);
        setTimeout(() => setBulkFeedback(null), 5000);
        return;
      }
    }

    const parsedVal = parseFloat(roomNewValor.replace(',', '.')) || 0;
    const tomboFinal = roomNewSemPlaqueta
      ? (roomNewTombo.trim() || `SEM-TOMBO-${activeUnitInfo.sigla.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`)
      : (roomNewTombo.trim() || `TOMBO-${Math.floor(1000 + Math.random() * 9000)}`);

    const isUntracked = roomNewForaDoAspec || roomNewSemPlaqueta;
    const targetUnitId = (activeSector && 'unidadeId' in activeSector ? (activeSector as any).unidadeId : '') || activeUnitInfo.id;

    const newAsset: Asset = {
      id: `asset-room-${Date.now()}`,
      tombamento: tomboFinal,
      tomboOrigemSesa: roomNewTomboSesa.trim() || undefined,
      duploTombamento: Boolean(roomNewTombo.trim() && roomNewTomboSesa.trim()),
      foraDoAspec: isUntracked,
      semPlaqueta: roomNewSemPlaqueta,
      origemTombo: roomNewTomboSesa.trim() ? 'SESA (Governo do Ceará - Cessão/Comodato)' : 'CPSMS (Próprio do Consórcio)',
      origemRecurso: isUntracked ? 'Achado em Campo (Não Constava no ASPEC)' : 'Cadastro ASPEC',
      formaAquisicao: isUntracked ? 'Achado de Inventário' : 'Compra / Pregão Eletrônico',
      orgao: 'Consórcio Público de Saúde da Microrregião de Sobral (CPSMS)',
      descricao: roomNewDescricao.trim() || 'Bem Patrimonial em Campo',
      unidadeId: targetUnitId as any,
      unidadeNome: activeUnitInfo.nome,
      area: activeUnitInfo.nome,
      subarea: activeSector.nome,
      setorId: activeSector.id,
      setorNome: activeSector.nome,
      subsetorNome: activeSector.nome,
      responsavelNome: activeSector.responsavel || currentProfile.nome,
      responsavelCargo: 'Responsável do Setor',
      responsavelMatricula: 'CPSMS-REG',
      categoria: 'Equipamentos Médicos & Odontológicos',
      estado: roomNewEstado,
      valorAquisicao: parsedVal,
      valorResidual: parsedVal,
      valorBrutoContabil: parsedVal,
      valorLiquidoContabil: parsedVal,
      depreciacaoAcumulada: 0,
      dataAquisicao: new Date().toISOString().slice(0, 10),
      dataTombamento: new Date().toISOString().slice(0, 10),
      notaFiscal: isUntracked ? 'S/N - Achado Físico' : 'Cadastrado ASPEC',
      fornecedor: roomNewFornecedor.trim() || 'A Apurar',
      numeroSerie: roomNewSerial.trim() || 'S/N',
      observacoes: roomNewSemPlaqueta
        ? `Bem físico sem plaqueta de tombamento encontrado na sala "${activeSector.nome}" em ${new Date().toLocaleDateString('pt-BR')} por ${currentProfile.nome}. Relação para novo emplacamento no ASPEC.`
        : isUntracked
          ? `Bem físico encontrado na sala "${activeSector.nome}" em ${new Date().toLocaleDateString('pt-BR')} por ${currentProfile.nome}. Não constava no ASPEC.`
          : `Bem cadastrado no ASPEC conferido in loco na sala "${activeSector.nome}".`,
      auditoria: {
        conferido: true,
        dataConferencia: new Date().toISOString().slice(0, 16).replace('T', ' '),
        responsavelConferencia: currentProfile.nome,
        statusDivergencia: 'conforme',
        unidadeEncontrada: activeUnitInfo.nome,
        setorEncontrado: activeSector.nome,
        subsetorEncontrado: activeSector.nome,
        observacaoAuditoria: roomNewSemPlaqueta
          ? 'Item físico sem plaqueta anotado para novo emplacamento no ASPEC.'
          : isUntracked
            ? 'Item encontrado fora do ASPEC e conferido in loco na sala.'
            : 'Item conferido in loco na sala conforme ASPEC.'
      }
    };

    onAddAsset?.(newAsset);
    markRoomAsDraft(activeSector.nome);
    setShowAddRoomAssetModal(false);
    setRoomNewTombo('');
    setRoomNewTomboSesa('');
    setRoomNewDescricao('');
    setRoomNewSerial('');
    setRoomNewFornecedor('');
    setRoomNewValor('');
    setRoomNewSemPlaqueta(false);
    setRoomNewForaDoAspec(false);
    setMatchedExistingAsset(null);
    setBulkFeedback(`Item "${newAsset.descricao}" (${newAsset.tombamento}) registrado na sala "${activeSector.nome}" com sucesso!`);
    setTimeout(() => setBulkFeedback(null), 6000);
  };

  // Handler: Search for a foreign tombo found while in the current room
  const handleSearchForeignTombo = () => {
    if (!foreignTomboInput.trim() || !activeSector) return;
    const q = foreignTomboInput.trim().toLowerCase();
    const digitsQ = q.replace(/\D/g, '');

    const matched = assets.find(a => {
      const tVal = a.tombamento.toLowerCase();
      const cVal = (a.tomboConsorcio || '').toLowerCase();
      const sVal = (a.tomboSesa || a.tomboOrigemSesa || '').toLowerCase();
      const uVal = (a.tomboUfc || '').toLowerCase();
      const fVal = (a.tomboFcpc || '').toLowerCase();
      const oVal = (a.outrosTombos || a.tomboSecundario || '').toLowerCase();

      // Correspondência textual direta
      if (
        tVal === q ||
        cVal === q ||
        sVal === q ||
        uVal === q ||
        fVal === q ||
        oVal === q
      ) return true;

      // Correspondência numérica inteligente (ex: "0184" bate com "CPSMS-0184", "184", etc.)
      if (digitsQ && digitsQ.length >= 2) {
        const tDig = tVal.replace(/\D/g, '');
        const cDig = cVal.replace(/\D/g, '');
        const sDig = sVal.replace(/\D/g, '');
        if ((tDig && (tDig === digitsQ || parseInt(tDig, 10) === parseInt(digitsQ, 10))) ||
            (cDig && (cDig === digitsQ || parseInt(cDig, 10) === parseInt(digitsQ, 10))) ||
            (sDig && (sDig === digitsQ || parseInt(sDig, 10) === parseInt(digitsQ, 10)))) {
          return true;
        }
      }

      return false;
    });

    if (!matched) {
      setForeignTomboFeedback({
        type: 'not_in_aspec',
        message: `O Tombo "${foreignTomboInput.trim()}" NÃO consta no ASPEC. Trata-se de um bem físico sem registro contábil.`
      });
      return;
    }

    // Se o bem já teve saída/baixa registrada (Devolução ou Doação), avisa claramente o usuário com o destino!
    if (matched.statusSaida && matched.statusSaida !== 'ativo') {
      const tipoLabel = matched.statusSaida === 'devolvido' ? 'DEVOLUÇÃO A CEDENTE' : 'DOAÇÃO FORMALIZADA';
      const dest = matched.detalhesSaida?.destinatario || 'Órgão Externo';
      const proc = matched.detalhesSaida?.processo || '—';
      const dataS = formatDate(matched.detalhesSaida?.dataSaida || '');
      setForeignTomboFeedback({
        type: 'found_other',
        asset: matched,
        message: `AVISO: O Tombo ${matched.tombamento} (${matched.descricao}) já teve BAIXA/SAÍDA REGISTRADA (${tipoLabel}). Destino: "${dest}". Processo: ${proc} (Data da Saída: ${dataS}). Local de origem anterior: ${matched.unidadeNome} — ${matched.setorNome}. Este bem não consta mais ativo nesta ou em outra sala!`
      });
      return;
    }

    const belongsHere = doesAssetOfficiallyMatchRoom(matched, activeSector.nome);

    if (belongsHere) {
      // Belongs to this room already!
      handleQuickConfirm(matched);
      setForeignTomboInput('');
      setForeignTomboFeedback({
        type: 'belongs_here',
        asset: matched,
        message: `O Tombo ${matched.tombamento} (${matched.descricao}) já pertence a esta sala no ASPEC! Presença confirmada no sistema.`
      });
      setTimeout(() => setForeignTomboFeedback(null), 5000);
    } else {
      // Belongs to another room in ASPEC! Remanejamento detectado!
      const fullLoc = getAssetFullLocation(matched);
      setPendingDivergenceConfirmation({
        asset: matched,
        targetRoom: activeSector.nome,
        targetUnit: activeUnitInfo.nome
      });
      setForeignTomboFeedback({
        type: 'found_other',
        asset: matched,
        message: `Tem certeza que deseja modificar? No ASPEC o item está em: Área: "${fullLoc.area}" · Subárea / Sala: "${fullLoc.subarea}". Destino físico: "${activeSector.nome}".`
      });
    }
  };
  const handleConfirmForeignAssetInCurrentRoom = (asset: Asset) => {
    if (!activeSector) return;
    handleConfirmDivergentLocation(asset, activeSector.nome, activeUnitInfo.nome);
  };

  // Generate standalone printable HTML for the current room
  const generateRoomSheetHtml = (): string => {
    if (!activeSector) return '';
    const targetUnitId = (activeSector as any).unidadeId || activeUnitInfo.id;
    const roomAssets = assets.filter(a => {
      if (targetUnitId && getAssetUnitId(a) !== targetUnitId) return false;
      return doesAssetMatchRoom(a, activeSector.nome);
    });

    const emissionDate = new Date();
    const dateFormatted = emissionDate.toLocaleDateString('pt-BR');
    const timeFormatted = emissionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const rowsHtml = roomAssets.map((asset, idx) => {
      const isChecked = asset.auditoria?.conferido;
      const isUntracked = asset.foraDoAspec;
      const isDivergent = asset.auditoria?.statusDivergencia === 'setor_divergente';
      const tomboSesa = asset.tomboOrigemSesa || (asset.tombamento.replace(/\D/g, '').length >= 6 ? asset.tombamento : '-');
      const val = asset.valorAquisicao || 0;

      return `
        <tr style="${isDivergent ? 'background:#fefce8;' : isUntracked ? 'background:#fffbeb;' : idx % 2 === 1 ? 'background:#f8fafc;' : ''}">
          <td style="text-align:center;padding:5px;border:1px solid #cbd5e1;font-size:12px;">${isChecked ? '☑' : '☐'}</td>
          <td style="font-family:monospace;font-weight:bold;padding:5px;border:1px solid #cbd5e1;white-space:nowrap;">${asset.tombamento}</td>
          <td style="font-family:monospace;font-weight:bold;color:#1e40af;padding:5px;border:1px solid #cbd5e1;white-space:nowrap;">${tomboSesa}</td>
          <td style="padding:5px;border:1px solid #cbd5e1;font-size:10px;">${asset.origemTombo.split(' ')[0]}</td>
          <td style="padding:5px;border:1px solid #cbd5e1;">
            <div style="font-weight:600;color:#0f172a;">${(asset.descricao || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            ${isDivergent ? `
              <div style="font-size:9px;color:#92400e;background:#fef3c7;border:1px solid #fde68a;padding:3px 5px;border-radius:4px;margin-top:3px;line-height:1.3;">
                <strong>📍 OBSERVAÇÃO DE LOCALIZAÇÃO PROVISÓRIA:</strong><br/>
                Físico na sala "${activeSector.nome}". No ASPEC o registro é "${asset.setorOriginalAspec || asset.setorNome}".<br/>
                ${asset.statusRegularizacaoAspec === 'oficializado'
                  ? '<span style="color:#065f46;font-weight:bold;">✓ Mudança definitiva homologada no ASPEC pela Gestora. Dados unificados!</span>'
                  : '<span style="color:#b45309;font-weight:bold;">⏳ Registro definitivo pendente de confirmação de baixa/mudança no ASPEC pela Gestora (OK Oficial).</span>'}
              </div>
            ` : isUntracked ? '<div style="font-size:9px;color:#b45309;font-weight:bold;margin-top:2px;">⚠️ IDENTIFICADO FORA DO ASPEC</div>' : ''}
          </td>
          <td style="font-family:monospace;font-size:10px;padding:5px;border:1px solid #cbd5e1;">${asset.numeroSerie && asset.numeroSerie !== '-' ? asset.numeroSerie : asset.fornecedor || '-'}</td>
          <td style="text-align:center;font-size:10px;padding:5px;border:1px solid #cbd5e1;">${asset.estado}</td>
          <td style="text-align:right;font-family:monospace;font-size:10px;padding:5px;border:1px solid #cbd5e1;white-space:nowrap;">${formatBRL(val)}</td>
        </tr>
      `;
    }).join('');

    const blankRows = Array.from({ length: 4 }).map(() => `
      <tr style="height:26px;">
        <td style="border:1px solid #fde68a;text-align:center;color:#94a3b8;">☐</td>
        <td style="border:1px solid #fde68a;"></td>
        <td style="border:1px solid #fde68a;"></td>
        <td style="border:1px solid #fde68a;"></td>
        <td style="border:1px solid #fde68a;"></td>
        <td style="border:1px solid #fde68a;"></td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Folha de Vistoria de Sala - ${activeSector.nome} - CPSMS</title>
  <style>
    @page { size: portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 16px; color: #0f172a; background: #fff; line-height: 1.35; }
    .no-print { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: white; padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; }
    .btn { background: #10b981; color: #0f172a; border: none; padding: 6px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .btn-close { background: #334155; color: white; border: none; padding: 6px 12px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 13px; margin-left: 8px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; font-family: Georgia, serif; }
    .gov { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #334155; }
    .org { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
    .room-badge { background: #0f172a; color: white; padding: 8px 12px; border-radius: 6px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
    th { background: #f1f5f9; padding: 6px; border: 1px solid #cbd5e1; text-align: left; font-size: 9px; text-transform: uppercase; }
    td { padding: 5px; border: 1px solid #cbd5e1; vertical-align: top; }
    .signatures { margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; text-align: center; font-size: 10px; }
    .sig-line { border-bottom: 1px solid #0f172a; padding-bottom: 30px; margin-bottom: 4px; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print">
    <div><strong>CPSMS · Folha de Vistoria de Sala</strong> · ${activeSector.nome} (${roomAssets.length} bens)</div>
    <div>
      <button class="btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
      <button class="btn-close" onclick="window.close()">✖ Fechar</button>
    </div>
  </div>
  <div class="header">
    <div class="gov">ESTADO DO CEARÁ · GOVERNO DO ESTADO DO CEARÁ</div>
    <div class="org">CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS</div>
    <div style="font-size:10px;color:#475569;">${activeUnitInfo.nome}</div>
    <div style="display:inline-block;font-size:12px;font-weight:bold;text-transform:uppercase;background:#f1f5f9;padding:4px 12px;border:1px solid #cbd5e1;border-radius:4px;margin-top:6px;">
      FOLHA DE CONFERÊNCIA FÍSICA SALA A SALA — EXERCÍCIO 2026
    </div>
    <div style="font-size:9px;color:#64748b;margin-top:4px;font-family:monospace;">
      Emissão: ${dateFormatted} às ${timeFormatted} · Vistoriadora: ${currentProfile.nome}
    </div>
  </div>

  <div class="room-badge">
    <div>
      <div style="font-size:8px;font-weight:bold;text-transform:uppercase;color:#fbbf24;">MICRO-LOCALIZAÇÃO / SALA</div>
      <div style="font-size:14px;font-weight:900;">📍 ${activeSector.nome}</div>
      ${activeSector.responsavel ? `<div style="font-size:9px;color:#cbd5e1;">Titular da Carga: <strong>${activeSector.responsavel}</strong></div>` : ''}
    </div>
    <div style="text-align:right;font-size:11px;font-family:monospace;">
      <div><strong>${roomAssets.length} bens alocados</strong></div>
      <div style="color:#94a3b8;font-size:10px;">${formatBRL(activeSector.totalVal)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px;text-align:center;">Conf.</th>
        <th style="width:90px;">Tombo CPSMS (4d)</th>
        <th style="width:90px;">Tombo SESA (6d)</th>
        <th style="width:55px;">Origem</th>
        <th>Descrição do Equipamento / Mobiliário</th>
        <th style="width:75px;">S/N / Marca</th>
        <th style="width:60px;text-align:center;">Estado</th>
        <th style="width:80px;text-align:right;">Valor (R$)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#92400e;background:#fef3c7;padding:4px 8px;border:1px solid #fde68a;border-radius:4px;margin-bottom:6px;">
    ✏️ BENS ENCONTRADOS NESTA SALA QUE NÃO CONSTAM NO ASPEC (ANOTAÇÃO MANUAL):
  </div>
  <table style="font-family:monospace;">
    <thead>
      <tr style="background:#fef3c7;color:#78350f;">
        <th style="width:30px;text-align:center;border:1px solid #fde68a;">Conf.</th>
        <th style="width:110px;border:1px solid #fde68a;">Tombo Físico</th>
        <th style="border:1px solid #fde68a;">Descrição / Marca</th>
        <th style="width:75px;border:1px solid #fde68a;">Estado</th>
        <th style="width:85px;border:1px solid #fde68a;">Nº de Série</th>
        <th style="width:110px;border:1px solid #fde68a;">Anotações p/ ASPEC</th>
      </tr>
    </thead>
    <tbody>${blankRows}</tbody>
  </table>

  <div class="signatures">
    <div>
      <div class="sig-line"></div>
      <strong>${currentProfile.nome}</strong><br />
      <span>Comissão de Inventário / Gestora de Patrimônio</span>
    </div>
    <div>
      <div class="sig-line"></div>
      <strong>${activeSector.responsavel || 'Responsável da Sala'}</strong><br />
      <span>Titular da Carga Patrimonial / Ciente</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { try { window.print(); } catch(e) {} }, 350);
    });
  </script>
</body>
</html>`;
  };

  const handlePrintRoomSheet = () => {
    if (!activeSector) return;
    const html = generateRoomSheetHtml();
    executePrintHtml({
      title: `Folha da Sala - ${activeSector.nome}`,
      html,
      filename: `folha_sala_${activeSector.nome.toLowerCase().replace(/[^a-z0-9]/g, '_')}.html`,
      onStatus: (status) => {
        if (status) {
          setBulkFeedback(status.message);
          setTimeout(() => setBulkFeedback(null), 6000);
        }
      }
    });
  };

  const handleDownloadRoomSheetHtml = () => {
    if (!activeSector) return;
    const html = generateRoomSheetHtml();
    downloadPrintableHtml(`folha_sala_${activeSector.nome.toLowerCase().replace(/[^a-z0-9]/g, '_')}.html`, html);
    setBulkFeedback(`Folha da sala "${activeSector.nome}" baixada! Dê dois cliques para abrir no navegador e imprimir (Ctrl+P).`);
    setTimeout(() => setBulkFeedback(null), 6000);
  };

  // Camera Toggle
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmera não suportada neste dispositivo.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(err.message || 'Permissão negada ou câmera indisponível.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header Banner - Clean Light Style */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Auditoria Sala a Sala · TCE-CE
              </span>
              <span className="text-xs text-slate-500 font-medium">Inventário Físico do CPSMS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-1">
              Conferência & Auditoria por Setor
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Escolha a unidade (<strong>Policlínica, CEO ou Consórcio</strong>), selecione a sala e confira diretamente tudo o que está alocado naquele ambiente sem necessidade de QR code.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg transition-all cursor-pointer min-h-[40px] shadow-2xs"
              title="Guia de soluções: o que fazer com tombos faltantes e tombos fora do setor"
            >
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span>Soluções para o Inventário</span>
            </button>

            <button
              onClick={() => setShowAspecReconciliationModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg transition-all cursor-pointer min-h-[40px] shadow-2xs"
              title="Visualizar o que alterar no ASPEC (Remanejamentos de salas, faltas e inclusões)"
            >
              <ArrowRightLeft className="w-4 h-4 text-amber-800" />
              <span>O Que Alterar no ASPEC</span>
              {remanejamentosCount + faltandoNaSalaCount + foraDoAspecCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950 text-[10px] font-mono font-bold">
                  {remanejamentosCount + faltandoNaSalaCount + foraDoAspecCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowMacroMicroModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 rounded-lg transition-all cursor-pointer min-h-[40px] shadow-2xs"
              title="Abrir e imprimir o Caderno de Balanço e Inventário completo (A4 / PDF)"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Caderno de Balanço / Imprimir</span>
            </button>
            <button
              onClick={() => exportAuditReportCsv(assets)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg cursor-pointer min-h-[40px]"
              title="Exportar CSV de auditoria"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Reassurance Banner: Modo Diagnóstico Seguro */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Modo Diagnóstico Seguro:</strong> Suas anotações no inventário físico <u>NÃO alteram o cadastro oficial do ASPEC nem apagam bens</u>. O sistema mapeia as divergências para você visualizar no botão <strong>"O Que Alterar no ASPEC"</strong> e levar à contabilidade com total tranquilidade.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer text-[11px] shrink-0"
          >
            Ver soluções práticas →
          </button>
        </div>

        {/* Global Progress Metrics */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div>
            <span className="text-slate-500 text-[11px] font-medium block">Cobertura Geral:</span>
            <div className="text-xl font-mono font-bold text-slate-900 tabular-nums mt-0.5">{coveragePercent}%</div>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] font-medium block">Bens Conferidos:</span>
            <div className="text-xl font-mono font-bold text-emerald-700 tabular-nums mt-0.5">{auditedCount} / {totalAssets}</div>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] font-medium block">Pendentes de Vistoria:</span>
            <div className="text-xl font-mono font-bold text-slate-700 tabular-nums mt-0.5">{totalAssets - auditedCount}</div>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] font-medium block">Alterações p/ o ASPEC:</span>
            <div className="text-xl font-mono font-bold text-amber-800 tabular-nums mt-0.5">
              {remanejamentosCount + faltandoNaSalaCount + foraDoAspecCount}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('salas')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeTab === 'salas'
              ? 'bg-white dark:bg-slate-750 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-500" />
          <span>Salas & Setores (Lista Direta)</span>
        </button>

        <button
          onClick={() => setActiveTab('conciliacao')}
          className={`flex items-center gap-2 px-3.5 py-2 font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeTab === 'conciliacao'
              ? 'bg-amber-400 text-slate-950 shadow-xs'
              : 'text-amber-800 dark:text-amber-400 hover:text-amber-950 font-bold'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>O Que Alterar no ASPEC</span>
          {remanejamentosCount + faltandoNaSalaCount + foraDoAspecCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-amber-300 font-mono font-bold">
              {remanejamentosCount + faltandoNaSalaCount + foraDoAspecCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('divergencias')}
          className={`flex items-center gap-2 px-3.5 py-2 font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeTab === 'divergencias'
              ? 'bg-white dark:bg-slate-750 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Divergências & Ausências</span>
          {divergentAssets.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold font-mono">
              {divergentAssets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('relatorio')}
          className={`flex items-center gap-2 px-3.5 py-2 font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeTab === 'relatorio'
              ? 'bg-white dark:bg-slate-750 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-blue-500" />
          <span>Inventário Analítico</span>
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-2 px-3.5 py-2 font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
            activeTab === 'scanner'
              ? 'bg-white dark:bg-slate-750 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4 text-purple-500" />
          <span>Câmera / QR Code (Opcional)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA PRINCIPAL: SALAS & SETORES (CONFERÊNCIA SALA A SALA) */}
      {/* ========================================================================= */}
      {activeTab === 'salas' && (
        <div className="space-y-5">
          
          {/* STEP 1: SELECT UNIT (POLICLÍNICA / CEO / CONSÓRCIO) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Passo 1: Selecione a Unidade do Consórcio para Vistoria
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {availableUnits.map(unit => {
                const isSelected = selectedUnitId === unit.id;
                const countInUnit = assets.filter(a => {
                  if (unit.id === 'policlinica') return a.unidadeId === 'policlinica' || a.unidadeNome.toLowerCase().includes('poli');
                  if (unit.id === 'ceo') return a.unidadeId === 'ceo' || a.unidadeNome.toLowerCase().includes('ceo');
                  if (unit.id === 'sede-cpsms') return a.unidadeId === 'sede-cpsms' || a.unidadeNome.toLowerCase().includes('sede');
                  if (unit.id === 'cer') return a.unidadeId === 'cer' || a.unidadeNome.toLowerCase().includes('cer');
                  return false;
                }).length;

                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => {
                      setSelectedUnitId(unit.id);
                      setSelectedSectorId(null); // Reset room selection when unit changes
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{unit.icon}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isSelected 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {countInUnit} bens
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs sm:text-sm font-bold block leading-tight">
                        {unit.sigla}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                        {unit.nome}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BANNER DE FECHAMENTO GERAL DA UNIDADE (POLICLÍNICA / CEO) & TERMO TCE-CE */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-850 text-white rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">Fechamento Geral de {activeUnitInfo.sigla}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    TCE-CE · Controle Interno
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ao concluir as salas da {activeUnitInfo.sigla}, gere o Termo Circunstanciado de Bens Não Localizados para apuração e blindagem processual.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowUnlocatedModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
              title="Gerar Termo Circunstanciado de Bens Não Localizados da Unidade para o TCE-CE"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Termo de Não Localizados (TCE-CE)</span>
            </button>
          </div>

          {/* Feedback banner after bulk action */}
          {bulkFeedback && (
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-xs font-semibold rounded-xl border border-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {bulkFeedback}
              </span>
              <button onClick={() => setBulkFeedback(null)}>✕</button>
            </div>
          )}

          {/* STEP 2 & 3: SECTOR LIST OR ROOM ASSETS VIEW */}
          {!selectedSectorId ? (
            /* SECTORS GRID FOR THE SELECTED UNIT */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Salas e Setores de {activeUnitInfo.sigla}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {roomStats.total} total
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                        ✓ {roomStats.conferidas} OK
                      </span>
                      {roomStats.pendentes > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300">
                          ⏳ {roomStats.pendentes} pendentes
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Marque um <strong>OK</strong> quando conferir a sala para não fazer retrabalho. O status é salvo permanentemente.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  {/* Status Filters: Todas / Conferidas / Pendentes */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-850 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setRoomFilterStatus('all')}
                      className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                        roomFilterStatus === 'all'
                          ? 'bg-white dark:bg-slate-750 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Todas ({roomStats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomFilterStatus('conferidas')}
                      className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        roomFilterStatus === 'conferidas'
                          ? 'bg-emerald-500 text-slate-950 shadow-xs'
                          : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-900'
                      }`}
                    >
                      <CheckCheck className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Conferidas ({roomStats.conferidas})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomFilterStatus('pendentes')}
                      className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                        roomFilterStatus === 'pendentes'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-amber-700 dark:text-amber-400 hover:text-amber-900'
                      }`}
                    >
                      Pendentes ({roomStats.pendentes})
                    </button>
                  </div>

                  {/* Regra da Desduplicidade Button */}
                  {onExecuteDeduplicationRule && (
                    <button
                      type="button"
                      onClick={() => {
                        setDedupResult(null);
                        setShowDeduplicationModal(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                      title="Regra da Desduplicidade: Unificar salas duplicadas (ex: 004-COPA e COPA), bens repetidos e restaurar itens apagados por falsa duplicidade"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                      <span>Regra da Desduplicidade</span>
                      {totalPotentialDuplicates > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[10px] font-mono font-black">
                          {totalPotentialDuplicates}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Add New Room / Physical Area Button */}
                  {onAddNewLocation && (
                    <button
                      type="button"
                      onClick={() => setIsNewLocationModalOpen(true)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                      title="Cadastrar uma nova sala física ou área (como Jardim, Pátio, DML, etc.)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Nova Sala</span>
                    </button>
                  )}

                  {/* Reset All Audits to Clean Slate Button */}
                  {onResetAllAudits && (
                    <button
                      type="button"
                      onClick={() => setShowResetAllConfirmModal(true)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xs hover:border-rose-300 transition-all cursor-pointer shrink-0"
                      title="Reiniciar todas as conferências para começar do zero (tudo pendente)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Começar do Zero</span>
                    </button>
                  )}

                  {/* Quick Sector Search Input */}
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={sectorSearchQuery}
                      onChange={(e) => setSectorSearchQuery(e.target.value)}
                      placeholder="Filtrar sala..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Sectors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unitSectorsList.map((sector, index) => {
                  const isConferida = Boolean(sector.revisada);
                  return (
                    <div
                      key={`sector-${sector.id}-${index}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedSectorId(sector.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedSectorId(sector.id);
                        }
                      }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer group flex flex-col justify-between space-y-3 ${
                        isConferida
                          ? 'border-2 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 hover:border-emerald-600 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/80 bg-slate-50/60 dark:bg-slate-850 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 leading-snug">
                              {sector.nome}
                            </span>
                            {isConferida && sector.dataRevisao && (
                              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono mt-0.5 font-semibold flex items-center gap-1">
                                <span>✓ Conferida em {new Date(sector.dataRevisao).toLocaleDateString('pt-BR')}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isConferida ? (
                              <span 
                                className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-mono shadow-xs flex items-center gap-1 ring-1 ring-emerald-600"
                                title="Sala concluída, auditada e conferida no inventário físico com OK garantido"
                              >
                                <CheckCheck className="w-3.5 h-3.5 stroke-[3]" />
                                <span>CONFERIDA (OK)</span>
                              </span>
                            ) : roomDrafts[sector.nome] ? (
                              <span 
                                className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-mono shadow-2xs"
                                title="Sala possui alterações em rascunho de conferência pendentes de homologação oficial no ASPEC"
                              >
                                Rascunho
                              </span>
                            ) : (
                              <span 
                                className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700"
                              >
                                Pendente
                              </span>
                            )}
                            {consolidatedRooms[sector.nome] && !isConferida && (
                              <span 
                                className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono border border-emerald-300"
                                title="Sala consolidada definitivamente no sistema com ASPEC oficializado"
                              >
                                ASPEC OK
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>

                        {sector.responsavel && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{sector.responsavel}</span>
                            {sector.liderAlterado && (
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/50 font-mono">
                                ⚠️ Líder alterado in loco
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        {/* Progress bar per sector */}
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${isConferida ? 100 : sector.percent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {sector.assetsCount} {sector.assetsCount === 1 ? 'bem' : 'bens'}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                              isConferida 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black' 
                                : sector.checkedCount > 0 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {isConferida ? '✓ ' : ''}
                              {isConferida ? sector.assetsCount : sector.checkedCount} de {sector.assetsCount} ({isConferida ? 100 : sector.percent}%)
                            </span>
                          </div>

                          {/* Direct Actions on the Room Card */}
                          <div className="flex items-center gap-2">
                            {isConferida ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnmarkRoomOk(sector);
                                }}
                                className="px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 underline transition-all cursor-pointer"
                                title="Desmarcar OK da sala"
                              >
                                Desmarcar OK
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkRoomOk(sector);
                                }}
                                className="px-2.5 py-1 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95"
                                title="Marcar sala como conferida (OK) imediatamente"
                              >
                                <CheckCheck className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Marcar OK</span>
                              </button>
                            )}
                            <span className="text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform flex items-center">
                              Entrar →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {unitSectorsList.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500">
                  Nenhum setor encontrado com o termo "{sectorSearchQuery}".
                </div>
              )}
            </div>
          ) : (
            /* STEP 3: INSIDE SELECTED SECTOR - SHOWS EVERYTHING IN THE ROOM! */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-7 space-y-6 shadow-sm">
              
              {/* Sector Header with Breadcrumb and Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSectorId(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer mb-0.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar à lista de salas de {activeUnitInfo.sigla}</span>
                  </button>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                        <MapPin className="w-6 h-6 shrink-0" />
                      </div>
                      <span>{activeSector?.nome}</span>
                    </h3>

                    {activeSector?.revisada ? (
                      <span className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-sm ring-2 ring-emerald-600/40">
                        <CheckCheck className="w-4 h-4 stroke-[3]" />
                        <span>SALA CONFERIDA (OK)</span>
                      </span>
                    ) : (
                      <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pendente de Conferência</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap pt-0.5">
                    <span>Unidade: <strong className="text-slate-700 dark:text-slate-200">{activeUnitInfo.nome}</strong></span>
                    {activeSector?.responsavel ? (
                      <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                        <span>· Responsável: <strong className="text-slate-800 dark:text-slate-100">{activeSector.responsavel}</strong></span>
                        {activeSector.liderAlterado && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-mono shadow-xs">
                            ⚠️ Alterar no ASPEC
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setNewSectorLeaderInput(activeSector.responsavel || '');
                            setNewSectorCargoInput(activeSector.responsavelCargo || 'Responsável Setorial');
                            setShowEditSectorLeaderModal(true);
                          }}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-1"
                        >
                          ✏️ Alterar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setNewSectorLeaderInput('');
                          setNewSectorCargoInput('Responsável Setorial');
                          setShowEditSectorLeaderModal(true);
                        }}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        + Definir Líder da Sala
                      </button>
                    )}
                    <span>· Valor alocado no ASPEC: <strong className="text-slate-700 dark:text-slate-200 font-mono">{formatBRL(activeSector?.totalVal || 0)}</strong></span>
                  </div>
                </div>

                {/* Top Action Buttons for this Room */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* BOTÃO PRINCIPAL: MARCAR SALA COMO CONFERIDA (OK) */}
                  {!activeSector?.revisada ? (
                    <button
                      type="button"
                      onClick={() => handleMarkRoomOk(activeSector)}
                      className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all cursor-pointer shadow-md ring-2 ring-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
                      title="Marcar sala como conferida (OK) no inventário e salvar permanentemente para não fazer retrabalho"
                    >
                      <CheckCheck className="w-4 h-4 stroke-[3]" />
                      <span>Marcar Sala como OK</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/80 p-1.5 rounded-xl border-2 border-emerald-500 shadow-xs">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-emerald-950 dark:text-emerald-200">
                        <CheckCheck className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        <span>CONFERIDA (OK)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnmarkRoomOk(activeSector)}
                        className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 underline cursor-pointer"
                        title="Reabrir sala para conferência caso queira alterar algo"
                      >
                        Desmarcar OK
                      </button>
                    </div>
                  )}

                  {/* Baixar PDF Oficial */}
                  <button
                    type="button"
                    onClick={handleConcludeRoomWithPdf}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer shadow-xs border border-slate-700"
                    title="Baixar o arquivo PDF oficial com confronto Físico vs ASPEC"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Baixar PDF Oficial</span>
                  </button>

                  {/* Confirm All In Room */}
                  <button
                    type="button"
                    onClick={handleConfirmAllInSector}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                    title="Confirmar presença de todos os bens pendentes desta sala com 1 clique"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Todos</span>
                  </button>

                  {/* Salvar Alterações da Sala (Abre Comparativo Lado a Lado: ASPEC vs Físico) */}
                  <button
                    type="button"
                    onClick={() => handleSaveRoomChanges(activeSector)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer shadow-xs ring-2 ring-blue-500/20"
                    title="Salvar alterações físicas da sala em rascunho de conferência e exibir versões comparativas lado a lado: 'Sala de acordo com o ASPEC' e 'Sala atualizada fisicamente'"
                  >
                    <Layers className="w-4 h-4 text-white" />
                    <span>Salvar (Comparar ASPEC)</span>
                  </button>

                  {/* EMITIR RELATÓRIO PARA O ASPEC */}
                  <button
                    type="button"
                    onClick={() => setShowRoomAspecModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-xs ring-2 ring-indigo-500/20"
                    title="Emitir relatório oficial para atualizar o sistema ASPEC: se estiver tudo OK emite termo regular, se houver alteração detalha o que saiu e o que entrou (com sala de origem)"
                  >
                    <FileText className="w-4 h-4 text-white" />
                    <span>Relatório para o ASPEC</span>
                  </button>

                  {/* ALTERAR LÍDER DA SALA */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewSectorLeaderInput(activeSector?.responsavel || '');
                      setNewSectorCargoInput(activeSector?.responsavelCargo || 'Responsável Setorial');
                      setShowEditSectorLeaderModal(true);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs ${
                      activeSector?.liderAlterado
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400/50 font-black'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                    title="Alterar o líder/responsável desta sala específica e registrar no termo que no ASPEC tem que alterar o líder"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>{activeSector?.liderAlterado ? 'Líder Alterado (Mudar no ASPEC)' : 'Alterar Líder da Sala'}</span>
                  </button>

                  {/* DEFINIR RESPONSÁVEIS DOS BENS DA SALA */}
                  <button
                    type="button"
                    onClick={() => setShowRoomResponsiblesModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-all cursor-pointer shadow-xs ring-2 ring-teal-500/20"
                    title="Cadastrar ou editar servidores responsáveis por cada equipamento desta sala (computador, mesa, armário, diretor)"
                  >
                    <Users className="w-4 h-4 text-white" />
                    <span>Responsáveis por Bem</span>
                  </button>

                  {/* Add Untracked Asset Right in this Room */}
                  <button
                    type="button"
                    onClick={() => {
                      setRoomNewTombo('');
                      setRoomNewTomboSesa('');
                      setRoomNewDescricao('');
                      setRoomNewSemPlaqueta(false);
                      setShowAddRoomAssetModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl transition-colors cursor-pointer shadow-xs"
                    title="Adicionar ou conferir tombo físico nesta sala (seja do ASPEC ou achado físico)"
                  >
                    <Plus className="w-4 h-4 text-slate-950" />
                    <span>+ Adicionar Tombo</span>
                  </button>

                  {/* Documents & Reports Dropdown Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowRoomExtraDocsMenu(!showRoomExtraDocsMenu)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>Documentos & Termos</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {showRoomExtraDocsMenu && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-2 z-30 space-y-1 text-xs animate-in fade-in duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRoomAspecModal(true);
                            setShowRoomExtraDocsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-2 text-slate-800 dark:text-slate-200"
                        >
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span>Termo ASPEC da Sala</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handlePrintRoomSheet();
                            setShowRoomExtraDocsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-2 text-slate-800 dark:text-slate-200"
                        >
                          <Printer className="w-4 h-4 text-emerald-500" />
                          <span>Imprimir Folha da Sala (A4)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDownloadRoomSheetHtml();
                            setShowRoomExtraDocsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-2 text-slate-800 dark:text-slate-200"
                        >
                          <FileCode className="w-4 h-4 text-indigo-500" />
                          <span>Baixar Folha em HTML</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMacroMicroModal(true);
                            setShowRoomExtraDocsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-2 text-slate-800 dark:text-slate-200"
                        >
                          <ClipboardList className="w-4 h-4 text-amber-500" />
                          <span>Caderno Balanço Geral</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Excluir Sala (Enviar para Lixeira com Quarentena 7d) */}
                  {onDeleteSector && activeSector && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteRoomReason('Sala duplicada ou criada por engano');
                        setShowDeleteRoomModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-xl transition-colors cursor-pointer"
                      title="Mover esta sala para a Lixeira (quarentena segura de 7 dias)"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Excluir Sala</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Aviso Prominente de Alteração de Líder */}
              {activeSector?.liderAlterado && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">⚠️</span>
                    <div>
                      <h5 className="text-xs sm:text-sm font-black uppercase tracking-wide text-amber-900 dark:text-amber-300">
                        Líder Desta Sala Alterado In Loco — Notificação Obrigatória para o ASPEC
                      </h5>
                      <p className="text-xs mt-0.5 text-slate-700 dark:text-slate-300">
                        Líder anterior no ASPEC: <strong className="line-through text-slate-500">{activeSector.responsavelOriginalAspec || 'Original'}</strong> ➔ Novo Líder conferido in loco: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{activeSector.responsavel}</strong> ({activeSector.responsavelCargo || 'Responsável Setorial'}).
                      </p>
                      <p className="text-[11px] font-bold text-red-700 dark:text-red-400 mt-1">
                        O Termo Oficial gerado ao clicar em "Concluir Sala" e "Relatório para o ASPEC" notificará a Contabilidade com a determinação: <u>NO ASPEC TEM QUE ALTERAR O LÍDER</u> desta sala.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSectorLeaderInput(activeSector.responsavel || '');
                      setNewSectorCargoInput(activeSector.responsavelCargo || 'Responsável Setorial');
                      setShowEditSectorLeaderModal(true);
                    }}
                    className="px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    Modificar Líder
                  </button>
                </div>
              )}

              {/* ROOM PROGRESS & STATS BANNER */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total de Bens</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {activeSector?.assetsCount || 0}
                    </span>
                    <span className="text-xs text-slate-400">itens</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">{formatBRL(activeSector?.totalVal || 0)}</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">Conferidos / Presentes</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                      {activeSector?.checkedCount || 0}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ({activeSector?.percent || 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200 dark:bg-emerald-900 h-2 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${activeSector?.percent || 0}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">Pendentes de Aferição</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
                      {activeSector?.pendingCount || 0}
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400">restantes</span>
                  </div>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 block">Aguardando conferência física in loco</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 block">Divergências / Achados</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-rose-700 dark:text-rose-300 font-mono">
                      {activeSectorAssets.filter(a => a.auditoria?.statusDivergencia === 'setor_divergente' || a.auditoria?.statusDivergencia === 'nao_encontrado' || a.foraDoAspec).length}
                    </span>
                    <span className="text-xs text-rose-600 dark:text-rose-400">registros</span>
                  </div>
                  <span className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 block">Não vistos ou fora do ASPEC</span>
                </div>
              </div>

              {/* Feedback banner após salvar / consolidar */}
              {roomSaveFeedback && (
                <div className="p-4 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 rounded-2xl border border-emerald-300 text-sm font-bold flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{roomSaveFeedback}</span>
                  </div>
                  <button onClick={() => setRoomSaveFeedback(null)} className="text-emerald-700 hover:text-emerald-900 font-mono text-xs">✕</button>
                </div>
              )}

              {/* Status da Sala: Rascunho de Conferência Ativo vs Consolidado Definitivo */}
              {activeSector && roomDrafts[activeSector.nome] ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border-2 border-amber-400 dark:border-amber-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2 bg-amber-400 text-amber-950 rounded-xl font-black text-[11px] uppercase font-mono shrink-0 shadow-xs">
                      Rascunho Ativo
                    </div>
                    <div className="leading-snug text-amber-950 dark:text-amber-200">
                      <strong className="text-sm">Esta sala possui alterações salvas em rascunho de conferência física.</strong>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                        Somente após a gestora dar o comando de confirmação de que o ASPEC foi atualizado oficialmente é que os dados serão consolidados como definitivos no sistema, excluindo este rascunho temporário.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveComparingSector(activeSector);
                        setShowRoomComparisonModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-xs flex items-center gap-2"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Ver Comparativo Lado a Lado</span>
                    </button>
                  </div>
                </div>
              ) : activeSector && consolidatedRooms[activeSector.nome] ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-300 dark:border-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-emerald-950 dark:text-emerald-200 text-xs">
                      <strong>Sala Consolidada como Definitiva no Sistema</strong> (Despacho ASPEC nº <strong>{consolidatedRooms[activeSector.nome].protocolo}</strong>).
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 ml-1">
                        Rascunho temporário excluído após homologação oficial da Gestora.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveComparingSector(activeSector);
                      setShowRoomComparisonModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 text-emerald-800 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-slate-700 cursor-pointer shrink-0"
                  >
                    Ver Comparativo Consolidado
                  </button>
                </div>
              ) : null}

              {/* ========================================================================= */}
              {/* NOVA ESTAÇÃO CENTRAL DE CONFERÊNCIA FÍSICA & BIPADOR DA SALA (ÁREA NOBRE) */}
              {/* ========================================================================= */}
              <div className="p-5 sm:p-7 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl border border-slate-700 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500 text-slate-950 rounded-2xl shadow-md">
                      <Barcode className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <span>Terminal de Conferência Física & Bipador da Sala</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Bipagem Rápida
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Bipe com leitor de código de barras ou digite a plaqueta do bem físico. Confirmação instantânea na sala!
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                    Atalho: Tecla [Enter] para conferir
                  </span>
                </div>

                {/* Big Input Bar for Quick Verification */}
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                  <div className="relative flex-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 flex items-center gap-1.5 pointer-events-none">
                      <Tag className="w-5 h-5 text-emerald-400" />
                    </div>
                    <input
                      type="text"
                      value={foreignTomboInput}
                      onChange={(e) => {
                        setForeignTomboInput(e.target.value);
                        setForeignTomboFeedback(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchForeignTombo();
                        }
                      }}
                      placeholder="Bipe o código de barras ou digite a plaqueta (ex: 0184 ou tombo SESA)..."
                      className="w-full h-14 sm:h-16 pl-12 pr-4 rounded-2xl bg-slate-950 border-2 border-emerald-500/50 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 text-white font-mono text-base sm:text-lg font-black placeholder:text-slate-500 shadow-inner transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSearchForeignTombo}
                    className="h-14 sm:h-16 px-6 sm:px-8 text-sm sm:text-base font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl cursor-pointer shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shrink-0 ring-2 ring-emerald-400/40"
                  >
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    <span>Conferir Plaqueta Agora</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRoomNewTombo(foreignTomboInput.trim());
                      setRoomNewTomboSesa('');
                      setRoomNewDescricao('');
                      setRoomNewSemPlaqueta(false);
                      setShowAddRoomAssetModal(true);
                    }}
                    className="h-14 sm:h-16 px-5 text-xs sm:text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl cursor-pointer shadow-md transition-colors flex items-center justify-center gap-2 shrink-0"
                    title="Adicionar tombo nesta sala (encontrado no ASPEC ou achado físico)"
                  >
                    <Plus className="w-4 h-4 text-slate-950" />
                    <span>Adicionar Tombo</span>
                  </button>
                </div>

                {/* Instant Feedback from quick scan or search */}
                {lastScannedFeedback && (
                  <div className="p-4 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-100 flex items-center justify-between gap-3 animate-in zoom-in-95">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl font-black">
                        <CheckCheck className="w-5 h-5 stroke-[3]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-lg text-emerald-300">
                            Plaqueta {lastScannedFeedback.tombo}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase">
                            Presente na Sala
                          </span>
                        </div>
                        <p className="text-xs text-emerald-100 font-bold">{lastScannedFeedback.nome}</p>
                        {lastScannedFeedback.detalhes && (
                          <p className="text-[11px] text-emerald-300/80 mt-0.5">{lastScannedFeedback.detalhes}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setLastScannedFeedback(null)} className="text-emerald-400 hover:text-white font-mono text-sm">✕</button>
                  </div>
                )}

                {/* Foreign Tombo Feedback Box */}
                {foreignTomboFeedback && (
                  <div className={`p-4 rounded-2xl border text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in ${
                    foreignTomboFeedback.type === 'found_other'
                      ? 'bg-amber-500/20 text-amber-100 border-amber-400'
                      : foreignTomboFeedback.type === 'not_in_aspec'
                      ? 'bg-rose-500/20 text-rose-100 border-rose-400'
                      : 'bg-emerald-500/20 text-emerald-100 border-emerald-400'
                  }`}>
                    <div className="space-y-1">
                      <p className="text-sm font-bold">{foreignTomboFeedback.message}</p>
                      {foreignTomboFeedback.type === 'found_other' && foreignTomboFeedback.asset && (
                        <p className="text-[11px] text-amber-200">
                          Ação no ASPEC: <strong>Transferência Interna de Carga</strong> de Área: "{getAssetFullLocation(foreignTomboFeedback.asset).area}" · Subárea: "{getAssetFullLocation(foreignTomboFeedback.asset).subarea}" para esta sala ("{activeSector?.nome}").
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {foreignTomboFeedback.type === 'found_other' && foreignTomboFeedback.asset && (
                        <button
                          type="button"
                          onClick={() => handleConfirmForeignAssetInCurrentRoom(foreignTomboFeedback.asset!)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-md"
                        >
                          ✓ Registrar Presença Nesta Sala
                        </button>
                      )}

                      {foreignTomboFeedback.type === 'not_in_aspec' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRoomNewTombo(foreignTomboInput.trim());
                            setRoomNewTomboSesa('');
                            setRoomNewDescricao('');
                            setRoomNewForaDoAspec(true);
                            setMatchedExistingAsset(null);
                            setShowAddRoomAssetModal(true);
                            setForeignTomboFeedback(null);
                          }}
                          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-md"
                        >
                          + Cadastrar Fora do ASPEC Agora
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setForeignTomboFeedback(null)}
                        className="text-slate-400 hover:text-white text-xs px-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* FILTROS DE STATUS, BUSCA E ALTERNADOR DE MODO DE VISUALIZAÇÃO */}
              {/* ========================================================================= */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
                {/* Big Status Filter Buttons */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => setRoomStatusFilter('pendentes')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 ${
                      roomStatusFilter === 'pendentes' 
                        ? 'bg-amber-500 text-slate-950 shadow-sm' 
                        : 'text-slate-600 dark:text-slate-300 hover:text-amber-600'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pendentes para Aferir ({activeSector?.pendingCount || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomStatusFilter('todos')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      roomStatusFilter === 'todos' 
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>Todos os Bens ({activeSector?.assetsCount || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomStatusFilter('conferidos')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      roomStatusFilter === 'conferidos' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Conferidos ({activeSector?.checkedCount || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomStatusFilter('divergentes')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      roomStatusFilter === 'divergentes' 
                        ? 'bg-rose-600 text-white shadow-sm' 
                        : 'text-slate-600 dark:text-slate-300 hover:text-rose-600'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Divergentes ({activeSectorAssets.filter(a => a.auditoria?.statusDivergencia === 'setor_divergente' || a.auditoria?.statusDivergencia === 'nao_encontrado').length})</span>
                  </button>
                </div>

                {/* Right: Layout Toggle + Search Bar */}
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  {/* View Mode Toggle: Ergonomic / Large vs Compact */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setInspectionLayout('ergonomic')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                        inspectionLayout === 'ergonomic'
                          ? 'bg-emerald-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                      title="Modo Vistoria Ampla com botões e plaquetas gigantes (ideal para conferência física em campo ou tablet)"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Modo Ergonômico (Grande)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectionLayout('compact')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                        inspectionLayout === 'compact'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                      title="Modo Tabela Compacta para telas desktop"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Modo Compacto</span>
                    </button>
                  </div>

                  {/* Search within this Room */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={roomAssetSearchQuery}
                      onChange={(e) => setRoomAssetSearchQuery(e.target.value)}
                      placeholder="Filtrar por plaqueta, nome..."
                      className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* ASSETS LIST IN THIS ROOM: ERGONOMIC VIEW (LARGE TOUCH TARGETS) OR COMPACT */}
              {/* ========================================================================= */}
              <div className="space-y-4 pt-1">
                {activeSectorAssets.map((asset) => {
                  const isChecked = asset.auditoria?.conferido;
                  const isDivergent = asset.auditoria?.statusDivergencia === 'setor_divergente' || asset.auditoria?.statusDivergencia === 'nao_encontrado';

                  if (inspectionLayout === 'ergonomic') {
                    // MODO ERGONÔMICO: TAMANHO CONFORTÁVEL, PLAQUETA GIGANTE, BOTÕES GRANDES
                    return (
                      <div
                        key={asset.id}
                        className={`p-5 sm:p-6 rounded-3xl border-2 transition-all shadow-xs ${
                          isChecked && !isDivergent
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-500/20'
                            : isDivergent
                            ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-400 dark:border-amber-700'
                            : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                          {/* Asset Details */}
                          <div className="space-y-2.5 flex-1">
                            {/* Plaqueta & Tags Header */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                              {/* Plaqueta Principal Monumental */}
                              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 text-emerald-400 font-mono font-black text-lg sm:text-2xl shadow-sm border border-slate-700 tracking-tight">
                                <span>{asset.tombamento}</span>
                                <span className="text-[10px] text-slate-400 font-sans font-normal">(4d)</span>
                              </div>

                              {/* Tombo SESA (6 dígitos) se houver */}
                              {asset.tomboOrigemSesa && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-mono font-bold text-sm sm:text-base border border-blue-300 dark:border-blue-700">
                                  <span className="text-[10px] uppercase font-sans font-black">SESA:</span>
                                  <span>{asset.tomboOrigemSesa}</span>
                                  <span className="text-[10px] font-sans font-normal">(6d)</span>
                                </div>
                              )}

                              {/* Origin Badge (CPSMS, SESA, UFC) */}
                              <span className={`text-xs font-black px-2.5 py-1 rounded-xl uppercase tracking-wider ${
                                asset.origemTombo.includes('SESA')
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                                  : asset.origemTombo.includes('UFC')
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                              }`}>
                                {asset.origemTombo.split(' ')[0]}
                              </span>

                              {asset.duploTombamento && (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                                  🏷️ Plaqueta Dupla
                                </span>
                              )}

                              {asset.foraDoAspec && (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                  ⚠️ Fora do ASPEC
                                </span>
                              )}

                              {asset.formaAquisicao && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                  {asset.formaAquisicao}
                                </span>
                              )}
                            </div>

                            {/* Description in clear, readable size */}
                            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                              {asset.descricao}
                            </h4>

                            {/* Specifications Row */}
                            <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-4 flex-wrap pt-0.5">
                              {asset.fornecedor && asset.fornecedor !== '-' && (
                                <span>Fornecedor: <strong className="text-slate-900 dark:text-white">{asset.fornecedor}</strong></span>
                              )}
                              {asset.numeroSerie && asset.numeroSerie !== '-' && (
                                <span>S/N: <strong className="font-mono text-slate-900 dark:text-white font-bold">{asset.numeroSerie}</strong></span>
                              )}
                              <span>Valor Contábil: <strong className="font-mono text-slate-900 dark:text-white">{formatBRL(asset.valorAquisicao || asset.valorBrutoContabil || 0)}</strong></span>
                              {editingAssetResponsibleId === asset.id ? (
                                <div className="flex items-center gap-1.5 flex-wrap p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-300 dark:border-emerald-700 w-full sm:w-auto mt-1">
                                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Responsável:</span>
                                  <input
                                    type="text"
                                    value={inlineResponsibleInput}
                                    onChange={(e) => setInlineResponsibleInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveInlineResponsible(asset);
                                      if (e.key === 'Escape') setEditingAssetResponsibleId(null);
                                    }}
                                    placeholder="Nome do servidor..."
                                    className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-bold text-slate-900 dark:text-white"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInlineResponsible(asset)}
                                    className="px-2.5 py-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingAssetResponsibleId(null)}
                                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                  {activeSector?.responsavel && (
                                    <button
                                      type="button"
                                      onClick={() => setInlineResponsibleInput(activeSector.responsavel || '')}
                                      className="px-1.5 py-0.5 text-[10px] rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 cursor-pointer"
                                    >
                                      Líder
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setInlineResponsibleInput('Diretor Geral')}
                                    className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 text-blue-900 dark:text-blue-200 cursor-pointer"
                                  >
                                    Diretor
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setInlineResponsibleInput(currentProfile.nome)}
                                    className="px-1.5 py-0.5 text-[10px] rounded bg-purple-100 dark:bg-purple-900/60 hover:bg-purple-200 text-purple-900 dark:text-purple-200 cursor-pointer"
                                  >
                                    Eu
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>Responsável:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAssetResponsibleId(asset.id);
                                      setInlineResponsibleInput(asset.responsavelNome || activeSector?.responsavel || '');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer group"
                                    title="Clique para cadastrar ou alterar o responsável por este bem"
                                  >
                                    <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>{asset.responsavelNome || 'Não atribuído'}</span>
                                    <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 ml-0.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Audit Status Note */}
                            {isChecked && !isDivergent && (
                              <div className="text-xs text-emerald-800 dark:text-emerald-300 font-bold pt-1 flex items-center gap-2">
                                <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>
                                  Conferido e presente na sala · Aferido por {asset.auditoria?.responsavelConferencia || currentProfile.nome}
                                </span>
                              </div>
                            )}

                            {isDivergent && (
                              <div className="text-xs text-amber-800 dark:text-amber-300 font-bold pt-1 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>{asset.auditoria?.observacaoAuditoria || 'Divergência registrada na vistoria'}</span>
                              </div>
                            )}

                            {asset.auditoria?.statusDivergencia === 'setor_divergente' && (
                              <div className="mt-2.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-xs text-amber-950 dark:text-amber-200 space-y-2">
                                <div className="flex items-center gap-2 font-bold text-xs text-amber-900 dark:text-amber-300 flex-wrap">
                                  <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wide ${
                                    asset.statusRegularizacaoAspec === 'oficializado'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-200 text-amber-950 border border-amber-400'
                                  }`}>
                                    {asset.statusRegularizacaoAspec === 'oficializado' ? '✓ Oficializado no ASPEC' : '📍 Localização Provisória no Caderno'}
                                  </span>
                                  <span>{asset.statusRegularizacaoAspec === 'oficializado' ? 'Dados Unificados Oficialmente' : 'Aguardando Baixa Definitiva no ASPEC'}</span>
                                </div>
                                <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                                  • Registro Original no ASPEC: <strong>{asset.setorOriginalAspec || asset.setorNome}</strong> ({asset.unidadeOriginalAspec || asset.unidadeNome})<br />
                                  • Localização Física Conferida: <strong className="text-emerald-800 dark:text-emerald-300 font-bold">{asset.auditoria?.setorEncontrado || activeSector?.nome}</strong>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                  {asset.statusRegularizacaoAspec === 'oficializado'
                                    ? '✓ Baixa contábil confirmada pela Gestora. Registros físicos e contábeis unificados com sucesso nesta sala.'
                                    : '* O registro definitivo nesta sala só deve ser oficializado após a Gestora confirmar a baixa/mudança definitiva no sistema ASPEC (unificando os dados após o "OK" oficial).'}
                                </p>
                                {asset.statusRegularizacaoAspec !== 'oficializado' && (
                                  <div className="pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setAssetToOfficialize(asset)}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-colors"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Confirmar Baixa Definitiva no ASPEC (OK Oficial da Gestora)</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ACTION BUTTONS FOR THIS ASSET (LARGE ERGONOMIC HIT TARGETS) */}
                          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                            {!isChecked ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleQuickConfirm(asset)}
                                  className="px-6 py-4 text-sm sm:text-base font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl transition-all cursor-pointer shadow-lg ring-2 ring-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5"
                                  title="Confirmar que o bem está presente e conforme nesta sala física"
                                >
                                  <Check className="w-5 h-5 stroke-[3]" />
                                  <span>✓ ESTÁ PRESENTE NA SALA</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleMarkMissing(asset)}
                                  className="px-4 py-3 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                                  title="Marcar bem como não localizado nesta sala física"
                                >
                                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span>Não Encontrado na Sala</span>
                                </button>
                              </>
                            ) : (
                              <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-2">
                                <div className="px-5 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md">
                                  <CheckCheck className="w-4 h-4 stroke-[3]" />
                                  <span>✓ CONFERIDO E PRESENTE</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleUndoAudit(asset)}
                                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer p-1 text-center"
                                >
                                  Desfazer Conferência
                                </button>
                              </div>
                            )}

                            {onDeleteAsset && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAssetToDelete(asset);
                                  setDeleteAssetReason('Duplicidade no cadastro da sala');
                                }}
                                className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center justify-center gap-1 p-1 mt-1 cursor-pointer transition-colors"
                                title="Mover este bem para a Lixeira (remover bem ou duplicidade)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir Bem</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // MODO COMPACTO: VISUAL DENSO / TABELA
                    return (
                      <div
                        key={asset.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isChecked && !isDivergent
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                            : isDivergent
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                            : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                                {asset.tombamento}
                              </span>
                              {asset.tomboOrigemSesa && (
                                <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 rounded border border-blue-300">
                                  SESA: {asset.tomboOrigemSesa}
                                </span>
                              )}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {asset.origemTombo.split(' ')[0]}
                              </span>
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {asset.descricao}
                            </h4>
                            <div className="text-[11px] text-slate-500 flex items-center gap-3">
                              <span>Valor: {formatBRL(asset.valorAquisicao || 0)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAssetResponsibleId(asset.id);
                                  setInlineResponsibleInput(asset.responsavelNome || activeSector?.responsavel || '');
                                }}
                                className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                                title="Clique para alterar o responsável pelo bem"
                              >
                                <span>Resp: <strong>{asset.responsavelNome || 'Definir'}</strong></span>
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!isChecked ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleQuickConfirm(asset)}
                                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Confirmar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMarkMissing(asset)}
                                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-lg cursor-pointer"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Não Visto</span>
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                                  ✓ Presente
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUndoAudit(asset)}
                                  className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer"
                                >
                                  Desfazer
                                </button>
                              </div>
                            )}

                            {onDeleteAsset && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAssetToDelete(asset);
                                  setDeleteAssetReason('Duplicidade no cadastro da sala');
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                                title="Mover para a Lixeira"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}

                {activeSectorAssets.length === 0 && (
                  <div className="p-10 text-center bg-slate-50 dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-3">
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      Nenhum bem alocado ainda nesta sala ({activeSector?.nome}).
                    </p>
                    <p className="text-xs max-w-md mx-auto">
                      Você pode bipear a plaqueta no campo de busca acima ou clicar no botão abaixo para registrar os bens encontrados neste ambiente (seja tombo vindo de outra sala ou novo tombo).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRoomNewTombo('');
                        setRoomNewTomboSesa('');
                        setRoomNewDescricao('');
                        setRoomNewSemPlaqueta(false);
                        setShowAddRoomAssetModal(true);
                      }}
                      className="mt-2 px-5 py-2.5 text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-slate-950" />
                      <span>+ Adicionar Tombo Nesta Sala</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* FINAL DA AUDITORIA DA SALA: CADASTRO DE RESPONSÁVEIS PELOS BENS */}
              {/* ========================================================================= */}
              <div className="mt-8 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-850 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 text-xs font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-700">
                        Etapa Final da Sala · Guarda Patrimonial
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Auditoria Sala a Sala
                      </span>
                    </div>

                    <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mt-1">
                      <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>Definição de Responsáveis por Bem — {activeSector?.nome}</span>
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                      Depois de conferir os equipamentos e adicionar tombos, cadastre quem responde pela guarda individual de cada bem:
                      computadores e mesas para os servidores usuários, armários para o líder setorial, e áreas como Jardim ou corredores sob a responsabilidade do Diretor Geral.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowRoomResponsiblesModal(true)}
                      className="px-5 py-3 text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 ring-2 ring-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
                      title="Abrir painel de cadastro de responsáveis individuais para cada equipamento desta sala"
                    >
                      <UserCheck className="w-4 h-4 stroke-[2.5]" />
                      <span>Cadastrar Responsáveis dos Bens ({activeSectorAssets.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRoomAspecModal(true)}
                      className="px-4 py-3 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Emitir relatório oficial para atualizar o ASPEC"
                    >
                      <FileText className="w-4 h-4 text-white" />
                      <span>Emitir Termo ASPEC</span>
                    </button>
                  </div>
                </div>

                {/* Resumo Rápido dos Responsáveis Atribuídos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Total de Bens na Sala:</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white font-mono">{activeSectorAssets.length}</span>
                    </div>
                    <Tag className="w-5 h-5 text-slate-400" />
                  </div>

                  <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block">Com Responsável Definido:</span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                        {activeSectorAssets.filter(a => a.responsavelNome && a.responsavelNome !== 'Não atribuído' && a.responsavelNome !== 'Responsável Setorial').length}
                      </span>
                    </div>
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                  </div>

                  <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-amber-800 dark:text-amber-300 block">Líder Setorial da Sala:</span>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate max-w-[150px] block">
                        {activeSector?.responsavel || 'Não cadastrado'}
                      </span>
                    </div>
                    <Building2 className="w-5 h-5 text-amber-600" />
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* PAINEL DE CONCLUSÃO DA SALA & BAIXA AUTOMÁTICA DO PDF (FÍSICO VS ASPEC) */}
                {/* ========================================================================= */}
                <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white border-2 border-emerald-500/40 shadow-xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] uppercase font-bold border border-emerald-500/40">
                          Finalização Oficial da Sala
                        </span>
                        {activeSector?.revisada ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] uppercase font-bold border border-blue-500/40">
                            ✓ Sala Concluída no Mapa Geral
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase font-bold border border-amber-500/40">
                            Pendente de Conclusão Oficial
                          </span>
                        )}
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <FileCheck2 className="w-5 h-5 text-emerald-400" />
                        <span>Concluir Sala & Baixar Relatório PDF Oficial (Físico vs ASPEC)</span>
                      </h4>
                      <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                        Ao clicar em Concluir, o sistema consolida as conferências, atualiza o mapa visual das unidades e 
                        <strong> baixa imediatamente o arquivo PDF oficial</strong> com o confronto contábil: se estiver tudo OK emite o Termo Regular de Dispensa de Alteração, ou aponta as divergências (entradas, saídas e transferências) para a Contabilidade atualizar o ASPEC.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                      {!activeSector?.revisada ? (
                        <button
                          type="button"
                          onClick={() => handleMarkRoomOk(activeSector)}
                          className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl transition-all cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98] ring-2 ring-emerald-400/40"
                          title="Marcar sala como conferida (OK) e salvar no inventário para não fazer retrabalho"
                        >
                          <CheckCheck className="w-5 h-5 stroke-[2.5]" />
                          <span>Marcar Sala como OK</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/50 text-emerald-300 font-black text-xs">
                          <CheckCheck className="w-4 h-4 stroke-[3] text-emerald-400" />
                          <span>✅ Sala Conferida (OK)</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleConcludeRoomWithPdf}
                        className="flex items-center justify-center gap-2 px-5 py-3.5 text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 transition-all cursor-pointer shadow-md"
                        title="Baixar o arquivo PDF oficial com confronto Físico vs ASPEC"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>Baixar PDF Oficial</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRoomAspecModal(true)}
                        className="flex items-center justify-center gap-1.5 px-4 py-3.5 text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-2xl border border-slate-700 transition-colors cursor-pointer"
                        title="Visualizar o espelho do ASPEC na tela"
                      >
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span>Ver Relatório na Tela</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRoomResponsiblesModal(true)}
                        className="flex items-center justify-center gap-1.5 px-4 py-3.5 text-xs sm:text-sm font-bold bg-teal-800/60 hover:bg-teal-700/60 text-teal-200 rounded-2xl border border-teal-600/40 transition-colors cursor-pointer"
                        title="Ajustar os servidores responsáveis de cada equipamento"
                      >
                        <Users className="w-4 h-4 text-teal-300" />
                        <span>Responsáveis por Bem</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA: CONCILIAÇÃO & O QUE ALTERAR NO ASPEC */}
      {/* ========================================================================= */}
      {activeTab === 'conciliacao' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300">
                  Conciliação Físico vs ASPEC
                </span>
                <span className="text-xs text-slate-400">Diretriz para o Setor Contábil</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                <span>O Que Alterar no ASPEC (Mapa de Ajustes Contábeis)</span>
              </h3>
              <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
                Relação direta dos remanejamentos de salas, bens não localizados e inclusões cadastrais sem alterar ou apagar dados da base original.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAspecReconciliationModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-slate-950" />
                <span>Abrir Espelho Completo & Imprimir (A4)</span>
              </button>
            </div>
          </div>

          {/* 3 Action Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                  1. Remanejar Carga no ASPEC
                </span>
                <span className="font-mono font-black text-sm text-amber-800 dark:text-amber-300">{remanejamentosCount}</span>
              </div>
              <p className="text-[11px] text-amber-950 dark:text-amber-200 leading-snug">
                Bens que existem no ASPEC, mas foram encontrados fisicamente em outra sala. <strong>Ação:</strong> Transferência interna de sala no ASPEC.
              </p>
            </div>

            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-rose-600" />
                  2. Em Apuração (Faltam na Sala)
                </span>
                <span className="font-mono font-black text-sm text-rose-800 dark:text-rose-300">{faltandoNaSalaCount}</span>
              </div>
              <p className="text-[11px] text-rose-950 dark:text-rose-200 leading-snug">
                Bens previstos no ASPEC que não estavam na sala. <strong>Ação:</strong> Não dar baixa agora! Aguardar conferência das demais salas.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  3. Incluir no ASPEC (Achados)
                </span>
                <span className="font-mono font-black text-sm text-emerald-800 dark:text-emerald-300">{foraDoAspecCount}</span>
              </div>
              <p className="text-[11px] text-emerald-950 dark:text-emerald-200 leading-snug">
                Itens físicos encontrados sem cadastro no ASPEC. <strong>Ação:</strong> Inclusão / tombamento contábil na sala onde estão.
              </p>
            </div>
          </div>

          {/* Quick List Preview */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 font-bold text-xs flex items-center justify-between text-slate-800 dark:text-slate-200">
              <span>Relação Sintética de Alterações Mapeadas ({remanejamentosCount + faltandoNaSalaCount + foraDoAspecCount} itens)</span>
              <button
                type="button"
                onClick={() => setShowAspecReconciliationModal(true)}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
              >
                Ver tabela completa e detalhada →
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto text-xs">
              {assets.filter(a => 
                a.foraDoAspec || 
                a.auditoria?.statusDivergencia === 'nao_encontrado' || 
                (a.auditoria?.statusDivergencia === 'setor_divergente' && a.auditoria?.conferido)
              ).slice(0, 50).map(a => {
                const isRemanejar = !a.foraDoAspec && a.auditoria?.statusDivergencia === 'setor_divergente';
                const isFalta = !a.foraDoAspec && a.auditoria?.statusDivergencia === 'nao_encontrado';
                const isFora = a.foraDoAspec;

                return (
                  <div key={a.id} className="p-3 hover:bg-slate-50/80 dark:hover:bg-slate-850/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                          {a.tombamento}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isRemanejar
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : isFalta
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {isRemanejar ? '🔄 Remanejar Carga' : isFalta ? '❓ Falta na Sala' : '➕ Incluir no ASPEC'}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-white truncate max-w-xs">{a.descricao}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isRemanejar && (
                          <span>No ASPEC: <strong className="text-rose-700">{a.setorNome}</strong> ➔ Visto fisicamente em: <strong className="text-emerald-700">{a.auditoria?.setorEncontrado}</strong></span>
                        )}
                        {isFalta && (
                          <span>Cadastrado no ASPEC em: <strong>{a.setorNome}</strong> ({a.unidadeNome})</span>
                        )}
                        {isFora && (
                          <span>Achado físico na sala: <strong>{a.setorNome}</strong> ({a.unidadeNome})</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                      {formatBRL(a.valorAquisicao || a.valorBrutoContabil || 0)}
                    </div>
                  </div>
                );
              })}

              {remanejamentosCount + faltandoNaSalaCount + foraDoAspecCount === 0 && (
                <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    Nenhuma divergência ou alteração mapeada ainda.
                  </p>
                  <p className="text-[11px]">
                    Ao conferir as salas, use o botão "Ausente" para bens que faltam e a ferramenta "Encontrou um bem que não estava na folha?" para registrar bens de outras salas.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: DIVERGÊNCIAS IDENTIFICADAS */}
      {/* ========================================================================= */}
      {activeTab === 'divergencias' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Bens com Divergência ou Extravio ({divergentAssets.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Itens marcados como não encontrados na sala de cadastro ou com divergência de localização.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {divergentAssets.map(asset => (
              <div key={asset.id} className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300">
                      {asset.tombamento}
                    </span>
                    <span className="font-bold text-amber-800 dark:text-amber-300">
                      {asset.auditoria?.statusDivergencia === 'nao_encontrado' ? 'Item Não Encontrado na Sala' : 'Setor Divergente'}
                    </span>
                  </div>
                  <div className="font-medium text-slate-900 dark:text-white">{asset.descricao}</div>
                  <div className="text-slate-500">
                    Local de Cadastro: {asset.unidadeNome} - {asset.setorNome} · Responsável: {asset.responsavelNome}
                  </div>
                  <div className="text-amber-800 dark:text-amber-300 pt-1 font-semibold">
                    Observação: {asset.auditoria?.observacaoAuditoria}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleUndoAudit(asset)}
                  className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer shrink-0"
                >
                  Regularizar / Desfazer
                </button>
              </div>
            ))}

            {divergentAssets.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhuma divergência registrada até o momento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: INVENTÁRIO ANALÍTICO COMPLETO */}
      {/* ========================================================================= */}
      {activeTab === 'relatorio' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Relação Analítica de Todos os Bens ({assets.length})
              </h3>
              <p className="text-xs text-slate-500">
                Listagem completa de conciliação física para entrega ao TCE-CE.
              </p>
            </div>
            <button
              onClick={() => exportAuditReportCsv(assets)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
            >
              Exportar CSV
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-850 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200">
                  <th className="p-2.5">Tombo</th>
                  <th className="p-2.5">Origem</th>
                  <th className="p-2.5">Descrição</th>
                  <th className="p-2.5">Unidade / Setor</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assets.slice(0, 100).map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="p-2.5 font-mono font-bold">{a.tombamento}</td>
                    <td className="p-2.5">{a.origemTombo.split(' ')[0]}</td>
                    <td className="p-2.5 font-medium max-w-xs truncate">{a.descricao}</td>
                    <td className="p-2.5 text-slate-500">{a.unidadeNome} - {a.setorNome}</td>
                    <td className="p-2.5">
                      {a.auditoria?.conferido ? (
                        <span className="text-emerald-600 font-bold">✅ Conferido</span>
                      ) : (
                        <span className="text-slate-400">⏳ Pendente</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold">{formatBRL(a.valorAquisicao || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: SCANNER / CÂMERA (OPCIONAL) */}
      {/* ========================================================================= */}
      {activeTab === 'scanner' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-purple-500" />
              <span>Leitor de Câmera / QR Code (Opcional)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Use esta opção apenas se a plaqueta do equipamento tiver QR Code ou código de barras legível por câmera.
            </p>
          </div>

          <div className="max-w-md mx-auto aspect-video bg-slate-950 rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-800">
            {cameraActive ? (
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            ) : (
              <div className="text-center p-6 space-y-2">
                <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  Clique no botão abaixo para ativar a câmera do dispositivo.
                </p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 text-center">
              {cameraError}
            </div>
          )}

          <div className="flex justify-center gap-2">
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Ativar Câmera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Desativar Câmera
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Modal: Add Asset Found in this Specific Room */}
      {showAddRoomAssetModal && activeSector && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-950 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  +
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Adicionar / Conferir Tombo nesta Sala
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Alocado em: <strong>{activeUnitInfo.sigla}</strong> ➔ <strong>{activeSector.nome}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRoomAssetModal(false)}
                className="w-7 h-7 rounded text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoomUntrackedAsset} className="space-y-3 text-xs">
              {/* Checkbox: Bem sem plaqueta */}
              <div className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950 dark:text-amber-200">
                  <input
                    type="checkbox"
                    checked={roomNewSemPlaqueta}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRoomNewSemPlaqueta(checked);
                      if (checked) {
                        setRoomNewTombo(`SEM-TOMBO-${activeUnitInfo.sigla.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
                      } else {
                        setRoomNewTombo('');
                      }
                    }}
                    className="w-4 h-4 text-amber-600 rounded border-amber-400 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>⚠️ Bem Físico Sem Plaqueta / Sem Tombo</span>
                </label>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                  (Para novo emplacamento)
                </span>
              </div>

              {/* Dual Tombo row */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="font-bold block mb-1">Tombo Consórcio (4 dígitos):</label>
                  <input
                    type="text"
                    value={roomNewTombo}
                    onChange={(e) => {
                      setRoomNewTombo(e.target.value);
                      handleTomboLookup(e.target.value, roomNewTomboSesa);
                    }}
                    placeholder="Ex: 0184 ou CPSMS-..."
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Padrão 4 números CPSMS</span>
                </div>

                <div>
                  <label className="font-bold text-blue-700 dark:text-blue-300 block mb-1">Tombo SESA (6 dígitos):</label>
                  <input
                    type="text"
                    value={roomNewTomboSesa}
                    onChange={(e) => {
                      setRoomNewTomboSesa(e.target.value);
                      handleTomboLookup(roomNewTombo, e.target.value);
                    }}
                    placeholder="Ex: 102450"
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 font-mono font-bold text-blue-700 dark:text-blue-200"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Implantação estadual</span>
                </div>
              </div>

              {/* Card de Bem Encontrado no ASPEC com especificações puxadas automaticamente */}
              {matchedExistingAsset && (
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                  !doesAssetOfficiallyMatchRoom(matchedExistingAsset, activeSector.nome)
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {!doesAssetOfficiallyMatchRoom(matchedExistingAsset, activeSector.nome) ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Atenção: Este item pertence oficialmente a outro setor no ASPEC!</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Item encontrado no cadastro oficial desta mesma sala no ASPEC!</span>
                      </>
                    )}
                  </div>
                  <div className="text-[11.5px] leading-relaxed pt-0.5">
                    <strong>Item:</strong> {matchedExistingAsset.descricao} (Tombo: {matchedExistingAsset.tombamento})<br />
                    <strong>Localização Oficial no ASPEC:</strong> Área: <span className="font-bold underline decoration-amber-500">{getAssetFullLocation(matchedExistingAsset).area}</span> · Subárea / Sala: <span className="font-bold underline decoration-amber-500">{getAssetFullLocation(matchedExistingAsset).subarea}</span><br />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      ✓ Todas as especificações cadastrais foram carregadas automaticamente abaixo.
                    </span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="font-bold block mb-1">* Descrição do Bem Encontrado:</label>
                <input
                  type="text"
                  required
                  value={roomNewDescricao}
                  onChange={(e) => setRoomNewDescricao(e.target.value)}
                  placeholder="Ex: Ar Condicionado 12.000 BTUs, Negatoscópio, Mesa Mayo..."
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                />
              </div>

              {/* State & Serial */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Estado de Conservação:</label>
                  <select
                    value={roomNewEstado}
                    onChange={(e) => setRoomNewEstado(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="Excelente">Excelente</option>
                    <option value="Bom">Bom (Operacional)</option>
                    <option value="Regular">Regular</option>
                    <option value="Ocioso">Ocioso</option>
                    <option value="Inservível / Danificado">Inservível / Danificado</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Nº Série / Marca:</label>
                  <input
                    type="text"
                    value={roomNewSerial}
                    onChange={(e) => setRoomNewSerial(e.target.value)}
                    placeholder="Ex: SN-99824 Philco"
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Supplier & Value */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Fornecedor / Cedente:</label>
                  <input
                    type="text"
                    value={roomNewFornecedor}
                    onChange={(e) => setRoomNewFornecedor(e.target.value)}
                    placeholder="Ex: SESA, Doação, Pregão..."
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Valor Estimado (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={roomNewValor}
                    onChange={(e) => setRoomNewValor(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                {matchedExistingAsset ? (
                  !doesAssetOfficiallyMatchRoom(matchedExistingAsset, activeSector.nome) ? (
                    <span>📍 Bem cadastrado no ASPEC em <strong>{getAssetFullLocation(matchedExistingAsset).area} · Subárea / Sala: {getAssetFullLocation(matchedExistingAsset).subarea}</strong>. Ao salvar, será registrado como remanejamento provisório desta sala para <strong>{activeSector.nome}</strong>.</span>
                  ) : (
                    <span>✓ Bem cadastrado no ASPEC nesta mesma sala (Área: {getAssetFullLocation(matchedExistingAsset).area} · Subárea / Sala: {getAssetFullLocation(matchedExistingAsset).subarea}). Ao salvar, sua presença física será confirmada regularmente.</span>
                  )
                ) : (
                  <div className="space-y-1.5">
                    <span className="font-bold block text-slate-800 dark:text-slate-200">Classificação Contábil no ASPEC:</span>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="roomNewForaDoAspecRadio"
                          checked={!roomNewForaDoAspec}
                          onChange={() => setRoomNewForaDoAspec(false)}
                          className="text-amber-600 cursor-pointer"
                        />
                        <span>Cadastrado no ASPEC (com tombo oficial)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="roomNewForaDoAspecRadio"
                          checked={roomNewForaDoAspec}
                          onChange={() => setRoomNewForaDoAspec(true)}
                          className="text-amber-600 cursor-pointer"
                        />
                        <span>Achado Físico (Fora do ASPEC)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRoomAssetModal(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-sm cursor-pointer"
                >
                  Salvar e Confirmar Presença
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Confirmação de Divergência de Setor */}
      {pendingDivergenceConfirmation && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border-2 border-amber-400 dark:border-amber-600 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4">
            
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                  Aviso de Divergência de Setor · Localização Provisória
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white leading-snug">
                  Bem encontrado nesta sala, mas registrado no ASPEC na Subárea "{getAssetFullLocation(pendingDivergenceConfirmation.asset).subarea}" (Área: {getAssetFullLocation(pendingDivergenceConfirmation.asset).area})
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{pendingDivergenceConfirmation.asset.descricao}</span>
                <span className="font-mono bg-slate-200 dark:bg-slate-750 px-2 py-0.5 rounded text-[11px]">
                  Tombo: {pendingDivergenceConfirmation.asset.tombamento}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                  <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block">No ASPEC (Cadastro Oficial):</span>
                  <div className="text-[10px] text-amber-900 dark:text-amber-300">
                    Área: <strong>{getAssetFullLocation(pendingDivergenceConfirmation.asset).area}</strong>
                  </div>
                  <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                    Subárea / Sala: <strong>{getAssetFullLocation(pendingDivergenceConfirmation.asset).subarea}</strong>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">No Físico (Localização Atual):</span>
                  <div className="text-[10px] text-emerald-900 dark:text-emerald-300">
                    Área: <strong>{pendingDivergenceConfirmation.targetUnit}</strong>
                  </div>
                  <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                    Subárea / Sala: <strong>{pendingDivergenceConfirmation.targetRoom}</strong>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                ℹ️ Ao confirmar, constará uma <strong>observação de localização provisória no caderno de balanço</strong> e na folha da sala. O registro definitivo nesta sala (<strong>"{pendingDivergenceConfirmation.targetRoom}"</strong>) só será oficializado após a Gestora confirmar a baixa/mudança definitiva no sistema ASPEC, unificando os dados apenas após o "OK" oficial.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingDivergenceConfirmation(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDivergentLocation(pendingDivergenceConfirmation.asset, pendingDivergenceConfirmation.targetRoom, pendingDivergenceConfirmation.targetUnit)}
                className="px-5 py-2 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Registrar Presença Provisória Nesta Sala</span>
              </button>
            </div>

          </div>
        </div>
      )}
      <MacroMicroInventoryReportModal
        isOpen={showMacroMicroModal}
        onClose={() => setShowMacroMicroModal(false)}
        assets={assets}
        units={units}
        sectors={sectors}
        currentProfile={currentProfile}
        initialMacroUnitId={selectedUnitId}
        onAddAsset={onAddAsset}
        onUpdateAsset={(updated) => {
          if (onUpdateAsset) {
            onUpdateAsset(updated);
          } else {
            onUpdateAudit(updated.id, {
              conferido: updated.auditoria?.conferido ?? false,
              statusDivergencia: updated.auditoria?.statusDivergencia || (updated.auditoria?.conferido ? 'conforme' : 'conforme'),
              observacaoAuditoria: updated.auditoria?.observacaoAuditoria || 'Atualizado no caderno de balanço.',
              responsavelConferencia: currentProfile.nome
            });
          }
        }}
        onNavigateToAudit={(roomName, unitId) => {
          setShowMacroMicroModal(false);
          setActiveTab('salas');
          if (unitId && unitId !== 'all') setSelectedUnitId(unitId);
          if (roomName) {
            const sec = sectors.find(s => s.nome.trim().toLowerCase() === roomName.trim().toLowerCase());
            if (sec) setSelectedSectorId(sec.id);
          }
        }}
      />

      {/* Modal de Conciliação Físico vs ASPEC (O Que Alterar no ASPEC) */}
      {showAspecReconciliationModal && (
        <AspecReconciliationModal
          isOpen={showAspecReconciliationModal}
          onClose={() => setShowAspecReconciliationModal(false)}
          assets={assets}
          sectors={sectors}
          currentProfile={currentProfile}
        />
      )}

      {/* Guia Didático de Soluções para o Inventário (Tombos Faltantes e Fora do Setor) */}
      {showGuideModal && (
        <InventorySolutionsGuideModal
          isOpen={showGuideModal}
          onClose={() => setShowGuideModal(false)}
          onOpenAspecReconciliation={() => setShowAspecReconciliationModal(true)}
        />
      )}

      {/* Termo de Vistoria da Sala Concluída & Espelho ASPEC Exclusivo da Localização */}
      {showRoomAspecModal && activeSector && (
        <RoomAspecReportModal
          isOpen={showRoomAspecModal}
          onClose={() => setShowRoomAspecModal(false)}
          sector={activeSector}
          unit={activeUnitInfo}
          assets={assets}
          currentProfile={currentProfile}
        />
      )}

      {/* Termo Circunstanciado de Bens Não Localizados por Unidade (TCE-CE & Blindagem Processual) */}
      {showUnlocatedModal && (
        <UnlocatedAssetsReportModal
          isOpen={showUnlocatedModal}
          onClose={() => setShowUnlocatedModal(false)}
          assets={assets}
          units={units}
          sectors={sectors}
          currentProfile={currentProfile}
          initialUnitId={selectedUnitId}
        />
      )}

      {/* Modal de Homologação / OK Oficial da Gestora no ASPEC */}
      <AspecOfficializationModal
        isOpen={!!assetToOfficialize}
        onClose={() => setAssetToOfficialize(null)}
        asset={assetToOfficialize}
        currentProfile={currentProfile}
        onConfirm={handleConfirmOfficialization}
      />

      {/* Modal Comparativo Lado a Lado: Sala de acordo com o ASPEC vs Sala atualizada fisicamente */}
      {showRoomComparisonModal && (activeComparingSector || activeSector) && (
        <RoomComparisonModal
          isOpen={showRoomComparisonModal}
          onClose={() => {
            setShowRoomComparisonModal(false);
            setActiveComparingSector(null);
          }}
          sector={activeComparingSector || activeSector}
          unit={activeUnitInfo}
          assets={assets}
          currentProfile={currentProfile}
          onConsolidateOfficial={handleConsolidateOfficial}
          onSaveDraftOnly={handleSaveDraftOnly}
          onDiscardDraft={handleDiscardDraft}
          hasDraftActive={Boolean(roomDrafts[(activeComparingSector || activeSector)?.nome || ''])}
        />
      )}

      {/* Modal de Atribuição de Responsáveis por Bem na Sala */}
      {showRoomResponsiblesModal && activeSector && (
        <RoomResponsiblesModal
          isOpen={showRoomResponsiblesModal}
          onClose={() => setShowRoomResponsiblesModal(false)}
          sector={activeSector}
          unit={activeUnitInfo}
          assets={activeSectorAssets}
          currentProfile={currentProfile}
          onSaveResponsibles={handleSaveRoomResponsibles}
          onUpdateSectorLeader={handleUpdateSectorLeader}
        />
      )}

      {/* Modal Rápido: Alterar Líder da Sala */}
      {showEditSectorLeaderModal && activeSector && (
        <div className="fixed inset-0 z-90 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Alterar Líder da Sala
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeSector.nome} · {activeUnitInfo.sigla}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditSectorLeaderModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                <span>⚠️ Notificação no Termo de Conclusão:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Ao alterar o líder nesta sala, no documento/termo gerado ao <strong>Concluir a Sala</strong> constará expressamente em destaque que <strong>NO ASPEC TEM QUE ALTERAR O LÍDER</strong> de "<u>{activeSector.responsavelOriginalAspec || activeSector.responsavel}</u>" para o novo líder indicado.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Líder Atual Cadastrado no ASPEC:
                </label>
                <input
                  type="text"
                  disabled
                  value={activeSector.responsavelOriginalAspec || activeSector.responsavel || 'Não cadastrado'}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Novo Líder da Sala (Vistoria Física in loco): *
                </label>
                <input
                  type="text"
                  value={newSectorLeaderInput}
                  onChange={(e) => setNewSectorLeaderInput(e.target.value)}
                  placeholder="Nome completo do novo responsável ou líder"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-amber-400 dark:border-amber-500 text-slate-900 dark:text-white font-bold ring-2 ring-amber-400/20"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Cargo / Função do Novo Líder:
                </label>
                <input
                  type="text"
                  value={newSectorCargoInput}
                  onChange={(e) => setNewSectorCargoInput(e.target.value)}
                  placeholder="Ex: Coordenador Clínico, Chefe de Setor, Diretor Geral..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditSectorLeaderModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleUpdateSectorLeader(newSectorLeaderInput, newSectorCargoInput)}
                disabled={!newSectorLeaderInput.trim()}
                className="px-5 py-2.5 text-xs font-black bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Salvar e Notificar no Termo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Nova Localização Física */}
      {isNewLocationModalOpen && onAddNewLocation && (
        <NewLocationModal
          isOpen={isNewLocationModalOpen}
          onClose={() => setIsNewLocationModalOpen(false)}
          units={units}
          onSaveLocation={(newSec) => {
            onAddNewLocation(newSec);
            setSelectedSectorId(newSec.id);
            setBulkFeedback(`Nova localização física "${newSec.nome}" (${newSec.sigla}) adicionada com sucesso! Você já está dentro da sala para adicionar os tombos.`);
            setTimeout(() => setBulkFeedback(null), 7000);
          }}
          currentProfile={currentProfile}
          defaultUnitId={selectedUnitId}
        />
      )}

      {/* Modal de Confirmação: Começar do Zero (Reset de Conferências) */}
      {showResetAllConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reiniciar Todas as Conferências
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Começar do zero como se nada tivesse sido visto ainda.
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 space-y-2">
              <p className="font-semibold">
                ⚠️ Todas as salas e bens voltarão ao status <strong>⏳ Pendente</strong>.
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                As marcações de salas conferidas e bens auditados serão resetadas para você fazer o levantamento real presencialmente do zero. Os bens cadastrados não serão apagados.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetAllConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetAllConfirmModal(false);
                  onResetAllAudits?.();
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Sim, Começar do Zero</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Sala (Mover para Lixeira com Quarentena 7d) */}
      {showDeleteRoomModal && activeSector && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black">Mover Sala para a Lixeira</h4>
                <p className="text-xs text-slate-500">Quarentena segura de 7 dias</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  {activeUnitInfo.nome}
                </span>
                <h5 className="font-black text-sm text-slate-900 dark:text-white">{activeSector.nome}</h5>
                <p className="text-slate-400">Total de bens nesta sala: {activeSector.assetsCount || 0}</p>
              </div>

              <p className="leading-relaxed">
                A sala será movida para a <strong>Lixeira</strong>. Os bens cadastrados continuarão no patrimônio geral da unidade. Você poderá <strong>restaurar a sala</strong> a qualquer momento na aba Lixeira em até 7 dias antes do expurgo definitivo.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo da exclusão da sala:
                </label>
                <select
                  value={deleteRoomReason}
                  onChange={(e) => setDeleteRoomReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Sala duplicada ou criada por engano">Sala duplicada ou criada por engano</option>
                  <option value="Ambiente desativado na unidade">Ambiente desativado na unidade</option>
                  <option value="Nome incorreto / reconfiguração de setores">Nome incorreto / reconfiguração de setores</option>
                  <option value="Outro motivo">Outro motivo</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteRoomModal(false)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSector && activeSector) {
                    onDeleteSector(activeSector.id || activeSector.nome, deleteRoomReason);
                    setSelectedSectorId(null);
                    setShowDeleteRoomModal(false);
                    setBulkFeedback(`A sala "${activeSector.nome}" foi enviada para a Lixeira com retenção de 7 dias.`);
                    setTimeout(() => setBulkFeedback(null), 6000);
                  }
                }}
                className="px-4 py-2.5 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Mover Sala para Lixeira</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Bem da Sala */}
      {assetToDelete && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black">Mover Bem para a Lixeira</h4>
                <p className="text-xs text-slate-500">Quarentena segura de 7 dias</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{assetToDelete.tombamento}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">{assetToDelete.unidadeNome}</span>
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{assetToDelete.descricao}</p>
                <p className="text-slate-400">Sala: {assetToDelete.setorNome}</p>
              </div>

              {/* Alerta de Desduplicidade e Proteção de Exemplar Único */}
              {assetCopiesInSystem <= 1 ? (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Atenção: Este é o ÚNICO exemplar deste bem no sistema!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
                    Não existem duplicatas cadastradas no acervo. Se você apagá-lo desta sala achando que é uma duplicata, ele sumirá de <strong>todas as salas</strong> e de todo o inventário geral do consórcio.
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                    💡 Dica: Se o bem pertence a outra sala ou se a sala apareceu duplicada, não exclua! Use a <strong>"Regra da Desduplicidade"</strong> no topo da página para unificar as salas ou altere a sala do bem.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Confirmado: {assetCopiesInSystem} registros deste tombo na base.</span>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">Esta exclusão removerá com segurança apenas esta cópia excedente.</p>
                  </div>
                </div>
              )}

              <p className="leading-relaxed">
                Ao confirmar, o bem será removido e movido para a <strong>Lixeira</strong> (retenção de 7 dias antes do expurgo definitivo). Você poderá restaurá-lo a qualquer momento.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo da exclusão:
                </label>
                <select
                  value={deleteAssetReason}
                  onChange={(e) => setDeleteAssetReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Duplicidade no cadastro da sala">Duplicidade no cadastro da sala</option>
                  <option value="Tombo cadastrado incorretamente">Tombo cadastrado incorretamente</option>
                  <option value="Bem inexistente fisicamente">Bem inexistente fisicamente</option>
                  <option value="Outro motivo">Outro motivo</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAsset && assetToDelete) {
                    onDeleteAsset(assetToDelete.id, deleteAssetReason);
                    setAssetToDelete(null);
                    setBulkFeedback(`O bem tombo ${assetToDelete.tombamento} foi movido para a Lixeira.`);
                    setTimeout(() => setBulkFeedback(null), 5000);
                  }
                }}
                className="px-4 py-2.5 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Mover para Lixeira</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Regra da Desduplicidade Inteligente */}
      {showDeduplicationModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-base font-black">Regra da Desduplicidade</h4>
                  <p className="text-xs text-slate-500">Saneamento automático de salas e bens</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeduplicationModal(false);
                  setDedupResult(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed">
                A <strong>Regra da Desduplicidade</strong> resolve o problema em que um mesmo espaço ou bem aparece replicado no sistema:
              </p>

              <div className="space-y-2">
                {/* 1. Salas equivalentes */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      1. Unificação de Salas Equivalentes
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">
                      {duplicateSectorsCount} duplicadas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Funde salas cadastradas com nomes semelhantes (ex: <code>004 - COPA</code> e <code>COPA</code>). Mantém o código oficial do ASPEC, junta os bens na sala certa e preserva o status de vistoria.
                  </p>
                </div>

                {/* 2. Bens duplicados */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-500" />
                      2. Desduplicação de Bens Repetidos
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">
                      {duplicateAssetsCount} cópias
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Identifica bens com mesmo tombo importados mais de uma vez. Preserva o bem que já foi conferido na vistoria e descarta as duplicatas redundantes.
                  </p>
                </div>

                {/* 3. Restauração de falsas duplicidades da lixeira */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-amber-500" />
                      3. Restauração de Bens Apagados por Engano
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold">
                      {falseDuplicatesCount} para resgatar
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Se você apagou algum bem de uma sala achando que era cópia, mas ele sumiu de todas as salas, a regra detecta que era o único exemplar e o restaura automaticamente da Lixeira!
                  </p>
                </div>
              </div>

              {dedupResult && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Regra da Desduplicidade executada com sucesso!</span>
                  </div>
                  <ul className="text-xs space-y-1 list-disc list-inside text-emerald-900 dark:text-emerald-200">
                    <li><strong>{dedupResult.sectorsMerged}</strong> sala(s) duplicada(s) foram unificadas.</li>
                    <li><strong>{dedupResult.assetsRemoved}</strong> bem(ns) repetido(s) foram desduplicados.</li>
                    <li><strong>{dedupResult.assetsRestored}</strong> bem(ns) apagado(s) por engano foram restaurados da lixeira.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeduplicationModal(false);
                  setDedupResult(null);
                }}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {dedupResult ? 'Fechar' : 'Cancelar'}
              </button>
              {onExecuteDeduplicationRule && (
                <button
                  type="button"
                  disabled={isDeduplicating}
                  onClick={async () => {
                    setIsDeduplicating(true);
                    try {
                      const res = await onExecuteDeduplicationRule();
                      if (res && typeof res === 'object') {
                        setDedupResult(res);
                      } else {
                        setDedupResult({ assetsRemoved: 0, sectorsMerged: 0, assetsRestored: 0 });
                      }
                      setBulkFeedback('Regra da Desduplicidade aplicada com sucesso em todo o sistema!');
                      setTimeout(() => setBulkFeedback(null), 6000);
                    } catch (e) {
                      console.error('Erro ao executar desduplicação:', e);
                    } finally {
                      setIsDeduplicating(false);
                    }
                  }}
                  className="px-4 py-2.5 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>{isDeduplicating ? 'Executando saneamento...' : 'Executar Desduplicação Automática'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
