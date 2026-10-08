import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Asset, Sector, UnitInfo, UserProfile, AssetCondition } from '../types';
import { formatBRL, formatDate, formatDateTime, exportAuditReportCsv } from '../utils/formatters';
import { executePrintHtml, downloadPrintableHtml, openPrintableInNewWindow } from '../utils/printHelper';
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
  ShieldAlert
} from 'lucide-react';
import { MacroMicroInventoryReportModal } from './MacroMicroInventoryReportModal';
import { AspecReconciliationModal } from './AspecReconciliationModal';
import { InventorySolutionsGuideModal } from './InventorySolutionsGuideModal';
import { RoomAspecReportModal } from './RoomAspecReportModal';
import { UnlocatedAssetsReportModal } from './UnlocatedAssetsReportModal';
import { AspecOfficializationModal } from './AspecOfficializationModal';

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
}) => {
  // Tab: Default is 'salas' (Salas & Setores - exactly as requested: no camera / QR code blocking on open!)
  const [activeTab, setActiveTab] = useState<'salas' | 'divergencias' | 'conciliacao' | 'relatorio' | 'scanner'>('salas');
  const [showMacroMicroModal, setShowMacroMicroModal] = useState<boolean>(false);
  const [showAspecReconciliationModal, setShowAspecReconciliationModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showRoomAspecModal, setShowRoomAspecModal] = useState<boolean>(false);
  const [showUnlocatedModal, setShowUnlocatedModal] = useState<boolean>(false);
  const [roomNewSemPlaqueta, setRoomNewSemPlaqueta] = useState<boolean>(false);

  // Cross-sector foreign tombo check states inside current room
  const [foreignTomboInput, setForeignTomboInput] = useState<string>('');
  const [foreignTomboFeedback, setForeignTomboFeedback] = useState<{
    type: 'found_other' | 'not_in_aspec' | 'belongs_here' | 'success';
    asset?: Asset;
    message: string;
  } | null>(null);

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

  // Room Print Sheet Modal
  const [showRoomPrintSheet, setShowRoomPrintSheet] = useState(false);
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

  // Available Units
  const availableUnits = useMemo(() => {
    return [
      { id: 'policlinica', nome: 'Policlínica Regional Bernardo Félix da Silva', sigla: 'Policlínica', icon: '🏥' },
      { id: 'ceo', nome: 'CEO – Centro de Especialidades Odontológicas', sigla: 'CEO Sobral', icon: '🦷' },
      { id: 'sede-cpsms', nome: 'Consórcio CPSMS (Sede Administrativa)', sigla: 'Sede CPSMS', icon: '🏛️' },
      { id: 'cer', nome: 'CER – Centro Especializado em Reabilitação', sigla: 'CER', icon: '♿' },
    ];
  }, []);

  const activeUnitInfo = useMemo(() => {
    return availableUnits.find(u => u.id === selectedUnitId) || availableUnits[0];
  }, [availableUnits, selectedUnitId]);

  // Assets belonging to currently selected Unit
  const unitAssets = useMemo(() => {
    return assets.filter(a => {
      const uEncontrada = (a.auditoria?.unidadeEncontrada || '').toLowerCase();
      const inThisUnitFound = (selectedUnitId === 'policlinica' && uEncontrada.includes('poli')) ||
        (selectedUnitId === 'ceo' && uEncontrada.includes('ceo')) ||
        (selectedUnitId === 'sede-cpsms' && (uEncontrada.includes('sede') || uEncontrada.includes('consórcio'))) ||
        (selectedUnitId === 'cer' && uEncontrada.includes('cer'));

      if (inThisUnitFound) return true;

      if (selectedUnitId === 'policlinica') return a.unidadeId === 'policlinica' || a.unidadeNome.toLowerCase().includes('poli');
      if (selectedUnitId === 'ceo') return a.unidadeId === 'ceo' || a.unidadeNome.toLowerCase().includes('ceo');
      if (selectedUnitId === 'sede-cpsms') return a.unidadeId === 'sede-cpsms' || a.unidadeNome.toLowerCase().includes('sede') || a.unidadeNome.toLowerCase().includes('consórcio');
      if (selectedUnitId === 'cer') return a.unidadeId === 'cer' || a.unidadeNome.toLowerCase().includes('cer');
      return true;
    });
  }, [assets, selectedUnitId]);

  // Distinct Sectors for the selected Unit
  const unitSectorsList = useMemo(() => {
    const definedSectors = sectors.filter(s => {
      if (selectedUnitId === 'policlinica') return s.unidadeId === 'policlinica';
      if (selectedUnitId === 'ceo') return s.unidadeId === 'ceo';
      if (selectedUnitId === 'sede-cpsms') return s.unidadeId === 'sede-cpsms';
      if (selectedUnitId === 'cer') return s.unidadeId === 'cer';
      return false;
    });

    // Collect any distinct sector / room names found in defined sectors and unit assets
    const sectorMap = new Map<string, { id: string; nome: string; responsavel?: string }>();
    const usedIds = new Set<string>();

    definedSectors.forEach(s => {
      const key = s.nome.trim().toLowerCase();
      let uniqueSecId = s.id;
      if (usedIds.has(uniqueSecId)) {
        uniqueSecId = `${s.id}-${Math.random().toString(36).slice(2, 7)}`;
      }
      usedIds.add(uniqueSecId);

      sectorMap.set(key, {
        id: uniqueSecId,
        nome: s.nome,
        responsavel: s.responsavelNome
      });
    });

    unitAssets.forEach(a => {
      // Prioritize the actual room/location name
      const sNome = (a.setorNome || a.area || a.subsetorNome || 'Setor Não Informado').trim();
      const key = sNome.toLowerCase();
      if (!sectorMap.has(key)) {
        // Generate a clean, unique ID that NEVER collides with defined sector IDs!
        const slug = key
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/gi, '-')
          .toLowerCase()
          .replace(/^-+|-+$/g, '') || 'sala';

        let uniqueId = `sala-${selectedUnitId}-${slug}`;
        let counter = 1;
        while (usedIds.has(uniqueId)) {
          uniqueId = `sala-${selectedUnitId}-${slug}-${counter++}`;
        }
        usedIds.add(uniqueId);

        sectorMap.set(key, {
          id: uniqueId,
          nome: sNome,
          responsavel: a.responsavelNome
        });
      }
    });

    const list = Array.from(sectorMap.values()).map(sec => {
      // Find all assets in this sector/room
      const secLower = sec.nome.trim().toLowerCase();
      const secAssets = unitAssets.filter(a => {
        const aSetor = (a.setorNome || '').trim().toLowerCase();
        const aArea = (a.area || '').trim().toLowerCase();
        const aSub = (a.subsetorNome || a.subarea || '').trim().toLowerCase();
        return aSetor === secLower || aSub === secLower || aArea === secLower;
      });
      const checkedCount = secAssets.filter(a => a.auditoria?.conferido).length;
      const totalVal = secAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0);
      return {
        ...sec,
        assetsCount: secAssets.length,
        checkedCount,
        pendingCount: secAssets.length - checkedCount,
        totalVal,
        percent: secAssets.length > 0 ? Math.round((checkedCount / secAssets.length) * 100) : 0
      };
    });

    // Sort: sectors with more assets first, then alphabetically
    list.sort((a, b) => {
      if (b.assetsCount !== a.assetsCount) {
        return b.assetsCount - a.assetsCount;
      }
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

    if (sectorSearchQuery.trim()) {
      const q = sectorSearchQuery.toLowerCase();
      return list.filter(s => s.nome.toLowerCase().includes(q) || (s.responsavel || '').toLowerCase().includes(q));
    }
    return list;
  }, [sectors, unitAssets, selectedUnitId, sectorSearchQuery]);

  // Synchronize initialSectorName when passed from Caderno de Balanço or external links
  useEffect(() => {
    if (initialSectorName && unitSectorsList.length > 0) {
      const targetLower = initialSectorName.trim().toLowerCase();
      const found = unitSectorsList.find(s => 
        s.nome.trim().toLowerCase() === targetLower ||
        s.id === initialSectorName ||
        s.nome.trim().toLowerCase().includes(targetLower) ||
        targetLower.includes(s.nome.trim().toLowerCase())
      );
      if (found) {
        setSelectedSectorId(found.id);
      }
    }
  }, [initialSectorName, unitSectorsList]);

  // Selected Sector Details & Assets
  const activeSector = useMemo(() => {
    if (!selectedSectorId) return null;
    return unitSectorsList.find(s => s.id === selectedSectorId || s.nome.trim().toLowerCase() === selectedSectorId.toLowerCase()) || null;
  }, [unitSectorsList, selectedSectorId]);

  const activeSectorAssets = useMemo(() => {
    if (!activeSector) return [];
    const secLower = activeSector.nome.trim().toLowerCase();
    let list = assets.filter(a => {
      const aSetor = (a.setorNome || '').trim().toLowerCase();
      const aArea = (a.area || '').trim().toLowerCase();
      const aSub = (a.subsetorNome || a.subarea || '').trim().toLowerCase();
      const aEncontrado = (a.auditoria?.setorEncontrado || '').trim().toLowerCase();
      return aSetor === secLower || aSub === secLower || aArea === secLower || aEncontrado === secLower;
    });

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
        (a.numeroSerie || '').toLowerCase().includes(q)
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
  };

  // Quick Action: Undo confirmation
  const handleUndoAudit = (asset: Asset) => {
    onUpdateAudit(asset.id, {
      conferido: false,
      statusDivergencia: 'conforme',
      observacaoAuditoria: '',
      responsavelConferencia: ''
    });
  };

  // Batch Action: Confirm All Pending Assets in this Room
  const handleConfirmAllInSector = () => {
    if (!activeSector) return;
    const secLower = activeSector.nome.trim().toLowerCase();
    const pendingList = unitAssets.filter(a => {
      const aSetor = (a.setorNome || '').trim().toLowerCase();
      const aArea = (a.area || '').trim().toLowerCase();
      const aSub = (a.subsetorNome || a.subarea || '').trim().toLowerCase();
      return (aSetor === secLower || aSub === secLower || aArea === secLower) && !a.auditoria?.conferido;
    });

    if (pendingList.length === 0) return;

    pendingList.forEach(asset => {
      onUpdateAudit(asset.id, {
        conferido: true,
        statusDivergencia: 'conforme',
        unidadeEncontrada: activeUnitInfo.nome,
        setorEncontrado: activeSector.nome,
        subsetorEncontrado: asset.subsetorNome || activeSector.nome,
        observacaoAuditoria: `Conferência em lote da sala ${activeSector.nome} realizada pela Gestora de Patrimônio.`,
        responsavelConferencia: currentProfile.nome
      });
    });

    setBulkFeedback(`Sucesso! Todos os ${pendingList.length} bens pendentes do setor "${activeSector.nome}" foram conferidos.`);
    setTimeout(() => setBulkFeedback(null), 5000);
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

    const updated: Asset = {
      ...asset,
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
    setBulkFeedback(`Localização provisória registrada! No ASPEC consta em "${originalSetor}" e na vistoria consta provisoriamente em "${targetRoom}". Aguardando OK oficial da Gestora.`);
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

  // Quick Action: Save an Untracked Asset found while inspecting this room
  const handleSaveRoomUntrackedAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNewDescricao.trim() || !activeSector) return;

    // Se o bem já existia no banco/ASPEC
    if (matchedExistingAsset) {
      const isOtherSector = matchedExistingAsset.setorNome.trim().toLowerCase() !== activeSector.nome.trim().toLowerCase();
      if (isOtherSector) {
        // Disparar confirmação de modificação de setor obrigatória
        setPendingDivergenceConfirmation({
          asset: matchedExistingAsset,
          targetRoom: activeSector.nome,
          targetUnit: activeUnitInfo.nome
        });
        return;
      } else {
        // Já pertencia a esta sala no ASPEC
        handleQuickConfirm(matchedExistingAsset);
        setShowAddRoomAssetModal(false);
        setRoomNewTombo('');
        setRoomNewTomboSesa('');
        setRoomNewDescricao('');
        setRoomNewSerial('');
        setRoomNewFornecedor('');
        setRoomNewValor('');
        setMatchedExistingAsset(null);
        setBulkFeedback(`Item "${matchedExistingAsset.descricao}" conferido com sucesso nesta sala!`);
        setTimeout(() => setBulkFeedback(null), 5000);
        return;
      }
    }

    const parsedVal = parseFloat(roomNewValor.replace(',', '.')) || 0;
    const tomboFinal = roomNewSemPlaqueta
      ? (roomNewTombo.trim() || `SEM-TOMBO-${activeUnitInfo.sigla.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`)
      : (roomNewTombo.trim() || `FORA-ASPEC-${Math.floor(1000 + Math.random() * 9000)}`);

    const newAsset: Asset = {
      id: `asset-room-${Date.now()}`,
      tombamento: tomboFinal,
      tomboOrigemSesa: roomNewTomboSesa.trim() || undefined,
      duploTombamento: Boolean(roomNewTombo.trim() && roomNewTomboSesa.trim()),
      foraDoAspec: true,
      semPlaqueta: roomNewSemPlaqueta,
      origemTombo: roomNewTomboSesa.trim() ? 'SESA (Governo do Ceará - Cessão/Comodato)' : 'CPSMS (Próprio do Consórcio)',
      origemRecurso: 'Achado em Campo (Não Constava no ASPEC)',
      formaAquisicao: 'Achado de Inventário',
      orgao: 'Consórcio Público de Saúde da Microrregião de Sobral (CPSMS)',
      descricao: roomNewDescricao.trim(),
      unidadeId: activeUnitInfo.id,
      unidadeNome: activeUnitInfo.nome,
      area: activeSector.nome,
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
      notaFiscal: 'S/N - Achado Físico',
      fornecedor: roomNewFornecedor.trim() || 'A Apurar',
      numeroSerie: roomNewSerial.trim() || 'S/N',
      observacoes: roomNewSemPlaqueta
        ? `Bem físico sem plaqueta de tombamento encontrado na sala "${activeSector.nome}" em ${new Date().toLocaleDateString('pt-BR')} por ${currentProfile.nome}. Relação para novo emplacamento no ASPEC.`
        : `Bem físico encontrado na sala "${activeSector.nome}" em ${new Date().toLocaleDateString('pt-BR')} por ${currentProfile.nome}. Não constava no ASPEC.`,
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
          : 'Item encontrado fora do ASPEC e conferido in loco na sala.'
      }
    };

    onAddAsset?.(newAsset);
    setShowAddRoomAssetModal(false);
    setRoomNewTombo('');
    setRoomNewTomboSesa('');
    setRoomNewDescricao('');
    setRoomNewSerial('');
    setRoomNewFornecedor('');
    setRoomNewValor('');
    setRoomNewSemPlaqueta(false);
    setMatchedExistingAsset(null);
    setBulkFeedback(`Item "${newAsset.descricao}" (${newAsset.tombamento}) registrado na sala "${activeSector.nome}" e incluído na lista para o ASPEC!`);
    setTimeout(() => setBulkFeedback(null), 6000);
  };

  // Handler: Search for a foreign tombo found while in the current room
  const handleSearchForeignTombo = () => {
    if (!foreignTomboInput.trim() || !activeSector) return;
    const q = foreignTomboInput.trim().toLowerCase();
    const matched = assets.find(a => 
      a.tombamento.toLowerCase() === q ||
      (a.tomboConsorcio && a.tomboConsorcio.toLowerCase() === q) ||
      (a.tomboOrigemSesa && a.tomboOrigemSesa.toLowerCase() === q) ||
      (a.tomboSesa && a.tomboSesa.toLowerCase() === q) ||
      (a.tomboUfc && a.tomboUfc.toLowerCase() === q) ||
      (a.tomboFcpc && a.tomboFcpc.toLowerCase() === q) ||
      (a.outrosTombos && a.outrosTombos.toLowerCase() === q)
    );

    if (!matched) {
      setForeignTomboFeedback({
        type: 'not_in_aspec',
        message: `O Tombo "${foreignTomboInput.trim()}" NÃO consta no ASPEC. Trata-se de um bem físico sem registro contábil.`
      });
      return;
    }

    const currentSectorLower = activeSector.nome.trim().toLowerCase();
    const matchedSectorLower = (matched.setorNome || '').trim().toLowerCase();

    if (matchedSectorLower === currentSectorLower) {
      // Belongs to this room already!
      handleQuickConfirm(matched);
      setForeignTomboFeedback({
        type: 'belongs_here',
        asset: matched,
        message: `O Tombo ${matched.tombamento} (${matched.descricao}) já pertence a esta sala no ASPEC! Presença confirmada.`
      });
    } else {
      // Belongs to another room in ASPEC! Remanejamento detectado!
      setPendingDivergenceConfirmation({
        asset: matched,
        targetRoom: activeSector.nome,
        targetUnit: activeUnitInfo.nome
      });
      setForeignTomboFeedback({
        type: 'found_other',
        asset: matched,
        message: `Tem certeza que deseja modificar? O item está no setor "${matched.setorNome}" (${matched.unidadeNome}).`
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
    const secLower = activeSector.nome.trim().toLowerCase();
    const roomAssets = assets.filter(a => {
      const aSetor = (a.setorNome || '').trim().toLowerCase();
      const aArea = (a.area || '').trim().toLowerCase();
      const aSub = (a.subsetorNome || a.subarea || '').trim().toLowerCase();
      const aEncontrado = (a.auditoria?.setorEncontrado || '').trim().toLowerCase();
      return aSetor === secLower || aSub === secLower || aArea === secLower || aEncontrado === secLower;
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Salas e Setores de {activeUnitInfo.sigla}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold">
                      {unitSectorsList.length} salas cadastradas
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Clique em qualquer sala para abrir a lista completa dos bens pertencentes àquele local.
                  </p>
                </div>

                {/* Quick Sector Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={sectorSearchQuery}
                    onChange={(e) => setSectorSearchQuery(e.target.value)}
                    placeholder="Filtrar sala / consultório..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Sectors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unitSectorsList.map((sector, index) => (
                  <button
                    key={`sector-${sector.id}-${index}`}
                    type="button"
                    onClick={() => setSelectedSectorId(sector.id)}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/80 bg-slate-50/60 dark:bg-slate-850 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 text-left transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 leading-snug">
                          {sector.nome}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>

                      {sector.responsavel && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{sector.responsavel}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {sector.assetsCount} {sector.assetsCount === 1 ? 'bem' : 'bens'}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                          sector.percent === 100 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : sector.checkedCount > 0 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {sector.checkedCount} de {sector.assetsCount} conferidos ({sector.percent}%)
                        </span>
                      </div>

                      {/* Progress bar per sector */}
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${sector.percent}%` }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {unitSectorsList.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500">
                  Nenhum setor encontrado com o termo "{sectorSearchQuery}".
                </div>
              )}
            </div>
          ) : (
            /* STEP 3: INSIDE SELECTED SECTOR - SHOWS EVERYTHING IN THE ROOM! */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5 shadow-xs">
              
              {/* Sector Header with Breadcrumb and Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelectedSectorId(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer mb-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar à lista de salas de {activeUnitInfo.sigla}</span>
                  </button>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span>{activeSector?.nome}</span>
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <span>Unidade: <strong>{activeUnitInfo.nome}</strong></span>
                    {activeSector?.responsavel && (
                      <span>· Responsável: <strong>{activeSector.responsavel}</strong></span>
                    )}
                    <span>· Valor alocado: <strong>{formatBRL(activeSector?.totalVal || 0)}</strong></span>
                  </div>
                </div>

                {/* Top Action Buttons for this Room */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Concluir Sala & Gerar Termo ASPEC */}
                  <button
                    type="button"
                    onClick={() => setShowRoomAspecModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all cursor-pointer min-h-[38px] shadow-sm ring-2 ring-emerald-500/30"
                    title="Concluir conferência desta sala e gerar o Termo Oficial com os ajustes exclusivos do ASPEC desta localização"
                  >
                    <FileText className="w-4 h-4 text-slate-950" />
                    <span>Concluir Sala & Termo ASPEC</span>
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
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-colors cursor-pointer min-h-[38px] shadow-xs"
                    title="Cadastrar bem físico encontrado nesta sala que não está no ASPEC"
                  >
                    <Plus className="w-4 h-4 text-slate-950" />
                    <span>+ Bem Fora do ASPEC</span>
                  </button>

                  {/* Confirm All In Room */}
                  <button
                    type="button"
                    onClick={handleConfirmAllInSector}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer min-h-[38px] shadow-xs"
                    title="Confirmar presença de todos os bens desta sala com 1 clique"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Todos da Sala</span>
                  </button>

                  {/* Print Room Sheet */}
                  <button
                    type="button"
                    onClick={handlePrintRoomSheet}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer min-h-[38px]"
                    title="Imprimir folha de conferência da sala (A4 / PDF)"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Imprimir Folha da Sala</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadRoomSheetHtml}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer min-h-[38px]"
                    title="Baixar arquivo HTML da folha da sala para abrir no navegador e imprimir diretamente (Ctrl+P)"
                  >
                    <FileCode className="w-4 h-4 text-indigo-500" />
                    <span className="hidden sm:inline">Baixar HTML</span>
                  </button>

                  {/* Caderno Balanço Macro ➔ Micro */}
                  <button
                    type="button"
                    onClick={() => setShowMacroMicroModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer min-h-[38px] shadow-2xs"
                    title="Abrir Caderno de Balanço Macro e Micro com campos para itens fora do ASPEC"
                  >
                    <ClipboardList className="w-4 h-4 text-emerald-500" />
                    <span>Caderno Balanço Geral</span>
                  </button>
                </div>
              </div>

              {/* FIELD TOOL: Verify Any Tombo Found in This Room that Wasn't on the Sheet */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-300 dark:border-amber-800 text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Encontrou um bem nesta sala que NÃO estava no documento desta sala?</span>
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                    (Anota o achado real para o espelho do ASPEC sem bagunçar a base contábil)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
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
                      placeholder="Digite a placa do bem que você achou aqui (ex: 0142 ou tombo SESA)..."
                      className="w-full p-2 pl-3 rounded-lg bg-white dark:bg-slate-850 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white font-mono text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchForeignTombo}
                    className="px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg cursor-pointer shrink-0"
                  >
                    Verificar Onde Deveria Estar
                  </button>
                </div>

                {/* Feedback */}
                {foreignTomboFeedback && (
                  <div className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    foreignTomboFeedback.type === 'found_other'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border-amber-400'
                      : foreignTomboFeedback.type === 'not_in_aspec'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-950 dark:text-rose-200 border-rose-300'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200 border-emerald-300'
                  }`}>
                    <div>
                      <p>{foreignTomboFeedback.message}</p>
                      {foreignTomboFeedback.type === 'found_other' && (
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                          Ação no ASPEC: <strong>Transferência Interna de Carga</strong> de "{foreignTomboFeedback.asset?.setorNome}" para esta sala ("{activeSector?.nome}").
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {foreignTomboFeedback.type === 'found_other' && foreignTomboFeedback.asset && (
                        <button
                          type="button"
                          onClick={() => handleConfirmForeignAssetInCurrentRoom(foreignTomboFeedback.asset!)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          ✓ Registrar Presença Nesta Sala
                        </button>
                      )}

                      {foreignTomboFeedback.type === 'not_in_aspec' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRoomNewTombo(foreignTomboInput.trim());
                            setShowAddRoomAssetModal(true);
                            setForeignTomboFeedback(null);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          + Cadastrar Fora do ASPEC
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setForeignTomboFeedback(null)}
                        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Room Stats Pill and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setRoomStatusFilter('todos')}
                    className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                      roomStatusFilter === 'todos' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Todos ({activeSector?.assetsCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomStatusFilter('pendentes')}
                    className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                      roomStatusFilter === 'pendentes' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Pendentes ({activeSector?.pendingCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomStatusFilter('conferidos')}
                    className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                      roomStatusFilter === 'conferidos' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Conferidos ({activeSector?.checkedCount || 0})
                  </button>
                </div>

                {/* Search within this Room */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={roomAssetSearchQuery}
                    onChange={(e) => setRoomAssetSearchQuery(e.target.value)}
                    placeholder="Buscar plaqueta / nome na sala..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* ASSETS LIST IN THIS ROOM */}
              <div className="space-y-3">
                {activeSectorAssets.map((asset, idx) => {
                  const isChecked = asset.auditoria?.conferido;
                  const isDivergent = asset.auditoria?.statusDivergencia === 'setor_divergente' || asset.auditoria?.statusDivergencia === 'nao_encontrado';

                  return (
                    <div
                      key={asset.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isChecked && !isDivergent
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : isDivergent
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Asset Details */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                              <span>{asset.tombamento}</span>
                              <span className="text-[10px] text-slate-400 font-sans font-normal">(4d)</span>
                            </span>

                            {/* Tombo SESA (6 dígitos) se houver */}
                            {asset.tomboOrigemSesa && (
                              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-700 flex items-center gap-1">
                                <span className="text-[9px] uppercase font-sans">SESA:</span>
                                <span>{asset.tomboOrigemSesa}</span>
                                <span className="text-[9px] font-sans font-normal">(6d)</span>
                              </span>
                            )}

                            {/* Origin Badge (CPSMS, SESA, UFC) */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              asset.origemTombo.includes('SESA')
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                                : asset.origemTombo.includes('UFC')
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            }`}>
                              {asset.origemTombo.split(' ')[0]}
                            </span>

                            {asset.duploTombamento && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                                🏷️ Plaqueta Dupla
                              </span>
                            )}

                            {asset.foraDoAspec && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                ⚠️ Fora do ASPEC
                              </span>
                            )}

                            {asset.formaAquisicao && (
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {asset.formaAquisicao}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {asset.descricao}
                          </h4>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                            {asset.fornecedor && asset.fornecedor !== '-' && (
                              <span>Fornecedor: <strong>{asset.fornecedor}</strong></span>
                            )}
                            {asset.numeroSerie && asset.numeroSerie !== '-' && (
                              <span>S/N: <strong className="font-mono">{asset.numeroSerie}</strong></span>
                            )}
                            <span>Valor: <strong>{formatBRL(asset.valorAquisicao || asset.valorBrutoContabil || 0)}</strong></span>
                            <span>Responsável: <strong>{asset.responsavelNome}</strong></span>
                          </div>

                          {/* Audit Status Note */}
                          {isChecked && (
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold pt-1 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Conferido por {asset.auditoria?.responsavelConferencia || currentProfile.nome}
                              </span>
                            </div>
                          )}

                          {isDivergent && (
                            <div className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold pt-1 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{asset.auditoria?.observacaoAuditoria || 'Divergência registrada'}</span>
                            </div>
                          )}

                          {asset.auditoria?.statusDivergencia === 'setor_divergente' && (
                            <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-xs text-amber-950 dark:text-amber-200 space-y-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900 dark:text-amber-300 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wide ${
                                  asset.statusRegularizacaoAspec === 'oficializado'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-200 text-amber-950 border border-amber-400'
                                }`}>
                                  {asset.statusRegularizacaoAspec === 'oficializado' ? '✓ Oficializado no ASPEC' : '📍 Localização Provisória no Caderno'}
                                </span>
                                <span>{asset.statusRegularizacaoAspec === 'oficializado' ? 'Dados Unificados Oficialmente' : 'Aguardando Baixa Definitiva no ASPEC'}</span>
                              </div>
                              <div className="text-[11px] leading-snug text-slate-800 dark:text-slate-200">
                                • Registro Original no ASPEC: <strong>{asset.setorOriginalAspec || asset.setorNome}</strong> ({asset.unidadeOriginalAspec || asset.unidadeNome})<br />
                                • Localização Física Conferida: <strong className="text-emerald-800 dark:text-emerald-300 font-bold">{asset.auditoria?.setorEncontrado || activeSector?.nome}</strong>
                              </div>
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 italic">
                                {asset.statusRegularizacaoAspec === 'oficializado'
                                  ? '✓ Baixa contábil confirmada pela Gestora. Registros físicos e contábeis unificados com sucesso nesta sala.'
                                  : '* O registro definitivo nesta sala só deve ser oficializado após a Gestora confirmar a baixa/mudança definitiva no sistema ASPEC (unificando os dados após o "OK" oficial).'}
                              </p>
                              {asset.statusRegularizacaoAspec !== 'oficializado' && (
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setAssetToOfficialize(asset)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-colors"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Confirmar Baixa Definitiva no ASPEC (OK Oficial da Gestora)</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons for this Asset */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!isChecked ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleQuickConfirm(asset)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer min-h-[38px] shadow-xs"
                                title="Confirmar que o bem está presente e conforme nesta sala"
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Confirmar Presença</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMarkMissing(asset)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg transition-colors cursor-pointer min-h-[38px]"
                                title="Marcar bem como não localizado nesta sala. Fique tranquila: o item NÃO é apagado nem dado baixa contábil. Ele entra em apuração para cruzar com as outras salas."
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Não Visto nesta Sala</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold border border-emerald-300 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                Presente
                              </span>

                              <button
                                type="button"
                                onClick={() => handleUndoAudit(asset)}
                                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer p-1"
                              >
                                Desfazer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activeSectorAssets.length === 0 && (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      Nenhum bem encontrado com os filtros atuais nesta sala.
                    </p>
                    <p className="text-[11px]">
                      Alterne o filtro para "Todos" ou limpe o termo de busca.
                    </p>
                  </div>
                )}
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
                    Adicionar Tombo Fora do ASPEC nesta Sala
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
                  matchedExistingAsset.setorNome.trim().toLowerCase() !== activeSector.nome.trim().toLowerCase()
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {matchedExistingAsset.setorNome.trim().toLowerCase() !== activeSector.nome.trim().toLowerCase() ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Atenção: Este item pertence oficialmente a outro setor no ASPEC!</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Item encontrado no cadastro desta mesma sala no ASPEC!</span>
                      </>
                    )}
                  </div>
                  <div className="text-[11.5px] leading-relaxed pt-0.5">
                    <strong>Item:</strong> {matchedExistingAsset.descricao} (Tombo: {matchedExistingAsset.tombamento})<br />
                    <strong>Setor no ASPEC:</strong> <span className="font-bold underline decoration-amber-500">{matchedExistingAsset.setorNome}</span> ({matchedExistingAsset.unidadeNome})<br />
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
                ℹ️ Este bem será cadastrado como <strong>Fora do ASPEC</strong>, alocado nesta sala e marcado automaticamente como <strong>conferido in loco</strong>.
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
                  Bem encontrado nesta sala, mas registrado no ASPEC em "{pendingDivergenceConfirmation.asset.setorNome}"
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
                  <strong className="text-slate-900 dark:text-white font-black">{pendingDivergenceConfirmation.asset.setorNome}</strong>
                  <div className="text-[10px] text-slate-500">{pendingDivergenceConfirmation.asset.unidadeNome}</div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">No Físico (Localização Provisória):</span>
                  <strong className="text-slate-900 dark:text-white font-black">{pendingDivergenceConfirmation.targetRoom}</strong>
                  <div className="text-[10px] text-slate-500">{pendingDivergenceConfirmation.targetUnit}</div>
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

    </div>
  );
};
