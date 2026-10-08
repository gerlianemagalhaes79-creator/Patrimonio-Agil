import { PatrimonyNorm } from '../types';

export const PATRIMONY_NORMS: PatrimonyNorm[] = [
  {
    id: 'norm-tce-ce-in',
    esfera: 'Estadual (Ceará / TCE-CE)',
    titulo: 'Instrução Normativa do TCE-CE sobre Inventário Físico e Tomada de Contas',
    numero: 'IN TCE-CE nº 03/2019 e Resoluções Correlatas',
    ano: '2019 - Vigente',
    orgaoEmissor: 'Tribunal de Contas do Estado do Ceará (TCE-CE)',
    resumo: 'Estabelece os procedimentos e prazos obrigatórios para realização do inventário analítico dos bens móveis permanentes, conferência física anual e demonstrações de bens em poder de terceiros ou cedidos para a prestação anual de contas de Consórcios Públicos de Saúde.',
    pontosChave: [
      'Obrigatoriedade de inventário físico anual concluído até 31 de dezembro de cada exercício fiscal.',
      'Obrigação expressa de manter Termos de Responsabilidade e Fiel Depositário assinados e atualizados para cada setor e unidade (Policlínica e CEO).',
      'Segregação contábil obrigatória entre bens próprios adquiridos com recursos de rateio do consórcio e bens recebidos em cessão de uso da SESA e de universidades (UFC).',
      'Exigência de numeração sequencial de tombamento, afixação de plaquetas com código legível e laudos de avaliação para bens inservíveis ou ociosos.'
    ],
    obrigatoriedadeTCE: true,
  },
  {
    id: 'norm-lei-4320',
    esfera: 'Federal',
    titulo: 'Normas Gerais de Direito Financeiro e Controle Patrimonial',
    numero: 'Lei Federal nº 4.320',
    ano: '1964 - Vigente',
    orgaoEmissor: 'Congresso Nacional / Presidência da República',
    resumo: 'Estatui normas gerais de finanças públicas para elaboração e controle dos orçamentos e balanços, dedicando o Título VII especificamente ao Controle dos Bens Patrimoniais Públicos.',
    pontosChave: [
      'Art. 94: Haverá registros analíticos de todos os bens de caráter permanente, exigindo-se a perfeita caracterização de cada um deles e dos agentes responsáveis pela sua guarda e administração.',
      'Art. 95: A contabilidade manterá registros sintéticos dos bens móveis e imóveis.',
      'Art. 96: O levantamento geral dos bens móveis e imóveis terá por base o inventário analítico de cada unidade administrativa e os seus acréscimos e decréscimos.',
      'Responsabilização pessoal e funcional dos titulares de carga patrimonial e da gerência de patrimônio perante o controle externo.'
    ],
    obrigatoriedadeTCE: true,
  },
  {
    id: 'norm-lei-consorcios',
    esfera: 'Federal',
    titulo: 'Lei Geral dos Consórcios Públicos e Gestão de Patrimônio Associado',
    numero: 'Lei Federal nº 11.107/2005 e Decreto Regulamentador nº 6.017/2007',
    ano: '2005 - Vigente',
    orgaoEmissor: 'Governo Federal / Ministério da Saúde',
    resumo: 'Disciplina a constituição e funcionamento dos Consórcios Públicos de Direito Público (autarquias interfederativas), incluindo a gestão patrimonial dos equipamentos hospitalares e odontológicos cedidos pelo Estado ou municípios consorciados.',
    pontosChave: [
      'Os bens cedidos pelo Estado do Ceará (SESA) ou por municípios ao consórcio devem permanecer registrados em contas de controle e compensação patrimonial.',
      'É vedada a alienação ou transferência de bens recebidos por convênio ou comodato sem prévia e expressa autorização do ente cedente originário (SESA / UFC).',
      'A utilização de equipamentos médicos e odontológicos deve atender estritamente aos fins pactuados no Contrato de Programa e no Contrato de Rateio da Microrregião de Sobral.',
      'A Gestora de Patrimônio responde pela guarda e integridade dos ativos alocados nas unidades operacionais (Policlínica e CEO).'
    ],
    obrigatoriedadeTCE: true,
  },
  {
    id: 'norm-nbc-tsp-07',
    esfera: 'Federal',
    titulo: 'Norma Brasileira de Contabilidade Aplicada ao Setor Público – Ativo Imobilizado',
    numero: 'NBC TSP 07 / MCASP 10ª Edição',
    ano: '2023/2026 - Vigente',
    orgaoEmissor: 'Conselho Federal de Contabilidade (CFC) / Secretaria do Tesouro Nacional (STN)',
    resumo: 'Padroniza o reconhecimento, mensuração, depreciação, amortização e baixa dos bens permanentes no setor público de saúde brasileiro.',
    pontosChave: [
      'Obrigatoriedade de reconhecimento do valor de aquisição histórico e apuração da depreciação acumulada mensal de equipamentos de saúde.',
      'Definição de vida útil econômica para equipamentos biomédicos, autoclaves, compressores odontológicos e equipamentos de imagem.',
      'Testes periódicos de recuperabilidade (Impairment) e classificação do estado de conservação (Excelente, Bom, Regular, Ocioso, Inservível).',
      'Necessidade de termo circunstanciado de baixa e comissão de descarte para equipamentos inservíveis ou antieconômicos.'
    ],
    obrigatoriedadeTCE: true,
  },
  {
    id: 'norm-decreto-ceara',
    esfera: 'Estadual (Ceará / TCE-CE)',
    titulo: 'Regulamento de Gestão de Bens Móveis do Estado do Ceará e Termos de Cessão',
    numero: 'Decreto Estadual do Ceará nº 33.320 e Portarias Conjuntas SEPLAG/SESA',
    ano: '2019/2024 - Vigente',
    orgaoEmissor: 'Governo do Estado do Ceará / SEPLAG-CE / SESA-CE',
    resumo: 'Regulamenta os procedimentos de tombamento, movimentação, inventário, cessão e controle dos bens pertencentes ao Estado do Ceará em uso por consórcios públicos de saúde.',
    pontosChave: [
      'Os bens com tombo SESA alocados na Policlínica Bernardo Félix da Silva e no CEO de Sobral continuam sob fiscalização patrimonial do Estado do Ceará.',
      'A movimentação de um equipamento com tombo SESA entre unidades diferentes do consórcio exige notificação prévia à Coordenadoria de Patrimônio da SESA.',
      'Emissão de Termo de Fiel Depositário específico com vinculação ao número do Termo de Cessão de Uso firmado entre o Governo do Estado e o CPSMS.',
      'Responsabilidade solidária do gestor do consórcio em caso de avaria por mau uso, extravio ou perda de garantia técnica de equipamentos doados pelo Estado.'
    ],
    obrigatoriedadeTCE: true,
  },
  {
    id: 'norm-cpsms-resolucao',
    esfera: 'Consórcio (CPSMS)',
    titulo: 'Regulamento Interno da Gerência de Patrimônio do CPSMS',
    numero: 'Portaria Normativa e Resolução da Assembleia do CPSMS nº 01/2026',
    ano: '2026 - Em Implantação',
    orgaoEmissor: 'Consórcio Público de Saúde da Microrregião de Sobral (CPSMS)',
    resumo: 'Institui as normas e rotinas internas de controle patrimonial para a Policlínica Bernardo Félix da Silva, Centro de Especialidades Odontológicas (CEO) e Sede Administrativa.',
    pontosChave: [
      'Criação oficial da Gerência de Patrimônio do CPSMS sob gestão técnica da Gestoria de Patrimônio.',
      'Proibição absoluta de transferência ou remanejamento físico de qualquer bem móvel entre salas ou setores sem prévio pedido no sistema e homologação da Gestora.',
      'Fixação de plaqueta patrimonial indelével com código e especificação da entidade titular (CPSMS, SESA ou UFC).',
      'Obrigatoriedade de assinatura bimestral ou a cada mudança de chefia dos Termos de Cautela e Responsabilidade Setorial.'
    ],
    obrigatoriedadeTCE: true,
  }
];
