import { Asset, Sector, UnitInfo, TransferRequest, ResponsibilityTerm, UserProfile } from '../types';

export const CPSMS_UNITS: UnitInfo[] = [
  {
    id: 'policlinica',
    nome: 'Policlínica Bernardo Félix da Silva',
    nomeOficial: 'Policlínica Regional de Sobral Bernardo Félix da Silva',
    sigla: 'POLICLÍNICA',
    endereco: 'Av. Monsenhor Aloísio Pinto, s/n - Bairro Dom Expedito',
    municipio: 'Sobral - CE'
  },
  {
    id: 'ceo',
    nome: 'CEO – Centro de Especialidades Odontológicas',
    nomeOficial: 'Centro de Especialidades Odontológicas Regional de Sobral',
    sigla: 'CEO-SOBRAL',
    endereco: 'Rua Menino Deus, Centro',
    municipio: 'Sobral - CE'
  },
  {
    id: 'sede-cpsms',
    nome: 'Sede Administrativa do CPSMS',
    nomeOficial: 'Consórcio Público de Saúde da Microrregião de Sobral',
    sigla: 'CPSMS-SEDE',
    endereco: 'Sobral, Ceará',
    municipio: 'Sobral - CE'
  }
];

export const CPSMS_SECTORS: Sector[] = [
  // --- CEO (Centro de Especialidades Odontológicas) ---
  {
    id: 'ceo-clinicas',
    unidadeId: 'ceo',
    unidadeNome: 'CEO – Centro de Especialidades Odontológicas',
    nome: 'Clínicas Odontológicas Especializadas',
    sigla: 'CEO-CLIN',
    responsavelNome: 'Dr. Ricardo Vasconcelos',
    responsavelCargo: 'Coordenador Clínico Odontológico',
    responsavelMatricula: 'CPSMS-1044',
    subsetores: [
      { id: 'sub-ceo-c1', nome: 'Consultório 01 – Endodontia Especializada' },
      { id: 'sub-ceo-c2', nome: 'Consultório 02 – Periodontia' },
      { id: 'sub-ceo-c3', nome: 'Consultório 03 – Cirurgia Bucomaxilofacial' },
      { id: 'sub-ceo-c4', nome: 'Consultório 04 – Odontopediatria e PNE' },
      { id: 'sub-ceo-c5', nome: 'Consultório 05 – Prótese Dentária e Estética' },
      { id: 'sub-ceo-c6', nome: 'Consultório 06 – Atendimento Integrado UFC/Preceptoria' }
    ]
  },
  {
    id: 'ceo-cme',
    unidadeId: 'ceo',
    unidadeNome: 'CEO – Centro de Especialidades Odontológicas',
    nome: 'Central de Material e Esterilização – CME Odonto',
    sigla: 'CEO-CME',
    responsavelNome: 'Enfª. Amanda Fontenele',
    responsavelCargo: 'Enfermeira Responsável pela CME',
    responsavelMatricula: 'CPSMS-1182',
    subsetores: [
      { id: 'sub-ceo-cme-1', nome: 'Sala de Expurgo e Descontaminação' },
      { id: 'sub-ceo-cme-2', nome: 'Sala de Preparo e Autoclaves' },
      { id: 'sub-ceo-cme-3', nome: 'Arsenal e Guarda de Instrumentais Estéreis' }
    ]
  },
  {
    id: 'ceo-radiologia',
    unidadeId: 'ceo',
    unidadeNome: 'CEO – Centro de Especialidades Odontológicas',
    nome: 'Radiologia e Diagnóstico Odontológico',
    sigla: 'CEO-RAD',
    responsavelNome: 'Téc. Francisco Menezes',
    responsavelCargo: 'Técnico em Radiologia Odontológica',
    responsavelMatricula: 'CPSMS-1310',
    subsetores: [
      { id: 'sub-ceo-rad-1', nome: 'Sala de Raio-X Panorâmico Digital' },
      { id: 'sub-ceo-rad-2', nome: 'Sala de Raio-X Periapical' },
      { id: 'sub-ceo-rad-3', nome: 'Sala de Processamento e Laudos' }
    ]
  },
  {
    id: 'ceo-recepcao',
    unidadeId: 'ceo',
    unidadeNome: 'CEO – Centro de Especialidades Odontológicas',
    nome: 'Recepção, Triagem e SAME do CEO',
    sigla: 'CEO-REC',
    responsavelNome: 'Mariana Duarte',
    responsavelCargo: 'Supervisora de Atendimento',
    responsavelMatricula: 'CPSMS-1402',
    subsetores: [
      { id: 'sub-ceo-rec-1', nome: 'Balcão de Acolhimento e Prontuários' },
      { id: 'sub-ceo-rec-2', nome: 'Sala de Espera de Pacientes' },
      { id: 'sub-ceo-rec-3', nome: 'Guichê de Agendamento e Regulação Regional' }
    ]
  },
  {
    id: 'ceo-farmacia-almox',
    unidadeId: 'ceo',
    unidadeNome: 'CEO – Centro de Especialidades Odontológicas',
    nome: 'Almoxarifado e Farmácia Odontológica',
    sigla: 'CEO-ALMOX',
    responsavelNome: 'Farm. Lucas Arruda',
    responsavelCargo: 'Farmacêutico Responsável',
    responsavelMatricula: 'CPSMS-1215',
    subsetores: [
      { id: 'sub-ceo-almox-1', nome: 'Depósito de Insumos Odontológicos e Resinas' },
      { id: 'sub-ceo-almox-2', nome: 'Sala de Dispensação de Medicamentos' }
    ]
  },
  {
    id: 'ceo-diretoria',
    unidadeId: 'ceo',
    unidadeNome: 'CEO – Centro de Especialidades Odontológicas',
    nome: 'Diretoria e Coordenação Geral do CEO',
    sigla: 'CEO-DIR',
    responsavelNome: 'Dr. Ricardo Vasconcelos',
    responsavelCargo: 'Diretor do CEO Sobral',
    responsavelMatricula: 'CPSMS-1044',
    subsetores: [
      { id: 'sub-ceo-dir-1', nome: 'Gabinete da Direção Odontológica' },
      { id: 'sub-ceo-dir-2', nome: 'Sala de Reuniões e Capacitação' }
    ]
  },

  // --- POLICLÍNICA BERNARDO FÉLIX DA SILVA ---
  {
    id: 'poli-consultorios',
    unidadeId: 'policlinica',
    unidadeNome: 'Policlínica Bernardo Félix da Silva',
    nome: 'Bloco de Consultórios Médicos Especializados',
    sigla: 'POLI-MED',
    responsavelNome: 'Dra. Helena Carneiro',
    responsavelCargo: 'Coordenadora de Consultórios Especializados',
    responsavelMatricula: 'CPSMS-2019',
    subsetores: [
      { id: 'sub-poli-c1', nome: 'Consultório 01 – Cardiologia e Ergometria' },
      { id: 'sub-poli-c2', nome: 'Consultório 02 – Oftalmologia' },
      { id: 'sub-poli-c3', nome: 'Consultório 03 – Ortopedia e Traumatologia' },
      { id: 'sub-poli-c4', nome: 'Consultório 04 – Ginecologia e Colposcopia' },
      { id: 'sub-poli-c5', nome: 'Consultório 05 – Pediatria' },
      { id: 'sub-poli-c6', nome: 'Consultório 06 – Neurologia' },
      { id: 'sub-poli-c7', nome: 'Consultório 07 – Dermatologia e Alergologia' },
      { id: 'sub-poli-c8', nome: 'Consultório 08 – Otorrinolaringologia e Audiometria' }
    ]
  },
  {
    id: 'poli-imagem',
    unidadeId: 'policlinica',
    unidadeNome: 'Policlínica Bernardo Félix da Silva',
    nome: 'Setor de Diagnóstico por Imagem e Métodos Gráficos',
    sigla: 'POLI-IMAG',
    responsavelNome: 'Dr. Fernando Linhares',
    responsavelCargo: 'Médico Radiologista Chefe',
    responsavelMatricula: 'CPSMS-2150',
    subsetores: [
      { id: 'sub-poli-img-1', nome: 'Sala de Ultrassonografia Geral e Doppler' },
      { id: 'sub-poli-img-2', nome: 'Sala de Ultrassonografia Ginecológica' },
      { id: 'sub-poli-img-3', nome: 'Sala de Mamografia Digital (Tombo SESA)' },
      { id: 'sub-poli-img-4', nome: 'Sala de Tomografia Computadorizada (Tombo SESA)' },
      { id: 'sub-poli-img-5', nome: 'Sala de Raio-X Digital' },
      { id: 'sub-poli-img-6', nome: 'Sala de ECG, MAPA e Holter' },
      { id: 'sub-poli-img-7', nome: 'Sala de Estações de Laudos Médicos' }
    ]
  },
  {
    id: 'poli-endoscopia',
    unidadeId: 'policlinica',
    unidadeNome: 'Policlínica Bernardo Félix da Silva',
    nome: 'Setor de Endoscopia e Digestivo',
    sigla: 'POLI-ENDO',
    responsavelNome: 'Dr. Paulo Roberto Soares',
    responsavelCargo: 'Médico Gastroenterologista',
    responsavelMatricula: 'CPSMS-2210',
    subsetores: [
      { id: 'sub-poli-endo-1', nome: 'Sala de Exames de Endoscopia Digestiva Alta' },
      { id: 'sub-poli-endo-2', nome: 'Sala de Colonoscopia' },
      { id: 'sub-poli-endo-3', nome: 'Sala de Recuperação Pós-Anestésica (RPA)' },
      { id: 'sub-poli-endo-4', nome: 'Sala de Processamento e Desinfecção de Tubos' }
    ]
  },
  {
    id: 'poli-reabilitacao',
    unidadeId: 'policlinica',
    unidadeNome: 'Policlínica Bernardo Félix da Silva',
    nome: 'Centro de Reabilitação e Fisioterapia',
    sigla: 'POLI-FISIO',
    responsavelNome: 'Fisiot. Carla Mendes',
    responsavelCargo: 'Coordenadora de Reabilitação',
    responsavelMatricula: 'CPSMS-2305',
    subsetores: [
      { id: 'sub-poli-fisio-1', nome: 'Ginásio Terapêutico de Cinesioterapia' },
      { id: 'sub-poli-fisio-2', nome: 'Box de Eletroterapia e Termoterapia' },
      { id: 'sub-poli-fisio-3', nome: 'Sala de Terapia Ocupacional' },
      { id: 'sub-poli-fisio-4', nome: 'Cabine Acústica de Fonoaudiologia' }
    ]
  },
  {
    id: 'poli-cirurgias',
    unidadeId: 'policlinica',
    unidadeNome: 'Policlínica Bernardo Félix da Silva',
    nome: 'Bloco de Pequenas Cirurgias Ambulatoriais',
    sigla: 'POLI-CIR',
    responsavelNome: 'Enfª. Vanessa Bezerra',
    responsavelCargo: 'Enfermeira Chefe do Bloco Cirúrgico',
    responsavelMatricula: 'CPSMS-2420',
    subsetores: [
      { id: 'sub-poli-cir-1', nome: 'Sala Cirúrgica Ambulatorial 01' },
      { id: 'sub-poli-cir-2', nome: 'Sala Cirúrgica Ambulatorial 02' },
      { id: 'sub-poli-cir-3', nome: 'Sala de Pré e Pós-Operatório Imediato' },
      { id: 'sub-poli-cir-4', nome: 'Área de Escovação e Barreira' }
    ]
  },
  {
    id: 'poli-cme',
    unidadeId: 'policlinica',
    unidadeNome: 'Policlínica Bernardo Félix da Silva',
    nome: 'Central de Material e Esterilização – CME Policlínica',
    sigla: 'POLI-CME',
    responsavelNome: 'Enfª. Vanessa Bezerra',
    responsavelCargo: 'Responsável Técnica CME',
    responsavelMatricula: 'CPSMS-2420',
    subsetores: [
      { id: 'sub-poli-cme-1', nome: 'Área Contaminada (Expurgo e Lavagem Ultrassônica)' },
      { id: 'sub-poli-cme-2', nome: 'Área Limpa (Termodesinfecção e Autoclaves)' },
      { id: 'sub-poli-cme-3', nome: 'Área Estéril (Guarda e Distribuição de Caixas)' }
    ]
  },
  {
    id: 'poli-farmacia-almox',
    unidadeId: 'policlinica',
    unidadeNome: 'Policlínica Bernardo Félix da Silva',
    nome: 'Farmácia e Almoxarifado Central da Policlínica',
    sigla: 'POLI-ALMOX',
    responsavelNome: 'Farm. Marcelo Timbó',
    responsavelCargo: 'Farmacêutico Coordenador',
    responsavelMatricula: 'CPSMS-2550',
    subsetores: [
      { id: 'sub-poli-almox-1', nome: 'Depósito Central de Materiais Médicos Hospitalares' },
      { id: 'sub-poli-almox-2', nome: 'Farmácia Central de Dispensação Ambulatorial' },
      { id: 'sub-poli-almox-3', nome: 'Câmara Fria de Termolábeis' }
    ]
  },
  {
    id: 'poli-diretoria',
    unidadeId: 'policlinica',
    unidadeNome: 'Policlínica Bernardo Félix da Silva',
    nome: 'Diretoria Geral e Administrativa da Policlínica',
    sigla: 'POLI-DIR',
    responsavelNome: 'Dr. Alberto Farias',
    responsavelCargo: 'Diretor Geral da Policlínica',
    responsavelMatricula: 'CPSMS-2001',
    subsetores: [
      { id: 'sub-poli-dir-1', nome: 'Gabinete da Diretoria Geral' },
      { id: 'sub-poli-dir-2', nome: 'Coordenação de Enfermagem e Apoio Clínico' },
      { id: 'sub-poli-dir-3', nome: 'Sala da Central de Agendamento Regional' }
    ]
  },

  // --- SEDE ADMINISTRATIVA DO CPSMS ---
  {
    id: 'cpsms-patrimonio',
    unidadeId: 'sede-cpsms',
    unidadeNome: 'Sede Administrativa do CPSMS',
    nome: 'Gerência de Patrimônio e Bens Móveis',
    sigla: 'GER-PAT',
    responsavelNome: 'Maria Gerliane Rocha Magalhães',
    responsavelCargo: 'Gestora de Patrimônio do CPSMS',
    responsavelMatricula: 'MAT-CPSMS-01',
    subsetores: [
      { id: 'sub-pat-1', nome: 'Gabinete da Gerência de Patrimônio' },
      { id: 'sub-pat-2', nome: 'Depósito de Bens Aguardando Tombamento e Plaqueta' },
      { id: 'sub-pat-3', nome: 'Depósito Transitório de Bens Ociosos para Remanejamento' }
    ]
  },
  {
    id: 'cpsms-diretoria-executiva',
    unidadeId: 'sede-cpsms',
    unidadeNome: 'Sede Administrativa do CPSMS',
    nome: 'Diretoria Executiva e Presidência do CPSMS',
    sigla: 'DIR-EXEC',
    responsavelNome: 'Diretoria Executiva CPSMS',
    responsavelCargo: 'Diretor Executivo',
    responsavelMatricula: 'CPSMS-0010',
    subsetores: [
      { id: 'sub-dir-1', nome: 'Gabinete da Diretoria Executiva' },
      { id: 'sub-dir-2', nome: 'Secretaria da Assembleia Geral dos Prefeitos' }
    ]
  },
  {
    id: 'cpsms-contabilidade',
    unidadeId: 'sede-cpsms',
    unidadeNome: 'Sede Administrativa do CPSMS',
    nome: 'Setor Contábil, Financeiro e Prestação de Contas TCE-CE',
    sigla: 'CONT-FIN',
    responsavelNome: 'Contador Chefe CPSMS',
    responsavelCargo: 'Responsável Contábil',
    responsavelMatricula: 'CPSMS-0045',
    subsetores: [
      { id: 'sub-cont-1', nome: 'Setor de Contabilidade Pública' },
      { id: 'sub-cont-2', nome: 'Controle de Prestação de Contas e Auditoria TCE-CE' }
    ]
  }
];

export const AVAILABLE_PROFILES: UserProfile[] = [
  {
    id: 'usr-gestora',
    nome: 'Maria Gerliane Rocha Magalhães',
    cargo: 'Gestora de Patrimônio – CPSMS (Acesso Pleno)',
    role: 'gestora',
    unidadeId: 'sede-cpsms',
    unidadeNome: 'Sede Administrativa do CPSMS',
    setorId: 'cpsms-patrimonio',
    setorNome: 'Gerência de Patrimônio e Bens Móveis',
    matricula: 'MAT-CPSMS-01'
  },
  {
    id: 'usr-lider-ceo',
    nome: 'Dr. Ricardo Vasconcelos',
    cargo: 'Coordenador Clínico / Diretor do CEO',
    role: 'lider',
    unidadeId: 'ceo',
    unidadeNome: 'CEO – Centro de Especialidades Odontológicas',
    setorId: 'ceo-clinicas',
    setorNome: 'Clínicas Odontológicas Especializadas',
    matricula: 'CPSMS-1044'
  },
  {
    id: 'usr-lider-policlinica',
    nome: 'Dra. Helena Carneiro',
    cargo: 'Líder de Consultórios – Policlínica Bernardo Félix',
    role: 'lider',
    unidadeId: 'policlinica',
    unidadeNome: 'Policlínica Bernardo Félix da Silva',
    setorId: 'poli-consultorios',
    setorNome: 'Bloco de Consultórios Médicos Especializados',
    matricula: 'CPSMS-2019'
  },
  {
    id: 'usr-lider-imagem',
    nome: 'Dr. Fernando Linhares',
    cargo: 'Chefe de Diagnóstico por Imagem – Policlínica',
    role: 'lider',
    unidadeId: 'policlinica',
    unidadeNome: 'Policlínica Bernardo Félix da Silva',
    setorId: 'poli-imagem',
    setorNome: 'Setor de Diagnóstico por Imagem e Métodos Gráficos',
    matricula: 'CPSMS-2150'
  }
];

// Clean initial assets list as requested: no invented assets!
// The system starts pristine, ready for Gerliane to register real assets or import them via CSV/Excel.
export const INITIAL_ASSETS: Asset[] = [];

// Clean initial transfer requests
export const INITIAL_TRANSFERS: TransferRequest[] = [];

// Clean initial terms
export const INITIAL_TERMS: ResponsibilityTerm[] = [];
