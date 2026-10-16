import { Asset, Sector } from '../types';

/**
 * Normaliza strings para comparação insensível a acentos, pontuação e maiúsculas
 */
export function normalizeLoc(str?: string): string {
  return (str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Identifica se uma determinada string refere-se à UNIDADE (Área no ASPEC)
 * em vez de uma sala/ambiente individual (Subárea no ASPEC).
 * 
 * No ASPEC do CPSMS:
 * Área: 004 - CENTRO DE ESPECIALIDADES ODONTOLOGICAS (Unidade CEO)
 * Área: 001 - POLICLINICA REGIONAL BERNARDO FELIX DA SILVA (Unidade Policlínica)
 * Área: 002 - CONSORCIO PUBLICO DE SAUDE DA MICRORREGIAO DE SOBRAL (Unidade Sede CPSMS)
 */
export function isUnitName(str?: string): boolean {
  if (!str) return false;
  const norm = normalizeLoc(str);

  // Verificações diretas ou por código ASPEC
  if (
    norm === '004' ||
    norm === '001' ||
    norm === '002' ||
    norm === 'ceo' ||
    norm === 'ceo-sobral' ||
    norm === 'ceo sobral' ||
    norm === 'policlinica' ||
    norm === 'sede-cpsms' ||
    norm === 'cer'
  ) {
    return true;
  }

  // Se começar com código de área da Unidade e tiver o nome da Unidade
  if (norm.startsWith('004') && (norm.includes('centro') || norm.includes('especialidade') || norm.includes('odonto') || norm.includes('ceo'))) {
    return true;
  }
  if (norm.startsWith('001') && (norm.includes('poli') || norm.includes('regional') || norm.includes('bernardo') || norm.includes('felix'))) {
    return true;
  }
  if (norm.startsWith('002') && (norm.includes('consor') || norm.includes('sede') || norm.includes('saude') || norm.includes('microrregiao'))) {
    return true;
  }

  return (
    norm.includes('centro de especialidades odontologicas') ||
    norm.includes('especialidades odontologicas') ||
    norm.includes('policlinica regional') ||
    norm.includes('bernardo felix da silva') ||
    norm.includes('consorcio publico de saude') ||
    norm.includes('sede administrativa do consorcio') ||
    norm.includes('sede administrativa do cpsms')
  );
}

/**
 * Identifica a qual unidade um bem pertence com base em unidadeId, unidadeNome e Área (ASPEC)
 */
export function getAssetUnitId(a: Asset): 'policlinica' | 'ceo' | 'sede-cpsms' | 'cer' {
  // 1. Prioridade máxima: conferência física / auditoria na unidade realizada pelo auditor
  const uEnc = normalizeLoc(a.auditoria?.unidadeEncontrada);
  if (uEnc) {
    if (uEnc.includes('ceo') || uEnc.includes('odonto') || uEnc.includes('004')) return 'ceo';
    if (uEnc.includes('poli') || uEnc.includes('bernardo') || uEnc.includes('001')) return 'policlinica';
    if (uEnc.includes('sede') || uEnc.includes('consorcio') || uEnc.includes('002')) return 'sede-cpsms';
    if (uEnc.includes('cer')) return 'cer';
  }

  // 2. Verificação explícita por ID
  if (a.unidadeId === 'ceo' || a.unidadeId === 'policlinica' || a.unidadeId === 'sede-cpsms' || a.unidadeId === 'cer') {
    return a.unidadeId;
  }

  // 3. Verificação no texto da Área (ASPEC), Unidade, Setor e Órgão
  const checkText = normalizeLoc(`${a.area || ''} ${a.unidadeNome || ''} ${a.setorOriginalAspec || ''} ${a.unidadeOriginalAspec || ''} ${a.orgao || ''}`);

  if (checkText.includes('004') || checkText.includes('ceo') || checkText.includes('odonto') || checkText.includes('especialidades odontologicas')) {
    return 'ceo';
  }
  if (checkText.includes('001') || checkText.includes('poli') || checkText.includes('bernardo') || checkText.includes('felix da silva')) {
    return 'policlinica';
  }
  if (checkText.includes('002') || checkText.includes('sede') || checkText.includes('consorcio') || checkText.includes('cpsms')) {
    return 'sede-cpsms';
  }
  if (checkText.includes('cer') || checkText.includes('reabilitacao')) {
    return 'cer';
  }

  return 'policlinica';
}

/**
 * Extrai a SALA / SUBÁREA exata de um bem físico.
 * 
 * Regra de Ouro do ASPEC:
 * Área = UNIDADE (ex: 004 - CENTRO DE ESPECIALIDADES ODONTOLOGICAS)
 * Subárea = SALA (ex: 004 - COPA, Consultório 01, Recepção)
 * Uma localização é composta de Área + Subárea.
 */
export function getAssetRoomName(a: Asset): string {
  // 1. Prioridade máxima: conferência física in loco realizada pelo auditor
  if (a.auditoria?.subsetorEncontrado && !isUnitName(a.auditoria.subsetorEncontrado)) {
    return a.auditoria.subsetorEncontrado.trim();
  }

  // 2. Subárea oficial (ex: 004 - COPA, Consultório 01 – Endodontia Especializada, etc.)
  const subarea = (a.subarea || a.subsetorNome || '').trim();
  if (subarea && !isUnitName(subarea)) {
    return subarea;
  }

  // 3. Se subárea não informada ou igual à unidade, verifica setorNome
  const setor = (a.setorNome || '').trim();
  if (setor && !isUnitName(setor)) {
    return setor;
  }

  // 4. Verifica auditoria setor encontrado
  if (a.auditoria?.setorEncontrado && !isUnitName(a.auditoria.setorEncontrado)) {
    return a.auditoria.setorEncontrado.trim();
  }

  // 5. Verifica área (apenas se não for o nome da unidade inteira)
  const area = (a.area || '').trim();
  if (area && !isUnitName(area)) {
    return area;
  }

  // Fallback
  return subarea || setor || 'Sala Geral';
}

/**
 * Retorna a Subárea / Sala oficial de cadastro do bem no ASPEC (sem levar em conta o que foi encontrado em auditoria)
 */
export function getAssetOfficialRoomName(a: Asset): string {
  const origSetor = (a.setorOriginalAspec || '').trim();
  if (origSetor && !isUnitName(origSetor)) return origSetor;

  const subarea = (a.subarea || a.subsetorNome || '').trim();
  if (subarea && !isUnitName(subarea)) return subarea;

  const setor = (a.setorNome || '').trim();
  if (setor && !isUnitName(setor)) return setor;

  const area = (a.area || '').trim();
  if (area && !isUnitName(area)) return area;

  return subarea || setor || 'Lotação Geral da Unidade';
}

/**
 * Retorna a localização oficial completa (Área + Subárea) de um bem conforme o padrão ASPEC.
 * Área: Unidade (ex: 004 - CENTRO DE ESPECIALIDADES ODONTOLOGICAS)
 * Subárea: Sala (ex: 004 - COPA)
 */
export function getAssetFullLocation(a: Asset): { area: string; subarea: string; full: string } {
  // Área (Unidade)
  let area = (a.unidadeOriginalAspec || a.area || '').trim();
  if (!area || !isUnitName(area)) {
    const uId = getAssetUnitId(a);
    if (uId === 'ceo') {
      area = '004 - CENTRO DE ESPECIALIDADES ODONTOLOGICAS';
    } else if (uId === 'policlinica') {
      area = '001 - POLICLINICA REGIONAL BERNARDO FELIX DA SILVA';
    } else if (uId === 'sede-cpsms') {
      area = '002 - CONSORCIO PUBLICO DE SAUDE DA MICRORREGIAO DE SOBRAL';
    } else if (uId === 'cer') {
      area = '003 - CENTRO ESPECIALIZADO EM REABILITACAO (CER)';
    } else {
      area = a.unidadeNome || 'Unidade CPSMS';
    }
  }

  // Subárea oficial de cadastro no ASPEC
  const subarea = getAssetOfficialRoomName(a);

  return {
    area,
    subarea,
    full: `Área: ${area} · Subárea: ${subarea}`
  };
}

const GENERIC_LOCATION_TERMS = new Set([
  'sala', 'salas', 'geral', 'sala geral', 'area', 'areas', 'setor', 'setores',
  'bloco', 'unidade', 'sede', 'apoio', 'externa', 'ambulatorio', 'predio', 'central'
]);

/**
 * Validação segura de prefixo ou correspondência exata sem códigos numéricos (ex: "004 - COPA" <-> "COPA").
 * Impede cruzamentos indevidos por termos genéricos como "sala" ou "área".
 */
export function isExactOrSafePrefixMatch(roomA: string, roomB: string): boolean {
  if (!roomA || !roomB) return false;
  const a = normalizeLoc(roomA).replace(/^[0-9]+[\s\-_.]*/, '').trim();
  const b = normalizeLoc(roomB).replace(/^[0-9]+[\s\-_.]*/, '').trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (isUnitName(a) || isUnitName(b)) return false;
  if (GENERIC_LOCATION_TERMS.has(a) || GENERIC_LOCATION_TERMS.has(b)) return false;

  // Permite correspondência com prefixo composto se tiver limite de palavra e tamanho seguro (>= 5 letras)
  if (a.length >= 5 && b.length >= 5) {
    if (a.startsWith(b + ' ') || a.startsWith(b + ' -') || a.startsWith(b + ' –') ||
        b.startsWith(a + ' ') || b.startsWith(a + ' -') || b.startsWith(a + ' –')) {
      return true;
    }
  }
  return false;
}

/**
 * Retorna a chave canônica limpa de uma sala (sem números de prefixo como "004 - ").
 * Exemplo: "004 - COPA" -> "copa", "COPA" -> "copa".
 */
export function getCanonicalRoomKey(roomName: string): string {
  if (!roomName) return '';
  const norm = normalizeLoc(roomName);
  const withoutDigits = norm.replace(/^[0-9]+[\s\-_.]*/, '').trim();
  return withoutDigits || norm;
}

/**
 * Valida estritamente se um bem pertence oficialmente a uma sala / subárea no CADASTRO DO ASPEC.
 * IGNORA a auditoria física in loco para refletir a Carga Contábil Oficial Registrada.
 */
export function doesAssetOfficiallyMatchRoom(a: Asset, roomName: string): boolean {
  if (!roomName) return false;

  const target = normalizeLoc(roomName);
  const officialRoom = normalizeLoc(getAssetOfficialRoomName(a));

  if (officialRoom === target) return true;

  const aSub = normalizeLoc(a.subarea || a.subsetorNome || '');
  if (aSub && aSub === target) return true;

  const aOrig = normalizeLoc(a.setorOriginalAspec || '');
  if (aOrig && aOrig === target) return true;

  const aSetor = normalizeLoc(a.setorNome || '');
  if (aSetor && !isUnitName(aSetor) && aSetor === target) return true;

  // Casos seguros com código numérico ("004 - COPA" <-> "COPA")
  if (isExactOrSafePrefixMatch(officialRoom, target)) return true;
  if (aSub && isExactOrSafePrefixMatch(aSub, target)) return true;
  if (aOrig && isExactOrSafePrefixMatch(aOrig, target)) return true;
  if (aSetor && !isUnitName(aSetor) && isExactOrSafePrefixMatch(aSetor, target)) return true;

  return false;
}

/**
 * Valida se um bem foi localizado FISICAMENTE nesta sala durante a vistoria in loco.
 */
export function doesAssetPhysicallyMatchRoom(a: Asset, roomName: string): boolean {
  if (!roomName) return false;

  // Se marcado expressamente como ausente / não encontrado, não está fisicamente aqui
  if (a.auditoria?.statusDivergencia === 'nao_encontrado') return false;

  // 1. Auditado explicitamente nesta subárea / sala
  const audSub = a.auditoria?.subsetorEncontrado || a.auditoria?.setorEncontrado;
  if (audSub) {
    const target = normalizeLoc(roomName);
    const audNorm = normalizeLoc(audSub);
    if (audNorm === target || isExactOrSafePrefixMatch(audNorm, target)) {
      return true;
    }
    // Se o bem foi explicitamente localizado em OUTRA sala, ele não está aqui!
    return false;
  }

  // 2. Se não auditado em outra sala e originalmente pertence a esta sala
  return doesAssetOfficiallyMatchRoom(a, roomName);
}

/**
 * Valida se um bem pertence a uma sala / subárea específica
 */
export function doesAssetMatchRoom(a: Asset, roomName: string): boolean {
  if (!roomName) return false;

  const target = normalizeLoc(roomName);

  // 1. Prioridade absoluta: se o bem foi conferido / encontrado fisicamente em uma sala
  const audSub = normalizeLoc(a.auditoria?.subsetorEncontrado || a.auditoria?.setorEncontrado || '');
  if (audSub) {
    if (audSub === target || isExactOrSafePrefixMatch(audSub, target)) {
      return true;
    }
    // Se foi auditado em OUTRA sala física, não pertence a esta!
    return false;
  }

  // 2. Subárea oficial do bem
  const aSub = normalizeLoc(a.subarea || a.subsetorNome || '');
  if (aSub && (aSub === target || isExactOrSafePrefixMatch(aSub, target))) {
    return true;
  }

  const assetRoom = normalizeLoc(getAssetRoomName(a));
  if (assetRoom && (assetRoom === target || isExactOrSafePrefixMatch(assetRoom, target))) {
    return true;
  }

  const aOrig = normalizeLoc(a.setorOriginalAspec || '');
  if (aOrig && (aOrig === target || isExactOrSafePrefixMatch(aOrig, target))) {
    return true;
  }

  const aSetor = normalizeLoc(a.setorNome || '');
  if (aSetor && !isUnitName(aSetor) && (aSetor === target || isExactOrSafePrefixMatch(aSetor, target))) {
    return true;
  }

  return false;
}

/**
 * Interface padronizada de Sala / Subárea Física
 */
export interface UnitSubareaRoom {
  id: string;
  nome: string; // Ex: "004 - COPA", "Consultório 01 – Endodontia Especializada"
  sigla: string;
  unidadeId: 'policlinica' | 'ceo' | 'sede-cpsms' | 'cer';
  unidadeNome: string;
  responsavelNome?: string;
  responsavelCargo?: string;
  responsavelMatricula?: string;
  responsavelOriginalAspec?: string;
  liderAlterado?: boolean;
  dataAlteracaoLider?: string;
  bloco?: string;
  andar?: string;
  revisada?: boolean;
  macroSetorNome?: string;
}

/**
 * Atribui bloco arquitetônico apropriado para uma sala
 */
export function inferArchitecturalBlock(roomName: string, unitId: string, currentBlock?: string): string {
  if (currentBlock) return currentBlock;
  const norm = normalizeLoc(roomName);

  if (unitId === 'ceo') {
    if (norm.includes('copa') || norm.includes('refei') || norm.includes('cafe')) {
      return 'Apoio, Copa & Convivência';
    }
    if (norm.includes('clinic') || norm.includes('consult') || norm.includes('odonto') || norm.includes('endo') || norm.includes('perio') || norm.includes('buco') || norm.includes('pediat') || norm.includes('protes')) {
      return 'Ala Clínica Odontológica';
    }
    if (norm.includes('cme') || norm.includes('esteril') || norm.includes('expurgo') || norm.includes('autoclave') || norm.includes('arsenal')) {
      return 'CME Odonto – Esterilização';
    }
    if (norm.includes('radio') || norm.includes('raio') || norm.includes('panoram') || norm.includes('laudo') || norm.includes('periapical')) {
      return 'Diagnóstico por Imagem Odontológica';
    }
    if (norm.includes('recep') || norm.includes('espera') || norm.includes('same') || norm.includes('prontu') || norm.includes('guiche') || norm.includes('triagem')) {
      return 'Recepção, Triagem & Atendimento';
    }
    if (norm.includes('farm') || norm.includes('almox') || norm.includes('deposito') || norm.includes('resina') || norm.includes('dispens')) {
      return 'Almoxarifado & Farmácia Odontológica';
    }
    if (norm.includes('dire') || norm.includes('gabinete') || norm.includes('reuniao') || norm.includes('coordena')) {
      return 'Diretoria & Coordenação Geral';
    }
    return 'Apoio Operacional';
  }

  if (unitId === 'policlinica') {
    if (norm.includes('consult') || norm.includes('clinic') || norm.includes('ambulat') || norm.includes('cardio') || norm.includes('oftalm') || norm.includes('ortop') || norm.includes('ginec') || norm.includes('pediat') || norm.includes('neuro') || norm.includes('dermato') || norm.includes('otorrino')) {
      return 'Bloco A – Ambulatórios & Consultórios Médicos';
    }
    if (norm.includes('raio') || norm.includes('tomo') || norm.includes('imagem') || norm.includes('ultra') || norm.includes('mamo') || norm.includes('endo') || norm.includes('ecg') || norm.includes('holter')) {
      return 'Bloco B – Centro de Diagnóstico por Imagem';
    }
    if (norm.includes('fisio') || norm.includes('reabilita') || norm.includes('cinesio') || norm.includes('fono') || norm.includes('terapia') || norm.includes('cme') || norm.includes('cirurg')) {
      return 'Bloco C – Reabilitação & Bloco Cirúrgico';
    }
    if (norm.includes('farm') || norm.includes('almox') || norm.includes('camara fria') || norm.includes('deposito')) {
      return 'Bloco D – Farmácia & Almoxarifado Central';
    }
    return 'Bloco E – Administrativo & Regulação';
  }

  return 'Prédio da Sede Administrativa do Consórcio';
}

/**
 * Constrói a lista oficial de SALAS (SUBÁREAS) para a Unidade selecionada.
 * Garante que:
 * 1. Cada sala seja uma SUBÁREA FÍSICA (ex: 004 - COPA, Consultório 01, etc.), nunca o nome da Unidade.
 * 2. Todos os bens da Unidade sejam mapeados estritamente para suas subáreas.
 * 3. Salas vindas de relatórios/importações ASPEC sejam descobertas automaticamente.
 */
export function buildUnitSubareas(
  unitId: 'policlinica' | 'ceo' | 'sede-cpsms' | 'cer',
  sectors: Sector[],
  assets: Asset[]
): (UnitSubareaRoom & {
  roomAssets: Asset[];
  totalCount: number;
  checkedCount: number;
  missingCount: number;
  divergentCount: number;
  totalVal: number;
  percent: number;
  visualStatus: 'concluida' | 'em_andamento' | 'pendente' | 'divergencia';
})[] {
  // Bens que pertencem a esta Unidade (Área no ASPEC)
  const unitAssets = assets.filter(a => getAssetUnitId(a) === unitId);
  const baseSectors = sectors.filter(s => s.unidadeId === unitId);

  // Mapa persistente de salas revisadas / conferidas
  const reviewedRoomsMap = new Map<string, { revisada: boolean; dataRevisao?: string; responsavelRevisao?: string }>();
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('cpsms_reviewed_rooms') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]: [string, any]) => {
          if (v && v.revisada !== false) {
            reviewedRoomsMap.set(normalizeLoc(k), v);
          }
        });
      }
    }
    const consolRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('cpsms_room_consolidated') : null;
    if (consolRaw) {
      const consolParsed = JSON.parse(consolRaw);
      if (typeof consolParsed === 'object' && consolParsed !== null) {
        Object.keys(consolParsed).forEach(k => {
          reviewedRoomsMap.set(normalizeLoc(k), { revisada: true });
        });
      }
    }
  } catch (e) {
    // ignore
  }

  // Mapa de alterações de líderes (Líder alterado in loco)
  const leaderChangesMap = new Map<string, { originalLeader: string; newLeader: string; newCargo?: string; changedAt?: string }>();
  try {
    const rawLeader = typeof localStorage !== 'undefined' ? localStorage.getItem('cpsms_room_leader_changes') : null;
    if (rawLeader) {
      const parsed = JSON.parse(rawLeader);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]: [string, any]) => {
          if (v && v.newLeader && v.originalLeader && v.newLeader.trim() !== v.originalLeader.trim()) {
            leaderChangesMap.set(normalizeLoc(k), v);
          }
        });
      }
    }
  } catch (e) {
    // ignore
  }

  // Setores base que já foram marcados como revisados
  baseSectors.forEach(sec => {
    if (sec.revisada) {
      reviewedRoomsMap.set(normalizeLoc(sec.nome), {
        revisada: true,
        dataRevisao: sec.dataRevisao,
        responsavelRevisao: sec.responsavelRevisao
      });
      if (sec.id) {
        reviewedRoomsMap.set(normalizeLoc(sec.id), {
          revisada: true,
          dataRevisao: sec.dataRevisao,
          responsavelRevisao: sec.responsavelRevisao
        });
      }
    }
    if (sec.liderAlterado && sec.responsavelOriginalAspec) {
      leaderChangesMap.set(normalizeLoc(sec.nome), {
        originalLeader: sec.responsavelOriginalAspec,
        newLeader: sec.responsavelNome,
        newCargo: sec.responsavelCargo,
        changedAt: sec.dataAlteracaoLider
      });
      if (sec.id) {
        leaderChangesMap.set(normalizeLoc(sec.id), {
          originalLeader: sec.responsavelOriginalAspec,
          newLeader: sec.responsavelNome,
          newCargo: sec.responsavelCargo,
          changedAt: sec.dataAlteracaoLider
        });
      }
    }
  });

  const roomsMap = new Map<string, UnitSubareaRoom>();

  const registerSubarea = (
    roomName: string,
    meta?: {
      id?: string;
      sigla?: string;
      responsavelNome?: string;
      responsavelCargo?: string;
      responsavelMatricula?: string;
      bloco?: string;
      andar?: string;
      revisada?: boolean;
      macroSetorNome?: string;
    }
  ) => {
    const clean = roomName.trim();
    if (!clean || isUnitName(clean)) return; // Ignora o nome da Unidade!

    const normKey = normalizeLoc(clean);
    if (!normKey) return;

    const isReviewedFromCache = reviewedRoomsMap.has(normKey) || (meta?.id ? reviewedRoomsMap.has(normalizeLoc(meta.id)) : false);
    const isRevisada = Boolean(meta?.revisada || isReviewedFromCache);

    const canonClean = getCanonicalRoomKey(clean);

    // Regra da Desduplicidade de Salas: Procura se já existe uma sala equivalente na Unidade
    let existingEntry: UnitSubareaRoom | undefined = roomsMap.get(normKey);
    let existingKey = normKey;

    if (!existingEntry) {
      for (const [k, r] of roomsMap.entries()) {
        const canonR = getCanonicalRoomKey(r.nome);
        if (canonR === canonClean || isExactOrSafePrefixMatch(r.nome, clean)) {
          existingEntry = r;
          existingKey = k;
          break;
        }
      }
    }

    const matchingBaseSector = baseSectors.find(s => 
      normalizeLoc(s.nome) === normKey || 
      getCanonicalRoomKey(s.nome) === canonClean || 
      (meta?.id && s.id === meta.id)
    );
    const finalId = meta?.id || matchingBaseSector?.id || existingEntry?.id || `sub-${unitId}-${normKey.replace(/[^a-z0-9]/g, '-')}`;
    const prefix = unitId === 'ceo' ? 'CEO' : unitId === 'policlinica' ? 'POLI' : 'CPSMS';
    const cleanAcronym = clean.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const finalSigla = meta?.sigla || matchingBaseSector?.sigla || existingEntry?.sigla || `${prefix}-${cleanAcronym}`;
    const finalResponsavel = meta?.responsavelNome || matchingBaseSector?.responsavelNome || existingEntry?.responsavelNome || 'Responsável Setorial';
    const finalCargo = meta?.responsavelCargo || matchingBaseSector?.responsavelCargo || existingEntry?.responsavelCargo;
    const finalMatricula = meta?.responsavelMatricula || matchingBaseSector?.responsavelMatricula || existingEntry?.responsavelMatricula;
    const finalBloco = meta?.bloco || matchingBaseSector?.bloco || existingEntry?.bloco;
    const finalAndar = meta?.andar || matchingBaseSector?.andar || existingEntry?.andar;

    if (!existingEntry) {
      roomsMap.set(normKey, {
        id: finalId,
        nome: clean,
        sigla: finalSigla,
        unidadeId: unitId,
        unidadeNome: baseSectors[0]?.unidadeNome || (unitId === 'ceo' ? 'CEO – Centro de Especialidades Odontológicas' : 'Policlínica'),
        responsavelNome: finalResponsavel,
        responsavelCargo: finalCargo,
        responsavelMatricula: finalMatricula,
        bloco: inferArchitecturalBlock(clean, unitId, finalBloco),
        andar: finalAndar || 'Térreo',
        revisada: isRevisada,
        macroSetorNome: meta?.macroSetorNome
      });
    } else {
      // Regra de Preservação Oficial: Se o nome atual tem código oficial ASPEC (ex: "004 - COPA") 
      // e a existente não tinha (ex: "COPA"), promove para o nome oficial!
      const cleanHasDigits = /^[0-9]+[\s\-_.]/.test(clean);
      const existingHasDigits = /^[0-9]+[\s\-_.]/.test(existingEntry.nome);
      if (cleanHasDigits && !existingHasDigits) {
        existingEntry.nome = clean;
      }
      // Garante preservação de ID estável caso venha de baseSectors ou meta oficial
      if (matchingBaseSector?.id && existingEntry.id !== matchingBaseSector.id) {
        existingEntry.id = matchingBaseSector.id;
      } else if (meta?.id && existingEntry.id.startsWith('sub-') && !meta.id.startsWith('sub-')) {
        existingEntry.id = meta.id;
      }
      if (finalSigla && !existingEntry.sigla) existingEntry.sigla = finalSigla;
      if (finalResponsavel && existingEntry.responsavelNome === 'Responsável Setorial') existingEntry.responsavelNome = finalResponsavel;
      if (finalCargo && !existingEntry.responsavelCargo) existingEntry.responsavelCargo = finalCargo;
      if (finalMatricula && !existingEntry.responsavelMatricula) existingEntry.responsavelMatricula = finalMatricula;
      if (isRevisada) {
        existingEntry.revisada = true;
      }
    }
  };

  // 1. Inclui PRIMEIRO todas as salas de baseSectors (novas salas customizadas e salas oficiais da unidade)
  baseSectors.forEach(sec => {
    registerSubarea(sec.nome, {
      id: sec.id,
      sigla: sec.sigla,
      responsavelNome: sec.responsavelNome,
      responsavelCargo: sec.responsavelCargo,
      responsavelMatricula: sec.responsavelMatricula,
      bloco: sec.bloco,
      andar: sec.andar,
      revisada: sec.revisada || reviewedRoomsMap.has(normalizeLoc(sec.nome)) || (sec.id ? reviewedRoomsMap.has(normalizeLoc(sec.id)) : false),
    });
  });

  // 2. Extrai as salas / subáreas dos bens que existem na Unidade
  unitAssets.forEach(a => {
    const roomName = getAssetRoomName(a);
    if (roomName && !isUnitName(roomName)) {
      registerSubarea(roomName, {
        responsavelNome: a.responsavelNome,
        responsavelCargo: a.responsavelCargo,
        responsavelMatricula: a.responsavelMatricula
      });
    }
  });

  // 3. Mapeia os bens para cada subárea e calcula estatísticas em tempo real
  const roomsList = Array.from(roomsMap.values())
    .map(room => {
      const roomAssets = unitAssets.filter(a => doesAssetMatchRoom(a, room.nome));

      const totalCount = roomAssets.length;
      const checkedCount = roomAssets.filter(a => a.auditoria?.conferido).length;
      const missingCount = roomAssets.filter(a => a.auditoria?.statusDivergencia === 'nao_encontrado').length;
      const divergentCount = roomAssets.filter(a => a.auditoria?.statusDivergencia === 'setor_divergente').length;
      const totalVal = roomAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0);

      const cleanSubName = room.id && room.id.startsWith('sub-') ? room.id.replace(/^sub-[a-z0-9]+-/, '').replace(/-/g, ' ') : '';
      const isRoomRevisada = Boolean(
        room.revisada || 
        reviewedRoomsMap.has(normalizeLoc(room.nome)) || 
        (room.id ? reviewedRoomsMap.has(normalizeLoc(room.id)) : false) ||
        (cleanSubName ? reviewedRoomsMap.has(normalizeLoc(cleanSubName)) : false) ||
        (totalCount > 0 && checkedCount === totalCount)
      );

      const percent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : (isRoomRevisada ? 100 : 0);

      let visualStatus: 'concluida' | 'em_andamento' | 'pendente' | 'divergencia' = 'pendente';
      if (isRoomRevisada || (totalCount > 0 && percent === 100)) {
        visualStatus = 'concluida';
      } else if (missingCount > 0 || divergentCount > 0) {
        visualStatus = 'divergencia';
      } else if (checkedCount > 0) {
        visualStatus = 'em_andamento';
      } else {
        visualStatus = 'pendente';
      }

      const leaderChange = leaderChangesMap.get(normalizeLoc(room.nome)) || 
        (room.id ? leaderChangesMap.get(normalizeLoc(room.id)) : undefined);
      
      const effectiveResponsavel = leaderChange?.newLeader || room.responsavelNome;
      const effectiveCargo = leaderChange?.newCargo || room.responsavelCargo;
      const effectiveOriginalAspec = leaderChange?.originalLeader || room.responsavelOriginalAspec;
      const effectiveLiderAlterado = Boolean(leaderChange || room.liderAlterado);

      return {
        ...room,
        responsavelNome: effectiveResponsavel,
        responsavelCargo: effectiveCargo,
        responsavelOriginalAspec: effectiveOriginalAspec,
        liderAlterado: effectiveLiderAlterado,
        dataAlteracaoLider: leaderChange?.changedAt || room.dataAlteracaoLider,
        revisada: isRoomRevisada,
        roomAssets,
        totalCount,
        checkedCount,
        missingCount,
        divergentCount,
        totalVal,
        percent,
        visualStatus,
      };
    })
    // REGRA DE OURO: Mantém todas as salas com bens, ou já revisadas (OK), ou customizadas, ou pré-cadastradas na unidade
    .filter(room => 
      room.totalCount > 0 || 
      room.revisada || 
      room.id.startsWith('sec-custom-') || 
      reviewedRoomsMap.has(normalizeLoc(room.nome)) ||
      baseSectors.some(s => normalizeLoc(s.nome) === normalizeLoc(room.nome))
    );

  // Ordena: primeiro salas com bens alocados (maior contagem), depois ordem alfabética
  roomsList.sort((a, b) => {
    if (b.totalCount !== a.totalCount) {
      return b.totalCount - a.totalCount;
    }
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  return roomsList;
}
