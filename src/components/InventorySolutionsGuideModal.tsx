import React from 'react';
import { 
  X, 
  Lightbulb, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft, 
  PlusCircle, 
  Sparkles, 
  ShieldCheck, 
  HelpCircle,
  FileSpreadsheet,
  Printer
} from 'lucide-react';

interface InventorySolutionsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAspecReconciliation?: () => void;
}

export const InventorySolutionsGuideModal: React.FC<InventorySolutionsGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenAspecReconciliation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Guia de Soluções para o Inventário</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                  Modo Diagnóstico Seguro
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                O que fazer quando faltam tombos ou aparecem bens de outros setores durante a conferência.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-850 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
          
          {/* Reassurance Banner */}
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
            <div className="flex items-center gap-2 font-black text-emerald-900 dark:text-emerald-200 text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Garantia de Segurança: Nada será alterado ou apagado no sistema agora!</span>
            </div>
            <p className="text-xs text-emerald-950 dark:text-emerald-300 leading-relaxed">
              Fique 100% tranquila: enquanto você faz a vistoria física, <strong>o cadastro original do ASPEC fica totalmente preservado e intacto</strong>. O sistema funciona como uma <em>camada de diagnóstico em tempo real</em>. Suas anotações servem apenas para montar o espelho de conferência, para que você saiba exatamente o que fazer no ASPEC no momento certo.
            </p>
          </div>

          {/* Por que isso acontece em quase todos os setores? */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              <span>Por que praticamente todos os setores apresentam essas divergências?</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Em policlínicas, centros odontológicos e consórcios públicos de saúde, a rotina diária é muito dinâmica:
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside pl-1">
              <li>Profissionais trocam computadores, impressoras, mesas e cadeiras entre salas conforme a necessidade do serviço.</li>
              <li>Muitas dessas movimentações ocorrem <strong>sem aviso prévio ao setor de patrimônio</strong> e sem emissão de termo formal no ASPEC.</li>
              <li>O relatório do ASPEC mostra onde o bem foi cadastrado no passado; a vistoria física mostra onde ele está hoje.</li>
            </ul>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 pt-1">
              👉 Conclusão: Essas divergências não são um erro seu! Descobrir essas migrações é o propósito principal do inventário.
            </p>
          </div>

          {/* Soluções Práticas Passo a Passo */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
              As 3 Soluções Práticas para o seu Inventário
            </h4>

            {/* Caso 1: O bem constava no documento mas NÃO está na sala */}
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Caso 1: O bem constava no papel, mas você não encontrou na sala (Tombo Faltante)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 text-[10px] font-bold">
                  Em Apuração
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                <strong>O que fazer no sistema agora:</strong> Clique no botão <em>"Não Encontrado nesta Sala"</em>. O item NÃO será excluído do sistema. Ele apenas fica com o status de "Em Apuração".
              </p>
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-rose-200 dark:border-rose-900 text-xs text-rose-950 dark:text-rose-200">
                <strong>O que alterar no ASPEC depois:</strong> <u>NÃO dê baixa contábil de imediato!</u> Em mais de 80% dos casos, esse bem foi levado para outra sala (ex: foi para a Recepção, Manutenção ou Coordenação) e você vai encontrá-lo nas próximas salas. Somente se nenhuma sala tiver o bem após o inventário geral é que se abre processo formal de apuração.
              </div>
            </div>

            {/* Caso 2: Você encontrou um bem na sala que NÃO constava no documento */}
            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-amber-600 shrink-0" />
                  Caso 2: Você achou na sala um tombo que NÃO constava no documento daquela sala
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                  Remanejamento
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                <strong>O que fazer no sistema agora:</strong> Na tela da sala, use o campo <em>"Encontrou um bem nesta sala que NÃO estava no documento?"</em> e digite o número da plaqueta. O sistema informará:
                <br />
                <span className="text-amber-800 dark:text-amber-300 font-mono font-semibold">"Tombo 1234: cadastrado no ASPEC em [Recepção]. Deseja registrar que ele está nesta sala?"</span>
                <br />
                Basta clicar em <strong>"Registrar Presença Nesta Sala"</strong>. O cadastro original permanece seguro e o sistema cria a conexão!
              </p>
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-amber-200 dark:border-amber-900 text-xs text-amber-950 dark:text-amber-200">
                <strong>O que alterar no ASPEC depois:</strong> Ação simples no ASPEC: <u>Transferência Interna de Carga</u>. O bem continua no patrimônio do Consórcio, apenas mudando a sala de lotação para refletir a realidade.
              </div>
            </div>

            {/* Caso 3: Casamentos Cruzados (Faltava em A, Achado em B) */}
            <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                  Caso 3: O Casamento Cruzado Automático
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 text-[10px] font-bold">
                  Alívio Imediato
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Quando você marca um bem como ausente na Sala A, e depois o encontra na Sala B, o sistema realiza um <strong>"Casamento Cruzado"</strong>.
                Ele avisa na hora: <em>"O bem que faltava na Sala A foi encontrado na Sala B! Não há perda de patrimônio."</em>
              </p>
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-purple-200 dark:border-purple-900 text-xs text-purple-950 dark:text-purple-200">
                <strong>O que alterar no ASPEC:</strong> Basta uma única transferência no ASPEC da Sala A para a Sala B.
              </div>
            </div>

            {/* Caso 4: Bem sem plaqueta ou com placa antiga SESA não cadastrada */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  Caso 4: Bem físico encontrado sem tombo ou placa SESA não lançada no ASPEC
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[10px] font-bold">
                  Inclusão Nova
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                <strong>O que fazer no sistema agora:</strong> Clique em <em>"+ Cadastrar Fora do ASPEC"</em>. Você anota a descrição e o local onde ele está.
              </p>
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-950 dark:text-emerald-200">
                <strong>O que alterar no ASPEC depois:</strong> Ação no ASPEC: <u>Incorporação / Tombamento de Bem Existente</u> ou registro nas contas de compensação se for cessão estadual da SESA.
              </div>
            </div>
          </div>

          {/* Roteiro Final para a Contadora */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
            <h4 className="font-bold flex items-center gap-2 text-amber-300">
              <Printer className="w-4 h-4" />
              <span>Como você visualiza tudo isso para sentar com a contadora?</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Você não precisa anotar nada em papéis soltos nem se preocupar em lembrar o que viu em cada sala. Basta clicar no botão dourado <strong>"O Que Alterar no ASPEC"</strong>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                <span className="font-bold text-amber-300 block">🖨️ Espelho em Folha A4:</span>
                Gera um relatório oficial diagramado com as 3 colunas (Onde estava no ASPEC ➔ Onde foi achado ➔ Ação exata a fazer no ASPEC), com espaço para assinaturas da Gestora de Patrimônio e da Contadora.
              </div>
              <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                <span className="font-bold text-emerald-300 block">📊 Planilha Excel / CSV:</span>
                Exporta os dados organizados por tombo, descrição e sala para facilitar a digitação em lote no sistema ASPEC.
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Você está segura: faça o inventário sala por sala e deixe o sistema organizar as divergências.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Entendi, Fechar Guia
            </button>

            {onOpenAspecReconciliation && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAspecReconciliation();
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg cursor-pointer shadow-xs"
              >
                <ArrowRightLeft className="w-4 h-4 text-slate-950" />
                <span>Visualizar O Que Alterar no ASPEC Agora</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
