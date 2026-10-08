import React, { useState, useMemo } from 'react';
import { Asset, Sector, UnitInfo, UserProfile, AssetCondition, TomboOrigin } from '../types';
import { formatBRL, formatDate } from '../utils/formatters';
import { executePrintHtml, downloadPrintableHtml, openPrintableInNewWindow, PrintStatus } from '../utils/printHelper';
import { 
  Printer, 
  X, 
  Download, 
  Building2, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  FileSpreadsheet, 
  Filter, 
  CheckSquare, 
  Square, 
  PlusCircle, 
  Tag, 
  User, 
  DollarSign, 
  Layers, 
  ShieldCheck, 
  FileText,
  MapPin,
  ClipboardList,
  ExternalLink,
  FileCode,
  Info,
  Clock
} from 'lucide-react';
import { AspecOfficializationModal } from './AspecOfficializationModal';

interface MacroMicroInventoryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  units: UnitInfo[];
  sectors: Sector[];
  currentProfile: UserProfile;
  initialMacroUnitId?: string;
  onAddAsset?: (newAsset: Asset) => void;
  onUpdateAsset?: (asset: Asset) => void;
  onNavigateToAudit?: (roomName?: string, unitId?: string) => void;
}

export const MacroMicroInventoryReportModal: React.FC<MacroMicroInventoryReportModalProps> = ({
  isOpen,
  onClose,
  assets,
  units,
  sectors,
  currentProfile,
  initialMacroUnitId = 'all',
  onAddAsset,
  onUpdateAsset,
  onNavigateToAudit,
}) => {
  // Macro Location Selector: 'all' | 'policlinica' | 'ceo' | 'sede-cpsms' | 'cer'
  const [selectedMacro, setSelectedMacro] = useState<string>(initialMacroUnitId || 'all');
  // Specific Micro Location filter (optional)
  const [selectedMicroFilter, setSelectedMicroFilter] = useState<string>('all');
  // Search within report
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');
  // Report Mode: 'prancheta' (boxes for manual check + blank lines) | 'balanco' (values, accounting status)
  const [reportMode, setReportMode] = useState<'prancheta' | 'balanco'>('prancheta');
  // Blank lines count for offline note taking per room
  const [blankLinesCount, setBlankLinesCount] = useState<number>(3);
  // Only show untracked / fuera del aspec
  const [onlyUntracked, setOnlyUntracked] = useState<boolean>(false);

  // Quick Modal State: Add Asset Found On Site (Outside ASPEC)
  const [showAddUntrackedModal, setShowAddUntrackedModal] = useState<boolean>(false);
  const [targetUnitForAdd, setTargetUnitForAdd] = useState<string>('policlinica');
  const [targetSectorForAdd, setTargetSectorForAdd] = useState<string>('');
  const [targetSubsetorForAdd, setTargetSubsetorForAdd] = useState<string>('');
  const [newTomboInput, setNewTomboInput] = useState<string>('');
  const [newTomboConsorcioInput, setNewTomboConsorcioInput] = useState<string>('');
  const [newTomboSesaInput, setNewTomboSesaInput] = useState<string>('');
  const [newTomboUfcInput, setNewTomboUfcInput] = useState<string>('');
  const [newTomboFcpcInput, setNewTomboFcpcInput] = useState<string>('');
  const [newOutrosTombosInput, setNewOutrosTombosInput] = useState<string>('');
  const [newDescricaoInput, setNewDescricaoInput] = useState<string>('');
  const [newOrigemTombo, setNewOrigemTombo] = useState<TomboOrigin>('CPSMS (Próprio do Consórcio)');
  const [newEstadoInput, setNewEstadoInput] = useState<AssetCondition>('Bom');
  const [newSerialInput, setNewSerialInput] = useState<string>('');
  const [newFornecedorInput, setNewFornecedorInput] = useState<string>('');
  const [newResponsavelInput, setNewResponsavelInput] = useState<string>('');
  const [newValorEstimado, setNewValorEstimado] = useState<string>('');

  // Modal State: Manage Multiple Tombos for any existing asset (Consórcio, SESA, UFC, FCPC, Outros)
  const [editingTombosAsset, setEditingTombosAsset] = useState<Asset | null>(null);
  const [editTombamentoPrincipal, setEditTombamentoPrincipal] = useState<string>('');
  const [editTomboConsorcio, setEditTomboConsorcio] = useState<string>('');
  const [editTomboSesa, setEditTomboSesa] = useState<string>('');
  const [editTomboUfc, setEditTomboUfc] = useState<string>('');
  const [editTomboFcpc, setEditTomboFcpc] = useState<string>('');
  const [editOutrosTombos, setEditOutrosTombos] = useState<string>('');
  const [editOrigemTombo, setEditOrigemTombo] = useState<TomboOrigin>('CPSMS (Próprio do Consórcio)');

  // Live lookup & Confirmação de Divergência de Setor no Caderno de Balanço
  const [matchedUntrackedExistingAsset, setMatchedUntrackedExistingAsset] = useState<Asset | null>(null);
  const [pendingMacroDivergenceConfirm, setPendingMacroDivergenceConfirm] = useState<{
    asset: Asset;
    targetRoom: string;
    targetUnit: string;
  } | null>(null);
  const [assetToOfficialize, setAssetToOfficialize] = useState<Asset | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [printStatus, setPrintStatus] = useState<PrintStatus | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Defined Macro Entities
  const macroEntities = useMemo(() => {
    return [
      { id: 'all', nome: 'Balanço Geral · Todas as Unidades CPSMS', sigla: 'Geral CPSMS', icon: '🌐' },
      { id: 'policlinica', nome: 'Policlínica Regional Bernardo Félix da Silva', sigla: 'Policlínica', icon: '🏥' },
      { id: 'ceo', nome: 'CEO – Centro de Especialidades Odontológicas', sigla: 'CEO Sobral', icon: '🦷' },
      { id: 'sede-cpsms', nome: 'Consórcio CPSMS (Sede Administrativa)', sigla: 'Sede CPSMS', icon: '🏛️' },
      { id: 'cer', nome: 'CER – Centro Especializado em Reabilitação', sigla: 'CER', icon: '♿' },
    ];
  }, []);

  const activeMacroInfo = useMemo(() => {
    return macroEntities.find(m => m.id === selectedMacro) || macroEntities[0];
  }, [macroEntities, selectedMacro]);

  // Assets filtered by selected Macro location
  const macroFilteredAssets = useMemo(() => {
    return assets.filter(a => {
      if (selectedMacro === 'all') return true;
      if (selectedMacro === 'policlinica') return a.unidadeId === 'policlinica' || a.unidadeNome.toLowerCase().includes('poli');
      if (selectedMacro === 'ceo') return a.unidadeId === 'ceo' || a.unidadeNome.toLowerCase().includes('ceo');
      if (selectedMacro === 'sede-cpsms') return a.unidadeId === 'sede-cpsms' || a.unidadeNome.toLowerCase().includes('sede') || a.unidadeNome.toLowerCase().includes('consórcio');
      if (selectedMacro === 'cer') return a.unidadeId === 'cer' || a.unidadeNome.toLowerCase().includes('cer');
      return true;
    });
  }, [assets, selectedMacro]);

  // Group Assets by Macro Unit -> then by Micro Location (Room / Sector)
  const groupedData = useMemo(() => {
    // Map of MacroUnit -> Map of MicroRoom -> Asset[]
    const macroMap = new Map<string, {
      unitId: string;
      unitNome: string;
      unitSigla: string;
      rooms: Map<string, {
        roomName: string;
        responsavel?: string;
        assets: Asset[];
        checkedCount: number;
        untrackedCount: number;
        totalValue: number;
      }>;
    }>();

    macroFilteredAssets.forEach(asset => {
      // Determine macro key
      let macroKey = 'sede-cpsms';
      let macroName = 'Consórcio CPSMS (Sede Administrativa)';
      let macroSigla = 'Consórcio';

      const uNome = ((asset.auditoria?.unidadeEncontrada || asset.unidadeNome) || '').toLowerCase();
      const uId = asset.unidadeId || '';

      if (uId === 'policlinica' || uNome.includes('poli')) {
        macroKey = 'policlinica';
        macroName = 'Policlínica Regional Bernardo Félix da Silva';
        macroSigla = 'Policlínica';
      } else if (uId === 'ceo' || uNome.includes('ceo')) {
        macroKey = 'ceo';
        macroName = 'CEO – Centro de Especialidades Odontológicas Regional Sobral';
        macroSigla = 'CEO Sobral';
      } else if (uId === 'cer' || uNome.includes('cer')) {
        macroKey = 'cer';
        macroName = 'CER – Centro Especializado em Reabilitação';
        macroSigla = 'CER';
      }

      if (!macroMap.has(macroKey)) {
        macroMap.set(macroKey, {
          unitId: macroKey,
          unitNome: macroName,
          unitSigla: macroSigla,
          rooms: new Map()
        });
      }

      const macroObj = macroMap.get(macroKey)!;

      // Determine micro key (room / sector): in physical balance sheet, assets appear in their physical room
      const physicalRoom = asset.auditoria?.setorEncontrado;
      const roomKey = (physicalRoom || asset.subsetorNome || asset.subarea || asset.setorNome || asset.area || 'Setor Geral / Não Especificado').trim();
      
      if (!macroObj.rooms.has(roomKey)) {
        macroObj.rooms.set(roomKey, {
          roomName: roomKey,
          responsavel: asset.responsavelNome,
          assets: [],
          checkedCount: 0,
          untrackedCount: 0,
          totalValue: 0,
        });
      }

      const roomObj = macroObj.rooms.get(roomKey)!;
      roomObj.assets.push(asset);
      if (asset.auditoria?.conferido) roomObj.checkedCount++;
      if (asset.foraDoAspec) roomObj.untrackedCount++;
      roomObj.totalValue += (asset.valorAquisicao || asset.valorBrutoContabil || 0);
    });

    // Convert map to structured list and apply search / filters
    return Array.from(macroMap.values()).map(m => {
      let roomList = Array.from(m.rooms.values());

      // Filter by micro room if selected
      if (selectedMicroFilter !== 'all') {
        roomList = roomList.filter(r => r.roomName.toLowerCase() === selectedMicroFilter.toLowerCase());
      }

      // Filter by search query
      if (reportSearchQuery.trim()) {
        const q = reportSearchQuery.toLowerCase();
        roomList = roomList.map(r => {
          const matchingAssets = r.assets.filter(a => 
            a.tombamento.toLowerCase().includes(q) ||
            (a.tomboOrigemSesa || '').toLowerCase().includes(q) ||
            (a.tomboConsorcio || '').toLowerCase().includes(q) ||
            (a.tomboSesa || '').toLowerCase().includes(q) ||
            (a.tomboUfc || '').toLowerCase().includes(q) ||
            (a.tomboFcpc || '').toLowerCase().includes(q) ||
            (a.outrosTombos || '').toLowerCase().includes(q) ||
            a.descricao.toLowerCase().includes(q) ||
            (a.numeroSerie || '').toLowerCase().includes(q) ||
            (a.responsavelNome || '').toLowerCase().includes(q)
          );
          return {
            ...r,
            assets: matchingAssets
          };
        }).filter(r => r.assets.length > 0 || r.roomName.toLowerCase().includes(q));
      }

      // Filter by only untracked
      if (onlyUntracked) {
        roomList = roomList.map(r => ({
          ...r,
          assets: r.assets.filter(a => a.foraDoAspec)
        })).filter(r => r.assets.length > 0);
      }

      // Sort rooms alphabetically
      roomList.sort((a, b) => a.roomName.localeCompare(b.roomName, 'pt-BR'));

      return {
        ...m,
        rooms: roomList,
        totalAssets: roomList.reduce((acc, r) => acc + r.assets.length, 0),
        totalChecked: roomList.reduce((acc, r) => acc + r.checkedCount, 0),
        totalUntracked: roomList.reduce((acc, r) => acc + r.untrackedCount, 0),
        totalVal: roomList.reduce((acc, r) => acc + r.totalValue, 0),
      };
    });
  }, [macroFilteredAssets, selectedMicroFilter, reportSearchQuery, onlyUntracked]);

  // Distinct Micro Rooms for dropdown filter
  const distinctMicroRooms = useMemo(() => {
    const setOfRooms = new Set<string>();
    macroFilteredAssets.forEach(a => {
      const r = (a.subsetorNome || a.subarea || a.setorNome || a.area || '').trim();
      if (r) setOfRooms.add(r);
    });
    return Array.from(setOfRooms).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [macroFilteredAssets]);

  // Overall statistics for active selection
  const grandTotalAssets = useMemo(() => {
    return groupedData.reduce((acc, m) => acc + m.totalAssets, 0);
  }, [groupedData]);

  const grandTotalChecked = useMemo(() => {
    return groupedData.reduce((acc, m) => acc + m.totalChecked, 0);
  }, [groupedData]);

  const grandTotalUntracked = useMemo(() => {
    return groupedData.reduce((acc, m) => acc + m.totalUntracked, 0);
  }, [groupedData]);

  const grandTotalValue = useMemo(() => {
    return groupedData.reduce((acc, m) => acc + m.totalVal, 0);
  }, [groupedData]);

  // Open modal to add untracked asset prefilling room
  const openAddForSpecificRoom = (macroId: string, roomName: string) => {
    setTargetUnitForAdd(macroId);
    setTargetSectorForAdd(roomName);
    setTargetSubsetorForAdd(roomName);
    setNewTomboInput('');
    setNewTomboConsorcioInput('');
    setNewTomboSesaInput('');
    setNewTomboUfcInput('');
    setNewTomboFcpcInput('');
    setNewOutrosTombosInput('');
    setNewDescricaoInput('');
    setNewSerialInput('');
    setNewValorEstimado('');
    setMatchedUntrackedExistingAsset(null);
    setShowAddUntrackedModal(true);
  };

  // Live lookup: Automatically pull all asset specifications when entering tombo in MacroMicro
  const handleMacroTomboLookup = (tVal: string, cVal: string, sVal: string, uVal: string, fVal: string, oVal?: string) => {
    const cleanT = tVal.trim().toLowerCase();
    const cleanC = cVal.trim().toLowerCase();
    const cleanS = sVal.trim().toLowerCase();
    const cleanU = uVal.trim().toLowerCase();
    const cleanF = fVal.trim().toLowerCase();
    const cleanO = (oVal || '').trim().toLowerCase();

    if (!cleanT && !cleanC && !cleanS && !cleanU && !cleanF && !cleanO) {
      setMatchedUntrackedExistingAsset(null);
      return;
    }

    const digitsT = cleanT.replace(/\D/g, '');
    const digitsC = cleanC.replace(/\D/g, '');
    const digitsS = cleanS.replace(/\D/g, '');

    const match = assets.find(a => {
      const at = a.tombamento.toLowerCase();
      const ac = (a.tomboConsorcio || '').toLowerCase();
      const as = (a.tomboSesa || a.tomboOrigemSesa || '').toLowerCase();
      const au = (a.tomboUfc || '').toLowerCase();
      const af = (a.tomboFcpc || '').toLowerCase();
      const ao = (a.outrosTombos || a.tomboSecundario || '').toLowerCase();

      // Direct string matches
      const matchT = cleanT && (at === cleanT || ac === cleanT || as === cleanT || au === cleanT || af === cleanT || ao === cleanT);
      const matchC = cleanC && (ac === cleanC || at === cleanC);
      const matchS = cleanS && (as === cleanS || at === cleanS);
      const matchU = cleanU && (au === cleanU || at === cleanU);
      const matchF = cleanF && (af === cleanF || at === cleanF);
      const matchO = cleanO && (ao === cleanO || at === cleanO);

      if (matchT || matchC || matchS || matchU || matchF || matchO) return true;

      // Numeric digit matching without leading zeros
      if (digitsT && digitsT.length >= 2) {
        const tDig = at.replace(/\D/g, '');
        const cDig = ac.replace(/\D/g, '');
        const sDig = as.replace(/\D/g, '');
        if ((tDig && (tDig === digitsT || parseInt(tDig, 10) === parseInt(digitsT, 10))) ||
            (cDig && (cDig === digitsT || parseInt(cDig, 10) === parseInt(digitsT, 10))) ||
            (sDig && (sDig === digitsT || parseInt(sDig, 10) === parseInt(digitsT, 10)))) {
          return true;
        }
      }

      if (digitsC && digitsC.length >= 2) {
        const cDig = ac.replace(/\D/g, '');
        const tDig = at.replace(/\D/g, '');
        if ((cDig && (cDig === digitsC || parseInt(cDig, 10) === parseInt(digitsC, 10))) ||
            (tDig && (tDig === digitsC || parseInt(tDig, 10) === parseInt(digitsC, 10)))) {
          return true;
        }
      }

      if (digitsS && digitsS.length >= 2) {
        const sDig = as.replace(/\D/g, '');
        const tDig = at.replace(/\D/g, '');
        if ((sDig && (sDig === digitsS || parseInt(sDig, 10) === parseInt(digitsS, 10))) ||
            (tDig && (tDig === digitsS || parseInt(tDig, 10) === parseInt(digitsS, 10)))) {
          return true;
        }
      }

      return false;
    });

    if (match) {
      setMatchedUntrackedExistingAsset(match);
      setNewDescricaoInput(match.descricao);
      setNewEstadoInput(match.estado);
      setNewSerialInput(match.numeroSerie && match.numeroSerie !== '-' ? match.numeroSerie : '');
      setNewFornecedorInput(match.fornecedor && match.fornecedor !== '-' ? match.fornecedor : '');
      setNewValorEstimado(String(match.valorAquisicao || match.valorBrutoContabil || ''));
      setNewOrigemTombo(match.origemTombo || 'CPSMS (Próprio do Consórcio)');
      if (match.tomboConsorcio) setNewTomboConsorcioInput(match.tomboConsorcio);
      if (match.tomboSesa || match.tomboOrigemSesa) setNewTomboSesaInput(match.tomboSesa || match.tomboOrigemSesa || '');
      if (match.tomboUfc) setNewTomboUfcInput(match.tomboUfc);
      if (match.tomboFcpc) setNewTomboFcpcInput(match.tomboFcpc);
      if (match.outrosTombos) setNewOutrosTombosInput(match.outrosTombos);
    } else {
      setMatchedUntrackedExistingAsset(null);
    }
  };

  // Confirm modifying asset location to current room with provisional record
  const handleConfirmMacroDivergentLocation = (asset: Asset, targetRoom: string, targetUnit: string) => {
    if (!onUpdateAsset) return;
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
        observacaoAuditoria: `[LOCALIZAÇÃO PROVISÓRIA NO CADERNO DE BALANÇO] Bem localizado fisicamente em "${targetRoom}", registrado no sistema ASPEC em "${originalSetor}". Aguardando confirmação de baixa/mudança definitiva no sistema ASPEC pela Gestora.`
      }
    };

    onUpdateAsset(updated);
    setPendingMacroDivergenceConfirm(null);
    setShowAddUntrackedModal(false);
    setMatchedUntrackedExistingAsset(null);
    setFeedbackMsg(`Localização provisória registrada! No ASPEC consta em "${originalSetor}" e no caderno de balanço consta provisoriamente em "${targetRoom}". Aguardando OK oficial da Gestora.`);
    setTimeout(() => setFeedbackMsg(null), 8000);
  };

  // Officialization Handler: Gestora gives official OK after confirming definitive baixa in ASPEC
  const handleConfirmOfficialization = (asset: Asset, protocolo: string, parecer: string) => {
    if (!onUpdateAsset) return;
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

    onUpdateAsset(updated);
    setFeedbackMsg(`OK Oficial registrado! Baixa processada no ASPEC e registro unificado definitivamente na sala "${targetRoom}".`);
    setTimeout(() => setFeedbackMsg(null), 8000);
  };

  // Submit new asset found on site (Outside ASPEC)
  const handleCreateUntrackedAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescricaoInput.trim()) return;

    // Se o bem já existia no cadastro/ASPEC
    if (matchedUntrackedExistingAsset) {
      const isOtherSector = matchedUntrackedExistingAsset.setorNome.trim().toLowerCase() !== targetSectorForAdd.trim().toLowerCase();
      if (isOtherSector) {
        setPendingMacroDivergenceConfirm({
          asset: matchedUntrackedExistingAsset,
          targetRoom: targetSectorForAdd,
          targetUnit: targetUnitForAdd
        });
        return;
      } else {
        // Pertence a esta mesma sala
        if (onUpdateAsset) {
          onUpdateAsset({
            ...matchedUntrackedExistingAsset,
            auditoria: {
              ...matchedUntrackedExistingAsset.auditoria,
              conferido: true,
              dataConferencia: new Date().toISOString().slice(0, 16).replace('T', ' '),
              responsavelConferencia: currentProfile.nome,
              statusDivergencia: 'conforme',
              unidadeEncontrada: activeMacroInfo.id !== 'all' ? activeMacroInfo.nome : matchedUntrackedExistingAsset.unidadeNome,
              setorEncontrado: targetSectorForAdd,
              observacaoAuditoria: 'Conferido no Caderno de Balanço.'
            }
          });
        }
        setShowAddUntrackedModal(false);
        setMatchedUntrackedExistingAsset(null);
        setFeedbackMsg(`Item "${matchedUntrackedExistingAsset.descricao}" conferido com sucesso nesta sala!`);
        setTimeout(() => setFeedbackMsg(null), 5000);
        return;
      }
    }

    const unitInfo = units.find(u => u.id === targetUnitForAdd) || {
      id: targetUnitForAdd,
      nome: targetUnitForAdd === 'policlinica' ? 'Policlínica Bernardo Félix da Silva' : targetUnitForAdd === 'ceo' ? 'CEO – Centro de Especialidades Odontológicas' : 'Consórcio CPSMS (Sede Administrativa)'
    };

    const consorcio = newTomboConsorcioInput.trim() || (newOrigemTombo.includes('CPSMS') ? newTomboInput.trim() : '');
    const sesa = newTomboSesaInput.trim() || (newOrigemTombo.includes('SESA') ? newTomboInput.trim() : '');
    const ufc = newTomboUfcInput.trim() || (newOrigemTombo.includes('UFC') ? newTomboInput.trim() : '');
    const fcpc = newTomboFcpcInput.trim();
    const outros = newOutrosTombosInput.trim();

    const tomboFinal = newTomboInput.trim() || consorcio || sesa || ufc || fcpc || outros || `FORA-ASPEC-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAssetObj: Asset = {
      id: `asset-untracked-${Date.now()}`,
      tombamento: tomboFinal,
      tomboConsorcio: consorcio || undefined,
      tomboSesa: sesa || undefined,
      tomboOrigemSesa: sesa || undefined,
      tomboUfc: ufc || undefined,
      tomboFcpc: fcpc || undefined,
      outrosTombos: outros || undefined,
      tomboSecundario: outros || undefined,
      duploTombamento: Boolean((consorcio && sesa) || (consorcio && ufc) || (sesa && ufc) || (consorcio && fcpc)),
      foraDoAspec: true, // Marked explicitly as physical asset not in original ASPEC!
      origemTombo: newOrigemTombo,
      origemRecurso: 'Inventário Físico In Loco (Não Constava no ASPEC)',
      formaAquisicao: 'Achado de Inventário / A Regularizar',
      orgao: 'Consórcio Público de Saúde da Microrregião de Sobral (CPSMS)',
      descricao: newDescricaoInput.trim(),
      unidadeId: unitInfo.id,
      unidadeNome: unitInfo.nome,
      area: targetSectorForAdd || 'Setor Não Informado',
      subarea: targetSubsetorForAdd || targetSectorForAdd || 'Ambiente',
      setorId: `sector-${(targetSectorForAdd || 'geral').toLowerCase().replace(/\s+/g, '-')}`,
      setorNome: targetSectorForAdd || 'Setor Geral',
      subsetorNome: targetSubsetorForAdd || targetSectorForAdd || 'Sala / Ambiente',
      responsavelNome: newResponsavelInput.trim() || 'Coordenador do Setor',
      responsavelCargo: 'Detentor Provisório da Carga',
      responsavelMatricula: 'CPSMS-REG',
      categoria: 'Equipamentos Médicos & Odontológicos',
      estado: newEstadoInput,
      valorAquisicao: parseFloat(newValorEstimado.replace(',', '.')) || 0,
      valorResidual: parseFloat(newValorEstimado.replace(',', '.')) || 0,
      dataAquisicao: new Date().toISOString().slice(0, 10),
      dataTombamento: new Date().toISOString().slice(0, 10),
      notaFiscal: 'S/N - Achado Físico',
      fornecedor: newFornecedorInput.trim() || 'A Apurar pelo Consórcio',
      numeroSerie: newSerialInput.trim() || 'S/N',
      observacoes: `Bem físico identificado na conferência sala a sala em ${new Date().toLocaleDateString('pt-BR')} pela Gestora de Patrimônio. Não constava na carga inicial do sistema ASPEC. Requer retombamento e regularização contábil.`,
      auditoria: {
        conferido: true,
        dataConferencia: new Date().toISOString().slice(0, 16).replace('T', ' '),
        responsavelConferencia: currentProfile.nome,
        statusDivergencia: 'conforme',
        unidadeEncontrada: unitInfo.nome,
        setorEncontrado: targetSectorForAdd,
        observacaoAuditoria: 'Cadastrado diretamente na conferência da sala.'
      }
    };

    onAddAsset?.(newAssetObj);
    setShowAddUntrackedModal(false);
    setMatchedUntrackedExistingAsset(null);
    setFeedbackMsg(`Bem "${newAssetObj.descricao}" (Tombo: ${newAssetObj.tombamento}) adicionado com sucesso à sala "${targetSectorForAdd}" e marcado como Fora do ASPEC!`);
    setTimeout(() => setFeedbackMsg(null), 6000);
  };

  // Open modal to manage / add multiple tombos for any existing asset (Consórcio, SESA, UFC, FCPC, Outros)
  const openEditTombosModal = (asset: Asset) => {
    setEditingTombosAsset(asset);
    setEditTombamentoPrincipal(asset.tombamento || '');
    setEditTomboConsorcio(asset.tomboConsorcio || (asset.origemTombo.includes('CPSMS') ? asset.tombamento : ''));
    setEditTomboSesa(asset.tomboSesa || asset.tomboOrigemSesa || (asset.origemTombo.includes('SESA') ? asset.tombamento : ''));
    setEditTomboUfc(asset.tomboUfc || (asset.origemTombo.includes('UFC') ? asset.tombamento : ''));
    setEditTomboFcpc(asset.tomboFcpc || '');
    setEditOutrosTombos(asset.outrosTombos || asset.tomboSecundario || '');
    setEditOrigemTombo(asset.origemTombo || 'CPSMS (Próprio do Consórcio)');
  };

  // Save multiple tombos for an asset
  const handleSaveTombos = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTombosAsset || !onUpdateAsset) return;

    const consorcio = editTomboConsorcio.trim();
    const sesa = editTomboSesa.trim();
    const ufc = editTomboUfc.trim();
    const fcpc = editTomboFcpc.trim();
    const outros = editOutrosTombos.trim();
    const principal = editTombamentoPrincipal.trim() || consorcio || sesa || ufc || fcpc || outros || editingTombosAsset.tombamento;

    const updated: Asset = {
      ...editingTombosAsset,
      tombamento: principal,
      tomboConsorcio: consorcio || undefined,
      tomboSesa: sesa || undefined,
      tomboOrigemSesa: sesa || undefined, // keep in sync
      tomboUfc: ufc || undefined,
      tomboFcpc: fcpc || undefined,
      outrosTombos: outros || undefined,
      tomboSecundario: outros || undefined,
      origemTombo: editOrigemTombo,
      duploTombamento: Boolean((consorcio && sesa) || (consorcio && ufc) || (sesa && ufc) || (consorcio && fcpc))
    };

    onUpdateAsset(updated);
    setEditingTombosAsset(null);
    setFeedbackMsg(`Tombos do item "${updated.descricao}" atualizados com sucesso no Caderno de Balanço!`);
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  // Explicitly mark asset as OK (Conferido)
  const handleMarkAsOk = (asset: Asset) => {
    if (!onUpdateAsset) return;
    const updated: Asset = {
      ...asset,
      auditoria: {
        ...asset.auditoria,
        conferido: true,
        dataConferencia: new Date().toISOString().slice(0, 16).replace('T', ' '),
        responsavelConferencia: currentProfile.nome,
        statusDivergencia: 'conforme',
        unidadeEncontrada: activeMacroInfo.id !== 'all' ? activeMacroInfo.nome : asset.unidadeNome,
        setorEncontrado: asset.setorNome,
        observacaoAuditoria: 'Conferido (OK) no Caderno de Balanço.'
      }
    };
    onUpdateAsset(updated);
    setFeedbackMsg(`Tombo ${asset.tombamento} (${asset.descricao}) marcado como CONFERIDO (OK) ☑!`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Explicitly mark asset as PENDENTE (Pendente de conferência)
  const handleMarkAsPending = (asset: Asset) => {
    if (!onUpdateAsset) return;
    const updated: Asset = {
      ...asset,
      auditoria: {
        ...asset.auditoria,
        conferido: false,
        dataConferencia: undefined,
        responsavelConferencia: undefined,
        statusDivergencia: undefined,
        unidadeEncontrada: undefined,
        setorEncontrado: undefined,
        observacaoAuditoria: 'Marcado como pendente de conferência no Caderno de Balanço.'
      }
    };
    onUpdateAsset(updated);
    setFeedbackMsg(`Tombo ${asset.tombamento} (${asset.descricao}) marcado como PENDENTE ☐!`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Quick Toggle Asset Status directly in Caderno de Balanço
  const handleToggleAssetCheck = (asset: Asset) => {
    if (asset.auditoria?.conferido) {
      handleMarkAsPending(asset);
    } else {
      handleMarkAsOk(asset);
    }
  };

  // Batch actions for room
  const handleMarkRoomAllOk = (roomAssets: Asset[]) => {
    if (!onUpdateAsset) return;
    roomAssets.forEach(asset => {
      const updated: Asset = {
        ...asset,
        auditoria: {
          ...asset.auditoria,
          conferido: true,
          dataConferencia: new Date().toISOString().slice(0, 16).replace('T', ' '),
          responsavelConferencia: currentProfile.nome,
          statusDivergencia: 'conforme',
          unidadeEncontrada: activeMacroInfo.id !== 'all' ? activeMacroInfo.nome : asset.unidadeNome,
          setorEncontrado: asset.setorNome,
          observacaoAuditoria: 'Conferido em lote no Caderno de Balanço.'
        }
      };
      onUpdateAsset(updated);
    });
    setFeedbackMsg(`Todos os ${roomAssets.length} itens da sala foram marcados como CONFERIDOS (OK) ☑!`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleMarkRoomAllPending = (roomAssets: Asset[]) => {
    if (!onUpdateAsset) return;
    roomAssets.forEach(asset => {
      const updated: Asset = {
        ...asset,
        auditoria: {
          ...asset.auditoria,
          conferido: false,
          dataConferencia: undefined,
          responsavelConferencia: undefined,
          statusDivergencia: undefined,
          unidadeEncontrada: undefined,
          setorEncontrado: undefined,
          observacaoAuditoria: 'Marcado como pendente em lote no Caderno de Balanço.'
        }
      };
      onUpdateAsset(updated);
    });
    setFeedbackMsg(`Todos os ${roomAssets.length} itens da sala foram marcados como PENDENTES ☐!`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Export report to CSV
  const handleExportCsv = () => {
    const rows = [
      ['Macro Unidade', 'Micro Sala / Setor', 'Tombo Principal', 'Tombo Consórcio (CPSMS)', 'Tombo SESA (6 dig)', 'Tombo UFC', 'Tombo FCPC', 'Outros Tombos', 'Origem', 'Descrição', 'N/S', 'Estado', 'Valor (R$)', 'Conferido?', 'Fora do ASPEC?', 'Responsável']
    ];

    groupedData.forEach(m => {
      m.rooms.forEach(r => {
        r.assets.forEach(a => {
          rows.push([
            m.unitNome,
            r.roomName,
            a.tombamento,
            a.tomboConsorcio || (a.origemTombo.includes('CPSMS') ? a.tombamento : ''),
            a.tomboSesa || a.tomboOrigemSesa || (a.origemTombo.includes('SESA') ? a.tombamento : ''),
            a.tomboUfc || (a.origemTombo.includes('UFC') ? a.tombamento : ''),
            a.tomboFcpc || '',
            a.outrosTombos || a.tomboSecundario || '',
            a.origemTombo,
            `"${a.descricao.replace(/"/g, '""')}"`,
            a.numeroSerie || '',
            a.estado,
            String(a.valorAquisicao || 0),
            a.auditoria?.conferido ? 'SIM' : 'NÃO',
            a.foraDoAspec ? 'SIM (FORA DO ASPEC)' : 'NÃO',
            a.responsavelNome || ''
          ]);
        });
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `balanco_patrimonio_macro_micro_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate standalone complete HTML for reliable printing in iframe, new window, or file
  const generateStandaloneHtml = (): string => {
    const emissionDate = new Date();
    const dateFormatted = emissionDate.toLocaleDateString('pt-BR');
    const timeFormatted = emissionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const unitsHtml = groupedData.map(macroUnit => {
      const roomsHtml = macroUnit.rooms.map(room => {
        const assetsRows = room.assets.map((asset, idx) => {
          const isChecked = asset.auditoria?.conferido;
          const isUntracked = asset.foraDoAspec;
          const tomboConsorcio = asset.tomboConsorcio || (asset.origemTombo.includes('CPSMS') ? asset.tombamento : '');
          const tomboSesa = asset.tomboSesa || asset.tomboOrigemSesa || (asset.origemTombo.includes('SESA') ? asset.tombamento : '');
          const tomboUfc = asset.tomboUfc || (asset.origemTombo.includes('UFC') ? asset.tombamento : '');
          const tomboFcpc = asset.tomboFcpc || '';
          const outros = asset.outrosTombos || asset.tomboSecundario || '';
          const val = asset.valorAquisicao || 0;

          return `
            <tr style="${isUntracked ? 'background-color:#fffbeb;' : idx % 2 === 1 ? 'background-color:#f8fafc;' : ''}">
              <td style="text-align:center;padding:5px;border:1px solid #cbd5e1;font-size:12px;">${isChecked ? '☑' : '☐'}</td>
              <td style="font-family:monospace;font-weight:bold;padding:5px;border:1px solid #cbd5e1;white-space:nowrap;">
                <div style="color:#0f172a;font-size:11px;">${asset.tombamento}</div>
                <div style="font-size:8.5px;color:#334155;margin-top:2px;line-height:1.2;">
                  ${tomboConsorcio ? `<span style="color:#047857;font-weight:bold;">CPSMS: ${tomboConsorcio}</span><br/>` : ''}
                  ${tomboSesa ? `<span style="color:#1d4ed8;font-weight:bold;">SESA: ${tomboSesa}</span><br/>` : ''}
                  ${tomboUfc ? `<span style="color:#b45309;font-weight:bold;">UFC: ${tomboUfc}</span><br/>` : ''}
                  ${tomboFcpc ? `<span style="color:#7e22ce;font-weight:bold;">FCPC: ${tomboFcpc}</span><br/>` : ''}
                  ${outros ? `<span style="color:#475569;font-weight:bold;">OUTRO: ${outros}</span>` : ''}
                </div>
              </td>
              <td style="padding:5px;border:1px solid #cbd5e1;font-size:10px;">${asset.origemTombo.split(' ')[0]}</td>
              <td style="padding:5px;border:1px solid #cbd5e1;">
                <div style="font-weight:600;color:#0f172a;">${(asset.descricao || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                ${asset.auditoria?.statusDivergencia === 'setor_divergente' ? `
                  <div style="font-size:8.5px;color:#92400e;background:#fef3c7;border:1px solid #fde68a;padding:3px 5px;border-radius:3px;margin-top:2px;">
                    <strong>📍 OBSERVAÇÃO DE LOCALIZAÇÃO PROVISÓRIA NO CADERNO:</strong><br/>
                    Físico na sala "${room.roomName}". Cadastro oficial ASPEC: "${asset.setorOriginalAspec || asset.setorNome}".
                    ${asset.statusRegularizacaoAspec === 'oficializado'
                      ? '<br/><span style="color:#065f46;font-weight:bold;">✓ Registro Definitivo Oficializado no ASPEC pela Gestora. Dados unificados!</span>'
                      : '<br/><span style="color:#b45309;font-weight:bold;">⏳ Registro definitivo aguarda confirmação de baixa/mudança definitiva no sistema ASPEC (OK Oficial da Gestora).</span>'}
                  </div>
                ` : isUntracked ? '<div style="font-size:9px;color:#b45309;font-weight:bold;margin-top:2px;">⚠️ IDENTIFICADO FORA DO ASPEC</div>' : ''}
              </td>
              <td style="font-family:monospace;font-size:10px;padding:5px;border:1px solid #cbd5e1;">${asset.numeroSerie && asset.numeroSerie !== '-' ? asset.numeroSerie : asset.fornecedor || '-'}</td>
              <td style="text-align:center;font-size:10px;padding:5px;border:1px solid #cbd5e1;">${asset.estado}</td>
              <td style="text-align:right;font-family:monospace;font-size:10px;padding:5px;border:1px solid #cbd5e1;white-space:nowrap;">${formatBRL(val)}</td>
            </tr>
          `;
        }).join('');

        const blankRowsHtml = blankLinesCount > 0 ? `
          <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #cbd5e1;">
            <div style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#92400e;background:#fef3c7;padding:4px 8px;border:1px solid #fde68a;border-radius:4px;margin-bottom:6px;">
              ✏️ BENS ENCONTRADOS NESTA SALA QUE NÃO CONSTAM NO ASPEC (ANOTAÇÃO MANUAL DA COMISSÃO DE INVENTÁRIO):
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:10px;font-family:monospace;">
              <thead>
                <tr style="background:#fef3c7;color:#78350f;">
                  <th style="padding:4px;border:1px solid #fde68a;width:28px;text-align:center;">Conf.</th>
                  <th style="padding:4px;border:1px solid #fde68a;width:85px;">Tombo Consórcio</th>
                  <th style="padding:4px;border:1px solid #fde68a;width:85px;">Tombo SESA</th>
                  <th style="padding:4px;border:1px solid #fde68a;width:95px;">Tombo UFC / FCPC</th>
                  <th style="padding:4px;border:1px solid #fde68a;">Descrição do Item / Marca Encontrada</th>
                  <th style="padding:4px;border:1px solid #fde68a;width:70px;">Estado</th>
                  <th style="padding:4px;border:1px solid #fde68a;width:80px;">Nº de Série</th>
                  <th style="padding:4px;border:1px solid #fde68a;width:100px;">Anotações</th>
                </tr>
              </thead>
              <tbody>
                ${Array.from({ length: blankLinesCount }).map(() => `
                  <tr style="height:26px;">
                    <td style="border:1px solid #fde68a;text-align:center;color:#94a3b8;">☐</td>
                    <td style="border:1px solid #fde68a;"></td>
                    <td style="border:1px solid #fde68a;"></td>
                    <td style="border:1px solid #fde68a;"></td>
                    <td style="border:1px solid #fde68a;"></td>
                    <td style="border:1px solid #fde68a;"></td>
                    <td style="border:1px solid #fde68a;"></td>
                    <td style="border:1px solid #fde68a;"></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '';

        return `
          <div style="border:2px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:16px;background:#ffffff;page-break-inside:avoid;break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px;">
              <div>
                <div style="font-size:9px;font-family:monospace;font-weight:bold;text-transform:uppercase;color:#475569;background:#f1f5f9;display:inline-block;padding:2px 6px;border-radius:4px;">
                  MICRO-LOCALIZAÇÃO / SALA · ${room.assets.length} ${room.assets.length === 1 ? 'bem' : 'bens'}
                </div>
                <div style="font-size:14px;font-weight:900;text-transform:uppercase;color:#0f172a;margin-top:3px;">
                  📍 ${room.roomName}
                </div>
                ${room.responsavel ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">Titular da Carga: <strong>${room.responsavel}</strong></div>` : ''}
              </div>
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f1f5f9;color:#0f172a;font-size:9px;text-transform:uppercase;font-weight:bold;">
                  <th style="padding:6px;border:1px solid #cbd5e1;width:32px;text-align:center;">Conf.</th>
                  <th style="padding:6px;border:1px solid #cbd5e1;width:150px;">Tombos (Consórcio · SESA · UFC · FCPC)</th>
                  <th style="padding:6px;border:1px solid #cbd5e1;width:60px;">Origem</th>
                  <th style="padding:6px;border:1px solid #cbd5e1;">Descrição do Equipamento / Mobiliário</th>
                  <th style="padding:6px;border:1px solid #cbd5e1;width:80px;">S/N / Marca</th>
                  <th style="padding:6px;border:1px solid #cbd5e1;width:65px;text-align:center;">Estado</th>
                  <th style="padding:6px;border:1px solid #cbd5e1;width:85px;text-align:right;">Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${assetsRows}
              </tbody>
            </table>

            ${blankRowsHtml}

            <div style="display:flex;justify-content:space-between;font-size:9px;color:#64748b;border-top:1px solid #f1f5f9;padding-top:6px;margin-top:8px;">
              <span>Vistoriado por: _____________________________ (Comissão)</span>
              <span>Ciente da Carga: _____________________________ (Responsável da Sala)</span>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="margin-top:20px;page-break-before:auto;">
          <div style="background:#0f172a;color:#ffffff;padding:10px 14px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div>
              <div style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#fbbf24;letter-spacing:1px;">
                LOCALIZAÇÃO MACRO: UNIDADE CPSMS
              </div>
              <div style="font-size:15px;font-weight:900;text-transform:uppercase;">
                ${macroUnit.unitNome}
              </div>
            </div>
            <div style="text-align:right;font-size:11px;font-family:monospace;">
              <div style="font-weight:bold;">${macroUnit.totalAssets} bens alocados</div>
              <div style="color:#cbd5e1;font-size:10px;">${formatBRL(macroUnit.totalVal)}</div>
            </div>
          </div>
          ${roomsHtml}
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Caderno de Balanço e Inventário Físico - CPSMS</title>
  <style>
    @page {
      size: portrait;
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 16px;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.35;
    }
    .no-print {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: white;
      padding: 12px 18px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .btn {
      background: #10b981;
      color: #0f172a;
      border: none;
      padding: 8px 18px;
      font-weight: 800;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .btn:hover { background: #34d399; }
    .btn-close {
      background: #334155;
      color: white;
      border: none;
      padding: 8px 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      margin-left: 8px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 14px;
      font-family: Georgia, serif;
    }
    .header .gov { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #334155; letter-spacing: 1px; }
    .header .org { font-size: 15px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 2px; }
    .header .units { font-size: 11px; color: #475569; margin-top: 1px; }
    .header .title {
      display: inline-block;
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      background: #f1f5f9;
      padding: 5px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      margin-top: 8px;
      font-family: sans-serif;
    }
    .header .meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 6px;
      font-family: monospace;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .metric-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px;
      background: #f8fafc;
      font-size: 11px;
    }
    .instructions {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      font-size: 11px;
      margin-bottom: 16px;
      line-height: 1.4;
    }
    .signatures {
      margin-top: 30px;
      border-top: 2px solid #0f172a;
      padding-top: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      text-align: center;
      font-size: 11px;
      margin-top: 20px;
    }
    .sig-line {
      border-bottom: 1px solid #0f172a;
      margin-bottom: 6px;
      padding-bottom: 35px;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; background: white; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <strong>CPSMS · Caderno de Vistoria e Balanço Geral (Macro ➔ Micro)</strong> · ${grandTotalAssets} bens alocados
    </div>
    <div>
      <button class="btn" onclick="window.print()">🖨️ Imprimir / Salvar em PDF (Ctrl+P)</button>
      <button class="btn-close" onclick="window.close()">✖ Fechar</button>
    </div>
  </div>

  <div class="header">
    <div class="gov">ESTADO DO CEARÁ · GOVERNO DO ESTADO DO CEARÁ</div>
    <div class="org">CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS</div>
    <div class="units">POLICLÍNICA REGIONAL BERNARDO FÉLIX DA SILVA · CEO REGIONAL SOBRAL · CPSMS SEDE · CER</div>
    <div>
      <div class="title">CADERNO DE VISTORIA FÍSICA E BALANÇO PATRIMONIAL SALA A SALA — EXERCÍCIO 2026</div>
    </div>
    <div class="meta">
      Emissão: ${dateFormatted} às ${timeFormatted} · Presidente da Comissão de Inventário: ${currentProfile.nome}
    </div>
  </div>

  <div class="metrics">
    <div class="metric-card">
      <span style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:bold;display:block;">Total de Bens:</span>
      <strong style="font-size:14px;font-family:monospace;">${grandTotalAssets} itens</strong>
    </div>
    <div class="metric-card">
      <span style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:bold;display:block;">Conferidos:</span>
      <strong style="font-size:14px;font-family:monospace;color:#16a34a;">${grandTotalChecked} (${grandTotalAssets > 0 ? Math.round((grandTotalChecked / grandTotalAssets) * 100) : 0}%)</strong>
    </div>
    <div class="metric-card">
      <span style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:bold;display:block;">Fora do ASPEC:</span>
      <strong style="font-size:14px;font-family:monospace;color:#d97706;">${grandTotalUntracked} itens novos</strong>
    </div>
    <div class="metric-card">
      <span style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:bold;display:block;">Valor Alocado:</span>
      <strong style="font-size:13px;font-family:monospace;">${formatBRL(grandTotalValue)}</strong>
    </div>
  </div>

  <div class="instructions">
    <strong style="text-transform:uppercase;color:#0f172a;display:block;margin-bottom:4px;">
      Instruções para a Comissão de Inventário Durante a Conferência Física:
    </strong>
    1. Marque com <strong>[ X ]</strong> na coluna de conferência cada item fisicamente localizado na sala conferindo a plaqueta.<br />
    2. Verifique se o equipamento possui <strong>plaqueta SESA de 6 dígitos</strong> ou <strong>plaqueta CPSMS de 4 dígitos</strong>.<br />
    3. Caso encontre na sala algum bem <strong>NÃO CONSTANTE NA LISTA DO ASPEC</strong>, anote-o obrigatoriamente no quadro de <em>"Bens Encontrados Fora do ASPEC"</em> para abertura do processo de retombamento e regularização contábil perante o TCE-CE.
  </div>

  ${unitsHtml}

  <div class="signatures">
    <div style="text-align:center;font-size:12px;font-weight:bold;text-transform:uppercase;margin-bottom:8px;">
      TERMO DE CONFERÊNCIA E ENCERRAMENTO DO BALANÇO DE INVENTÁRIO FÍSICO
    </div>
    <p style="font-size:11px;text-align:justify;line-height:1.5;color:#334155;">
      Certificamos que foi realizado o levantamento físico e a conferência sala a sala dos bens móveis e equipamentos da presente macro-unidade, tendo sido confrontadas as plaquetas físicas do Consórcio CPSMS e da Secretaria de Saúde do Estado do Ceará (SESA), registrando-se os bens regulares e relacionando-se os itens identificados fora do sistema contábil ASPEC para fins de conciliação físico-financeira perante o Tribunal de Contas do Estado do Ceará (TCE-CE).
    </p>

    <div class="sig-grid">
      <div>
        <div class="sig-line"></div>
        <strong>${currentProfile.nome}</strong><br />
        <span style="font-size:9px;color:#64748b;">Presidente da Comissão / Gestora de Patrimônio</span>
      </div>
      <div>
        <div class="sig-line"></div>
        <strong>Membro da Comissão de Inventário</strong><br />
        <span style="font-size:9px;color:#64748b;">Representante do Setor de Saúde</span>
      </div>
      <div>
        <div class="sig-line"></div>
        <strong>Diretoria Executiva do CPSMS</strong><br />
        <span style="font-size:9px;color:#64748b;">Homologação Final para o TCE-CE</span>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) { console.warn('Auto print failed:', e); }
      }, 350);
    });
  </script>
</body>
</html>`;
  };

  // Robust print execution with hidden iframe and direct/download fallbacks
  const handlePrint = () => {
    setIsPrinting(true);
    const html = generateStandaloneHtml();
    const filename = `caderno_balanco_${selectedMacro}_${new Date().toISOString().slice(0, 10)}.html`;

    executePrintHtml({
      title: 'Caderno de Balanço CPSMS',
      html,
      filename,
      onStatus: (status) => {
        setPrintStatus(status);
        if (status?.type !== 'info') {
          setIsPrinting(false);
        }
      }
    });
  };

  // Instant download of the complete self-contained printable report
  const handleDownloadHtml = () => {
    const html = generateStandaloneHtml();
    const filename = `caderno_balanco_${selectedMacro}_${new Date().toISOString().slice(0, 10)}.html`;
    downloadPrintableHtml(filename, html);
    setPrintStatus({
      message: 'Arquivo do relatório baixado! Dê dois cliques no arquivo para abrir no navegador e use Ctrl+P para imprimir ou salvar como PDF.',
      type: 'success'
    });
    setTimeout(() => setPrintStatus(null), 8000);
  };

  // Open printable document in a new window/tab
  const handleOpenInNewTab = () => {
    const html = generateStandaloneHtml();
    const win = openPrintableInNewWindow(html);
    if (!win) {
      handleDownloadHtml();
    } else {
      setPrintStatus({
        message: 'Relatório aberto em nova janela com visualização de impressão pronta!',
        type: 'success'
      });
      setTimeout(() => setPrintStatus(null), 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="printable-modal-overlay fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
      <div className="printable-modal-card bg-white dark:bg-slate-900 text-slate-950 dark:text-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[96vh] flex flex-col border border-slate-200 dark:border-slate-800 my-auto">
        
        {/* Top Control Bar (Screen only - HIDDEN IN PRINT) */}
        <div className="no-print p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 rounded-t-2xl space-y-4 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Caderno de Balanço & Inventário Geral (Macro ➔ Micro)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300">
                    Conferência Sala a Sala
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Relatório analítico agrupado por <strong>Localização Macro</strong> (Consórcio, Policlínica, CEO) e <strong>Localização Micro</strong> (salas/consultórios) com campos para itens fora do ASPEC.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setTargetUnitForAdd(selectedMacro === 'all' ? 'policlinica' : selectedMacro);
                  setTargetSectorForAdd(distinctMicroRooms[0] || 'Consultório 01');
                  setTargetSubsetorForAdd(distinctMicroRooms[0] || 'Consultório 01');
                  setShowAddUntrackedModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg shadow-sm transition-colors cursor-pointer min-h-[38px]"
                title="Cadastrar bem físico encontrado na vistoria que não está no ASPEC"
              >
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>+ Adicionar Tombo Fora do ASPEC</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer min-h-[38px]"
                title="Exportar planilha analítica em formato CSV / Excel"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Exportar CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-lg shadow-md transition-all cursor-pointer min-h-[38px]"
                title="Abrir diálogo de impressão do navegador ou salvar como PDF"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>{isPrinting ? 'Preparando...' : 'Imprimir Caderno (A4 / PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer min-h-[38px]"
                title="Baixar arquivo HTML do relatório para abrir no navegador e imprimir diretamente (Ctrl+P / Salvar PDF)"
              >
                <FileCode className="w-4 h-4 text-indigo-500" />
                <span>Baixar HTML / PDF</span>
              </button>

              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer min-h-[38px]"
                title="Abrir relatório em nova aba para imprimir sem restrições"
              >
                <ExternalLink className="w-4 h-4 text-sky-500" />
                <span className="hidden sm:inline">Nova Aba</span>
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

          {/* Direct Navigation Alert to Audit tab with Clear Guidance */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-950 dark:text-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-black text-blue-900 dark:text-blue-300">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Como editar e conferir seus bens (Caminhos de Ação):</span>
              </div>
              <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed">
                • <strong>Edição Rápida Aqui:</strong> Clique na caixinha <strong>☐ / ☑</strong> de qualquer bem na tabela abaixo para alternar entre <em>Pendente</em> e <em>Conferido (OK)</em>.<br />
                • <strong>Vistoria Completa Sala a Sala (Recomendado):</strong> Para marcar <strong>OK</strong> no que está, colocar <strong>X</strong> no que falta, adicionar itens e gerar o <strong>Termo de Alterações do ASPEC</strong>, clique no botão ao lado ou no botão verde de cada sala!
              </p>
            </div>
            {onNavigateToAudit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToAudit(selectedMicroFilter !== 'all' ? selectedMicroFilter : undefined, selectedMacro !== 'all' ? selectedMacro : undefined);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs cursor-pointer shrink-0 shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Abrir Vistoria Completa (Auditoria) →</span>
              </button>
            )}
          </div>

          {printStatus && (
            <div className={`p-3 rounded-lg text-xs font-medium flex flex-wrap items-center justify-between gap-2 border ${
              printStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' :
              printStatus.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800' :
              printStatus.type === 'error' ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800' :
              'bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800'
            }`}>
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 shrink-0" />
                <span>{printStatus.message}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 cursor-pointer text-[11px]"
                >
                  💾 Baixar HTML Formatado
                </button>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 cursor-pointer text-[11px]"
                >
                  ↗️ Abrir Nova Janela
                </button>
                <button
                  type="button"
                  onClick={() => setPrintStatus(null)}
                  className="px-1 text-slate-400 hover:text-slate-600 dark:hover:text-white ml-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {feedbackMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-xs font-bold border border-emerald-300 flex items-center justify-between">
              <span>{feedbackMsg}</span>
              <button onClick={() => setFeedbackMsg(null)}>✕</button>
            </div>
          )}

          {/* Filter Bar Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-2 text-xs">
            {/* Macro Location Buttons */}
            <div className="lg:col-span-5 space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 block">
                1. Localização Macro (Unidade):
              </label>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {macroEntities.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMacro(m.id);
                      setSelectedMicroFilter('all');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      selectedMacro === m.id
                        ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{m.icon} {m.sigla}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Micro Room Filter */}
            <div className="lg:col-span-3 space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 block">
                2. Filtrar Sala / Micro-Local:
              </label>
              <select
                value={selectedMicroFilter}
                onChange={(e) => setSelectedMicroFilter(e.target.value)}
                className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
              >
                <option value="all">Todas as Salas ({distinctMicroRooms.length})</option>
                {distinctMicroRooms.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 block">
                3. Buscar Bem / Plaqueta:
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tombo, descrição..."
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
            </div>

            {/* Mode & Blank Lines Options */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 block">
                4. Linhas em Branco / Sala:
              </label>
              <select
                value={blankLinesCount}
                onChange={(e) => setBlankLinesCount(Number(e.target.value))}
                className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
              >
                <option value={1}>1 linha pautada p/ novos tombos</option>
                <option value={3}>3 linhas pautadas p/ novos tombos</option>
                <option value={5}>5 linhas pautadas p/ novos tombos</option>
                <option value={0}>Sem linhas em branco</option>
              </select>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Total de Bens no Caderno:</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                {grandTotalAssets} itens
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Bens Já Conferidos:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {grandTotalChecked} de {grandTotalAssets} ({grandTotalAssets > 0 ? Math.round((grandTotalChecked / grandTotalAssets) * 100) : 0}%)
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Achados Fora do ASPEC:</span>
              <span className="font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
                {grandTotalUntracked} itens novos
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Valor Patrimonial Alocado:</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                {formatBRL(grandTotalValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="printable-report-scroll-container overflow-y-auto p-4 sm:p-8 space-y-6 flex-1 bg-white text-slate-950 font-sans">
          <div className="max-w-5xl mx-auto space-y-6 text-slate-950">
            
            {/* Report Official Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1 font-serif">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
                ESTADO DO CEARÁ · GOVERNO DO ESTADO DO CEARÁ
              </div>
              <div className="text-base font-black uppercase text-slate-950">
                CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS
              </div>
              <div className="text-xs text-slate-700 font-medium">
                POLICLÍNICA REGIONAL BERNARDO FÉLIX DA SILVA · CEO REGIONAL SOBRAL · CER · SEDE
              </div>
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-900 pt-1 font-sans">
                CADERNO DE VISTORIA FÍSICA E BALANÇO PATRIMONIAL SALA A SALA — EXERCÍCIO 2026
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Presidente da Comissão: {currentProfile?.nome || 'Gestora de Patrimônio'}
              </div>
            </div>

            {/* Instruction Box for the Inventory Team */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded text-[11px] font-sans space-y-1">
              <div className="font-bold uppercase text-slate-800 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                Instruções para a Comissão de Inventário Durante a Conferência Física:
              </div>
              <p className="text-slate-700 leading-snug">
                1. Marque com <strong>[ X ]</strong> na coluna de conferência cada item fisicamente localizado na sala conferindo a plaqueta.<br />
                2. Verifique se o equipamento possui <strong>plaqueta SESA de 6 dígitos</strong> ou <strong>plaqueta CPSMS de 4 dígitos</strong>.<br />
                3. Caso encontre na sala algum bem <strong>NÃO CONSTANTE NA LISTA DO ASPEC</strong>, anote-o obrigatoriamente no quadro de <em>"Bens Encontrados Fora do ASPEC"</em> abaixo de cada sala para abertura do processo de retombamento e regularização contábil.
              </p>
            </div>

            {/* Search Query Feedback & Observation of Provisional Location */}
            {reportSearchQuery.trim() && (
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs space-y-1.5 font-sans animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="font-black text-amber-950 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-amber-700" />
                    <span>Resultado da Busca no Caderno de Balanço por: "{reportSearchQuery.trim()}"</span>
                  </div>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">
                    {groupedData.reduce((acc, m) => acc + m.totalAssets, 0)} itens encontrados
                  </span>
                </div>
                {groupedData.some(m => m.rooms.some(r => r.assets.some(a => a.statusRegularizacaoAspec === 'provisorio' || a.auditoria?.statusDivergencia === 'setor_divergente'))) && (
                  <div className="p-2.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-900 font-black">
                        Observação de Localização Provisória no Caderno de Balanço:
                      </strong>
                      <span>
                        O bem pesquisado foi localizado fisicamente na sala informada, mas consta registrado no sistema ASPEC em outro setor. Sua localização atual no caderno de balanço é provisória. O registro definitivo na sala só será oficializado após a Gestora confirmar a baixa/mudança definitiva no sistema ASPEC, unificando os dados apenas após o 'OK' oficial.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RENDER GROUPED DATA: MACRO -> MICRO */}
            {groupedData.map(macroUnit => (
              <div key={macroUnit.unitId} className="space-y-6 pt-2">
                
                {/* MACRO UNIT HEADER BANNER */}
                <div className="bg-slate-900 text-white p-3 rounded-lg flex items-center justify-between font-sans print:bg-slate-900 print:text-white">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                      LOCALIZAÇÃO MACRO 1: UNIDADE DO CONSÓRCIO
                    </span>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">
                      {macroUnit.unitNome}
                    </h3>
                  </div>

                  <div className="text-right text-xs">
                    <span className="font-mono font-bold block">{macroUnit.totalAssets} bens alocados</span>
                    <span className="text-[10px] text-slate-300 font-mono">{formatBRL(macroUnit.totalVal)}</span>
                  </div>
                </div>

                {/* MICRO ROOMS UNDER THIS MACRO UNIT */}
                {macroUnit.rooms.map(room => (
                  <div 
                    key={`${macroUnit.unitId}-${room.roomName}`} 
                    className="border-2 border-slate-300 rounded-xl p-4 space-y-3 bg-white page-break-inside-avoid font-sans"
                  >
                    {/* Micro Room Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-mono font-bold uppercase">
                            MICRO-LOCALIZAÇÃO / SALA
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {room.assets.length} {room.assets.length === 1 ? 'bem' : 'bens'}
                          </span>
                        </div>
                        <h4 className="text-sm font-black uppercase text-slate-900 mt-0.5">
                          📍 {room.roomName}
                        </h4>
                        {room.responsavel && (
                          <div className="text-[10px] text-slate-600">
                            Titular da Carga: <strong>{room.responsavel}</strong>
                          </div>
                        )}
                      </div>

                      {/* Screen Action: Add Untracked Asset button for this specific room */}
                      <div className="no-print flex items-center gap-2 flex-wrap">
                        {onUpdateAsset && room.assets.length > 0 && (
                          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleMarkRoomAllOk(room.assets)}
                              className="px-2 py-1 text-[10.5px] font-bold bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 rounded shadow-2xs border border-emerald-200 cursor-pointer flex items-center gap-1 transition-all"
                              title="Marcar todos os itens desta sala como OK (Conferidos)"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Todos OK</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkRoomAllPending(room.assets)}
                              className="px-2 py-1 text-[10.5px] font-bold bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 rounded shadow-2xs border border-amber-200 cursor-pointer flex items-center gap-1 transition-all"
                              title="Marcar todos os itens desta sala como Pendentes de conferência"
                            >
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Todos Pendentes</span>
                            </button>
                          </div>
                        )}
                        {onNavigateToAudit && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onNavigateToAudit(room.roomName, macroUnit.unitId);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer shadow-sm ring-2 ring-emerald-500/20 transition-all"
                            title="Abrir esta sala na tela de Auditoria para conferência detalhada, marcar OK no que está, X no que não está e concluir com Termo ASPEC"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Vistoria na Auditoria (OK / X) →</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openAddForSpecificRoom(macroUnit.unitId, room.roomName)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg cursor-pointer"
                          title="Adicionar bem físico encontrado nesta sala que não está no ASPEC"
                        >
                          <Plus className="w-3 h-3 text-amber-800" />
                          <span>+ Bem Fora do ASPEC</span>
                        </button>
                      </div>
                    </div>

                    {/* Table of Assets for this Micro Room */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-[10px] uppercase">
                            <th className="p-1.5 w-20 text-center">Status</th>
                            <th className="p-1.5 min-w-[210px]">Tombos do Item (Consórcio · SESA · UFC · FCPC · Outros)</th>
                            <th className="p-1.5 w-20">Origem</th>
                            <th className="p-1.5">Descrição do Equipamento / Mobiliário</th>
                            <th className="p-1.5 w-20">S/N / Marca</th>
                            <th className="p-1.5 w-16">Estado</th>
                            <th className="p-1.5 w-20 text-right">Valor (R$)</th>
                            <th className="p-1.5 w-44 text-center no-print">Conferência & Tombos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px]">
                          {room.assets.map(asset => {
                            const isChecked = asset.auditoria?.conferido;
                            const isUntracked = asset.foraDoAspec;

                            return (
                              <tr 
                                key={asset.id} 
                                className={`hover:bg-slate-50 ${isUntracked ? 'bg-amber-50/60 font-medium' : ''}`}
                              >
                                <td className="p-1.5 text-center whitespace-nowrap align-middle">
                                  {isChecked ? (
                                    <span 
                                      title="Item conferido e presente in loco (OK)"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>OK</span>
                                    </span>
                                  ) : (
                                    <span 
                                      title="Item pendente de verificação física"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs"
                                    >
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      <span>Pendente</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-1.5 align-top">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-black text-slate-900 text-xs">
                                      {asset.tombamento}
                                    </span>
                                    {asset.duploTombamento && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                                        Duplo Tombo
                                      </span>
                                    )}
                                  </div>

                                  {/* Badges dos múltiplos tombos */}
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(asset.tomboConsorcio || (asset.origemTombo.includes('CPSMS') && asset.tombamento)) && (
                                      <span 
                                        title="Tombo do Consórcio Público (CPSMS)"
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300"
                                      >
                                        <span className="text-[8px] font-sans font-black text-emerald-700 uppercase">CPSMS:</span>
                                        {asset.tomboConsorcio || (asset.origemTombo.includes('CPSMS') ? asset.tombamento : '')}
                                      </span>
                                    )}

                                    {(asset.tomboSesa || asset.tomboOrigemSesa || (asset.origemTombo.includes('SESA') && asset.tombamento)) && (
                                      <span 
                                        title="Tombo da Secretaria da Saúde (SESA / Governo do Ceará)"
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-300"
                                      >
                                        <span className="text-[8px] font-sans font-black text-blue-700 uppercase">SESA:</span>
                                        {asset.tomboSesa || asset.tomboOrigemSesa || (asset.origemTombo.includes('SESA') ? asset.tombamento : '')}
                                      </span>
                                    )}

                                    {(asset.tomboUfc || (asset.origemTombo.includes('UFC') && asset.tombamento)) && (
                                      <span 
                                        title="Tombo da Universidade Federal do Ceará (UFC)"
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300"
                                      >
                                        <span className="text-[8px] font-sans font-black text-amber-700 uppercase">UFC:</span>
                                        {asset.tomboUfc || (asset.origemTombo.includes('UFC') ? asset.tombamento : '')}
                                      </span>
                                    )}

                                    {asset.tomboFcpc && (
                                      <span 
                                        title="Tombo da Fundação Cearense de Pesquisa e Cultura (FCPC)"
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-purple-50 text-purple-900 border border-purple-300"
                                      >
                                        <span className="text-[8px] font-sans font-black text-purple-700 uppercase">FCPC:</span>
                                        {asset.tomboFcpc}
                                      </span>
                                    )}

                                    {(asset.outrosTombos || asset.tomboSecundario) && (
                                      <span 
                                        title="Outros Tombos / Retombamentos Adicionais"
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300"
                                      >
                                        <span className="text-[8px] font-sans font-black text-slate-600 uppercase">OUTRO:</span>
                                        {asset.outrosTombos || asset.tomboSecundario}
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => openEditTombosModal(asset)}
                                    className="no-print mt-1 text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                    title="Adicionar ou editar tombos do Consórcio, SESA, UFC, FCPC ou outros deste item"
                                  >
                                    <Tag className="w-2.5 h-2.5" />
                                    <span>+ Adicionar / Editar Tombos</span>
                                  </button>
                                </td>
                                <td className="p-1.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    asset.origemTombo.includes('SESA') ? 'bg-blue-100 text-blue-800' :
                                    asset.origemTombo.includes('UFC') ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {asset.origemTombo.split(' ')[0]}
                                  </span>
                                </td>
                                <td className="p-1.5">
                                  <div className="font-semibold text-slate-900 leading-tight">
                                    {asset.descricao}
                                  </div>
                                  {asset.auditoria?.statusDivergencia === 'setor_divergente' && (
                                    <div className="mt-1 p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-[10px] leading-tight space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${
                                          asset.statusRegularizacaoAspec === 'oficializado'
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-amber-200 text-amber-900 border border-amber-400'
                                        }`}>
                                          {asset.statusRegularizacaoAspec === 'oficializado'
                                            ? '✓ Oficializado no ASPEC'
                                            : '📍 Localização Provisória no Caderno'}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-700">
                                          Registro ASPEC: <strong>{asset.setorOriginalAspec || asset.setorNome}</strong>
                                        </span>
                                      </div>

                                      <p className="text-[10px] text-slate-800">
                                        <strong>Observação:</strong> Localização provisória na sala <strong>"{room.roomName}"</strong> (consta no ASPEC no setor "{asset.setorOriginalAspec || asset.setorNome}").
                                        {asset.statusRegularizacaoAspec === 'oficializado' ? (
                                          <span className="text-emerald-800 font-semibold block mt-0.5">
                                            ✓ Baixa e transferência homologadas com 'OK' Oficial da Gestora. Dados unificados com sucesso nesta sala!
                                          </span>
                                        ) : (
                                          <span className="text-amber-800 font-medium block mt-0.5">
                                            ⏳ O registro definitivo nesta sala só será oficializado após a Gestora confirmar a baixa/mudança definitiva no sistema ASPEC (OK Oficial).
                                          </span>
                                        )}
                                      </p>

                                      {asset.statusRegularizacaoAspec !== 'oficializado' && (
                                        <div className="no-print pt-1">
                                          <button
                                            type="button"
                                            onClick={() => setAssetToOfficialize(asset)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9.5px] shadow-xs cursor-pointer transition-colors"
                                            title="Confirmar baixa contábil e unificar dados nesta sala com OK Oficial da Gestora"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Confirmar Baixa Definitiva no ASPEC (OK Oficial da Gestora)</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {isUntracked && (
                                    <span className="text-[9px] text-amber-800 font-bold uppercase block mt-0.5">
                                      ⚠️ IDENTIFICADO FORA DO ASPEC
                                    </span>
                                  )}
                                </td>
                                <td className="p-1.5 font-mono text-[10px] text-slate-600">
                                  {asset.numeroSerie && asset.numeroSerie !== '-' ? asset.numeroSerie : asset.fornecedor || '-'}
                                </td>
                                <td className="p-1.5 text-[10px]">
                                  {asset.estado}
                                </td>
                                <td className="p-1.5 text-right font-mono text-[10px]">
                                  {formatBRL(asset.valorAquisicao || 0)}
                                </td>
                                <td className="p-1.5 text-center no-print whitespace-nowrap align-middle">
                                  <div className="flex items-center justify-center gap-1">
                                    {/* Botão Marcar OK */}
                                    <button
                                      type="button"
                                      onClick={() => handleMarkAsOk(asset)}
                                      className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                                        isChecked 
                                          ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-500' 
                                          : 'bg-slate-100 hover:bg-emerald-100 text-emerald-800 border border-slate-300 hover:border-emerald-300'
                                      }`}
                                      title={isChecked ? 'Item já está conferido (OK). Clique para reconfirmar.' : 'Marcar este item como conferido (OK)'}
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>OK</span>
                                    </button>

                                    {/* Botão Marcar Pendente */}
                                    <button
                                      type="button"
                                      onClick={() => handleMarkAsPending(asset)}
                                      className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                                        !isChecked 
                                          ? 'bg-amber-500 text-white shadow-2xs ring-1 ring-amber-400' 
                                          : 'bg-slate-100 hover:bg-amber-100 text-amber-800 border border-slate-300 hover:border-amber-300'
                                      }`}
                                      title={!isChecked ? 'Item já está pendente.' : 'Marcar este item como PENDENTE (desmarcar conferência)'}
                                    >
                                      <Clock className="w-3 h-3" />
                                      <span>Pendente</span>
                                    </button>

                                    {/* Botão Gerenciar Múltiplos Tombos */}
                                    <button
                                      type="button"
                                      onClick={() => openEditTombosModal(asset)}
                                      className="px-2 py-1 rounded-md text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer flex items-center gap-1 transition-all"
                                      title="Adicionar ou editar múltiplos tombos do mesmo item (Consórcio, SESA, UFC, FCPC, Outros)"
                                    >
                                      <Tag className="w-3 h-3 text-indigo-600" />
                                      <span>+ Tombos</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* SECTION: BENS ENCONTRADOS NESTA SALA NÃO CONSTANTES NO ASPEC */}
                    {blankLinesCount > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200">
                          <span>
                            ✏️ BENS ENCONTRADOS NESTA SALA QUE NÃO CONSTAM NO ASPEC (ANOTAÇÃO DA COMISSÃO):
                          </span>
                          <span className="font-normal lowercase text-[9px] text-slate-500">
                            Preencher com os dados da plaqueta física encontrada in loco (Consórcio, SESA, UFC, FCPC)
                          </span>
                        </div>

                        <table className="w-full text-left text-xs border-collapse border border-amber-300 font-mono">
                          <thead>
                            <tr className="bg-amber-100/60 text-slate-800 text-[9px] uppercase border-b border-amber-300">
                              <th className="p-1 w-8 text-center">Conf.</th>
                              <th className="p-1 w-24">Tombo Consórcio</th>
                              <th className="p-1 w-24">Tombo SESA</th>
                              <th className="p-1 w-24">Tombo UFC / FCPC</th>
                              <th className="p-1">Descrição do Item / Marca Encontrada</th>
                              <th className="p-1 w-16">Estado</th>
                              <th className="p-1 w-20">Nº de Série</th>
                              <th className="p-1 w-28">Anotações p/ ASPEC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: blankLinesCount }).map((_, lineIdx) => (
                              <tr key={lineIdx} className="border-b border-amber-200 h-6">
                                <td className="p-1 text-center text-slate-400">☐</td>
                                <td className="p-1 border-r border-amber-200"></td>
                                <td className="p-1 border-r border-amber-200"></td>
                                <td className="p-1 border-r border-amber-200"></td>
                                <td className="p-1 border-r border-amber-200"></td>
                                <td className="p-1 border-r border-amber-200"></td>
                                <td className="p-1 border-r border-amber-200"></td>
                                <td className="p-1"></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Room Signature Footer */}
                    <div className="pt-2 flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-100 font-sans">
                      <span>Vistoriado por: _____________________________ (Comissão)</span>
                      <span>Ciente da Carga: _____________________________ (Responsável da Sala)</span>
                    </div>

                  </div>
                ))}
              </div>
            ))}

            {/* General End Signatures */}
            <div className="pt-8 border-t-2 border-slate-900 page-break-inside-avoid font-sans space-y-6">
              <div className="text-center text-xs font-bold uppercase text-slate-900">
                TERMO DE CONFERÊNCIA E ENCERRAMENTO DO BALANÇO DE INVENTÁRIO FÍSICO
              </div>
              <p className="text-[11px] text-justify leading-relaxed text-slate-700">
                Certificamos que foi realizado o levantamento físico e a conferência sala a sala dos bens móveis e equipamentos da presente macro-unidade, tendo sido confrontadas as plaquetas físicas do Consórcio CPSMS e da Secretaria de Saúde do Estado do Ceará (SESA), registrando-se os bens regulares e relacionando-se os itens identificados fora do sistema contábil ASPEC para fins de conciliação físico-financeira perante o Tribunal de Contas do Estado do Ceará (TCE-CE).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs pt-4">
                <div>
                  <div className="border-b border-slate-900 pb-10 w-4/5 mx-auto" />
                  <div className="font-bold text-slate-950 pt-1.5">{currentProfile.nome}</div>
                  <div className="text-[10px] text-slate-600">Presidente da Comissão / Gestora de Patrimônio</div>
                </div>

                <div>
                  <div className="border-b border-slate-900 pb-10 w-4/5 mx-auto" />
                  <div className="font-bold text-slate-950 pt-1.5">Membro da Comissão de Inventário</div>
                  <div className="text-[10px] text-slate-600">Representante do Setor de Saúde</div>
                </div>

                <div>
                  <div className="border-b border-slate-900 pb-10 w-4/5 mx-auto" />
                  <div className="font-bold text-slate-950 pt-1.5">Diretoria Executiva do CPSMS</div>
                  <div className="text-[10px] text-slate-600">Homologação Final para o TCE-CE</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions (Screen only - HIDDEN IN PRINT) */}
        <div className="no-print p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl shrink-0">
          <div className="text-xs text-slate-500">
            Dica: use a opção <strong>"Imprimir Caderno de Vistoria (A4)"</strong> para levar as pranchetas para a vistoria sala por sala.
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 rounded-lg cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Dados</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-lg cursor-pointer"
              title="Baixar arquivo HTML formatado para abrir em qualquer navegador"
            >
              <FileCode className="w-4 h-4 text-indigo-500" />
              <span>Baixar HTML / PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>{isPrinting ? 'Preparando...' : 'Imprimir Caderno Completo'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* SUB-MODAL: GERENCIAR / ADICIONAR MÚLTIPLOS TOMBOS DO MESMO ITEM */}
      {editingTombosAsset && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-950 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Múltiplos Tombos do Mesmo Item
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Caderno de Balanço & Inventário Geral (Macro ➔ Micro)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTombosAsset(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Item Context Card */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500">Item Selecionado:</div>
              <div className="text-xs font-black text-slate-900 dark:text-white leading-snug">
                {editingTombosAsset.descricao}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap pt-0.5">
                <span>📍 <strong>{editingTombosAsset.setorNome}</strong> ({editingTombosAsset.unidadeNome})</span>
                {editingTombosAsset.numeroSerie && editingTombosAsset.numeroSerie !== '-' && (
                  <span>· S/N: <strong className="font-mono">{editingTombosAsset.numeroSerie}</strong></span>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed">
              💡 <strong>Orientação da Comissão CPSMS:</strong> Um mesmo bem pode possuir mais de um tombo simultâneo (plaqueta 4 dígitos do <em>Consórcio</em>, 6 dígitos da <em>SESA</em>, plaqueta da <em>UFC</em>, <em>FCPC</em> ou retombamento). Informe abaixo os tombos identificados neste bem físico para total transparência no balanço e perante o TCE-CE.
            </div>

            <form onSubmit={handleSaveTombos} className="space-y-3 text-xs">
              {/* Tombo Principal no Sistema */}
              <div>
                <label className="font-bold block mb-1 text-slate-800 dark:text-slate-200">
                  Tombo Principal de Exibição / Plaqueta Ativa:
                </label>
                <input
                  type="text"
                  required
                  value={editTombamentoPrincipal}
                  onChange={(e) => setEditTombamentoPrincipal(e.target.value)}
                  placeholder="Número do tombo principal"
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              {/* Grid: Consórcio & SESA */}
              <div className="grid grid-cols-2 gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="font-bold block mb-1 text-[11px] text-emerald-800 dark:text-emerald-400">
                    Tombo Consórcio (CPSMS):
                  </label>
                  <input
                    type="text"
                    value={editTomboConsorcio}
                    onChange={(e) => setEditTomboConsorcio(e.target.value)}
                    placeholder="Ex: 0184 ou CPSMS-..."
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 font-mono font-bold text-emerald-800 dark:text-emerald-300"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Plaqueta do Consórcio (4 dígitos)</span>
                </div>

                <div>
                  <label className="font-bold block mb-1 text-[11px] text-blue-800 dark:text-blue-400">
                    Tombo SESA (Governo do Ceará):
                  </label>
                  <input
                    type="text"
                    value={editTomboSesa}
                    onChange={(e) => setEditTomboSesa(e.target.value)}
                    placeholder="Ex: 124589"
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 font-mono font-bold text-blue-700 dark:text-blue-300"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Plaqueta do Estado (6 dígitos)</span>
                </div>
              </div>

              {/* Grid: UFC & FCPC */}
              <div className="grid grid-cols-2 gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="font-bold block mb-1 text-[11px] text-amber-900 dark:text-amber-400">
                    Tombo UFC (se houver):
                  </label>
                  <input
                    type="text"
                    value={editTomboUfc}
                    onChange={(e) => setEditTomboUfc(e.target.value)}
                    placeholder="Ex: UFC-0482"
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 font-mono font-bold text-amber-900 dark:text-amber-300"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Plaqueta Univ. Federal do Ceará</span>
                </div>

                <div>
                  <label className="font-bold block mb-1 text-[11px] text-purple-900 dark:text-purple-400">
                    Tombo FCPC (se houver):
                  </label>
                  <input
                    type="text"
                    value={editTomboFcpc}
                    onChange={(e) => setEditTomboFcpc(e.target.value)}
                    placeholder="Ex: FCPC-1092"
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 font-mono font-bold text-purple-900 dark:text-purple-300"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Fundação Cearense de Apoio</span>
                </div>
              </div>

              {/* Outros Tombos (Livre) */}
              <div>
                <label className="font-bold block mb-1 text-slate-800 dark:text-slate-200">
                  Outros Tombos / Retombamentos Anteriores (Campo Livre):
                </label>
                <input
                  type="text"
                  value={editOutrosTombos}
                  onChange={(e) => setEditOutrosTombos(e.target.value)}
                  placeholder="Ex: Tombo Municipal 4410, plaqueta anterior..."
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Outros números ou plaquetas encontradas no mesmo equipamento</span>
              </div>

              {/* Origem Principal */}
              <div>
                <label className="font-bold block mb-1 text-slate-800 dark:text-slate-200">
                  Origem Principal do Tombo:
                </label>
                <select
                  value={editOrigemTombo}
                  onChange={(e) => setEditOrigemTombo(e.target.value as any)}
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  <option value="CPSMS (Próprio do Consórcio)">CPSMS (Próprio do Consórcio)</option>
                  <option value="SESA (Governo do Ceará - Cessão/Comodato)">SESA (Governo do Ceará - Cessão/Comodato)</option>
                  <option value="UFC (Universidade Federal do Ceará)">UFC (Universidade Federal do Ceará)</option>
                  <option value="Ministério da Saúde / SUS / Doação">Ministério da Saúde / SUS / Doação</option>
                  <option value="Município Consorciado">Município Consorciado</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTombosAsset(null)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Salvar Tombos do Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: QUICK ADD ASSET FOUND OUTSIDE ASPEC WITH MULTIPLE TOMBOS */}
      {showAddUntrackedModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-950 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  +
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Registrar Tombo Encontrado (Fora do ASPEC)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cadastrar item físico achado na sala com suporte a múltiplos tombos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUntrackedModal(false)}
                className="w-7 h-7 rounded text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUntrackedAsset} className="space-y-3 text-xs">
              {/* Macro & Micro Location Selection */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Localização Macro:</label>
                  <select
                    value={targetUnitForAdd}
                    onChange={(e) => setTargetUnitForAdd(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  >
                    <option value="policlinica">Policlínica Regional</option>
                    <option value="ceo">CEO Regional Sobral</option>
                    <option value="sede-cpsms">Consórcio CPSMS (Sede)</option>
                    <option value="cer">CER</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Micro-Local / Sala:</label>
                  <input
                    type="text"
                    required
                    value={targetSectorForAdd}
                    onChange={(e) => {
                      setTargetSectorForAdd(e.target.value);
                      setTargetSubsetorForAdd(e.target.value);
                    }}
                    placeholder="Ex: Consultório 02, CME..."
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>

              {/* Numbering: Multiple Tombos */}
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Plaquetas e Tombamentos Identificados no Item Físico:</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1 text-[11px] text-emerald-800 dark:text-emerald-400">Tombo Consórcio (CPSMS):</label>
                    <input
                      type="text"
                      value={newTomboConsorcioInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewTomboConsorcioInput(val);
                        if (!newTomboInput) setNewTomboInput(val);
                        handleMacroTomboLookup(newTomboInput || val, val, newTomboSesaInput, newTomboUfcInput, newTomboFcpcInput, newOutrosTombosInput);
                      }}
                      placeholder="Ex: 0184 ou CPSMS-104"
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 font-mono font-bold text-emerald-800 dark:text-emerald-300 text-xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Plaqueta do Consórcio (4d)</span>
                  </div>

                  <div>
                    <label className="font-bold block mb-1 text-[11px] text-blue-800 dark:text-blue-400">Tombo SESA (Estado):</label>
                    <input
                      type="text"
                      value={newTomboSesaInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewTomboSesaInput(val);
                        if (!newTomboInput && !newTomboConsorcioInput) setNewTomboInput(val);
                        handleMacroTomboLookup(newTomboInput || val, newTomboConsorcioInput, val, newTomboUfcInput, newTomboFcpcInput, newOutrosTombosInput);
                      }}
                      placeholder="Ex: 124589"
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 font-mono font-bold text-blue-700 dark:text-blue-300 text-xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Plaqueta da Secretaria (6d)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="font-bold block mb-1 text-[11px] text-amber-900 dark:text-amber-400">Tombo UFC (se houver):</label>
                    <input
                      type="text"
                      value={newTomboUfcInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewTomboUfcInput(val);
                        handleMacroTomboLookup(newTomboInput, newTomboConsorcioInput, newTomboSesaInput, val, newTomboFcpcInput, newOutrosTombosInput);
                      }}
                      placeholder="Ex: UFC-0492"
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 font-mono font-bold text-amber-900 dark:text-amber-300 text-xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Plaqueta da Universidade</span>
                  </div>

                  <div>
                    <label className="font-bold block mb-1 text-[11px] text-purple-900 dark:text-purple-400">Tombo FCPC (se houver):</label>
                    <input
                      type="text"
                      value={newTomboFcpcInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewTomboFcpcInput(val);
                        handleMacroTomboLookup(newTomboInput, newTomboConsorcioInput, newTomboSesaInput, newTomboUfcInput, val, newOutrosTombosInput);
                      }}
                      placeholder="Ex: FCPC-1092"
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 font-mono font-bold text-purple-900 dark:text-purple-300 text-xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Fundação Cearense Apoio</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1 text-[11px] text-slate-700 dark:text-slate-300">Outros Tombos / Plaqueta Anterior:</label>
                  <input
                    type="text"
                    value={newOutrosTombosInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewOutrosTombosInput(val);
                      handleMacroTomboLookup(newTomboInput, newTomboConsorcioInput, newTomboSesaInput, newTomboUfcInput, newTomboFcpcInput, val);
                    }}
                    placeholder="Ex: Tombo Municipal 4410, retombamento anterior..."
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Card de Bem Encontrado no ASPEC com especificações puxadas automaticamente */}
              {matchedUntrackedExistingAsset && (
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                  matchedUntrackedExistingAsset.setorNome.trim().toLowerCase() !== targetSectorForAdd.trim().toLowerCase()
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {matchedUntrackedExistingAsset.setorNome.trim().toLowerCase() !== targetSectorForAdd.trim().toLowerCase() ? (
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
                    <strong>Item:</strong> {matchedUntrackedExistingAsset.descricao} (Tombo: {matchedUntrackedExistingAsset.tombamento})<br />
                    <strong>Setor no ASPEC:</strong> <span className="font-bold underline decoration-amber-500">{matchedUntrackedExistingAsset.setorNome}</span> ({matchedUntrackedExistingAsset.unidadeNome})<br />
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
                  value={newDescricaoInput}
                  onChange={(e) => setNewDescricaoInput(e.target.value)}
                  placeholder="Ex: Negatoscópio de Parede 2 Corpos, Cadeira Estofada..."
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                />
              </div>

              {/* Origin and Condition */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Origem do Tombo:</label>
                  <select
                    value={newOrigemTombo}
                    onChange={(e) => setNewOrigemTombo(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="CPSMS (Próprio do Consórcio)">CPSMS (Próprio)</option>
                    <option value="SESA (Governo do Ceará - Cessão/Comodato)">SESA (Governo do Ceará)</option>
                    <option value="UFC (Universidade Federal do Ceará)">UFC (Universidade)</option>
                    <option value="Ministério da Saúde / SUS / Doação">Ministério da Saúde / Doação</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Estado de Conservação:</label>
                  <select
                    value={newEstadoInput}
                    onChange={(e) => setNewEstadoInput(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="Excelente">Excelente</option>
                    <option value="Bom">Bom</option>
                    <option value="Regular">Regular</option>
                    <option value="Inservível / Danificado">Inservível / Danificado</option>
                    <option value="Ocioso">Ocioso</option>
                  </select>
                </div>
              </div>

              {/* Serial & Responsible */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Nº Série / Marca:</label>
                  <input
                    type="text"
                    value={newSerialInput}
                    onChange={(e) => setNewSerialInput(e.target.value)}
                    placeholder="S/N ou Fabricante"
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Responsável pela Sala:</label>
                  <input
                    type="text"
                    value={newResponsavelInput}
                    onChange={(e) => setNewResponsavelInput(e.target.value)}
                    placeholder="Nome do detentor"
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Valor Estimado */}
              <div>
                <label className="font-bold block mb-1">Valor Estimado (R$) (Opcional):</label>
                <input
                  type="text"
                  value={newValorEstimado}
                  onChange={(e) => setNewValorEstimado(e.target.value)}
                  placeholder="0,00"
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUntrackedModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm cursor-pointer"
                >
                  Salvar Tombo Encontrado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Confirmação de Divergência de Setor no Caderno de Balanço */}
      {pendingMacroDivergenceConfirm && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border-2 border-amber-400 dark:border-amber-600 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4">
            
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                  Aviso de Divergência de Localização
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white leading-snug">
                  Tem certeza que deseja modificar? O item está no setor {pendingMacroDivergenceConfirm.asset.setorNome}
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{pendingMacroDivergenceConfirm.asset.descricao}</span>
                <span className="font-mono bg-slate-200 dark:bg-slate-750 px-2 py-0.5 rounded text-[11px]">
                  Tombo: {pendingMacroDivergenceConfirm.asset.tombamento}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                  <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block">No ASPEC (Cadastro Oficial):</span>
                  <strong className="text-slate-900 dark:text-white font-black">{pendingMacroDivergenceConfirm.asset.setorNome}</strong>
                  <div className="text-[10px] text-slate-500">{pendingMacroDivergenceConfirm.asset.unidadeNome}</div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">No Sistema / Físico (Sala Conferida):</span>
                  <strong className="text-slate-900 dark:text-white font-black">{pendingMacroDivergenceConfirm.targetRoom}</strong>
                  <div className="text-[10px] text-slate-500">{pendingMacroDivergenceConfirm.targetUnit}</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                ℹ️ Esta informação ficará salva no sistema e no <strong>relatório da sala</strong>, informando que no ASPEC a localização é <strong>"{pendingMacroDivergenceConfirm.asset.setorNome}"</strong> e que no sistema/físico está na sala conferida <strong>"{pendingMacroDivergenceConfirm.targetRoom}"</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingMacroDivergenceConfirm(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmMacroDivergentLocation(pendingMacroDivergenceConfirm.asset, pendingMacroDivergenceConfirm.targetRoom, pendingMacroDivergenceConfirm.targetUnit)}
                className="px-5 py-2 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sim, Modificar Localização</span>
              </button>
            </div>

          </div>
        </div>
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
