import React, { useState } from 'react';
import { PATRIMONY_NORMS } from '../data/patrimonyNorms';
import { PatrimonyNorm } from '../types';
import { 
  BookOpen, 
  ShieldCheck, 
  Scale, 
  Building2, 
  CheckCircle2, 
  Search, 
  FileText, 
  ExternalLink,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

export const NormsView: React.FC = () => {
  const [selectedSphere, setSelectedSphere] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNorm, setSelectedNorm] = useState<PatrimonyNorm | null>(PATRIMONY_NORMS[0]);

  const filteredNorms = PATRIMONY_NORMS.filter(norm => {
    if (selectedSphere !== 'all' && norm.esfera !== selectedSphere) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        norm.titulo.toLowerCase().includes(q) ||
        norm.numero.toLowerCase().includes(q) ||
        norm.resumo.toLowerCase().includes(q) ||
        norm.pontosChave.some(p => p.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-24">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                Conformidade Legal & Fiscalização
              </span>
              <span className="text-xs text-slate-400">TCE-CE & Legislação Federal</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Normas Vigentes de Gestão Patrimonial
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Repositório normativo completo para fundamentação da <strong>Gerência de Patrimônio do CPSMS</strong>, aplicável à <strong>Policlínica Bernardo Félix da Silva</strong> e ao <strong>CEO de Sobral</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              100% Alinhado ao TCE-CE
            </span>
          </div>
        </div>
      </div>

      {/* Audit Checklist for Gerliane (TCE-CE Requirements) */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
          <Scale className="w-5 h-5 shrink-0" />
          <span>Diretrizes Obrigatórias do Tribunal de Contas do Estado do Ceará (TCE-CE) para o CPSMS</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          Como este setor está sendo implantado do zero por você, o TCE-CE fiscalizará os seguintes pilares obrigatórios na Tomada de Contas Anual do Consórcio:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              1. Segregação de Origens
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Separar categoricamente bens próprios do CPSMS, bens cedidos pela SESA e bens de convênio da UFC.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              2. Cautela & Fiel Depositário
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Emitir e manter assinados os Termos de Cautela de cada consultório, clínica e sala da Policlínica e CEO.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              3. Trava de Movimentação
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Proibir qualquer remoção de equipamento entre salas ou unidades sem homologação prévia da Gestora.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              4. Inventário Físico Anual
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Conferir 100% dos ativos móveis in loco com relatório consolidado até o fechamento do exercício fiscal.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {[
            { id: 'all', label: 'Todas as Normas' },
            { id: 'Estadual (Ceará / TCE-CE)', label: 'Ceará / TCE-CE' },
            { id: 'Federal', label: 'Legislação Federal' },
            { id: 'Consórcio (CPSMS)', label: 'Regulamento CPSMS' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedSphere(f.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer min-h-[36px] ${
                selectedSphere === f.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar artigo, lei ou norma..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Two Column Layout: Norms List + Selected Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Norms List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
            Legislação em Vigor ({filteredNorms.length})
          </div>

          <div className="space-y-2.5">
            {filteredNorms.map(norm => {
              const isSelected = selectedNorm?.id === norm.id;
              return (
                <div
                  key={norm.id}
                  onClick={() => setSelectedNorm(norm)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 dark:border-emerald-500/50 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-semibold ${isSelected ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {norm.esfera}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {norm.ano}
                    </span>
                  </div>

                  <h4 className={`text-xs font-bold mt-1.5 leading-snug ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {norm.numero}
                  </h4>
                  <div className={`text-xs mt-0.5 font-medium line-clamp-1 ${isSelected ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>
                    {norm.titulo}
                  </div>

                  <p className={`text-[11px] mt-1.5 line-clamp-2 leading-relaxed ${isSelected ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {norm.resumo}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Full Details */}
        <div className="lg:col-span-7">
          {selectedNorm ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {selectedNorm.esfera} · {selectedNorm.orgaoEmissor}
                  </span>
                  {selectedNorm.obrigatoriedadeTCE && (
                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                      Fiscalizado pelo TCE-CE
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {selectedNorm.numero} – {selectedNorm.titulo}
                </h3>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Síntese e Alcance da Norma
                </label>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  {selectedNorm.resumo}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Pontos Obrigatórios para Aplicação no CPSMS
                </label>
                <div className="space-y-2">
                  {selectedNorm.pontosChave.map((ponto, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-xs flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-slate-800 dark:text-slate-200 leading-relaxed">{ponto}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal citation helper */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <strong>Dica de Uso Prático:</strong> Você pode citar esta norma nos Termos de Responsabilidade e despachos de transferências patrimoniais da Policlínica e do CEO para garantir a higidez jurídica da sua gestão perante os auditores do TCE-CE.
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center text-slate-500 border border-slate-200 dark:border-slate-800">
              Selecione uma norma ao lado para visualizar os detalhes e exigências do TCE-CE.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
