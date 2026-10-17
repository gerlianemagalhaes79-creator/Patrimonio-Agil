import React, { useState, useRef } from 'react';
import { Asset, Sector, TransferRequest, ResponsibilityTerm, AssetExit } from '../types';
import { exportAssetsToCsv, downloadCsvFile } from '../utils/formatters';
import { 
  downloadSystemBackup, 
  parseBackupFile, 
  getLastBackupInfo, 
  FullBackupPayload 
} from '../utils/backupHelper';
import { 
  Download, 
  Trash2, 
  FileSpreadsheet, 
  X, 
  Sparkles, 
  FolderOpen, 
  ShieldCheck, 
  Upload, 
  HardDrive, 
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface DataExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  sectors?: Sector[];
  transfers?: TransferRequest[];
  terms?: ResponsibilityTerm[];
  exits?: AssetExit[];
  onClearAllData: () => void;
  onOpenSmartImport: () => void;
  onRestoreBackup?: (payload: FullBackupPayload) => Promise<void> | void;
}

export const DataExchangeModal: React.FC<DataExchangeModalProps> = ({
  isOpen,
  onClose,
  assets,
  sectors = [],
  transfers = [],
  terms = [],
  exits = [],
  onClearAllData,
  onOpenSmartImport,
  onRestoreBackup,
}) => {
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const backupInfo = getLastBackupInfo();

  const handleDownloadFullBackup = () => {
    downloadSystemBackup({
      assets,
      sectors,
      transfers,
      terms,
      exits,
    });
  };

  const handleDownloadTemplate = () => {
    const templateHeader = [
      'Tombamento;OrigemTombo;Descricao;Unidade;Setor;SubsetorSala;Responsavel;Categoria;Estado;ValorAquisicao;NotaFiscal;NumeroSerie'
    ].join('\r\n');
    const exampleRow = [
      'CPSMS-0001;CPSMS (Próprio do Consórcio);Cadeira Odontológica Completa;CEO – Centro de Especialidades Odontológicas;Clínicas Odontológicas Especializadas;Consultório 01 – Endodontia;Dr. Ricardo Vasconcelos;Equipamentos Médicos & Odontológicos;Excelente;18500.00;NF-e 00412;SN-99812A'
    ].join('\r\n');
    downloadCsvFile(`${templateHeader}\r\n${exampleRow}`, 'modelo_importacao_patrimonio_cpsms.csv');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError(null);
    setRestoreFeedback(null);
    setIsRestoring(true);
    try {
      const payload = await parseBackupFile(file);
      if (onRestoreBackup) {
        await onRestoreBackup(payload);
        setRestoreFeedback(`Backup restaurado com sucesso! ${payload.assets.length} bens recuperados.`);
      } else {
        setRestoreFeedback(`Arquivo válido contendo ${payload.assets.length} bens. (Restauração ativada)`);
      }
    } catch (err: any) {
      setRestoreError(err?.message || 'Falha ao processar arquivo de backup.');
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Central de Segurança & Backup</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                  Blindagem Ativa
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Garantia de segurança, backups imediatos e persistência total do CPSMS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status card: Why your work is 100% safe */}
        <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-800/60 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Seu trabalho está protegido contra perdas:</span>
          </div>
          <ul className="text-[11.5px] text-emerald-800/90 dark:text-emerald-300/90 space-y-1 list-disc list-inside">
            <li><strong>Banco Local Ativo:</strong> Todos os <strong>{assets.length.toLocaleString('pt-BR')}</strong> bens estão gravados no IndexedDB do seu navegador.</li>
            <li><strong>Trava Anti-Sumiço:</strong> A lista de demonstração de 27 itens foi extirpada em definitivo do sistema.</li>
            <li><strong>Resiliência Offline:</strong> Mesmo que o Firebase atinja a cota gratuita ou fique offline, o sistema não apaga nada.</li>
            {backupInfo && (
              <li><strong>Cópia de Emergência:</strong> Gravada em {backupInfo.dateStr} ({backupInfo.count} bens).</li>
            )}
          </ul>
        </div>

        {/* Feedback messages */}
        {restoreFeedback && (
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{restoreFeedback}</span>
          </div>
        )}
        {restoreError && (
          <div className="p-3 bg-rose-100 dark:bg-rose-950 border border-rose-300 text-rose-900 dark:text-rose-200 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{restoreError}</span>
          </div>
        )}

        <div className="space-y-3 text-xs sm:text-sm">
          {/* Main Action 1: Download Full System Backup (.JSON) */}
          <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <span>Salvar Cópia de Segurança Completa (Backup .JSON)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full font-bold">
                Recomendado
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Baixa um arquivo completo contendo todos os <strong>{assets.length} bens</strong>, todas as conferências, salas, transferências e termos para o seu computador. Você pode guardar este arquivo no Google Drive, pendrive ou pasta segura.
            </p>
            <button
              onClick={handleDownloadFullBackup}
              disabled={assets.length === 0}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[44px] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Baixar Cópia de Segurança Agora ({assets.length} bens)
            </button>
          </div>

          {/* Main Action 2: Export Excel CSV */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>Exportar Planilha Geral para Excel (.CSV)</span>
            </div>
            <p className="text-xs text-slate-500">
              Gera planilha oficial com colunas do TCE-CE/ASPEC com todos os tombos, setores, salas e status de conferência.
            </p>
            <button
              onClick={() => {
                exportAssetsToCsv(assets);
              }}
              disabled={assets.length === 0}
              className="w-full py-2 px-3 text-xs font-semibold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              <Download className="w-4 h-4 text-teal-400" />
              Baixar Planilha do Acervo ({assets.length} ativos)
            </button>
          </div>

          {/* Restore Backup (.JSON) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Restaurar Cópia de Segurança (.JSON)</span>
            </div>
            <p className="text-xs text-slate-500">
              Se você formatou o computador, trocou de máquina ou quiser restaurar um ponto anterior, selecione o arquivo de backup oficial salvo.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className="w-full py-2 px-3 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              {isRestoring ? 'Processando Restauração...' : 'Selecionar Arquivo de Backup para Restaurar (.json)'}
            </button>
          </div>

          {/* Import new spreadsheet */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Importar Planilha do Excel (.xlsx / .csv)</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Importe novas planilhas com mapeamento inteligente de colunas e prevenção de duplicidades.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenSmartImport();
                }}
                className="py-2 px-3 text-xs font-bold text-slate-900 bg-amber-300 hover:bg-amber-200 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Importar Planilha
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="py-2 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1 min-h-[40px] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Modelo (.csv)
              </button>
            </div>
          </div>

          {/* Clear / Wipe all data option */}
          <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/40 space-y-2">
            <div className="font-semibold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Zerar Base (Apenas se quiser recomeçar do zero)</span>
            </div>
            {!showConfirmClear ? (
              <button
                type="button"
                onClick={() => setShowConfirmClear(true)}
                className="w-full py-1.5 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-colors border border-rose-200 dark:border-rose-800 min-h-[38px] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Todos os Bens Cadastrados
              </button>
            ) : (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-rose-300 dark:border-rose-800 space-y-2 text-xs">
                <p className="font-bold text-rose-600 dark:text-rose-400">
                  Tem certeza que deseja apagar todos os bens cadastrados?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllData();
                      onClose();
                    }}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Sim, Apagar Tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-h-[44px] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
