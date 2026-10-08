export type AssetCategory = 
  | 'Equipamentos Médicos & Odontológicos'
  | 'TI & Informática'
  | 'Mobiliário Hospitalar & Escritório'
  | 'Aparelhos Eletroeletrônicos & Climatização'
  | 'Veículos & Ambulâncias'
  | 'Instrumentais & CME';

export type AssetCondition = 
  | 'Excelente'
  | 'Bom'
  | 'Regular'
  | 'Ocioso'
  | 'Inservível / Danificado';

export type TomboOrigin = 
  | 'CPSMS (Próprio do Consórcio)'
  | 'SESA (Governo do Ceará - Cessão/Comodato)'
  | 'UFC (Universidade Federal do Ceará)'
  | 'Ministério da Saúde / SUS / Doação'
  | 'Município Consorciado';

export interface AuditRecord {
  conferido: boolean;
  dataConferencia?: string;
  responsavelConferencia?: string;
  observacaoAuditoria?: string;
  statusDivergencia?: 'conforme' | 'setor_divergente' | 'nao_encontrado' | 'estado_alterado';
  unidadeEncontrada?: string;
  setorEncontrado?: string;
  subsetorEncontrado?: string;
  setorOriginalAspec?: string; // Localização oficial cadastrada no ASPEC
  unidadeOriginalAspec?: string; // Unidade gestora original no ASPEC
  divergenciaConfirmada?: boolean; // Se a alteração de setor foi confirmada pelo usuário
  statusRegularizacaoAspec?: 'provisorio' | 'oficializado'; // 'provisorio': no caderno com observação provisória; 'oficializado': após OK oficial da gestora no ASPEC
  gestoraConfirmouAspec?: boolean; // OK oficial da gestora confirmando baixa/mudança no sistema ASPEC
  dataOficializacaoAspec?: string;
  protocoloOficializacaoAspec?: string;
  responsavelOficializacaoAspec?: string;
}

export interface Asset {
  id: string;
  tombamento: string; // Número do Tombo / Plaqueta
  origemTombo: TomboOrigin; // Origem do Tombo (CPSMS / SESA / UFC / etc.)
  origemRecurso?: string; // Origem do Recurso (Próprio CPSMS, Convênio Federal SUS, Estado SESA, Doação, etc.)
  formaAquisicao?: string; // Forma de Aquisição (Compra/Pregão, Cessão/Comodato, Doação, Permuta)
  orgao?: string; // Órgão / Ente Gestor (Consórcio CPSMS, Governo do Estado, UFC, etc.)
  descricao: string; // Nome do Patrimônio / Nome do Item (ex: fogão, ar condicionado, mesa)
  unidadeId: string; // 'policlinica' | 'ceo' | 'sede-cpsms'
  unidadeNome: string;
  area?: string; // Área / Setor de Lotação
  subarea?: string; // Subárea / Sala / Consultório / Ambiente
  setorId: string;
  setorNome: string;
  subsetorNome: string;
  responsavelNome: string; // Responsável / Detentor da Carga
  responsavelCargo: string;
  responsavelMatricula: string;
  categoria: AssetCategory;
  estado: AssetCondition; // Estado de Conservação
  valorAquisicao: number; // Valor de Aquisição (R$)
  valorResidual: number; // Valor Líquido Contábil / Residual (R$)
  valorBrutoContabil?: number; // Valor B. Contábil (R$)
  valorLiquidoContabil?: number; // Valor L. Contábil (R$)
  depreciacaoAcumulada?: number; // Depreciação Acumulada (R$)
  dataAquisicao: string; // Data de Aquisição
  dataTombamento?: string; // Data de Tombamento
  notaFiscal: string; // NF caso tenha
  fornecedor: string; // Fornecedor / Cedente
  numeroSerie: string;
  observacoes: string;
  termoCessaoVinculado?: string; // Se tombo SESA ou UFC, número do termo de cessão
  tomboOrigemSesa?: string; // Tombo de Origem SESA / Governo do Ceará (padrão 6 dígitos)
  tomboSecundario?: string; // Tombo secundário ou retombamento anterior
  duploTombamento?: boolean; // Indica duplicidade de plaqueta (4 dígitos CPSMS + 6 dígitos SESA)
  tomboConsorcio?: string; // Tombo do Consórcio CPSMS (geralmente 4 dígitos)
  tomboSesa?: string; // Tombo SESA (Governo do Estado do Ceará - 6 dígitos)
  tomboUfc?: string; // Tombo UFC (Universidade Federal do Ceará)
  tomboFcpc?: string; // Tombo FCPC (Fundação Cearense de Pesquisa e Cultura)
  outrosTombos?: string; // Outros tombos adicionais / tombamentos múltiplos (livre)
  foraDoAspec?: boolean; // Bem físico encontrado na conferência que NÃO estava cadastrado no ASPEC
  semPlaqueta?: boolean; // Bem físico encontrado sem plaqueta de tombamento (para novo emplacamento)
  setorOriginalAspec?: string; // Setor original cadastrado no ASPEC antes da divergência
  unidadeOriginalAspec?: string; // Unidade original no ASPEC
  statusRegularizacaoAspec?: 'provisorio' | 'oficializado';
  codigoSGPS?: string;
  codigoASPEC?: string;
  auditoria: AuditRecord;
}

export type TransferStatus = 'pendente' | 'aprovada' | 'rejeitada';

export interface TransferRequest {
  id: string;
  protocolo: string; // Ex: "MOV-CPSMS-2026/001"
  assetId: string;
  assetTombamento: string;
  assetDescricao: string;
  assetOrigemTombo: TomboOrigin;
  unidadeOrigem: string;
  setorOrigem: string;
  subsetorOrigem: string;
  unidadeDestino: string;
  setorDestino: string;
  subsetorDestino: string;
  solicitanteNome: string;
  solicitanteCargo: string;
  solicitanteUnidade: string;
  responsavelDestino: string;
  matriculaResponsavelDestino: string;
  motivo: string;
  status: TransferStatus;
  dataSolicitacao: string;
  dataDecisao?: string;
  gestoraParecer?: string;
  gestoraNome: string;
  termoGeradoId?: string;
}

export interface SubSector {
  id: string;
  nome: string;
  descricao?: string;
}

export interface Sector {
  id: string;
  unidadeId: 'policlinica' | 'ceo' | 'sede-cpsms' | 'cer';
  unidadeNome: string;
  nome: string;
  sigla: string;
  responsavelNome: string;
  responsavelCargo: string;
  responsavelMatricula: string;
  subsetores: SubSector[];
}

export interface UnitInfo {
  id: 'policlinica' | 'ceo' | 'sede-cpsms';
  nome: string;
  nomeOficial: string;
  sigla: string;
  endereco: string;
  municipio: string;
}

export interface UserProfile {
  id: string;
  nome: string;
  cargo: string;
  role: 'gestora' | 'lider';
  unidadeId?: 'policlinica' | 'ceo' | 'sede-cpsms';
  unidadeNome?: string;
  setorId?: string;
  setorNome?: string;
  matricula: string;
}

export interface ResponsibilityTerm {
  id: string;
  numeroTermo: string; // Ex: "TR-CPSMS-2026/001"
  tipo: 'termo_setorial' | 'termo_transferencia' | 'termo_cessao_sesa' | 'termo_baixa';
  titulo: string;
  dataEmissao: string;
  unidadeOrigem?: string;
  setorOrigem?: string;
  unidadeDestino: string;
  setorDestino: string;
  subsetorDestino?: string;
  responsavelNome: string;
  responsavelCargo: string;
  responsavelMatricula: string;
  gestoraNome: string;
  gestoraCargo: string;
  bens: Array<{
    tombamento: string;
    origemTombo: TomboOrigin;
    descricao: string;
    estado: AssetCondition;
    valor: number;
    numeroSerie?: string;
  }>;
  observacoesLegais: string;
  codigoVerificacao: string;
  statusAssinatura: 'assinado' | 'aguardando_assinatura';
}

export interface PatrimonyNorm {
  id: string;
  esfera: 'Federal' | 'Estadual (Ceará / TCE-CE)' | 'Consórcio (CPSMS)';
  titulo: string;
  numero: string;
  ano: string;
  orgaoEmissor: string;
  resumo: string;
  pontosChave: string[];
  linkOficial?: string;
  obrigatoriedadeTCE: boolean;
}

export interface RoomDraftAsset {
  id: string;
  tombamento: string;
  tomboOrigemSesa?: string;
  descricao: string;
  origemTombo: TomboOrigin;
  estado: AssetCondition;
  valor: number;
  tipoNoRascunho: 'original_conferido' | 'remanejado_provisorio' | 'fora_aspec' | 'nao_encontrado';
  setorOriginalAspec?: string;
  unidadeOriginalAspec?: string;
  numeroSerie?: string;
  fornecedor?: string;
  observacao?: string;
}

export interface RoomConferenceDraft {
  id: string;
  roomId: string;
  roomName: string;
  unitId: string;
  unitNome: string;
  dataCriacao: string;
  dataUltimaAtualizacao: string;
  criadoPor: string;
  bensOriginaisAspec: RoomDraftAsset[];
  bensAtualizadosFisico: RoomDraftAsset[];
  status: 'rascunho_pendente' | 'consolidado_oficial';
  observacaoRascunho?: string;
}
