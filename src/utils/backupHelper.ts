import { Asset, Sector, TransferRequest, ResponsibilityTerm, AssetExit } from '../types';

export interface FullBackupPayload {
  version: '1.0';
  timestamp: string;
  formattedDate: string;
  totalAssets: number;
  totalValue: number;
  assets: Asset[];
  sectors?: Sector[];
  transfers?: TransferRequest[];
  terms?: ResponsibilityTerm[];
  exits?: AssetExit[];
}

/**
 * Realiza o download imediato de uma cópia de segurança completa (Backup JSON)
 * contendo todos os bens, salas, transferências, saídas e termos do sistema.
 */
export function downloadSystemBackup(data: {
  assets: Asset[];
  sectors: Sector[];
  transfers: TransferRequest[];
  terms: ResponsibilityTerm[];
  exits: AssetExit[];
}): void {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;

  const totalValue = data.assets.reduce((sum, a) => sum + (a.valorAquisicao || 0), 0);

  const payload: FullBackupPayload = {
    version: '1.0',
    timestamp: now.toISOString(),
    formattedDate: `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`,
    totalAssets: data.assets.length,
    totalValue,
    assets: data.assets,
    sectors: data.sectors,
    transfers: data.transfers,
    terms: data.terms,
    exits: data.exits,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_oficial_patrimonio_cpsms_${dateStr}_${timeStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Salva uma cópia de emergência resiliente no navegador
 */
export function saveEmergencyLocalBackup(assets: Asset[]): void {
  try {
    if (!assets || assets.length === 0) return;
    const backupObj = {
      timestamp: new Date().toISOString(),
      formattedDate: new Date().toLocaleString('pt-BR'),
      count: assets.length,
      assets: assets,
    };
    localStorage.setItem('cpsms_patrimonio_emergency_backup', JSON.stringify(backupObj));
  } catch (err) {
    console.warn('Erro ao salvar backup de emergência no localStorage:', err);
  }
}

/**
 * Lê o backup de emergência caso IndexedDB falhe ou precise de restauração rápida
 */
export function loadEmergencyLocalBackup(): { timestamp: string; count: number; assets: Asset[] } | null {
  try {
    const raw = localStorage.getItem('cpsms_patrimonio_emergency_backup');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.assets)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Erro ao carregar backup de emergência:', err);
  }
  return null;
}

/**
 * Retorna as informações do último backup automático para tranquilizar o usuário
 */
export function getLastBackupInfo(): { dateStr: string; count: number } | null {
  try {
    const raw = localStorage.getItem('cpsms_patrimonio_emergency_backup');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.timestamp) {
      const d = new Date(parsed.timestamp);
      return {
        dateStr: d.toLocaleString('pt-BR'),
        count: parsed.count || (Array.isArray(parsed.assets) ? parsed.assets.length : 0),
      };
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Lê e valida um arquivo .json de backup selecionado pelo usuário
 */
export async function parseBackupFile(file: File): Promise<FullBackupPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.assets)) {
          throw new Error('Arquivo de backup inválido: não contém a lista de bens ("assets").');
        }
        resolve(parsed);
      } catch (err: any) {
        reject(new Error(err?.message || 'Falha ao processar o arquivo de backup. Certifique-se de que é um arquivo JSON válido do CPSMS.'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de backup.'));
    reader.readAsText(file);
  });
}
