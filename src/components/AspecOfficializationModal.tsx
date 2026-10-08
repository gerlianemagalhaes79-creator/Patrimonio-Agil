import React, { useState } from 'react';
import { Asset, UserProfile } from '../types';
import { ShieldCheck, AlertTriangle, CheckCircle2, X, Building2, MapPin, FileCheck } from 'lucide-react';
import { formatBRL } from '../utils/formatters';

interface AspecOfficializationModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  currentProfile: UserProfile;
  onConfirm: (asset: Asset, protocolo: string, parecer: string) => void;
}

export const AspecOfficializationModal: React.FC<AspecOfficializationModalProps> = ({
  isOpen,
  onClose,
  asset,
  currentProfile,
  onConfirm,
}) => {
  if (!isOpen || !asset) return null;

  const originalSetor = asset.setorOriginalAspec || asset.auditoria?.setorOriginalAspec || asset.setorNome;
  const originalUnidade = asset.unidadeOriginalAspec || asset.auditoria?.unidadeOriginalAspec || asset.unidadeNome;
  const targetRoom = asset.auditoria?.setorEncontrado || asset.setorNome;
  const targetUnit = asset.auditoria?.unidadeEncontrada || asset.unidadeNome;

  const [protocolo, setProtocolo] = useState<string>(() => {
    return `MOV-ASPEC-${new Date().getFullYear()}/${asset.tombamento || '0000'}`;
  });
  const [parecer, setParecer] = useState<string>(
    'Confirmo a baixa contábil e transferência definitiva no sistema ASPEC. Registro físico sala a sala e cadastro contábil devidamente unificados.'
  );
  const [declaracaoAceita, setDeclaracaoAceita] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declaracaoAceita) return;
    onConfirm(asset, protocolo.trim(), parecer.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border-2 border-emerald-500 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 to-slate-900 text-white flex items-start justify-between gap-3 border-b border-emerald-800/50">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 font-mono">
                Homologação Oficial · Gestora de Patrimônio
              </span>
              <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
                Oficializar Mudança Definitiva no ASPEC
              </h3>
              <p className="text-xs text-slate-300">
                Unificação contábil e física após baixa formal no sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
          {/* Asset Info Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
              <span className="text-sm">{asset.descricao}</span>
              <span className="font-mono bg-slate-200 dark:bg-slate-750 px-2 py-0.5 rounded text-xs text-emerald-800 dark:text-emerald-300 font-black">
                Tombo: {asset.tombamento}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-3">
              <span>Origem: <strong>{asset.origemTombo.split(' ')[0]}</strong></span>
              <span>Valor: <strong>{formatBRL(asset.valorAquisicao || 0)}</strong></span>
            </div>
          </div>

          {/* Divergence Comparison Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block">
                1. Local de Origem no ASPEC:
              </span>
              <strong className="text-slate-900 dark:text-white font-black block">
                {originalSetor}
              </strong>
              <div className="text-[10px] text-slate-500">{originalUnidade}</div>
              <div className="text-[9.5px] text-amber-700 dark:text-amber-300 font-semibold pt-1">
                ↳ Requer baixa / transferência no ASPEC
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">
                2. Destino Definitivo (Físico Conferido):
              </span>
              <strong className="text-slate-900 dark:text-white font-black block">
                {targetRoom}
              </strong>
              <div className="text-[10px] text-slate-500">{targetUnit}</div>
              <div className="text-[9.5px] text-emerald-700 dark:text-emerald-300 font-semibold pt-1">
                ↳ Será o novo registro oficial no sistema
              </div>
            </div>
          </div>

          {/* Protocol / ASPEC Reference */}
          <div>
            <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
              Protocolo / Registro de Movimentação no ASPEC:
            </label>
            <input
              type="text"
              required
              value={protocolo}
              onChange={(e) => setProtocolo(e.target.value)}
              placeholder="Ex: MOV-ASPEC-2026/1847 ou PROTOCOLO-TCE-123"
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Número da movimentação contábil ou despacho emitido no sistema ASPEC.
            </span>
          </div>

          {/* Parecer da Gestora */}
          <div>
            <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
              Parecer / Observação da Gestora de Patrimônio:
            </label>
            <textarea
              rows={2}
              value={parecer}
              onChange={(e) => setParecer(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Formal Confirmation Checkbox */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="decl-oficial"
              checked={declaracaoAceita}
              onChange={(e) => setDeclaracaoAceita(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer"
            />
            <label htmlFor="decl-oficial" className="text-[11px] text-slate-800 dark:text-slate-200 cursor-pointer leading-tight">
              <strong>Declaração Oficial:</strong> Confirmo que a baixa no setor anterior (<strong>{originalSetor}</strong>) e o remanejamento para a sala <strong>{targetRoom}</strong> foram devidamente lançados no sistema ASPEC. Autorizo a unificação definitiva dos registros patrimoniais.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!declaracaoAceita}
              className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Dar "OK" Oficial e Unificar Dados</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
