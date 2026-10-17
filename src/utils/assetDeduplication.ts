import { Asset, Sector, TrashedAsset } from '../types';

/**
 * Normaliza e gera uma chave única estável para desduplicar bens patrimoniais.
 * Resolve o problema de planilhas repetidas (mesmo arquivo importado 2x ou 3x),
 * mesmo quando os tombos contêm zeros à esquerda, prefixos diferentes ou quando
 * o tombo não foi mapeado (usando chave composta por descrição, setor e valor).
 */
export function getAssetDeduplicationKey(a: Partial<Asset>): string {
  // 1. Tenta número de tombo principal ou secundário
  const rawTombo = (
    a.tombamento ||
    a.tomboConsorcio ||
    a.tomboSesa ||
    a.codigoASPEC ||
    a.codigoSGPS ||
    ''
  ).toString().trim();

  // Se tem número de tombo, extrai os dígitos significativos (ex: "00123" e "CPSMS-00123" -> "123")
  const digitsOnly = rawTombo.replace(/\D/g, '').replace(/^0+/, '');
  if (digitsOnly && digitsOnly !== '') {
    // Prefixamos com origem se especificado para não colidir tombos de órgãos diferentes se houver
    const prefixOrigem = (a.origemTombo || '').toUpperCase().includes('SESA')
      ? 'sesa'
      : (a.origemTombo || '').toUpperCase().includes('UFC')
      ? 'ufc'
      : 'cpsms';
    return `${prefixOrigem}-tombo-num-${digitsOnly}`;
  }

  // Se for texto alfanumérico sem dígitos puros (ex: "EQUIP-ALFA-9")
  const cleanAlpha = rawTombo.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanAlpha && cleanAlpha !== 'sn' && cleanAlpha !== '0' && cleanAlpha !== 'semtombo' && cleanAlpha !== 'pendente') {
    return `tombo-alpha-${cleanAlpha}`;
  }

  // 2. Se tem número de série único
  const serie = (a.numeroSerie || '').toString().trim().toLowerCase();
  if (serie && serie !== 's/n' && serie !== 'sn' && serie !== '0') {
    return `serie-${serie}`;
  }

  // Se for bem sem plaqueta, achado físico em campo ou sem tombo explícito, usa seu ID único para NUNCA fundir itens físicos reais diferentes
  if (a.id && (a.foraDoAspec || a.semPlaqueta || !digitsOnly)) {
    return `item-unique-${a.id}`;
  }

  // 3. Chave Composta Semântica: quando a mesma planilha foi importada mais de uma vez sem tombo
  // Descrição do bem + Unidade + Setor/Subárea + Valor
  const normDesc = (a.descricao || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
  const normUnidade = (a.unidadeNome || a.unidadeId || '').toString().trim().toLowerCase();
  const normSetor = (a.setorNome || a.subarea || a.area || '').toString().trim().toLowerCase();
  const valNum = Number(a.valorAquisicao || 0).toFixed(2);

  if (normDesc) {
    return `composite-${normDesc}|${normUnidade}|${normSetor}|${valNum}`;
  }

  // 4. Último caso: ID do bem
  return a.id || 'ast-unknown';
}

/**
 * Conta quantos bens repetidos/duplicados existem na base atual
 */
export function countDuplicateAssets(assets: Asset[]): { duplicatesCount: number; duplicateGroupsCount: number } {
  const countMap = new Map<string, number>();
  for (const a of assets) {
    const key = getAssetDeduplicationKey(a);
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  let duplicatesCount = 0;
  let duplicateGroupsCount = 0;
  for (const [, occurrences] of countMap.entries()) {
    if (occurrences > 1) {
      duplicatesCount += (occurrences - 1);
      duplicateGroupsCount++;
    }
  }

  return { duplicatesCount, duplicateGroupsCount };
}

/**
 * Desduplica a lista de bens com preservação de auditoria realizada.
 * Se houver 3 cópias do mesmo bem e uma delas foi conferida ou editada,
 * a cópia conferida é PRESERVADA, descartando as duplicatas redundantes.
 */
export function deduplicateAssetsList(assets: Asset[]): { uniqueAssets: Asset[]; removedCount: number } {
  const map = new Map<string, Asset>();

  for (const a of assets) {
    const key = getAssetDeduplicationKey(a);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, a);
    } else {
      // Prioridade: se o bem atual tem conferência e o anterior não, mantém o conferido
      const existingIsChecked = existing.auditoria?.conferido === true;
      const currentIsChecked = a.auditoria?.conferido === true;

      if (!existingIsChecked && currentIsChecked) {
        map.set(key, a);
      } else if (existingIsChecked && currentIsChecked) {
        // Ambos conferidos: preserva a conferência mais recente
        const existingDate = existing.auditoria?.dataConferencia || '';
        const currentDate = a.auditoria?.dataConferencia || '';
        if (currentDate > existingDate) {
          map.set(key, { ...existing, ...a, auditoria: a.auditoria });
        }
      } else {
        // Nenhum conferido: combina campos complementares (se a descrição do atual for mais rica, usa ela)
        if ((a.descricao?.length || 0) > (existing.descricao?.length || 0)) {
          map.set(key, { ...existing, descricao: a.descricao, valorAquisicao: a.valorAquisicao || existing.valorAquisicao });
        }
      }
    }
  }

  const uniqueAssets = Array.from(map.values());
  const removedCount = Math.max(0, assets.length - uniqueAssets.length);

  return { uniqueAssets, removedCount };
}

/**
 * Conta quantas salas/setores duplicados existem cadastrados para a mesma unidade.
 */
export function countDuplicateSectors(sectors: Sector[]): number {
  const seen = new Set<string>();
  let duplicates = 0;

  for (const s of sectors) {
    const unitKey = (s.unidadeId || 'geral').toLowerCase();
    const norm = (s.nome || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const canon = norm.replace(/^[0-9]+[\s\-_.]*/, '').trim() || norm;
    const compoundKey = `${unitKey}::${canon}`;

    if (seen.has(compoundKey)) {
      duplicates++;
    } else {
      seen.add(compoundKey);
    }
  }

  return duplicates;
}

/**
 * Desduplica a lista de setores / salas por unidade e nome canônico.
 * Garante que nomes como "004 - COPA" e "COPA" sejam fundidos em um único setor oficial,
 * preservando o nome oficial do ASPEC e o status de revisão.
 */
export function deduplicateSectorsList(sectors: Sector[]): {
  uniqueSectors: Sector[];
  removedCount: number;
} {
  const map = new Map<string, Sector>();

  for (const s of sectors) {
    const unitKey = (s.unidadeId || 'geral').toLowerCase();
    const norm = (s.nome || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const canon = norm.replace(/^[0-9]+[\s\-_.]*/, '').trim() || norm;
    const compoundKey = `${unitKey}::${canon}`;

    const existing = map.get(compoundKey);
    if (!existing) {
      map.set(compoundKey, { ...s });
    } else {
      // Prioridade: se o setor atual tem código de prefixo oficial (ex: "004 - COPA") e o existente não, usa o oficial!
      const currentHasDigits = /^[0-9]+[\s\-_.]/.test(s.nome);
      const existingHasDigits = /^[0-9]+[\s\-_.]/.test(existing.nome);

      const preferredNome = currentHasDigits && !existingHasDigits ? s.nome : existing.nome;
      const preferredId = !existing.id.startsWith('sec-custom-') ? existing.id : s.id;
      const isRevisada = Boolean(existing.revisada || s.revisada);
      const dataRevisao = existing.dataRevisao || s.dataRevisao;
      const responsavelRevisao = existing.responsavelRevisao || s.responsavelRevisao;

      map.set(compoundKey, {
        ...existing,
        id: preferredId,
        nome: preferredNome,
        sigla: existing.sigla || s.sigla,
        responsavelNome: existing.responsavelNome !== 'Responsável Setorial' ? existing.responsavelNome : (s.responsavelNome || existing.responsavelNome),
        revisada: isRevisada,
        dataRevisao,
        responsavelRevisao,
      });
    }
  }

  const uniqueSectors = Array.from(map.values());
  const removedCount = Math.max(0, sectors.length - uniqueSectors.length);

  return { uniqueSectors, removedCount };
}

/**
 * Detecta bens na lixeira que foram apagados por engano sob justificativa de "duplicidade",
 * mas cujo tombo NÃO EXISTE mais no acervo ativo (ou seja, o usuário apagou o único exemplar).
 */
export function findFalseDuplicateTrashedAssets(
  activeAssets: Asset[],
  trashAssets: TrashedAsset[]
): TrashedAsset[] {
  const activeKeys = new Set<string>();
  const activeTombos = new Set<string>();

  for (const a of activeAssets) {
    activeKeys.add(getAssetDeduplicationKey(a));
    if (a.tombamento) activeTombos.add(a.tombamento.trim().toLowerCase());
  }

  return trashAssets.filter(t => {
    const reason = (t.reason || '').toLowerCase();
    const isDuplicityReason = reason.includes('duplic') || reason.includes('sala') || reason.includes('copa') || reason.includes('repet');
    if (!isDuplicityReason) return false;

    const tKey = getAssetDeduplicationKey(t.asset);
    const tTombo = (t.asset.tombamento || '').trim().toLowerCase();

    // Se o tombo ou chave não existe mais nos bens ativos, trata-se de falsa duplicidade!
    const existsInActive = activeKeys.has(tKey) || (tTombo ? activeTombos.has(tTombo) : false);
    return !existsInActive;
  });
}
