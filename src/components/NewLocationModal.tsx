import React, { useState } from 'react';
import { Sector, UnitInfo, UserProfile, SubSector } from '../types';
import { 
  X, 
  Building2, 
  MapPin, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Layers, 
  User, 
  Tag, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface NewLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: UnitInfo[];
  onSaveLocation: (newSector: Sector) => void;
  currentProfile: UserProfile;
  defaultUnitId?: string;
}

export const NewLocationModal: React.FC<NewLocationModalProps> = ({
  isOpen,
  onClose,
  units,
  onSaveLocation,
  currentProfile,
  defaultUnitId = 'policlinica',
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(defaultUnitId);
  const [bloco, setBloco] = useState<string>('Bloco A – Ambulatórios & Consultórios');
  const [andar, setAndar] = useState<string>('Térreo');
  const [nome, setNome] = useState<string>('');
  const [sigla, setSigla] = useState<string>('');
  const [responsavelNome, setResponsavelNome] = useState<string>(currentProfile.nome || 'Gestora de Patrimônio');
  const [responsavelCargo, setResponsavelCargo] = useState<string>('Responsável Setorial');
  const [responsavelMatricula, setResponsavelMatricula] = useState<string>('CPSMS-NOV');
  const [subsetores, setSubsetores] = useState<string[]>([]);
  const [newSubsectorInput, setNewSubsectorInput] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUnit = units.find(u => u.id === selectedUnitId) || units[0];

  const handleAddSubsector = () => {
    if (newSubsectorInput.trim()) {
      setSubsetores(prev => [...prev, newSubsectorInput.trim()]);
      setNewSubsectorInput('');
    }
  };

  const handleRemoveSubsector = (index: number) => {
    setSubsetores(prev => prev.filter((_, i) => i !== index));
  };

  // Pre-fill sigla automatically when name changes if sigla wasn't manually typed
  const handleNameChange = (val: string) => {
    setNome(val);
    if (!sigla || sigla.startsWith(currentUnit.sigla.slice(0, 3))) {
      const initials = val
        .split(' ')
        .filter(w => w.length > 2 && !['das', 'dos', 'para', 'com', 'que'].includes(w.toLowerCase()))
        .map(w => w[0].toUpperCase())
        .join('');
      setSigla(`${currentUnit.sigla.slice(0, 4)}-${initials || 'SALA'}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setFeedback('Informe o nome da sala, consultório ou setor.');
      return;
    }

    const subsectorList: SubSector[] = subsetores.map((sub, i) => ({
      id: `sub-${Date.now()}-${i}`,
      nome: sub,
    }));

    const newSector: Sector = {
      id: `sec-custom-${Date.now()}`,
      unidadeId: selectedUnitId,
      unidadeNome: currentUnit.nome,
      nome: nome.trim(),
      sigla: (sigla.trim() || `${currentUnit.sigla.slice(0, 4)}-SALA`).toUpperCase(),
      responsavelNome: responsavelNome.trim() || currentProfile.nome,
      responsavelCargo: responsavelCargo.trim() || 'Responsável Setorial',
      responsavelMatricula: responsavelMatricula.trim() || 'CPSMS-REG',
      bloco: bloco.trim() || 'Prédio Principal',
      andar: andar.trim() || 'Térreo',
      revisada: false,
      subsetores: subsectorList,
    };

    onSaveLocation(newSector);
    onClose();
  };

  // Sugestões de prédios/blocos comuns por unidade
  const blocoSuggestions: Record<string, string[]> = {
    policlinica: [
      'Bloco A – Ambulatórios & Consultórios Médicos',
      'Bloco B – Centro de Diagnóstico por Imagem',
      'Bloco C – Reabilitação & Apoio Técnico',
      'Bloco D – Administrativo & Regulação',
      'Anexo Especializado / Novo Pavimento'
    ],
    ceo: [
      'Ala Clínica Odontológica',
      'CME Odonto – Central de Esterilização',
      'Diagnóstico por Imagem Odontológica',
      'Recepção, Triagem & SAME',
      'Prédio Anexo de Preceptoria e UFC'
    ],
    'sede-cpsms': [
      'Bloco de Governança & Diretoria Executiva',
      'Diretoria Administrativa e Financeira',
      'Almoxarifado Central & Logística de Bens',
      'Núcleo de Tecnologia e Servidores (TI)',
      'Arquivo Geral e Depósito'
    ]
  };

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-mono">
                Cadastro Físico Dinâmico
              </span>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                Cadastrar Nova Localização Física
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {feedback && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 text-xs font-semibold">
              {feedback}
            </div>
          )}

          {/* 1. Escolha da Unidade */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unidade Hospitalar / Gestora:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {units.map(unit => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setSelectedUnitId(unit.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedUnitId === unit.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-200 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase text-slate-500">{unit.sigla}</div>
                  <div className="text-xs truncate font-bold mt-0.5">{unit.nome}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Prédio / Bloco e Pavimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Prédio / Bloco Arquitetônico:
              </label>
              <input
                type="text"
                required
                list="bloco-options"
                value={bloco}
                onChange={(e) => setBloco(e.target.value)}
                placeholder="Ex: Bloco A – Consultórios"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium"
              />
              <datalist id="bloco-options">
                {(blocoSuggestions[selectedUnitId] || []).map((s, idx) => (
                  <option key={idx} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Andar / Pavimento:
              </label>
              <select
                value={andar}
                onChange={(e) => setAndar(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium cursor-pointer"
              >
                <option value="Térreo">Pavimento Térreo</option>
                <option value="1º Andar">1º Andar / Pavimento Superior</option>
                <option value="2º Andar">2º Andar</option>
                <option value="Subsolo / Anexo">Subsolo / Área Externa / Anexo</option>
              </select>
            </div>
          </div>

          {/* 3. Nome da Sala / Consultório e Sigla */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Nome da Nova Sala / Consultório / Setor:</span>
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Consultório 09 – Oftalmologia Especializada"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Sigla no Sistema:
              </label>
              <input
                type="text"
                required
                value={sigla}
                onChange={(e) => setSigla(e.target.value.toUpperCase())}
                placeholder="Ex: POLI-OFT-09"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* 4. Responsável e Matrícula */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" />
                <span>Responsável da Carga:</span>
              </label>
              <input
                type="text"
                required
                value={responsavelNome}
                onChange={(e) => setResponsavelNome(e.target.value)}
                placeholder="Nome do responsável"
                className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Cargo / Função:
              </label>
              <input
                type="text"
                value={responsavelCargo}
                onChange={(e) => setResponsavelCargo(e.target.value)}
                placeholder="Cargo"
                className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Matrícula:
              </label>
              <input
                type="text"
                value={responsavelMatricula}
                onChange={(e) => setResponsavelMatricula(e.target.value)}
                placeholder="Matrícula"
                className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono"
              />
            </div>
          </div>

          {/* 5. Subsetores / Divisões Internas (Opcional) */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Ambientes Internos / Subsetores (Opcional):
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={newSubsectorInput}
                onChange={(e) => setNewSubsectorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubsector();
                  }
                }}
                placeholder="Ex: Sala de Exame, Lavabo Técnico, Depósito Interno..."
                className="flex-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
              />
              <button
                type="button"
                onClick={handleAddSubsector}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {subsetores.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                {subsetores.map((sub, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[11px] font-medium"
                  >
                    <span>{sub}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubsector(idx)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Informação TCE-CE */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Ao salvar, a localização será incorporada imediatamente ao <strong>Mapa das Unidades</strong>, ao cadastro de conferências e à emissão de termos do TCE-CE.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar e Adicionar ao Mapa</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
