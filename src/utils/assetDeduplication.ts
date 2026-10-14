import { Asset } from '../types';

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
