import React, { useState } from 'react';
import { ResponsibilityTerm, Asset, Sector, UnitInfo, UserProfile } from '../types';
import { formatBRL, formatDate } from '../utils/formatters';
import { generateQrSvg } from '../utils/codeGenerators';
import { 
  FileText, 
  Printer, 
  PlusCircle, 
  Building2, 
  CheckCircle2, 
  X,
  Scale
} from 'lucide-react';

interface TermsViewProps {
  terms: ResponsibilityTerm[];
  assets: Asset[];
  sectors: Sector[];
  units: UnitInfo[];
  currentProfile: UserProfile;
  onCreateTerm: (term: ResponsibilityTerm) => void;
  initialSelectedTermId?: string;
}

export const TermsView: React.FC<TermsViewProps> = ({
  terms,
  assets,
  sectors,
  units,
  currentProfile,
  onCreateTerm,
  initialSelectedTermId,
}) => {
  const [selectedTerm, setSelectedTerm] = useState<ResponsibilityTerm | null>(
    terms.find(t => t.id === initialSelectedTermId) || terms[0] || null
  );
  const [isCreatingNewTerm, setIsCreatingNewTerm] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id || 'policlinica');
  const [selectedSectorId, setSelectedSectorId] = useState<string>(sectors[0]?.id || '');
  const [newTermTipo, setNewTermTipo] = useState<'termo_setorial' | 'termo_transferencia' | 'termo_cessao_sesa'>('termo_setorial');
  const [newTermObservacoes, setNewTermObservacoes] = useState(
    'O titular qualificado assume perante a Administração do CPSMS o encargo de Fiel Depositário dos bens discriminados, nos termos do art. 94 da Lei Federal nº 4.320/64 e da Instrução Normativa do Tribunal de Contas do Estado do Ceará (TCE-CE). É vedada a remoção sem autorização prévia da Gestora de Patrimônio.'
  );

  const availableSectors = sectors.filter(s => s.unidadeId === selectedUnitId);

  const handleCreateTerm = (e: React.FormEvent) => {
    e.preventDefault();
    const sector = sectors.find(s => s.id === selectedSectorId) || availableSectors[0];
    const unit = units.find(u => u.id === selectedUnitId);
    if (!sector || !unit) return;

    const sectorAssets = assets.filter(a => a.setorId === sector.id);

    const termNumber = `TR-CPSMS-${new Date().getFullYear()}/${String(terms.length + 1).padStart(4, '0')}`;
    const newTerm: ResponsibilityTerm = {
      id: termNumber,
      numeroTermo: termNumber,
      tipo: newTermTipo,
      titulo: newTermTipo === 'termo_setorial' 
        ? `Termo de Responsabilidade e Cautela – ${sector.nome}`
        : newTermTipo === 'termo_cessao_sesa'
        ? `Termo de Guarda e Fiel Depositário de Bens Cedidos pela SESA/UFC`
        : `Termo de Transferência e Remanejamento Patrimonial`,
      dataEmissao: new Date().toISOString().slice(0, 10),
      unidadeDestino: unit.nome,
      setorDestino: sector.nome,
      responsavelNome: sector.responsavelNome,
      responsavelCargo: sector.responsavelCargo,
      responsavelMatricula: sector.responsavelMatricula,
      gestoraNome: currentProfile.nome || 'Gestora de Patrimônio',
      gestoraCargo: 'Gestora de Patrimônio – CPSMS',
      bens: sectorAssets.map(a => ({
        tombamento: a.tombamento,
        origemTombo: a.origemTombo,
        descricao: a.descricao,
        estado: a.estado,
        valor: a.valorAquisicao,
        numeroSerie: a.numeroSerie
      })),
      observacoesLegais: newTermObservacoes,
      codigoVerificacao: `AUT-CPSMS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      statusAssinatura: 'assinado'
    };

    onCreateTerm(newTerm);
    setSelectedTerm(newTerm);
    setIsCreatingNewTerm(false);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
              Conformidade TCE-CE & Lei 4.320/64
            </span>
            <span className="text-xs text-slate-400">CPSMS · Sobral-CE</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Termos de Responsabilidade & Cautela
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Emissão oficial de documentos de fiel depositário para os responsáveis da <strong>Policlínica Bernardo Félix</strong> e do <strong>CEO</strong>, prontos para assinatura digital ou física.
          </p>
        </div>

        {currentProfile.role === 'gestora' && (
          <button
            onClick={() => setIsCreatingNewTerm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4" />
            Emitir Novo Termo
          </button>
        )}
      </div>

      {/* Grid: Terms list + Document View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Terms list */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
            Termos Emitidos no CPSMS ({terms.length})
          </div>

          {terms.length === 0 ? (
            <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">
                Nenhum termo gerado ainda. Clique em "Emitir Novo Termo" para criar o documento de cautela setorial da Policlínica ou CEO.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {terms.map(t => {
                const isSelected = selectedTerm?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTerm(t)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 dark:border-emerald-500/50 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-mono font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {t.numeroTermo}
                      </span>
                      <span className={`text-[11px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {formatDate(t.dataEmissao)}
                      </span>
                    </div>

                    <h4 className={`text-xs font-semibold mt-1 line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                      {t.titulo}
                    </h4>

                    <div className={`text-[11px] mt-1 flex items-center justify-between ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      <span className="truncate max-w-[170px]">{t.unidadeDestino} – {t.setorDestino}</span>
                      <span className="font-semibold tabular-nums">{t.bens.length} bem(ns)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Printable Term Layout */}
        <div className="lg:col-span-8">
          {selectedTerm ? (
            <div className="bg-white text-slate-950 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {selectedTerm.numeroTermo} · Visualização Oficial
                  </span>
                </div>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer min-h-[44px]"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Termo Oficial
                </button>
              </div>

              {/* Printable Content */}
              <div className="space-y-6 font-serif text-slate-950">
                {/* Government Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-700">
                    ESTADO DO CEARÁ · CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL (CPSMS)
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-800 mt-0.5">
                    GERÊNCIA DE PATRIMÔNIO E BENS MÓVEIS · POLICLÍNICA BERNARDO FÉLIX & CEO SOBRAL
                  </div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 mt-2 uppercase">
                    {selectedTerm.titulo}
                  </h1>
                  <div className="text-xs font-mono font-bold text-slate-700 mt-1">
                    PROTOCOLO Nº {selectedTerm.numeroTermo} · AUTENTICAÇÃO TCE-CE: {selectedTerm.codigoVerificacao}
                  </div>
                </div>

                {/* Qualification */}
                <div className="text-xs leading-relaxed space-y-2 font-sans bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p>
                    Aos <strong>{formatDate(selectedTerm.dataEmissao)}</strong>, a Gestora de Patrimônio do CPSMS, <strong>{selectedTerm.gestoraNome}</strong>, faz a entrega formal e lavra a respectiva carga patrimonial dos bens móveis discriminados abaixo sob a guarda e fiel depósito do titular qualificado:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[11px]">
                    <div>
                      <strong>Responsável pelo Recebimento:</strong> {selectedTerm.responsavelNome}<br />
                      <strong>Cargo / Função:</strong> {selectedTerm.responsavelCargo}<br />
                      <strong>Matrícula Funcional:</strong> {selectedTerm.responsavelMatricula}
                    </div>
                    <div>
                      <strong>Unidade:</strong> {selectedTerm.unidadeDestino}<br />
                      <strong>Setor / Sala:</strong> {selectedTerm.setorDestino}<br />
                      <strong>Origem da Carga:</strong> {selectedTerm.setorOrigem || 'Gerência de Patrimônio'}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="space-y-2 font-sans">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Relação Analítica dos Bens Tombados ({selectedTerm.bens.length} itens)
                  </div>

                  <table className="w-full text-left border-collapse text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                        <th className="p-2">Item</th>
                        <th className="p-2">Tombamento</th>
                        <th className="p-2">Origem Tombo</th>
                        <th className="p-2">Descrição do Ativo</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2 text-right">Valor Histórico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedTerm.bens.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500 text-xs">
                            Nenhum bem registrado sob este termo. Os novos ativos cadastrados no setor aparecerão aqui.
                          </td>
                        </tr>
                      ) : (
                        selectedTerm.bens.map((b, idx) => (
                          <tr key={b.tombamento}>
                            <td className="p-2 text-slate-500 font-mono">{idx + 1}</td>
                            <td className="p-2 font-mono font-bold text-slate-950">{b.tombamento}</td>
                            <td className="p-2 font-semibold text-emerald-800">{b.origemTombo}</td>
                            <td className="p-2">
                              <div className="font-semibold text-slate-900">{b.descricao}</div>
                              {b.numeroSerie && (
                                <div className="text-[10px] text-slate-500 font-mono">Série: {b.numeroSerie}</div>
                              )}
                            </td>
                            <td className="p-2 font-medium">{b.estado}</td>
                            <td className="p-2 text-right font-mono tabular-nums">{formatBRL(b.valor)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t border-slate-300">
                        <td colSpan={5} className="p-2 text-right text-xs">VALOR TOTAL DA CARGA PATRIMONIAL:</td>
                        <td className="p-2 text-right font-mono text-xs tabular-nums">
                          {formatBRL(selectedTerm.bens.reduce((s, b) => s + b.valor, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Legal Clauses */}
                <div className="text-xs leading-relaxed space-y-2 text-slate-800 border-t border-slate-300 pt-3">
                  <div className="font-bold uppercase text-[11px] text-slate-900 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-slate-700" />
                    Cláusula de Responsabilidade e Fiel Depositário (Art. 94, Lei Federal 4.320/64 e IN TCE-CE)
                  </div>
                  <p className="text-justify text-[11px] text-slate-700">
                    {selectedTerm.observacoesLegais}
                  </p>
                </div>

                {/* Signatures */}
                <div className="pt-8 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6 font-sans">
                  <div className="flex items-center gap-3 border border-slate-300 p-2.5 rounded-lg bg-slate-50">
                    <div 
                      className="w-16 h-16 shrink-0 bg-white p-0.5 border border-slate-200"
                      dangerouslySetInnerHTML={{ __html: generateQrSvg(selectedTerm.codigoVerificacao, 64) }}
                    />
                    <div className="text-[10px] space-y-0.5">
                      <div className="font-bold text-slate-900">Autenticação Patrimonial CPSMS</div>
                      <div className="text-slate-600 font-mono">Cód: {selectedTerm.codigoVerificacao}</div>
                      <div className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Fiel Depositário Válido
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-4 text-center text-xs">
                    <div>
                      <div className="border-t border-slate-900 pt-1 font-bold">
                        {selectedTerm.gestoraNome}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {selectedTerm.gestoraCargo}
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-slate-900 pt-1 font-bold">
                        {selectedTerm.responsavelNome}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {selectedTerm.responsavelCargo}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center text-slate-500 border border-slate-200 dark:border-slate-800">
              Selecione ou emita um termo para visualização oficial.
            </div>
          )}
        </div>
      </div>

      {/* Modal to Create New Term */}
      {isCreatingNewTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Emitir Novo Termo de Responsabilidade · CPSMS
              </h3>
              <button
                onClick={() => setIsCreatingNewTerm(false)}
                className="w-7 h-7 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTerm} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Unidade de Saúde:
                </label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Setor / Bloco:
                </label>
                <select
                  value={selectedSectorId}
                  onChange={(e) => setSelectedSectorId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {availableSectors.map((s, idx) => (
                    <option key={`term-sec-${s.id}-${idx}`} value={s.id}>{s.nome} ({s.sigla})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tipo do Termo:
                </label>
                <select
                  value={newTermTipo}
                  onChange={(e) => setNewTermTipo(e.target.value as any)}
                  className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="termo_setorial">Termo Geral de Cautela e Fiel Depositário do Setor</option>
                  <option value="termo_cessao_sesa">Termo Específico de Guarda de Bens Cedidos SESA/UFC</option>
                  <option value="termo_transferencia">Termo de Remanejamento e Transferência</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Cláusula Legal / Observações:
                </label>
                <textarea
                  rows={3}
                  value={newTermObservacoes}
                  onChange={(e) => setNewTermObservacoes(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingNewTerm(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-colors min-h-[44px]"
                >
                  Gerar Termo Oficial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
