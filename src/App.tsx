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
  AssetCondition,
  TrashedAsset,
  TrashedSector,
  AssetExit
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
  getAssetDeduplicationKey, 
  deduplicateAssetsList, 
  countDuplicateAssets,
  deduplicateSectorsList,
  countDuplicateSectors,
  findFalseDuplicateTrashedAssets
} from './utils/assetDeduplication';
import { 
  testFirebaseConnection,
  subscribeToAssets,
  subscribeToTransfers,
  subscribeToTerms,
  saveAssetToFirestore,
  batchSaveAssetsToFirestore,
  clearAllAssetsFromFirestore,
  batchReplaceAssetsInFirestore,
  saveTransferToFirestore,
  saveTermToFirestore,
  deleteAssetFromFirestore,
  saveTrashedAssetToFirestore,
  deleteTrashedAssetFromFirestore,
  fetchAllTrashedAssetsFromFirestore,
  saveExitToFirestore,
  deleteExitFromFirestore,
  fetchAllExitsFromFirestore
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
import { TrashView } from './components/TrashView';
import { ExitsView } from './components/ExitsView';
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

      const rawList = Array.from(map.values());
      const { uniqueSectors } = deduplicateSectorsList(rawList);
      return uniqueSectors;
    } catch (e) {
      console.warn('Error reading custom sectors from localStorage:', e);
    }
    return deduplicateSectorsList(CPSMS_SECTORS).uniqueSectors;
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

  // Trash & Quarantine state (7-day safety retention)
  const [trashAssets, setTrashAssets] = useState<TrashedAsset[]>(() => {
    try {
      const saved = localStorage.getItem('cpsms_trash_assets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          const valid = parsed.filter((item: TrashedAsset) => {
            const t = new Date(item.deletedAt).getTime();
            return now - t < 7 * 24 * 60 * 60 * 1000;
          });
          return valid;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [trashSectors, setTrashSectors] = useState<TrashedSector[]>(() => {
    try {
      const saved = localStorage.getItem('cpsms_trash_sectors');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          const valid = parsed.filter((item: TrashedSector) => {
            const t = new Date(item.deletedAt).getTime();
            return now - t < 7 * 24 * 60 * 60 * 1000;
          });
          return valid;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Asset Exits state (Devoluções e Doações)
  const [exits, setExits] = useState<AssetExit[]>(() => {
    try {
      const saved = localStorage.getItem('cpsms_asset_exits');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

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
        const isExplicitlyCleared = localStorage.getItem('patrimonio_cpsms_explicitly_cleared') === 'true';

        let effectiveAssets = loadedAssets;
        if (isExplicitlyCleared && (!loadedAssets || loadedAssets.length === 0)) {
          effectiveAssets = [];
        } else if (!isCleanResetDone) {
          // RESET CLEAN SLATE: Start completely pending with genuine assets (zero fake conferences)
          effectiveAssets = INITIAL_ASSETS.map(a => ({
            ...a,
            auditoria: {
              conferido: false
            }
          }));
          saveAssetsToDB(effectiveAssets).catch(console.warn);
          localStorage.setItem(CLEAN_RESET_KEY, 'done');
        } else if (!isExplicitlyCleared && (!effectiveAssets || effectiveAssets.length <= 1) && INITIAL_ASSETS.length > 1) {
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

        // Sync trashed assets from Firestore
        fetchAllTrashedAssetsFromFirestore().then(cloudTrash => {
          if (cloudTrash && cloudTrash.length > 0) {
            setTrashAssets(prev => {
              const map = new Map<string, TrashedAsset>();
              prev.forEach(t => map.set(t.asset.id, t));
              cloudTrash.forEach(t => map.set(t.asset.id, t));
              const now = Date.now();
              const valid = Array.from(map.values()).filter(t => now - new Date(t.deletedAt).getTime() < 7 * 24 * 60 * 60 * 1000);
              try {
                localStorage.setItem('cpsms_trash_assets', JSON.stringify(valid));
              } catch (e) {
                console.warn(e);
              }
              return valid;
            });
          }
        }).catch(e => console.warn('Cloud trash fetch error:', e));

        // Sync exits from Firestore
        fetchAllExitsFromFirestore().then(cloudExits => {
          if (cloudExits && cloudExits.length > 0) {
            setExits(prev => {
              const map = new Map<string, AssetExit>();
              prev.forEach(e => map.set(e.id, e));
              cloudExits.forEach(e => map.set(e.id, e));
              const merged = Array.from(map.values());
              try {
                localStorage.setItem('cpsms_asset_exits', JSON.stringify(merged));
              } catch (err) {
                console.warn(err);
              }
              return merged;
            });
          }
        }).catch(e => console.warn('Cloud exits fetch error:', e));
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
          const isExplicitlyCleared = localStorage.getItem('patrimonio_cpsms_explicitly_cleared') === 'true';
          if (isExplicitlyCleared) {
            // Se o usuário limpou a base explicitamente, não ressuscita dados antigos da nuvem
            setAssets([]);
            return;
          }

          if (isCleanResetJustRun && localAssets.length > 0) {
            // First time clean slate: force overwrite cloud with clean zero-conference assets
            batchSaveAssetsToFirestore(localAssets).catch(console.warn);
            localStorage.setItem(CLEAN_RESET_KEY + '_cloud_synced', 'true');
            return;
          }
          if (cloudAssets && cloudAssets.length > 0) {
            const { uniqueAssets } = deduplicateAssetsList(cloudAssets);
            setAssets(uniqueAssets);
            saveAssetsToDB(uniqueAssets);
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
    setAssets(prev => {
      const updated = [newAsset, ...prev];
      saveAssetsToDB(updated).catch(e => console.warn('IndexedDB asset err:', e));
      return updated;
    });
    saveAssetToFirestore(newAsset).catch(e => console.warn('Firestore asset err:', e));
    if (navigateToAssetsTab) {
      setActiveTab('assets');
    }
  };

  const handleUpdateAsset = (updatedAsset: Asset) => {
    setAssets(prev => {
      const updated = prev.map(a => a.id === updatedAsset.id ? updatedAsset : a);
      saveAssetsToDB(updated).catch(e => console.warn('IndexedDB asset err:', e));
      return updated;
    });
    saveAssetToFirestore(updatedAsset).catch(e => console.warn('Firestore asset err:', e));
  };

  // ==========================================
  // LIXEIRA & QUARENTENA DE SEGURANÇA (7 DIAS)
  // ==========================================
  const handleDeleteAsset = (assetId: string, reason?: string) => {
    const target = assets.find(a => a.id === assetId);
    if (!target) return;

    const trashed: TrashedAsset = {
      asset: target,
      deletedAt: new Date().toISOString(),
      deletedBy: currentProfile.nome,
      reason: reason || 'Duplicidade de cadastro / Exclusão manual',
    };

    // 1. Remove do estado ativo e salva
    setAssets(prev => {
      const updated = prev.filter(a => a.id !== assetId);
      saveAssetsToDB(updated).catch(e => console.warn('IndexedDB delete err:', e));
      return updated;
    });
    deleteAssetFromFirestore(assetId).catch(e => console.warn('Firestore delete err:', e));

    // 2. Adiciona à lixeira
    setTrashAssets(prev => {
      const updated = [trashed, ...prev.filter(t => t.asset.id !== assetId)];
      try {
        localStorage.setItem('cpsms_trash_assets', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage trash save err:', e);
      }
      return updated;
    });
    saveTrashedAssetToFirestore(trashed).catch(e => console.warn('Firestore save trash err:', e));
  };

  const handleRestoreAsset = (assetId: string) => {
    const trashedItem = trashAssets.find(t => t.asset.id === assetId);
    if (!trashedItem) return;

    // 1. Remove da lixeira
    setTrashAssets(prev => {
      const updated = prev.filter(t => t.asset.id !== assetId);
      try {
        localStorage.setItem('cpsms_trash_assets', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage trash save err:', e);
      }
      return updated;
    });
    deleteTrashedAssetFromFirestore(assetId).catch(e => console.warn('Firestore delete trash err:', e));

    // 2. Retorna para o patrimônio ativo
    setAssets(prev => {
      const updated = [trashedItem.asset, ...prev.filter(a => a.id !== assetId)];
      saveAssetsToDB(updated).catch(e => console.warn('IndexedDB restore err:', e));
      return updated;
    });
    saveAssetToFirestore(trashedItem.asset).catch(e => console.warn('Firestore restore asset err:', e));
  };

  const handlePermanentlyDeleteAsset = (assetId: string) => {
    const trashedItem = trashAssets.find(t => t.asset.id === assetId);
    if (!trashedItem) return;
    const elapsed = Date.now() - new Date(trashedItem.deletedAt).getTime();
    if (elapsed < 7 * 24 * 60 * 60 * 1000) {
      alert('Segurança: Este bem só pode ser excluído definitivamente após 7 dias de quarentena na lixeira.');
      return;
    }

    setTrashAssets(prev => {
      const updated = prev.filter(t => t.asset.id !== assetId);
      try {
        localStorage.setItem('cpsms_trash_assets', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage trash err:', e);
      }
      return updated;
    });
    deleteTrashedAssetFromFirestore(assetId).catch(e => console.warn('Firestore permanent delete err:', e));
  };

  const handleDeleteSector = (sectorIdOrName: string, reason?: string) => {
    const norm = normalizeLoc(sectorIdOrName);
    const target = sectors.find(s => s.id === sectorIdOrName || normalizeLoc(s.nome) === norm);
    if (!target) return;

    const trashed: TrashedSector = {
      sector: target,
      deletedAt: new Date().toISOString(),
      deletedBy: currentProfile.nome,
      reason: reason || 'Duplicidade de sala / Exclusão manual',
    };

    // 1. Remove dos setores ativos
    setSectors(prev => {
      const updated = prev.filter(s => s.id !== target.id && normalizeLoc(s.nome) !== norm);
      try {
        localStorage.setItem('cpsms_custom_sectors', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage custom sectors err:', e);
      }
      return updated;
    });

    // 2. Adiciona à lixeira
    setTrashSectors(prev => {
      const updated = [trashed, ...prev.filter(t => t.sector.id !== target.id)];
      try {
        localStorage.setItem('cpsms_trash_sectors', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage trash sectors err:', e);
      }
      return updated;
    });
  };

  const handleRestoreSector = (sectorId: string) => {
    const trashedItem = trashSectors.find(t => t.sector.id === sectorId);
    if (!trashedItem) return;

    // 1. Remove da lixeira
    setTrashSectors(prev => {
      const updated = prev.filter(t => t.sector.id !== sectorId);
      try {
        localStorage.setItem('cpsms_trash_sectors', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage trash sectors err:', e);
      }
      return updated;
    });

    // 2. Retorna para os setores ativos
    setSectors(prev => {
      const updated = [...prev.filter(s => s.id !== sectorId), trashedItem.sector];
      try {
        localStorage.setItem('cpsms_custom_sectors', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage restore sector err:', e);
      }
      return updated;
    });
  };

  const handlePermanentlyDeleteSector = (sectorId: string) => {
    const trashedItem = trashSectors.find(t => t.sector.id === sectorId);
    if (!trashedItem) return;
    const elapsed = Date.now() - new Date(trashedItem.deletedAt).getTime();
    if (elapsed < 7 * 24 * 60 * 60 * 1000) {
      alert('Segurança: Esta sala só pode ser excluída definitivamente após 7 dias de quarentena na lixeira.');
      return;
    }

    setTrashSectors(prev => {
      const updated = prev.filter(t => t.sector.id !== sectorId);
      try {
        localStorage.setItem('cpsms_trash_sectors', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage trash sectors err:', e);
      }
      return updated;
    });
  };

  const handlePurgeExpiredTrash = () => {
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    const expiredAssets = trashAssets.filter(t => now - new Date(t.deletedAt).getTime() >= SEVEN_DAYS);
    expiredAssets.forEach(t => {
      deleteTrashedAssetFromFirestore(t.asset.id).catch(e => console.warn(e));
    });

    setTrashAssets(prev => {
      const remaining = prev.filter(t => now - new Date(t.deletedAt).getTime() < SEVEN_DAYS);
      try {
        localStorage.setItem('cpsms_trash_assets', JSON.stringify(remaining));
      } catch (e) {
        console.warn(e);
      }
      return remaining;
    });

    setTrashSectors(prev => {
      const remaining = prev.filter(t => now - new Date(t.deletedAt).getTime() < SEVEN_DAYS);
      try {
        localStorage.setItem('cpsms_trash_sectors', JSON.stringify(remaining));
      } catch (e) {
        console.warn(e);
      }
      return remaining;
    });
  };

  // ==========================================
  // SAÍDAS PATRIMONIAIS (DEVOLUÇÃO & DOAÇÃO)
  // ==========================================
  const handleCreateExit = (newExitData: Omit<AssetExit, 'id' | 'dataRegistro' | 'status'>) => {
    const exitId = `exit-${Date.now()}`;
    const newExit: AssetExit = {
      ...newExitData,
      id: exitId,
      dataRegistro: new Date().toISOString(),
      status: 'concluida',
    };

    // 1. Salva saída
    setExits(prev => {
      const updated = [newExit, ...prev];
      try {
        localStorage.setItem('cpsms_asset_exits', JSON.stringify(updated));
      } catch (err) {
        console.warn('LocalStorage exits save err:', err);
      }
      return updated;
    });
    saveExitToFirestore(newExit).catch(e => console.warn('Firestore exit save err:', e));

    // 2. Atualiza o bem no inventário com a baixa/saída registrada
    setAssets(prev => {
      const updated = prev.map(a => {
        if (a.id === newExit.assetId) {
          const updatedAsset: Asset = {
            ...a,
            statusSaida: newExit.tipoSaida === 'devolucao' ? 'devolvido' : 'doado',
            detalhesSaida: {
              tipo: newExit.tipoSaida,
              destinatario: newExit.destinatario,
              processo: newExit.numeroProcesso,
              dataSaida: newExit.dataSaida,
              responsavelDestino: newExit.destinatarioResponsavel,
              motivo: newExit.motivo,
            },
            auditoria: {
              ...a.auditoria,
              conferido: true,
              statusDivergencia: 'conforme',
              observacaoAuditoria: `[SAÍDA REGISTRADA - ${newExit.tipoSaida.toUpperCase()}] ${newExit.motivo}. Destinatário: ${newExit.destinatario}. Processo: ${newExit.numeroProcesso}.`,
            }
          };
          saveAssetToFirestore(updatedAsset).catch(e => console.warn('Firestore asset exit update err:', e));
          return updatedAsset;
        }
        return a;
      });
      saveAssetsToDB(updated).catch(e => console.warn('IndexedDB asset exit update err:', e));
      return updated;
    });
  };

  const handleCancelExit = (exitId: string) => {
    const exitItem = exits.find(e => e.id === exitId);
    if (!exitItem) return;

    // 1. Remove saída
    setExits(prev => {
      const updated = prev.filter(e => e.id !== exitId);
      try {
        localStorage.setItem('cpsms_asset_exits', JSON.stringify(updated));
      } catch (err) {
        console.warn('LocalStorage exit delete err:', err);
      }
      return updated;
    });
    deleteExitFromFirestore(exitId).catch(e => console.warn('Firestore exit delete err:', e));

    // 2. Reativa o bem no inventário
    setAssets(prev => {
      const updated = prev.map(a => {
        if (a.id === exitItem.assetId) {
          const reativado: Asset = {
            ...a,
            statusSaida: 'ativo',
            detalhesSaida: undefined,
          };
          saveAssetToFirestore(reativado).catch(e => console.warn(e));
          return reativado;
        }
        return a;
      });
      saveAssetsToDB(updated).catch(e => console.warn(e));
      return updated;
    });
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

    // 3. Preserva ESTRITAMENTE as escolhas do vistoriador:
    // NÃO marca em massa conferido=true nos bens não selecionados.
    // Apenas os bens que o usuário efetivamente conferiu/selecionou in loco permanecem conferidos.

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
    const t0 = performance.now();
    setIsProcessing(true);
    try {
      // 1. Zera estados em memória IMEDIATAMENTE para resposta visual instantânea
      setAssets([]);
      setTransfers([]);
      setTerms([]);

      // 2. Marca flag de limpeza explícita e limpa todos os caches
      localStorage.setItem('patrimonio_cpsms_explicitly_cleared', 'true');
      localStorage.removeItem('patrimonio_cpsms_assets_v2');
      localStorage.removeItem('cpsms_reviewed_rooms');
      localStorage.removeItem('cpsms_room_consolidated');
      localStorage.removeItem('cpsms_room_drafts');
      localStorage.removeItem('patrimonio_cpsms_reviewed_rooms_v1');

      // 3. Limpa IndexedDB local
      await clearAllDB();

      // 4. Limpa o Google Cloud Firestore
      if (firebaseStatus === 'connected') {
        try {
          await clearAllAssetsFromFirestore();
        } catch (fErr) {
          console.warn('Aviso ao limpar Firestore:', fErr);
        }
      }
    } catch (err) {
      console.error('Erro ao limpar base de bens:', err);
    } finally {
      setIsProcessing(false);
      setLastQueryDurationMs(Math.max(5, Math.round(performance.now() - t0)));
    }
  };

  const handleExecuteDeduplicationRule = async (): Promise<{
    assetsRemoved: number;
    sectorsMerged: number;
    assetsRestored: number;
  }> => {
    const t0 = performance.now();
    setIsProcessing(true);
    try {
      // 1. Desduplica salas/setores duplicados (ex: "004 - COPA" e "COPA")
      const { uniqueSectors, removedCount: sectorsMerged } = deduplicateSectorsList(sectors);
      if (sectorsMerged > 0) {
        setSectors(uniqueSectors);
        try {
          localStorage.setItem('cpsms_custom_sectors', JSON.stringify(uniqueSectors));
        } catch (e) {
          console.warn('Erro ao salvar setores desduplicados:', e);
        }
      }

      // 2. Desduplica bens patrimoniais preservando conferências
      const { uniqueAssets, removedCount: assetsRemoved } = deduplicateAssetsList(assets);

      // 3. Detecta e restaura bens na lixeira apagados por engano de duplicidade de sala
      const falseDuplicates = findFalseDuplicateTrashedAssets(uniqueAssets, trashAssets);
      let assetsRestored = 0;
      let finalAssets = uniqueAssets;

      if (falseDuplicates.length > 0) {
        const falseIds = new Set(falseDuplicates.map(f => f.asset.id));
        const restoredList = falseDuplicates.map(f => f.asset);
        finalAssets = [...restoredList, ...uniqueAssets];
        assetsRestored = falseDuplicates.length;

        setTrashAssets(prev => {
          const updated = prev.filter(t => !falseIds.has(t.asset.id));
          try {
            localStorage.setItem('cpsms_trash_assets', JSON.stringify(updated));
          } catch (e) {
            console.warn('Erro ao atualizar lixeira:', e);
          }
          return updated;
        });

        falseDuplicates.forEach(f => {
          deleteTrashedAssetFromFirestore(f.asset.id).catch(e => console.warn('Firestore trash delete err:', e));
        });
      }

      // 4. Salva no IndexedDB
      await saveAssetsToDB(finalAssets);

      // 5. Substitui no Cloud Firestore
      if (firebaseStatus === 'connected') {
        try {
          await batchReplaceAssetsInFirestore(finalAssets);
        } catch (fErr) {
          console.warn('Aviso ao sincronizar no Firestore:', fErr);
        }
      }

      setAssets(finalAssets);
      return { assetsRemoved, sectorsMerged, assetsRestored };
    } catch (err) {
      console.error('Erro ao executar regra da desduplicidade:', err);
      return { assetsRemoved: 0, sectorsMerged: 0, assetsRestored: 0 };
    } finally {
      setIsProcessing(false);
      setLastQueryDurationMs(Math.max(5, Math.round(performance.now() - t0)));
    }
  };

  const handleDeduplicateAssets = async () => {
    const res = await handleExecuteDeduplicationRule();
    return res.assetsRemoved;
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

  const handleSmartImportBatch = async (importedList: Asset[], mode: 'update' | 'replace' = 'update') => {
    const t0 = performance.now();
    setIsProcessing(true);
    try {
      // 1. Limpa imediatamente a flag de base apagada para que o sistema reconheça a nova planilha
      localStorage.removeItem('patrimonio_cpsms_explicitly_cleared');

      // 2. Desduplica os itens dentro da própria planilha importada
      const { uniqueAssets: uniqueImported } = deduplicateAssetsList(importedList);

      let targetList: Asset[] = [];

      if (mode === 'replace') {
        // Modo SUBSTITUIR: Limpa o banco local e define a base exatamente como a planilha importada
        targetList = uniqueImported;
        await clearAllDB();
      } else {
        // Modo ATUALIZAR / MESCLAR: Combina com os existentes sem somar duplicatas
        const combined = [...assets, ...uniqueImported];
        const { uniqueAssets: merged } = deduplicateAssetsList(combined);
        targetList = merged;
      }

      // 3. Atualiza estado em memória e filtros IMEDIATAMENTE (resposta visual imediata)
      setAssets(targetList);
      setSelectedUnitFilter('all');
      setActiveTab('assets');

      // 4. Salva no IndexedDB local de forma persistente
      await saveAssetsToDB(targetList);

      // 5. Atualiza o Cloud Firestore de forma resiliente
      if (firebaseStatus === 'connected') {
        try {
          await batchReplaceAssetsInFirestore(targetList);
        } catch (fErr) {
          console.warn('Aviso sincronizando importação com Firestore:', fErr);
        }
      }
    } catch (err) {
      console.error('Erro na importação de planilha:', err);
    } finally {
      setIsProcessing(false);
      setLastQueryDurationMs(Math.max(5, Math.round(performance.now() - t0)));
      setActiveTab('assets');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row antialiased">
      {/* Standardized Left Sidebar (Desktop permanent, Mobile slide drawer) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingTransfersCount={pendingTransfersCount}
        totalAssetsCount={assets.length}
        trashCount={trashAssets.length + trashSectors.length}
        exitsCount={exits.filter(e => e.status === 'concluida').length}
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
            onDeleteSector={handleDeleteSector}
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
            onClearAllData={handleClearAllData}
            onDeduplicateAssets={handleDeduplicateAssets}
            onExecuteDeduplicationRule={handleExecuteDeduplicationRule}
            trashAssets={trashAssets}
            onDeleteAsset={handleDeleteAsset}
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
            onDeleteAsset={handleDeleteAsset}
            onDeleteSector={handleDeleteSector}
            onExecuteDeduplicationRule={handleExecuteDeduplicationRule}
            trashAssets={trashAssets}
            onNavigateToTrash={() => setActiveTab('trash')}
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

        {activeTab === 'trash' && (
          <TrashView
            trashAssets={trashAssets}
            trashSectors={trashSectors}
            activeAssets={assets}
            currentProfile={currentProfile}
            onRestoreAsset={handleRestoreAsset}
            onPermanentlyDeleteAsset={handlePermanentlyDeleteAsset}
            onRestoreSector={handleRestoreSector}
            onPermanentlyDeleteSector={handlePermanentlyDeleteSector}
            onPurgeExpiredTrash={handlePurgeExpiredTrash}
            onExecuteDeduplicationRule={handleExecuteDeduplicationRule}
          />
        )}

        {activeTab === 'exits' && (
          <ExitsView
            exits={exits}
            assets={assets}
            units={units}
            sectors={sectors}
            currentProfile={currentProfile}
            onCreateExit={handleCreateExit}
            onCancelExit={handleCancelExit}
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
          onClearAllData={handleClearAllData}
          onDeduplicateAssets={handleDeduplicateAssets}
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
