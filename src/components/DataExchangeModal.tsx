import React from 'react';
import { Asset } from '../types';
import { exportAssetsToCsv, downloadCsvFile } from '../utils/formatters';
import { Download, Trash2, FileSpreadsheet, X, Sparkles, FolderOpen } from 'lucide-react';

interface DataExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  onClearAllData: () => void;
  onOpenSmartImport: () => void;
}

export const DataExchangeModal: React.FC<DataExchangeModalProps> = ({
  isOpen,
  onClose,
  assets,
  onClearAllData,
  onOpenSmartImport,
}) => {
  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const templateHeader = [
      'Tombamento;OrigemTombo;Descricao;Unidade;Setor;SubsetorSala;Responsavel;Categoria;Estado;ValorAquisicao;NotaFiscal;NumeroSerie'
    ].join('\r\n');
    const exampleRow = [
      'CPSMS-0001;CPSMS (Próprio do Consórcio);Cadeira Odontológica Completa;CEO – Centro de Especialidades Odontológicas;Clínicas Odontológicas Especializadas;Consultório 01 – Endodontia;Dr. Ricardo Vasconcelos;Equipamentos Médicos & Odontológicos;Excelente;18500.00;NF-e 00412;SN-99812A'
    ].join('\r\n');
    downloadCsvFile(`${templateHeader}\r\n${exampleRow}`, 'modelo_importacao_patrimonio_cpsms.csv');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Planilhas & Dados do Patrimônio
              </h3>
              <p className="text-[11px] text-slate-500">
                Gerência de Patrimônio do CPSMS
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

        <div className="space-y-3 text-xs sm:text-sm">
          {/* Main Action: Import 2,849 items spreadsheet */}
          <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                Importar Planilha (2.849 Bens)
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Carregue sua planilha do Excel (<strong>.xlsx</strong> ou <strong>.xls</strong>) ou em <strong>CSV</strong>. O sistema realiza o mapeamento das colunas e importa os bens com segurança.
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenSmartImport();
              }}
              className="w-full py-2.5 px-4 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <FolderOpen className="w-4 h-4" />
              Abrir Importador de Planilha do Excel
            </button>
          </div>

          {/* Export Assets Button */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-semibold text-slate-900 dark:text-white">
              Exportar Inventário do CPSMS (CSV)
            </div>
            <p className="text-xs text-slate-500">
              Gera planilha compatível com ASPEC/SGPS com segregação de bens CPSMS, SESA e UFC.
            </p>
            <button
              onClick={() => {
                exportAssetsToCsv(assets);
                onClose();
              }}
              disabled={assets.length === 0}
              className="w-full py-2 px-3 text-xs font-semibold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Baixar Planilha do Acervo ({assets.length} ativos)
            </button>
          </div>

          {/* Download Import Template */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-semibold text-slate-900 dark:text-white">
              Modelo Padrão de Planilha
            </div>
            <p className="text-xs text-slate-500">
              Baixe a planilha modelo de referência com colunas sugeridas pelo TCE-CE.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="w-full py-2 px-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Modelo de Exemplo (.csv)
            </button>
          </div>

          {/* Clear / Wipe all data option */}
          <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/40 space-y-2">
            <div className="font-semibold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-500" />
              Limpar Todos os Bens Cadastrados
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Remove todos os registros para você reiniciar o cadastro do zero caso necessário.
            </p>
            <button
              onClick={() => {
                if (confirm('Deseja realmente limpar todos os bens patrimoniais do sistema? Esta ação é irreversível.')) {
                  onClearAllData();
                  onClose();
                }
              }}
              className="w-full py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-colors border border-rose-200 dark:border-rose-800 min-h-[44px] cursor-pointer"
            >
              Zerar Base de Bens
            </button>
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
