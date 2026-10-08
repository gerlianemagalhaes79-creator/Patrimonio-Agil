import React, { useState } from 'react';
import { Asset, Sector, UnitInfo, AssetCategory, AssetCondition, TomboOrigin } from '../types';
import { PlusCircle, Package, Building2, Tag, Calendar, DollarSign, X, Scale } from 'lucide-react';

interface NewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newAsset: Asset) => void;
  sectors: Sector[];
  units: UnitInfo[];
  existingAssetsCount: number;
}

export const NewAssetModal: React.FC<NewAssetModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sectors,
  units,
  existingAssetsCount,
}) => {
  const currentYear = new Date().getFullYear();

  const [origemTombo, setOrigemTombo] = useState<TomboOrigin>('CPSMS (Próprio do Consórcio)');
  const [tombamento, setTombamento] = useState(`CPSMS-${String(existingAssetsCount + 1).padStart(4, '0')}`);
  const [tomboConsorcio, setTomboConsorcio] = useState('');
  const [tomboOrigemSesa, setTomboOrigemSesa] = useState('');
  const [tomboUfc, setTomboUfc] = useState('');
  const [tomboFcpc, setTomboFcpc] = useState('');
  const [outrosTombos, setOutrosTombos] = useState('');
  const [duploTombamento, setDuploTombamento] = useState(false);
  const [foraDoAspec, setForaDoAspec] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [unidadeId, setUnidadeId] = useState<string>('policlinica');
  const [setorId, setSetorId] = useState<string>('');
  const [subsetorNome, setSubsetorNome] = useState<string>('');
  const [categoria, setCategoria] = useState<AssetCategory>('Equipamentos Médicos & Odontológicos');
  const [estado, setEstado] = useState<AssetCondition>('Excelente');
  const [valorAquisicao, setValorAquisicao] = useState<string>('1500.00');
  const [dataAquisicao, setDataAquisicao] = useState(new Date().toISOString().slice(0, 10));
  const [notaFiscal, setNotaFiscal] = useState('NF-e ');
  const [fornecedor, setFornecedor] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [termoCessaoVinculado, setTermoCessaoVinculado] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Sectors for chosen unit
  const availableSectors = sectors.filter(s => s.unidadeId === unidadeId);

  // Auto pick sector when unit changes
  React.useEffect(() => {
    if (availableSectors.length > 0 && (!setorId || !availableSectors.some(s => s.id === setorId))) {
      const first = availableSectors[0];
      setSetorId(first.id);
      setSubsetorNome(first.subsetores[0]?.nome || '');
    }
  }, [unidadeId, availableSectors]);

  // Handle prefix change on tombo origin change
  const handleOriginChange = (orig: TomboOrigin) => {
    setOrigemTombo(orig);
    const prefix = orig.includes('SESA') ? 'SESA-' : orig.includes('UFC') ? 'UFC-' : 'CPSMS-';
    setTombamento(`${prefix}${String(existingAssetsCount + 1).padStart(4, '0')}`);
  };

  const handleSectorChange = (secId: string) => {
    setSetorId(secId);
    const sec = sectors.find(s => s.id === secId);
    if (sec && sec.subsetores.length > 0) {
      setSubsetorNome(sec.subsetores[0].nome);
    }
  };

  if (!isOpen) return null;

  const currentSector = sectors.find(s => s.id === setorId) || availableSectors[0];
  const currentUnit = units.find(u => u.id === unidadeId) || units[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      alert('Informe a descrição do bem.');
      return;
    }
    if (!currentSector) {
      alert('Selecione o setor de lotação.');
      return;
    }

    const valor = parseFloat(valorAquisicao) || 0;
    const newAsset: Asset = {
      id: `ast-${Date.now()}`,
      tombamento: tombamento.trim(),
      origemTombo,
      tomboConsorcio: tomboConsorcio.trim() || undefined,
      tomboSesa: tomboOrigemSesa.trim() || undefined,
      tomboOrigemSesa: tomboOrigemSesa.trim() || undefined,
      tomboUfc: tomboUfc.trim() || undefined,
      tomboFcpc: tomboFcpc.trim() || undefined,
      outrosTombos: outrosTombos.trim() || undefined,
      tomboSecundario: outrosTombos.trim() || undefined,
      duploTombamento: Boolean(duploTombamento || (tomboOrigemSesa.trim() && tombamento.trim())),
      foraDoAspec,
      descricao: descricao.trim(),
      unidadeId: currentUnit.id,
      unidadeNome: currentUnit.nome,
      setorId: currentSector.id,
      setorNome: currentSector.nome,
      subsetorNome: subsetorNome || currentSector.subsetores[0]?.nome || 'Geral',
      responsavelNome: currentSector.responsavelNome,
      responsavelCargo: currentSector.responsavelCargo,
      responsavelMatricula: currentSector.responsavelMatricula,
      categoria,
      estado,
      valorAquisicao: valor,
      valorResidual: valor,
      dataAquisicao,
      notaFiscal: notaFiscal.trim(),
      fornecedor: fornecedor.trim() || 'Fornecedor Credenciado',
      numeroSerie: numeroSerie.trim(),
      termoCessaoVinculado: termoCessaoVinculado.trim(),
      observacoes: observacoes.trim(),
      codigoASPEC: `ASP-CPSMS-${Math.floor(1000 + Math.random() * 9000)}`,
      codigoSGPS: `SGPS-${tombamento.trim()}`,
      auditoria: {
        conferido: true,
        dataConferencia: new Date().toISOString().slice(0, 10),
        responsavelConferencia: 'Maria Gerliane Rocha Magalhães',
        statusDivergencia: 'conforme',
        observacaoAuditoria: 'Tombamento registrado na implantação da Gerência de Patrimônio do CPSMS.'
      }
    };

    onSubmit(newAsset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cadastrar Bem Patrimonial · CPSMS
              </h3>
              <p className="text-[11px] text-slate-500">
                Padrão TCE-CE para a Policlínica Bernardo Félix e CEO Sobral
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 text-slate-400 hover:text-slate-600 flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Row: Origem do Tombo (CPSMS, SESA, UFC) */}
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                Origem do Tombamento (Titularidade do Ativo):
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Exigência TCE-CE</span>
            </div>
            <select
              value={origemTombo}
              onChange={(e) => handleOriginChange(e.target.value as any)}
              className="w-full p-2.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white font-semibold"
            >
              <option value="CPSMS (Próprio do Consórcio)">CPSMS (Próprio do Consórcio)</option>
              <option value="SESA (Governo do Ceará - Cessão/Comodato)">SESA (Governo do Ceará - Cessão/Comodato)</option>
              <option value="UFC (Universidade Federal do Ceará)">UFC (Universidade Federal do Ceará - Convênio)</option>
              <option value="Ministério da Saúde / SUS / Doação">Ministério da Saúde / SUS / Doação</option>
              <option value="Município Consorciado">Município Consorciado</option>
            </select>
          </div>

          {/* Row 1: Tombamento CPSMS (4 dígitos), Tombo SESA (6 dígitos), Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Tombo Principal / Consórcio (4 dígitos):
              </label>
              <input
                type="text"
                required
                value={tombamento}
                onChange={(e) => setTombamento(e.target.value)}
                placeholder="Ex: 0184 ou CPSMS-0184"
                className="w-full p-2.5 font-mono font-bold text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Padrão Consórcio CPSMS: 4 números</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-blue-700 dark:text-blue-300 block mb-1">
                Tombo de Origem SESA / Estado (6 dígitos):
              </label>
              <input
                type="text"
                value={tomboOrigemSesa}
                onChange={(e) => {
                  setTomboOrigemSesa(e.target.value);
                  if (e.target.value.trim()) setDuploTombamento(true);
                }}
                placeholder="Ex: 102450 (Plaqueta do Estado)"
                className="w-full p-2.5 font-mono font-bold text-xs rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Implantação Estadual: padrão 6 números</span>
            </div>
          </div>

          {/* Row: Outros Tombos Vinculados (UFC, FCPC, Outros) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-amber-800 dark:text-amber-300 block mb-1">
                Tombo UFC (se houver):
              </label>
              <input
                type="text"
                value={tomboUfc}
                onChange={(e) => setTomboUfc(e.target.value)}
                placeholder="Ex: UFC-0482 ou 38472"
                className="w-full p-2.5 font-mono font-bold text-xs rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Universidade Federal do Ceará</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-purple-800 dark:text-purple-300 block mb-1">
                Tombo FCPC (se houver):
              </label>
              <input
                type="text"
                value={tomboFcpc}
                onChange={(e) => setTomboFcpc(e.target.value)}
                placeholder="Ex: FCPC-1092"
                className="w-full p-2.5 font-mono font-bold text-xs rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Fundação Cearense de Apoio</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Outros Tombos / Retombamentos (Livre):
            </label>
            <input
              type="text"
              value={outrosTombos}
              onChange={(e) => setOutrosTombos(e.target.value)}
              placeholder="Ex: Tombo Municipal 4410, plaqueta anterior..."
              className="w-full p-2.5 font-mono text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Duplo Tombamento & Fora do ASPEC Checkboxes */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={duploTombamento}
                onChange={(e) => setDuploTombamento(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Possui Plaqueta Dupla (Consórcio 4d + SESA 6d)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-amber-800 dark:text-amber-300">
              <input
                type="checkbox"
                checked={foraDoAspec}
                onChange={(e) => setForaDoAspec(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span>Item Fora do ASPEC (Achado em Campo)</span>
            </label>
          </div>

          {/* Categoria Contábil */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Categoria Contábil:
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as any)}
              className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="Equipamentos Médicos & Odontológicos">Equipamentos Médicos & Odontológicos</option>
              <option value="TI & Informática">TI & Informática</option>
              <option value="Mobiliário Hospitalar & Escritório">Mobiliário Hospitalar & Escritório</option>
              <option value="Aparelhos Eletroeletrônicos & Climatização">Aparelhos Eletroeletrônicos & Climatização</option>
              <option value="Veículos & Ambulâncias">Veículos & Ambulâncias</option>
              <option value="Instrumentais & CME">Instrumentais & CME</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Descrição Pormenorizada do Bem:
            </label>
            <input
              type="text"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Cadeira Odontológica Gnatus com Equipo e Refletor LED..."
              className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Unidade e Setor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Unidade:
              </label>
              <select
                value={unidadeId}
                onChange={(e) => setUnidadeId(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
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
                value={setorId}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {availableSectors.map((s, idx) => (
                  <option key={`newasset-sec-${s.id}-${idx}`} value={s.id}>{s.nome} ({s.sigla})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Subsetor / Sala:
              </label>
              <select
                value={subsetorNome}
                onChange={(e) => setSubsetorNome(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {currentSector?.subsetores.map(sub => (
                  <option key={sub.id} value={sub.nome}>{sub.nome}</option>
                )) || <option value="Geral">Setor Geral</option>}
              </select>
            </div>
          </div>

          {/* Estado and Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Estado Físico:
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="Excelente">Excelente (Novo / Em perfeito uso)</option>
                <option value="Bom">Bom (Operacional)</option>
                <option value="Regular">Regular (Desgaste natural)</option>
                <option value="Ocioso">Ocioso (Disponível p/ remanejamento)</option>
                <option value="Inservível / Danificado">Inservível (Danificado / Baixa)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Valor do Bem (R$):
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={valorAquisicao}
                onChange={(e) => setValorAquisicao(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Data do Tombamento:
              </label>
              <input
                type="date"
                required
                value={dataAquisicao}
                onChange={(e) => setDataAquisicao(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Serial number and Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Número de Série / Chassi:
              </label>
              <input
                type="text"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                placeholder="Ex: SN-994120"
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nota Fiscal ou Termo de Cessão:
              </label>
              <input
                type="text"
                value={notaFiscal}
                onChange={(e) => setNotaFiscal(e.target.value)}
                placeholder="NF-e ou Termo SESA nº..."
                className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Observações Patrimoniais / Garantia:
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Equipamento instalado no consultório 03 do CEO, sob garantia técnica até 2027..."
              className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-colors min-h-[44px]"
            >
              Concluir Tombamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
