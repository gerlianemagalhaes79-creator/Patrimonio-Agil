/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Asset, 
  Sector, 
  UnitInfo,
  TransferRequest, 
  ResponsibilityTerm, 
  UserProfile, 
  AssetCondition
} from './types';
import { 
  CPSMS_SECTORS, 
  CPSMS_UNITS,
  AVAILABLE_PROFILES,
  INITIAL_ASSETS
} from './data/initialData';
import { 
  saveAssetsToDB, 
  loadAssetsFromDB, 
  saveTransfersToDB, 
  loadTransfersFromDB, 
  saveTermsToDB, 
  loadTermsFromDB, 
  clearAllDB 
} from './utils/db';
import { 
  testFirebaseConnection,
  subscribeToAssets,
  subscribeToTransfers,
  subscribeToTerms,
  saveAssetToFirestore,
  batchSaveAssetsToFirestore,
  saveTransferToFirestore,
  saveTermToFirestore
} from './services/firebase';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNavigation, NavTab } from './components/BottomNavigation';
import { DashboardView } from './components/DashboardView';
import { AssetsView } from './components/AssetsView';
import { TransfersView } from './components/TransfersView';
import { AuditView } from './components/AuditView';
import { TermsView } from './components/TermsView';
import { NormsView } from './components/NormsView';
import { SaneamentoView } from './components/SaneamentoView';
import { MacroMicroInventoryReportModal } from './components/MacroMicroInventoryReportModal';
import { NewTransferModal } from './components/NewTransferModal';
import { NewAssetModal } from './components/NewAssetModal';
import { DataExchangeModal } from './components/DataExchangeModal';
import { SmartImportModal } from './components/SmartImportModal';
import { UnitsInteractiveMap } from './components/UnitsInteractiveMap';
import { doesAssetMatchRoom, normalizeLoc } from './utils/locationHelper';

export default function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sectors, setSectors] = useState<Sector[]>(() => {
    try {
      const CLEAN_RESET_KEY = 'patrimonio_cpsms_clean_reset_v3';
      const isCleanResetDone = localStorage.getItem(CLEAN_RESET_KEY) === 'done';

      if (!isCleanResetDone) {
        // Clear any old mock conferences or fictitious reviewed rooms
        localStorage.removeItem('cpsms_reviewed_rooms');
        localStorage.removeItem('cpsms_room_consolidated');
        localStorage.removeItem('cpsms_room_drafts');
        localStorage.removeItem('patrimonio_cpsms_reviewed_rooms_v1');
      }

      const saved = isCleanResetDone ? localStorage.getItem('cpsms_custom_sectors') : null;
      const reviewedRaw = isCleanResetDone ? localStorage.getItem('cpsms_reviewed_rooms') : null;
      const reviewedMap: Record<string, any> = reviewedRaw ? JSON.parse(reviewedRaw) : {};

      const map = new Map<string, Sector>();
      CPSMS_SECTORS.forEach(s => {
        const isRev = isCleanResetDone && Boolean(
          s.revisada || 
          reviewedMap[s.id]?.revisada || 
          reviewedMap[s.nome]?.revisada || 
          reviewedMap[normalizeLoc(s.nome)]?.revisada
        );
        map.set(s.id, isRev ? { ...s, revisada: true } : { ...s, revisada: false });
      });

      if (saved && isCleanResetDone) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((s: Sector) => {
            const existing = map.get(s.id);
            const isRev = Boolean(
              s.revisada || 
              existing?.revisada || 
              reviewedMap[s.id]?.revisada || 
              reviewedMap[s.nome]?.revisada || 
              reviewedMap[normalizeLoc(s.nome)]?.revisada
            );
            map.set(s.id, { ...(existing || {}), ...s, revisada: isRev });
          });
        }
      }

      // Add any reviewed rooms that might not have been in CPSMS_SECTORS
      if (isCleanResetDone) {
        Object.entries(reviewedMap).forEach(([k, v]: [string, any]) => {
          if (v && v.revisada) {
            const rawName = v.nome || k;
            const roomName = rawName.startsWith('sub-') 
              ? rawName.replace(/^sub-[a-z0-9]+-/, '').replace(/-/g, ' ') 
              : rawName;
            const found = Array.from(map.values()).find(
              s => s.id === k || 
                   normalizeLoc(s.nome) === normalizeLoc(roomName) || 
                   normalizeLoc(s.nome) === normalizeLoc(rawName) ||
                   normalizeLoc(s.id) === normalizeLoc(k)
            );
            if (found) {
              found.revisada = true;
              found.dataRevisao = v.dataRevisao || found.dataRevisao;
              found.responsavelRevisao = v.responsavelRevisao || found.responsavelRevisao;
            } else {
              const id = k.startsWith('room-') || k.startsWith('sub-') || k.startsWith('sec-') 
                ? k 
                : `sec-custom-${normalizeLoc(roomName).replace(/[^a-z0-9]/g, '-')}`;
              map.set(id, {
                id,
                nome: roomName,
                sigla: roomName.slice(0, 8).toUpperCase(),
                unidadeId: 'policlinica',
                unidadeNome: 'Policlínica',
                responsavelNome: v.responsavelNome || 'Responsável Setorial',
                responsavelCargo: v.responsavelCargo || 'Detentor da Carga',
                responsavelMatricula: v.responsavelMatricula || 'CPSMS',
                subsetores: [],
                revisada: true,
                dataRevisao: v.dataRevisao,
                responsavelRevisao: v.responsavelRevisao
              });
            }
          }
        });
      }

      // Apply any saved leader changes
      const leaderChangesRaw = localStorage.getItem('cpsms_room_leader_changes');
      if (leaderChangesRaw) {
        try {
          const leaderMap = JSON.parse(leaderChangesRaw);
          if (typeof leaderMap === 'object' && leaderMap !== null) {
            Object.entries(leaderMap).forEach(([k, v]: [string, any]) => {
              if (v && v.newLeader && v.originalLeader && v.newLeader.trim() !== v.originalLeader.trim()) {
                const targetSector = Array.from(map.values()).find(
                  s => s.id === k || normalizeLoc(s.nome) === normalizeLoc(k)
                );
                if (targetSector) {
                  targetSector.responsavelNome = v.newLeader;
                  targetSector.responsavelCargo = v.newCargo || targetSector.responsavelCargo;
                  targetSector.responsavelOriginalAspec = v.originalLeader;
                  targetSector.liderAlterado = true;
                  targetSector.dataAlteracaoLider = v.changedAt;
                }
              }
            });
          }
        } catch (e) {
          // ignore
        }
      }

      return Array.from(map.values());
    } catch (e) {
      console.warn('Error reading custom sectors from localStorage:', e);
    }
    return CPSMS_SECTORS;
  });
  const [units] = useState<UnitInfo[]>(CPSMS_UNITS);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [terms, setTerms] = useState<ResponsibilityTerm[]>([]);
  const [isDBLoaded, setIsDBLoaded] = useState(false);

  const [currentProfile, setCurrentProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('patrimonio_cpsms_profile_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = AVAILABLE_PROFILES.find(p => p.id === parsed.id);
        if (match) return match;
      }
      return AVAILABLE_PROFILES[0]; // Perfil Gestora
    } catch {
      return AVAILABLE_PROFILES[0];
    }
  });

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');
  const [selectedTermIdForView, setSelectedTermIdForView] = useState<string | undefined>();

  // Modals state
  const [isNewTransferModalOpen, setIsNewTransferModalOpen] = useState(false);
  const [preselectedAssetForTransfer, setPreselectedAssetForTransfer] = useState<Asset | null>(null);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [isDataExchangeModalOpen, setIsDataExchangeModalOpen] = useState(false);
  const [isSmartImportModalOpen, setIsSmartImportModalOpen] = useState(false);
  const [isMacroMicroReportOpen, setIsMacroMicroReportOpen] = useState(false);
  const [initialMacroForReport, setInitialMacroForReport] = useState<string>('all');
  const [auditTarget, setAuditTarget] = useState<{ unitId?: string; roomName?: string } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');

  // Performance timer & query stability tracking
  const [lastQueryDurationMs, setLastQueryDurationMs] = useState<number>(18);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load from IndexedDB on startup + Real-time Cloud Firestore synchronization
  useEffect(() => {
    let unsubscribeAssets: (() => void) | undefined;
    let unsubscribeTransfers: (() => void) | undefined;
    let unsubscribeTerms: (() => void) | undefined;

    async function loadData() {
      const loadStartTime = performance.now();
      setIsProcessing(true);
      let localAssets: Asset[] = [];
      try {
        const [loadedAssets, loadedTransfers, loadedTerms] = await Promise.all([
          loadAssetsFromDB(),
          loadTransfersFromDB(),
          loadTermsFromDB()
        ]);
        const CLEAN_RESET_KEY = 'patrimonio_cpsms_clean_reset_v3';
        const isCleanResetDone = localStorage.getItem(CLEAN_RESET_KEY) === 'done';

        let effectiveAssets = loadedAssets;
        if (!isCleanResetDone) {
          // RESET CLEAN SLATE: Start completely pending with genuine assets (zero fake conferences)
          effectiveAssets = INITIAL_ASSETS.map(a => ({
            ...a,
            auditoria: {
              conferido: false
            }
          }));
          saveAssetsToDB(effectiveAssets).catch(console.warn);
          localStorage.setItem(CLEAN_RESET_KEY, 'done');
        } else if ((!effectiveAssets || effectiveAssets.length <= 1) && INITIAL_ASSETS.length > 1) {
          effectiveAssets = INITIAL_ASSETS;
          saveAssetsToDB(INITIAL_ASSETS).catch(console.warn);
        } else if (Array.isArray(effectiveAssets) && effectiveAssets.length > 1) {
          // Garante que bens oficiais de novas salas sejam mesclados
          const existingIds = new Set(effectiveAssets.map(a => a.id));
          const existingTombos = new Set(effectiveAssets.map(a => (a.tombamento || '').toString().trim()));
          const missingAssets = INITIAL_ASSETS.filter(a => {
            const tombo = (a.tombamento || '').toString().trim();
            return !existingIds.has(a.id) && (!tombo || !existingTombos.has(tombo));
          });
          if (missingAssets.length > 0) {
            effectiveAssets = [...effectiveAssets, ...missingAssets];
            saveAssetsToDB(effectiveAssets).catch(console.warn);
          }
        }
        localAssets = effectiveAssets;
        setAssets(effectiveAssets);
        setTransfers(loadedTransfers);
        setTerms(loadedTerms);
      } catch (err) {
        console.error('Error loading from IndexedDB:', err);
      } finally {
        setIsDBLoaded(true);
        const loadDuration = Math.max(12, Math.round(performance.now() - loadStartTime));
        setLastQueryDurationMs(loadDuration);
        setIsProcessing(false);
      }

      // Test connection to Google Firebase
      const isConnected = await testFirebaseConnection();
      if (isConnected) {
        setFirebaseStatus('connected');

        // Subscribe to real-time Cloud Firestore collections
        let initialAssetsCheckDone = false;
        const CLEAN_RESET_KEY = 'patrimonio_cpsms_clean_reset_v3';
        const isCleanResetJustRun = !localStorage.getItem(CLEAN_RESET_KEY + '_cloud_synced');

        unsubscribeAssets = subscribeToAssets((cloudAssets) => {
          if (isCleanResetJustRun && localAssets.length > 0) {
            // First time clean slate: force overwrite cloud with clean zero-conference assets
            batchSaveAssetsToFirestore(localAssets).catch(console.warn);
            localStorage.setItem(CLEAN_RESET_KEY + '_cloud_synced', 'true');
            return;
          }
          if (cloudAssets && cloudAssets.length > 0) {
            setAssets(prev => {
              if (!prev || prev.length === 0) {
                saveAssetsToDB(cloudAssets);
                return cloudAssets;
              }
              const cloudMap = new Map(cloudAssets.map(c => [c.id, c]));
              const merged = prev.map(localA => {
                const cloudA = cloudMap.get(localA.id);
                if (!cloudA) return localA;
                // Preserva conferência local se na nuvem ainda não tiver sido sincronizada
                if (localA.auditoria?.conferido && !cloudA.auditoria?.conferido) {
                  return localA;
                }
                return cloudA;
              });
              const localIds = new Set(prev.map(p => p.id));
              cloudAssets.forEach(ca => {
                if (!localIds.has(ca.id)) merged.push(ca);
              });
              saveAssetsToDB(merged);
              return merged;
            });
          } else if (!initialAssetsCheckDone && localAssets.length > 0) {
            // First time sync: migrate existing local IndexedDB assets to Firebase Firestore
            batchSaveAssetsToFirestore(localAssets).catch(e => console.warn('Firebase initial migration error:', e));
          }
          initialAssetsCheckDone = true;
        }, () => {
          setFirebaseStatus('offline');
        });

        unsubscribeTransfers = subscribeToTransfers((cloudTransfers) => {
          if (cloudTransfers && cloudTransfers.length > 0) {
            setTransfers(cloudTransfers);
            saveTransfersToDB(cloudTransfers);
          }
        });

        unsubscribeTerms = subscribeToTerms((cloudTerms) => {
          if (cloudTerms && cloudTerms.length > 0) {
            setTerms(cloudTerms);
            saveTermsToDB(cloudTerms);
          }
        });
      } else {
        setFirebaseStatus('offline');
      }
    }

    loadData();

    return () => {
      unsubscribeAssets?.();
      unsubscribeTransfers?.();
      unsubscribeTerms?.();
    };
  }, []);

  // Save to IndexedDB whenever assets change (debounced slightly for large lists)
  useEffect(() => {
    if (!isDBLoaded) return;
    saveAssetsToDB(assets);
  }, [assets, isDBLoaded]);

  useEffect(() => {
    if (!isDBLoaded) return;
    saveTransfersToDB(transfers);
  }, [transfers, isDBLoaded]);

  useEffect(() => {
    if (!isDBLoaded) return;
    saveTermsToDB(terms);
  }, [terms, isDBLoaded]);

  useEffect(() => {
    try {
      localStorage.setItem('patrimonio_cpsms_profile_v2', JSON.stringify(currentProfile));
    } catch (e) {
      console.error('Error saving profile:', e);
    }
  }, [currentProfile]);

  const pendingTransfersCount = transfers.filter(t => t.status === 'pendente').length;

  // Actions
  const handleApproveTransfer = (
    transferId: string, 
    parecer: string, 
    generateTerm: boolean
  ) => {
    const transferIndex = transfers.findIndex(t => t.id === transferId);
    if (transferIndex === -1) return;

    const tr = transfers[transferIndex];
    const assetIndex = assets.findIndex(a => a.id === tr.assetId);

    const destUnit = units.find(u => u.nome === tr.unidadeDestino);
    const destSector = sectors.find(s => s.nome === tr.setorDestino);

    const updatedAssets = [...assets];
    if (assetIndex !== -1) {
      const currentAsset = updatedAssets[assetIndex];
      updatedAssets[assetIndex] = {
        ...currentAsset,
        unidadeId: destUnit ? destUnit.id : currentAsset.unidadeId,
        unidadeNome: tr.unidadeDestino,
        setorId: destSector ? destSector.id : currentAsset.setorId,
        setorNome: tr.setorDestino,
        subsetorNome: tr.subsetorDestino,
        responsavelNome: tr.responsavelDestino,
        responsavelMatricula: tr.matriculaResponsavelDestino,
        observacoes: `${currentAsset.observacoes ? currentAsset.observacoes + ' | ' : ''}Transferido de ${tr.unidadeOrigem} (${tr.setorOrigem}) para ${tr.unidadeDestino} (${tr.setorDestino}) em ${new Date().toLocaleDateString('pt-BR')}.`,
        auditoria: {
          ...currentAsset.auditoria,
          conferido: true,
          statusDivergencia: 'conforme',
          observacaoAuditoria: `Carga transferida formalmente para ${tr.unidadeDestino} – ${tr.setorDestino}.`
        }
      };
      setAssets(updatedAssets);
    }

    let createdTermId: string | undefined = undefined;
    if (generateTerm && assetIndex !== -1) {
      const ast = updatedAssets[assetIndex];
      const termNumber = `TR-CPSMS-${new Date().getFullYear()}/${String(terms.length + 1).padStart(4, '0')}`;
      const newTerm: ResponsibilityTerm = {
        id: termNumber,
        numeroTermo: termNumber,
        tipo: 'termo_transferencia',
        titulo: `Termo de Transferência e Cautela – ${ast.tombamento}`,
        dataEmissao: new Date().toISOString().slice(0, 10),
        unidadeOrigem: tr.unidadeOrigem,
        setorOrigem: tr.setorOrigem,
        unidadeDestino: tr.unidadeDestino,
        setorDestino: tr.setorDestino,
        subsetorDestino: tr.subsetorDestino,
        responsavelNome: tr.responsavelDestino,
        responsavelCargo: 'Responsável Designado',
        responsavelMatricula: tr.matriculaResponsavelDestino,
        gestoraNome: currentProfile.nome || 'Gestora de Patrimônio',
        gestoraCargo: 'Gestora de Patrimônio – CPSMS',
        bens: [
          {
            tombamento: ast.tombamento,
            origemTombo: ast.origemTombo,
            descricao: ast.descricao,
            estado: ast.estado,
            valor: ast.valorAquisicao,
            numeroSerie: ast.numeroSerie
          }
        ],
        observacoesLegais: `Fica formalizada a transferência de carga patrimonial entre unidades do CPSMS, assumindo o recebedor o encargo de Fiel Depositário (Art. 94, Lei 4.320/64). Parecer da Gestora: ${parecer}`,
        codigoVerificacao: `AUT-CPSMS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        statusAssinatura: 'assinado'
      };
      setTerms(prev => [newTerm, ...prev]);
      createdTermId = termNumber;
    }

    const updatedTransfers = [...transfers];
    const approvedTransfer: TransferRequest = {
      ...tr,
      status: 'aprovada',
      dataDecisao: new Date().toISOString().slice(0, 16).replace('T', ' '),
      gestoraParecer: parecer,
      termoGeradoId: createdTermId,
    };
    updatedTransfers[transferIndex] = approvedTransfer;
    setTransfers(updatedTransfers);
    saveTransferToFirestore(approvedTransfer).catch(e => console.warn('Firestore transfer err:', e));
  };

  const handleRejectTransfer = (transferId: string, motivoRejeicao: string) => {
    setTransfers(prev => prev.map(t => {
      if (t.id === transferId) {
        const rejected: TransferRequest = {
          ...t,
          status: 'rejeitada',
          dataDecisao: new Date().toISOString().slice(0, 16).replace('T', ' '),
          gestoraParecer: `Indeferido pela Gestora: ${motivoRejeicao}`,
        };
        saveTransferToFirestore(rejected).catch(e => console.warn('Firestore transfer err:', e));
        return rejected;
      }
      return t;
    }));
  };

  const handleCreateNewTransfer = (
    transferData: Omit<TransferRequest, 'id' | 'protocolo' | 'status' | 'dataSolicitacao' | 'gestoraNome'>
  ) => {
    const protocolNumber = `MOV-CPSMS-${new Date().getFullYear()}/${String(transfers.length + 1).padStart(4, '0')}`;
    const newRequest: TransferRequest = {
      ...transferData,
      id: `trf-${Date.now()}`,
      protocolo: protocolNumber,
      status: 'pendente',
      dataSolicitacao: new Date().toISOString().slice(0, 16).replace('T', ' '),
      gestoraNome: currentProfile.nome || 'Gestora de Patrimônio',
    };
    setTransfers(prev => [newRequest, ...prev]);
    saveTransferToFirestore(newRequest).catch(e => console.warn('Firestore transfer err:', e));
    setActiveTab('transfers');
  };

  const handleAddNewAsset = (newAsset: Asset, navigateToAssetsTab = false) => {
    setAssets(prev => [newAsset, ...prev]);
    saveAssetToFirestore(newAsset).catch(e => console.warn('Firestore asset err:', e));
    if (navigateToAssetsTab) {
      setActiveTab('assets');
    }
  };

  const handleUpdateAsset = (updatedAsset: Asset) => {
    setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
    saveAssetToFirestore(updatedAsset).catch(e => console.warn('Firestore asset err:', e));
  };

  const handleUpdateAudit = (
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
  ) => {
    setAssets(prev => {
      const updated = prev.map(a => {
        if (a.id === assetId) {
          const audited: Asset = {
            ...a,
            setorOriginalAspec: data.setorOriginalAspec || a.setorOriginalAspec || a.setorNome,
            unidadeOriginalAspec: data.unidadeOriginalAspec || a.unidadeOriginalAspec || a.unidadeNome,
            setorNome: data.statusDivergencia === 'setor_divergente' && data.setorEncontrado ? data.setorEncontrado : a.setorNome,
            subsetorNome: data.statusDivergencia === 'setor_divergente' && data.subsetorEncontrado ? data.subsetorEncontrado : a.subsetorNome,
            estado: data.novoEstado || a.estado,
            auditoria: {
              conferido: data.conferido,
              dataConferencia: new Date().toISOString().slice(0, 16).replace('T', ' '),
              responsavelConferencia: data.responsavelConferencia,
              statusDivergencia: data.statusDivergencia,
              unidadeEncontrada: data.unidadeEncontrada,
              setorEncontrado: data.setorEncontrado,
              subsetorEncontrado: data.subsetorEncontrado,
              setorOriginalAspec: data.setorOriginalAspec || a.setorOriginalAspec || a.setorNome,
              unidadeOriginalAspec: data.unidadeOriginalAspec || a.unidadeOriginalAspec || a.unidadeNome,
              divergenciaConfirmada: data.divergenciaConfirmada,
              observacaoAuditoria: data.observacaoAuditoria,
            }
          };
          saveAssetToFirestore(audited).catch(e => console.warn('Firestore audit err:', e));
          return audited;
        }
        return a;
      });
      saveAssetsToDB(updated).catch(e => console.warn('IndexedDB audit err:', e));
      return updated;
    });
  };

  const handleConsolidateRoomOfficial = (sectorName: string, protocolo: string, parecer: string) => {
    const t0 = performance.now();
    setIsProcessing(true);
    const secLower = sectorName.trim().toLowerCase();

    setAssets(prev => {
      const updated = prev.map(a => {
        const aEncontrado = (a.auditoria?.setorEncontrado || '').trim().toLowerCase();
        const aOrig = (a.setorOriginalAspec || a.setorNome || '').trim().toLowerCase();
        const isMissing = a.auditoria?.statusDivergencia === 'nao_encontrado';

        // Asset was physically found in this room -> consolidate as definitive location
        if (aEncontrado === secLower && !isMissing) {
          const consolidated: Asset = {
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
              observacaoAuditoria: `[CONSOLIDADO DEFINITIVO NO ASPEC] Atualização homologada pela Gestora sob Despacho ASPEC nº ${protocolo} em ${new Date().toLocaleDateString('pt-BR')}. Rascunho temporário excluído e carga unificada.`
            }
          };
          saveAssetToFirestore(consolidated).catch(console.warn);
          return consolidated;
        }

        // Asset was originally in this room but confirmed missing -> record official absence in ASPEC
        if (aOrig === secLower && isMissing) {
          const missingConsolidated: Asset = {
            ...a,
            statusRegularizacaoAspec: 'oficializado',
            auditoria: {
              ...a.auditoria,
              statusRegularizacaoAspec: 'oficializado',
              dataOficializacaoAspec: new Date().toISOString(),
              observacaoAuditoria: `[BAIXA/REGULARIZAÇÃO NO ASPEC] Ausência física homologada sob Despacho ASPEC nº ${protocolo} em ${new Date().toLocaleDateString('pt-BR')}. Parecer: ${parecer}`
            }
          };
          saveAssetToFirestore(missingConsolidated).catch(console.warn);
          return missingConsolidated;
        }

        return a;
      });

      return updated;
    });

    const duration = Math.max(8, Math.round(performance.now() - t0));
    setLastQueryDurationMs(duration);
    setIsProcessing(false);
  };

  const handleAddNewLocation = (newSector: Sector) => {
    setSectors(prev => {
      const exists = prev.some(s => s.id === newSector.id || s.nome.trim().toLowerCase() === newSector.nome.trim().toLowerCase());
      let updated: Sector[];
      if (exists) {
        updated = prev.map(s => (s.id === newSector.id || s.nome.trim().toLowerCase() === newSector.nome.trim().toLowerCase()) ? newSector : s);
      } else {
        updated = [...prev, newSector];
      }
      try {
        localStorage.setItem('cpsms_custom_sectors', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save sectors to localStorage:', e);
      }
      return updated;
    });
  };

  const handleUpdateSector = (sectorIdOrName: string, updates: Partial<Sector>) => {
    setSectors(prev => {
      const normTarget = normalizeLoc(sectorIdOrName);
      let found = false;
      const updated = prev.map(s => {
        if (s.id === sectorIdOrName || normalizeLoc(s.nome) === normTarget) {
          found = true;
          return { ...s, ...updates };
        }
        return s;
      });

      if (!found) {
        const genId = sectorIdOrName.startsWith('sub-') || sectorIdOrName.startsWith('sec-') || sectorIdOrName.startsWith('room-')
          ? sectorIdOrName
          : `sec-custom-${normTarget.replace(/[^a-z0-9]/g, '-')}`;
        updated.push({
          id: genId,
          nome: updates.nome || sectorIdOrName,
          sigla: (updates.nome || sectorIdOrName).slice(0, 8).toUpperCase(),
          unidadeId: updates.unidadeId || 'policlinica',
          unidadeNome: updates.unidadeNome || 'Policlínica',
          responsavelNome: updates.responsavelNome || 'Responsável Setorial',
          responsavelCargo: updates.responsavelCargo || 'Detentor da Carga',
          responsavelMatricula: updates.responsavelMatricula || 'CPSMS',
          subsetores: updates.subsetores || [],
          ...updates,
        });
      }

      try {
        localStorage.setItem('cpsms_custom_sectors', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save sectors to localStorage:', e);
      }
      return updated;
    });
  };

  const handleConcludeRoom = (sectorIdOrName: string, explicitRoomName?: string) => {
    const t0 = performance.now();
    setIsProcessing(true);

    const normTarget = normalizeLoc(sectorIdOrName);
    const targetSector = sectors.find(s => 
      s.id === sectorIdOrName || 
      normalizeLoc(s.nome) === normTarget ||
      s.nome.trim().toLowerCase() === sectorIdOrName.trim().toLowerCase()
    );

    let sectorName = explicitRoomName || (targetSector ? targetSector.nome : sectorIdOrName);
    if (sectorName.startsWith('sub-')) {
      sectorName = sectorName.replace(/^sub-[a-z0-9]+-/, '').replace(/-/g, ' ');
    }
    const sectorNameLower = sectorName.trim().toLowerCase();
    const sectorNorm = normalizeLoc(sectorName);

    // 1. Mark sector as reviewed and persist
    setSectors(prev => {
      let found = false;
      const updated = prev.map(s => {
        if (
          s.id === sectorIdOrName || 
          normalizeLoc(s.nome) === sectorNorm || 
          s.nome.trim().toLowerCase() === sectorNameLower
        ) {
          found = true;
          return {
            ...s,
            revisada: true,
            dataRevisao: new Date().toISOString(),
            responsavelRevisao: currentProfile.nome,
          };
        }
        return s;
      });

      if (!found) {
        const genId = sectorIdOrName.startsWith('sub-') || sectorIdOrName.startsWith('sec-') || sectorIdOrName.startsWith('room-')
          ? sectorIdOrName
          : `sec-custom-${sectorNorm.replace(/[^a-z0-9]/g, '-')}`;
        updated.push({
          id: genId,
          nome: sectorName,
          sigla: sectorName.slice(0, 8).toUpperCase(),
          unidadeId: (targetSector?.unidadeId || 'policlinica') as any,
          unidadeNome: targetSector?.unidadeNome || 'Policlínica',
          responsavelNome: targetSector?.responsavelNome || currentProfile.nome || 'Responsável Setorial',
          responsavelCargo: targetSector?.responsavelCargo || 'Detentor da Carga',
          responsavelMatricula: targetSector?.responsavelMatricula || 'CPSMS',
          subsetores: [],
          revisada: true,
          dataRevisao: new Date().toISOString(),
          responsavelRevisao: currentProfile.nome,
        });
      }

      try {
        localStorage.setItem('cpsms_custom_sectors', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save sectors to localStorage:', e);
      }
      return updated;
    });

    // 2. Persist in cpsms_reviewed_rooms registry with all variants of key
    try {
      const raw = localStorage.getItem('cpsms_reviewed_rooms');
      const reviewedMap = raw ? JSON.parse(raw) : {};
      const revData = {
        revisada: true,
        dataRevisao: new Date().toISOString(),
        responsavelRevisao: currentProfile.nome,
        nome: sectorName,
        id: sectorIdOrName
      };
      reviewedMap[sectorName] = revData;
      reviewedMap[sectorNorm] = revData;
      if (sectorIdOrName) {
        reviewedMap[sectorIdOrName] = revData;
        reviewedMap[normTarget] = revData;
      }
      if (targetSector?.id) {
        reviewedMap[targetSector.id] = revData;
      }
      localStorage.setItem('cpsms_reviewed_rooms', JSON.stringify(reviewedMap));
    } catch (e) {
      console.warn('Failed to save reviewed room to localStorage:', e);
    }

    // 3. Consolidate and mark checked ALL assets in this sector
    const updatedAssets = assets.map(a => {
      const isMatch = doesAssetMatchRoom(a, sectorName) || 
                      doesAssetMatchRoom(a, sectorIdOrName) ||
                      (a.setorNome && normalizeLoc(a.setorNome) === sectorNorm) ||
                      (a.subarea && normalizeLoc(a.subarea) === sectorNorm) ||
                      (a.subsetorNome && normalizeLoc(a.subsetorNome) === sectorNorm) ||
                      (targetSector && a.setorId === targetSector.id);

      if (isMatch) {
        const audited: Asset = {
          ...a,
          auditoria: {
            ...a.auditoria,
            conferido: true,
            dataConferencia: a.auditoria?.dataConferencia || new Date().toISOString(),
            responsavelConferencia: a.auditoria?.responsavelConferencia || currentProfile.nome,
            observacaoAuditoria: a.auditoria?.observacaoAuditoria || 'Sala concluída e conferida no inventário físico',
            statusDivergencia: a.auditoria?.statusDivergencia === 'nao_encontrado' ? 'nao_encontrado' : (a.auditoria?.statusDivergencia || 'conforme'),
            setorEncontrado: sectorName,
            unidadeEncontrada: targetSector?.unidadeNome || a.unidadeNome,
          }
        };
        saveAssetToFirestore(audited).catch(e => console.warn('Firestore err:', e));
        return audited;
      }
      return a;
    });

    setAssets(updatedAssets);
    saveAssetsToDB(updatedAssets).catch(e => console.warn('IndexedDB err:', e));

    const dur = Math.max(5, Math.round(performance.now() - t0));
    setLastQueryDurationMs(dur);
    setIsProcessing(false);
  };

  const handleReopenRoom = (sectorIdOrName: string, explicitRoomName?: string) => {
    const normTarget = normalizeLoc(sectorIdOrName);
    const targetSector = sectors.find(s => 
      s.id === sectorIdOrName || 
      normalizeLoc(s.nome) === normTarget ||
      s.nome.trim().toLowerCase() === sectorIdOrName.trim().toLowerCase()
    );
    let sectorName = explicitRoomName || (targetSector ? targetSector.nome : sectorIdOrName);
    if (sectorName.startsWith('sub-')) {
      sectorName = sectorName.replace(/^sub-[a-z0-9]+-/, '').replace(/-/g, ' ');
    }
    const sectorNorm = normalizeLoc(sectorName);

    // 1. Unmark in sectors state
    setSectors(prev => {
      const updated = prev.map(s => {
        if (
          s.id === sectorIdOrName || 
          normalizeLoc(s.nome) === sectorNorm || 
          s.nome.trim().toLowerCase() === sectorName.trim().toLowerCase()
        ) {
          return {
            ...s,
            revisada: false,
          };
        }
        return s;
      });
      try {
        localStorage.setItem('cpsms_custom_sectors', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    // 2. Remove from cpsms_reviewed_rooms
    try {
      const raw = localStorage.getItem('cpsms_reviewed_rooms');
      if (raw) {
        const reviewedMap = JSON.parse(raw);
        delete reviewedMap[sectorName];
        delete reviewedMap[sectorNorm];
        delete reviewedMap[sectorIdOrName];
        delete reviewedMap[normTarget];
        if (targetSector?.id) delete reviewedMap[targetSector.id];
        localStorage.setItem('cpsms_reviewed_rooms', JSON.stringify(reviewedMap));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleClearAllData = async () => {
    await clearAllDB();
    setAssets([]);
    setTransfers([]);
    setTerms([]);
  };

  const handleResetAllAuditsToCleanSlate = async () => {
    setIsProcessing(true);
    try {
      localStorage.removeItem('cpsms_reviewed_rooms');
      localStorage.removeItem('cpsms_room_consolidated');
      localStorage.removeItem('cpsms_room_drafts');
      localStorage.removeItem('patrimonio_cpsms_reviewed_rooms_v1');

      const cleanSectors = CPSMS_SECTORS.map(s => ({
        ...s,
        revisada: false,
        dataRevisao: undefined,
        responsavelRevisao: undefined
      }));
      setSectors(cleanSectors);

      const cleanAssets = assets.map(a => ({
        ...a,
        auditoria: {
          conferido: false
        }
      }));
      setAssets(cleanAssets);
      await saveAssetsToDB(cleanAssets);
      if (firebaseStatus === 'connected') {
        await batchSaveAssetsToFirestore(cleanAssets);
      }
    } catch (err) {
      console.error('Erro ao reiniciar conferências:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSmartImportBatch = (importedList: Asset[], mode: 'update' | 'replace' = 'update') => {
    if (mode === 'replace') {
      setAssets(importedList);
      batchSaveAssetsToFirestore(importedList).catch(e => console.warn('Firestore batch import err:', e));
    } else {
      setAssets(prev => {
        if (prev.length === 0) {
          batchSaveAssetsToFirestore(importedList).catch(e => console.warn('Firestore batch import err:', e));
          return importedList;
        }

        // Map existing by tombamento (normalized)
        const existingMap = new Map<string, Asset>(
          prev.map(a => [a.tombamento.toLowerCase().trim(), a])
        );
        const newAssets: Asset[] = [];

        for (const item of importedList) {
          const key = item.tombamento.toLowerCase().trim();
          const existing = existingMap.get(key);
          if (existing) {
            // Update existing asset with single unified valor
            const newValor = item.valorAquisicao > 0 ? item.valorAquisicao : existing.valorAquisicao;

            existingMap.set(key, {
              ...existing,
              // 1. Nome do Patrimônio / Nome do Item (ex: fogão)
              descricao: item.descricao && !item.descricao.startsWith('Bem Patrimonial nº')
                ? item.descricao
                : (existing.descricao.startsWith('Bem Patrimonial nº') && item.descricao ? item.descricao : (item.descricao || existing.descricao)),
              // 2. Data de Tombamento
              dataTombamento: item.dataTombamento || existing.dataTombamento,
              // 3. Número do Tombo
              tombamento: item.tombamento || existing.tombamento,
              // 4. NF caso tenha
              notaFiscal: (item.notaFiscal && item.notaFiscal !== 'S/N') ? item.notaFiscal : (existing.notaFiscal || item.notaFiscal),
              // 5. Estado de Conservação
              estado: item.estado || existing.estado,
              // 6. Origem do Recurso
              origemRecurso: item.origemRecurso || existing.origemRecurso,
              // 7. Fornecedor
              fornecedor: (item.fornecedor && !item.fornecedor.includes('Não informado')) ? item.fornecedor : (existing.fornecedor || item.fornecedor),
              // 8. Órgão
              orgao: item.orgao || existing.orgao,
              // 9. Área
              area: item.area || existing.area || item.setorNome || existing.setorNome,
              // 10. Subárea
              subarea: item.subarea || existing.subarea || item.subsetorNome || existing.subsetorNome,
              // 11. Responsável
              responsavelNome: item.responsavelNome || existing.responsavelNome,
              // 12. Data de Aquisição
              dataAquisicao: item.dataAquisicao || existing.dataAquisicao,
              // 13. Forma de Aquisição
              formaAquisicao: item.formaAquisicao || existing.formaAquisicao,
              // 14. Valor do Bem (R$)
              valorAquisicao: newValor,
              valorBrutoContabil: newValor,
              valorResidual: newValor,
              valorLiquidoContabil: newValor,
              depreciacaoAcumulada: 0,
              // Secondary fields
              unidadeNome: item.unidadeNome || existing.unidadeNome,
              unidadeId: item.unidadeId || existing.unidadeId,
              setorNome: item.setorNome || existing.setorNome,
              setorId: item.setorId || existing.setorId,
              subsetorNome: item.subsetorNome || existing.subsetorNome,
              origemTombo: item.origemTombo || existing.origemTombo,
              categoria: item.categoria || existing.categoria,
              numeroSerie: item.numeroSerie || existing.numeroSerie,
            });
          } else {
            newAssets.push(item);
          }
        }

        const merged = [...newAssets, ...Array.from(existingMap.values())];
        batchSaveAssetsToFirestore(merged).catch(e => console.warn('Firestore batch import err:', e));
        return merged;
      });
    }
    setActiveTab('assets');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row antialiased">
      {/* Standardized Left Sidebar (Desktop permanent, Mobile slide drawer) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingTransfersCount={pendingTransfersCount}
        totalAssetsCount={assets.length}
        onOpenMacroMicroReport={() => {
          setInitialMacroForReport('all');
          setIsMacroMicroReportOpen(true);
        }}
        onOpenSmartImport={() => setIsSmartImportModalOpen(true)}
        onOpenQuickScan={() => setActiveTab('audit')}
        onOpenNewAsset={() => setIsNewAssetModalOpen(true)}
        onOpenNewTransfer={() => {
          setPreselectedAssetForTransfer(null);
          setIsNewTransferModalOpen(true);
        }}
        onOpenDataExchange={() => setIsDataExchangeModalOpen(true)}
        currentProfile={currentProfile}
        availableProfiles={AVAILABLE_PROFILES}
        onSelectProfile={setCurrentProfile}
        firebaseStatus={firebaseStatus}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean Top Header (No duplicate buttons) */}
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          pendingTransfersCount={pendingTransfersCount}
          firebaseStatus={firebaseStatus}
          lastQueryDurationMs={lastQueryDurationMs}
          totalAssetsCount={assets.length}
          isProcessing={isProcessing}
        />

        {/* Main Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 lg:pb-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            assets={assets}
            sectors={sectors}
            units={units}
            transfers={transfers}
            currentProfile={currentProfile}
            onNavigateTab={setActiveTab}
            onSelectUnitFilter={(uId) => {
              setSelectedUnitFilter(uId);
              setActiveTab('assets');
            }}
            onOpenNewTransfer={() => {
              setPreselectedAssetForTransfer(null);
              setIsNewTransferModalOpen(true);
            }}
            onOpenNewAsset={() => setIsNewAssetModalOpen(true)}
            onOpenDataExchange={() => setIsDataExchangeModalOpen(true)}
            onOpenSmartImport={() => setIsSmartImportModalOpen(true)}
            onOpenMacroMicroReport={() => {
              setInitialMacroForReport('all');
              setIsMacroMicroReportOpen(true);
            }}
          />
        )}

        {activeTab === 'map' && (
          <UnitsInteractiveMap
            assets={assets}
            sectors={sectors}
            units={units}
            currentProfile={currentProfile}
            onNavigateToAuditRoom={(unitId, sectorName) => {
              setAuditTarget({ unitId, roomName: sectorName });
              setActiveTab('audit');
            }}
            onConcludeRoom={handleConcludeRoom}
            onAddNewLocation={handleAddNewLocation}
          />
        )}

        {activeTab === 'assets' && (
          <AssetsView
            assets={assets}
            sectors={sectors}
            units={units}
            currentProfile={currentProfile}
            selectedUnitId={selectedUnitFilter}
            onSelectUnitId={setSelectedUnitFilter}
            onRequestTransfer={(asset) => {
              setPreselectedAssetForTransfer(asset);
              setIsNewTransferModalOpen(true);
            }}
            onAuditAsset={() => setActiveTab('audit')}
            onOpenNewAssetModal={() => setIsNewAssetModalOpen(true)}
            onOpenSmartImport={() => setIsSmartImportModalOpen(true)}
            onUpdateAsset={handleUpdateAsset}
            onOpenMacroMicroReport={() => {
              setInitialMacroForReport(selectedUnitFilter);
              setIsMacroMicroReportOpen(true);
            }}
          />
        )}

        {activeTab === 'transfers' && (
          <TransfersView
            transfers={transfers}
            assets={assets}
            sectors={sectors}
            units={units}
            currentProfile={currentProfile}
            onApproveTransfer={handleApproveTransfer}
            onRejectTransfer={handleRejectTransfer}
            onOpenNewTransferModal={() => {
              setPreselectedAssetForTransfer(null);
              setIsNewTransferModalOpen(true);
            }}
            onViewGeneratedTerm={(termId) => {
              setSelectedTermIdForView(termId);
              setActiveTab('terms');
            }}
          />
        )}

        {activeTab === 'audit' && (
          <AuditView
            assets={assets}
            sectors={sectors}
            units={units}
            currentProfile={currentProfile}
            initialUnitId={auditTarget?.unitId}
            initialSectorName={auditTarget?.roomName}
            onUpdateAudit={handleUpdateAudit}
            onAddAsset={handleAddNewAsset}
            onUpdateAsset={handleUpdateAsset}
            onConsolidateRoom={handleConsolidateRoomOfficial}
            onRecordQueryDuration={(dur) => setLastQueryDurationMs(Math.max(1, Math.round(dur)))}
            onConcludeRoom={handleConcludeRoom}
            onReopenRoom={handleReopenRoom}
            onUpdateSector={handleUpdateSector}
            onAddNewLocation={handleAddNewLocation}
            onResetAllAudits={handleResetAllAuditsToCleanSlate}
          />
        )}

        {activeTab === 'terms' && (
          <TermsView
            terms={terms}
            assets={assets}
            sectors={sectors}
            units={units}
            currentProfile={currentProfile}
            onCreateTerm={(newTerm) => setTerms(prev => [newTerm, ...prev])}
            initialSelectedTermId={selectedTermIdForView}
          />
        )}

        {activeTab === 'norms' && (
          <NormsView />
        )}

        {activeTab === 'saneamento' && (
          <SaneamentoView
            assets={assets}
            sectors={sectors}
            units={units}
            currentProfile={currentProfile}
            onNavigateToAssets={() => setActiveTab('assets')}
            onNavigateToTransfers={() => setActiveTab('transfers')}
            onNavigateToAudit={() => setActiveTab('audit')}
            onUpdateAsset={handleUpdateAsset}
            onAddAsset={handleAddNewAsset}
          />
        )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (only on small screens < lg) */}
      <div className="lg:hidden">
        <BottomNavigation
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingTransfersCount={pendingTransfersCount}
        />
      </div>

      {/* Modals */}
      {isNewTransferModalOpen && (
        <NewTransferModal
          isOpen={isNewTransferModalOpen}
          onClose={() => {
            setIsNewTransferModalOpen(false);
            setPreselectedAssetForTransfer(null);
          }}
          onSubmit={handleCreateNewTransfer}
          assets={assets}
          sectors={sectors}
          units={units}
          currentProfile={currentProfile}
          preselectedAsset={preselectedAssetForTransfer}
        />
      )}

      {isNewAssetModalOpen && (
        <NewAssetModal
          isOpen={isNewAssetModalOpen}
          onClose={() => setIsNewAssetModalOpen(false)}
          onSubmit={handleAddNewAsset}
          sectors={sectors}
          units={units}
          existingAssetsCount={assets.length}
        />
      )}

      {isDataExchangeModalOpen && (
        <DataExchangeModal
          isOpen={isDataExchangeModalOpen}
          onClose={() => setIsDataExchangeModalOpen(false)}
          assets={assets}
          onClearAllData={handleClearAllData}
          onOpenSmartImport={() => {
            setIsDataExchangeModalOpen(false);
            setIsSmartImportModalOpen(true);
          }}
        />
      )}

      {isSmartImportModalOpen && (
        <SmartImportModal
          isOpen={isSmartImportModalOpen}
          onClose={() => setIsSmartImportModalOpen(false)}
          units={units}
          sectors={sectors}
          onImportCompleted={handleSmartImportBatch}
          existingCount={assets.length}
        />
      )}

      {/* Caderno de Balanço & Inventário Geral (Macro ➔ Micro) */}
      {isMacroMicroReportOpen && (
        <MacroMicroInventoryReportModal
          isOpen={isMacroMicroReportOpen}
          onClose={() => setIsMacroMicroReportOpen(false)}
          assets={assets}
          units={units}
          sectors={sectors}
          currentProfile={currentProfile}
          initialMacroUnitId={initialMacroForReport}
          onAddAsset={handleAddNewAsset}
          onUpdateAsset={handleUpdateAsset}
          onNavigateToAudit={(roomName, unitId) => {
            if (roomName || unitId) {
              setAuditTarget({ unitId, roomName });
            }
            setIsMacroMicroReportOpen(false);
            setActiveTab('audit');
          }}
        />
      )}
    </div>
  );
}
