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
  AVAILABLE_PROFILES 
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

export default function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sectors] = useState<Sector[]>(CPSMS_SECTORS);
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
      return AVAILABLE_PROFILES[0]; // Gerliane Magalhães
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

  // Load from IndexedDB on startup + Real-time Cloud Firestore synchronization
  useEffect(() => {
    let unsubscribeAssets: (() => void) | undefined;
    let unsubscribeTransfers: (() => void) | undefined;
    let unsubscribeTerms: (() => void) | undefined;

    async function loadData() {
      let localAssets: Asset[] = [];
      try {
        const [loadedAssets, loadedTransfers, loadedTerms] = await Promise.all([
          loadAssetsFromDB(),
          loadTransfersFromDB(),
          loadTermsFromDB()
        ]);
        localAssets = loadedAssets;
        setAssets(loadedAssets);
        setTransfers(loadedTransfers);
        setTerms(loadedTerms);
      } catch (err) {
        console.error('Error loading from IndexedDB:', err);
      } finally {
        setIsDBLoaded(true);
      }

      // Test connection to Google Firebase
      const isConnected = await testFirebaseConnection();
      if (isConnected) {
        setFirebaseStatus('connected');

        // Subscribe to real-time Cloud Firestore collections
        let initialAssetsCheckDone = false;
        unsubscribeAssets = subscribeToAssets((cloudAssets) => {
          if (cloudAssets && cloudAssets.length > 0) {
            setAssets(cloudAssets);
            saveAssetsToDB(cloudAssets);
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
        gestoraNome: 'Maria Gerliane Rocha Magalhães',
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
      gestoraNome: 'Maria Gerliane Rocha Magalhães',
    };
    setTransfers(prev => [newRequest, ...prev]);
    saveTransferToFirestore(newRequest).catch(e => console.warn('Firestore transfer err:', e));
    setActiveTab('transfers');
  };

  const handleAddNewAsset = (newAsset: Asset) => {
    setAssets(prev => [newAsset, ...prev]);
    saveAssetToFirestore(newAsset).catch(e => console.warn('Firestore asset err:', e));
    setActiveTab('assets');
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
      observacaoAuditoria: string;
      responsavelConferencia: string;
    }
  ) => {
    setAssets(prev => prev.map(a => {
      if (a.id === assetId) {
        const audited: Asset = {
          ...a,
          estado: data.novoEstado || a.estado,
          auditoria: {
            conferido: data.conferido,
            dataConferencia: new Date().toISOString().slice(0, 16).replace('T', ' '),
            responsavelConferencia: data.responsavelConferencia,
            statusDivergencia: data.statusDivergencia,
            unidadeEncontrada: data.unidadeEncontrada,
            setorEncontrado: data.setorEncontrado,
            subsetorEncontrado: data.subsetorEncontrado,
            observacaoAuditoria: data.observacaoAuditoria,
          }
        };
        saveAssetToFirestore(audited).catch(e => console.warn('Firestore audit err:', e));
        return audited;
      }
      return a;
    }));
  };

  const handleClearAllData = async () => {
    await clearAllDB();
    setAssets([]);
    setTransfers([]);
    setTerms([]);
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
