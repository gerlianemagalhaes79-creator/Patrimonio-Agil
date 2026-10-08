import React, { useState, useMemo } from 'react';
import { Asset, Sector, UnitInfo, UserProfile } from '../types';
import { formatBRL, formatDate } from '../utils/formatters';
import { executePrintHtml, downloadPrintableHtml } from '../utils/printHelper';
import { 
  Printer, 
  Download, 
  Copy, 
  Check, 
  X, 
  FileText, 
  Building2, 
  Scale, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface DiretoriaContabilidadeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  currentProfile: UserProfile;
  stolenRecord?: {
    itemDescricao: string;
    boNumero: string;
    boDelegacia: string;
    boData: string;
    sindicanciaNumero: string;
    localOcorrencia: string;
  };
}

export const DiretoriaContabilidadeReportModal: React.FC<DiretoriaContabilidadeReportModalProps> = ({
  isOpen,
  onClose,
  assets,
  currentProfile,
}) => {
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Statistics
  const sesaAssets = useMemo(() => assets.filter(a => a.origemTombo.includes('SESA')), [assets]);
  const ufcAssets = useMemo(() => assets.filter(a => a.origemTombo.includes('UFC')), [assets]);
  const ownAssets = useMemo(() => assets.filter(a => a.origemTombo.includes('CPSMS')), [assets]);
  const inserviveis = useMemo(() => assets.filter(a => a.estado === 'Inservível / Danificado' || a.estado === 'Ocioso'), [assets]);

  const totalSesaVal = useMemo(() => sesaAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0), [sesaAssets]);
  const totalUfcVal = useMemo(() => ufcAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0), [ufcAssets]);
  const totalOwnVal = useMemo(() => ownAssets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0), [ownAssets]);
  const totalGeneralVal = useMemo(() => assets.reduce((sum, a) => sum + (a.valorAquisicao || a.valorBrutoContabil || 0), 0), [assets]);

  const now = new Date();
  const currentDateFormatted = now.toLocaleDateString('pt-BR');
  const protocolNumber = `OF-CPSMS/PATR-Nº 01/${now.getFullYear()}`;

  const documentPlainText = `OFÍCIO / RELATÓRIO CIRCUNSTANCIADO DE DIAGNÓSTICO E NOTIFICAÇÃO TÉCNICA Nº 01/${now.getFullYear()}
PROTOCOLADO EM: ${currentDateFormatted}
ORIGEM: Gerência de Patrimônio do CPSMS
DESTINATÁRIAS: 
1. À Senhora Diretora Executiva do CPSMS
2. À Senhora Contadora Geral do CPSMS / Setor Contábil (Sistema ASPEC)

ASSUNTO: RELATÓRIO DE DIAGNÓSTICO INICIAL (MARCO ZERO), ALINHAMENTO CONTÁBIL URGENTE PARA SEGREGAÇÃO E EXCLUSÃO DA DEPRECIAÇÃO DE BENS CEDIDOS PELA SESA E UFC NO SISTEMA ASPEC, REGULARIZAÇÃO DE DUPLO TOMBAMENTO E MEDIDAS SANEADORAS PARA A FISCALIZAÇÃO DO TCE-CE.

Senhora Diretora Executiva e Senhora Contadora Geral,

Na qualidade de Gestora de Patrimônio do Consórcio Público de Saúde da Microrregião de Sobral (CPSMS), designada para atuar na gestão patrimonial da Policlínica Regional Bernardo Félix da Silva, do Centro de Especialidades Odontológicas (CEO Sobral), do CER e da Base Administrativa, venho, pelo presente instrumento oficial, apresentar o DIAGNÓSTICO PRELIMINAR do acervo de bens e submeter para deliberação as providências administrativas e contábeis inadiáveis.

1. DO MARCO ZERO E DO HISTÓRICO DE 13 ANOS SEM COMISSÃO PERMANENTE
Constatou-se que o Consórcio permaneceu por um período aproximado de 13 (treze) anos sem equipe permanente e sem realização de inventários periódicos obrigatórios, em descumprimento ao preconizado nos artigos 94 a 96 da Lei Federal nº 4.320/64.
Fica registrado formalmente que as inconsistências fáticas, ausências documentais e descompassos contábeis pretéritos constituem passivo herdado, iniciando-se a responsabilidade material e funcional da atual Gestora a partir de sua efetiva nomeação e deste ato notificador.

2. DA INCONSISTÊNCIA CONTÁBIL CRÍTICA: BENS DA SESA E UFC NO ASPEC
Constatou-se que equipamentos de elevado valor financeiro pertencentes à Secretaria de Saúde do Estado do Ceará (SESA) e à Universidade Federal do Ceará (UFC), transferidos a este Consórcio por meio de Termos de Cessão de Uso ou Comodato, foram equivocadamente lançados no sistema ASPEC como "Ativo Imobilizado Próprio" (Implantação do Consórcio), estando sujeitos a lançamentos mensais de depreciação contábil remetidos ao TCE-CE.
FUNDAMENTAÇÃO TÉCNICA NORMATIVA:
Conforme o Manual de Contabilidade Aplicada ao Setor Público (MCASP - 10ª edição) e as Normas Brasileiras de Contabilidade Aplicadas ao Setor Público (NBC TSP 07 - Ativo Imobilizado), bens de terceiros sob guarda não integram o patrimônio líquido do consórcio e NÃO PODEM sofrer depreciação por este ente.
- Total de Bens SESA Identificados: ${sesaAssets.length} itens (Valor de Origem: ${formatBRL(totalSesaVal)})
- Total de Bens UFC Identificados: ${ufcAssets.length} itens (Valor de Origem: ${formatBRL(totalUfcVal)})
SOLICITAÇÃO À CONTADORIA:
Determinar a imediata PARALISAÇÃO E ESTORNO da depreciação acumulada indevida sobre esses bens no ASPEC e a respectiva reclassificação para "Contas de Controle / Compensação" (Atos Potenciais Ativos), instruindo a prestação de contas do TCE-CE com Nota Explicativa saneadora.

2.1. DA OCORRÊNCIA DE DUPLO TOMBAMENTO (PADRÃO SESA DE 6 DÍGITOS VS PADRÃO CPSMS DE 4 DÍGITOS):
Identificou-se tecnicamente que os bens próprios do Consórcio CPSMS adotam historicamente a codificação de 4 (quatro) dígitos numéricos, ao passo que os bens transferidos pelo Governo do Estado do Ceará (SESA) possuem plaquetas originais padronizadas de 6 (seis) dígitos. Diversos equipamentos estaduais de 6 dígitos foram indevidamente retombados com plaquetas de 4 dígitos do Consórcio e lançados como implantação própria, gerando duplicidade física na plaqueta e inflação indevida do Ativo Imobilizado no ASPEC.

3. DAS CARGAS FUNCIONAIS EM NOME DE EX-SERVIDORES E RESISTÊNCIA À ASSINATURA
Foram localizados diversos bens cadastrados sob a guarda de servidores já exonerados ou demitidos. Paralelamente, identificou-se pontual resistência de profissionais em assinar os Termos de Fiel Depositário.
SOLICITAÇÃO À DIRETORIA EXECUTIVA:
A expedição de Circular Normativa a todas as chefias e coordenadores de setor da Policlínica, CEO e CER, fixando o dever funcional obrigatório de guarda e assinatura dos termos (Art. 116 da Lei 8.112/90), autorizando a transferência da carga para os atuais ocupantes dos cargos de chefia.

4. DA TRIAGEM DO CEMITÉRIO DE INSERVÍVEIS
Foi detectado volume expressivo de bens ociosos, quebrados e antieconômicos (${inserviveis.length} itens mapeados).
Propõe-se a publicação de laudo da Comissão para abertura de Processo de Desfazimento de Bens (leilão público, doação ou descarte com baixa patrimonial autorizada pelo TCE-CE).

5. DA PUBLICAÇÃO DA PORTARIA DA COMISSÃO DE INVENTÁRIO
Reitera-se a solicitação de publicação de Portaria instituindo a Comissão Especial de Levantamento e Regularização Patrimonial (Gestora + 2 servidores) com cronograma de trabalho sala a sala visando à auditoria do TCE-CE no final deste ano.

Nestes termos, pede-se deferimento e juntada, aguardando-se os despachos da Diretoria Executiva e o protocolo técnico da Contadoria Geral.

Sobral - CE, ${currentDateFormatted}.

__________________________________________________
MARIA GERLIANE ROCHA MAGALHÃES
Gestora de Patrimônio - CPSMS

__________________________________________________
DIRETORIA EXECUTIVA DO CPSMS
[  ] Homologado e Autorizadas as Providências

__________________________________________________
CONTADORA GERAL DO CPSMS (ASPEC)
[  ] Ciente para Adequação Contábil e Notas Explicativas`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(documentPlainText);
    setCopied(true);
    setStatusMsg('Texto completo do relatório copiado para a área de transferência!');
    setTimeout(() => {
      setCopied(false);
      setStatusMsg(null);
    }, 4000);
  };

  const generateStandaloneHtml = (): string => {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Diagnóstico Inicial - Diretoria e Contabilidade - CPSMS</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif; color: #0f172a; line-height: 1.6; padding: 25px; margin: 0; background: #fff; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; font-family: Georgia, serif; }
    .gov { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #334155; }
    .org { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 3px; }
    .unit { font-size: 11px; color: #475569; }
    .title-box { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 4px; text-align: center; font-weight: 900; font-size: 13px; text-transform: uppercase; margin: 15px 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; margin-bottom: 16px; font-family: sans-serif; }
    h3 { font-size: 12px; font-weight: 900; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 18px; margin-bottom: 8px; font-family: sans-serif; }
    p { font-size: 11px; text-align: justify; margin: 6px 0; }
    .highlight-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 12px; margin: 10px 0; font-size: 11px; }
    .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 8px 12px; margin: 10px 0; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 10px 0; font-family: sans-serif; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-weight: bold; }
    td { border: 1px solid #e2e8f0; padding: 5px 8px; }
    .signatures { margin-top: 40px; page-break-inside: avoid; font-family: sans-serif; }
    .sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; font-size: 10px; }
    .sig-line { border-bottom: 1px solid #0f172a; margin-bottom: 6px; padding-bottom: 35px; }
    .no-print { margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end; }
    .btn { background: #10b981; color: #0f172a; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 12px; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  </div>

  <div class="header">
    <div class="gov">ESTADO DO CEARÁ · GOVERNO DO ESTADO DO CEARÁ</div>
    <div class="org">CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS</div>
    <div class="unit">POLICLÍNICA REGIONAL BERNARDO FÉLIX DA SILVA & CEO REGIONAL SOBRAL</div>
    <div style="font-size:10px;font-weight:bold;color:#64748b;text-transform:uppercase;margin-top:2px;">
      GERÊNCIA DE PATRIMÔNIO · CONTROLE INTERNO
    </div>
  </div>

  <div class="title-box">
    OFÍCIO CIRCUNSTANCIADO DE DIAGNÓSTICO INICIAL (MARCO ZERO) E NOTIFICAÇÃO TÉCNICA Nº 01/${now.getFullYear()}
  </div>

  <div class="meta-grid">
    <div><strong>Origem:</strong> Gerência de Patrimônio (CPSMS)</div>
    <div><strong>Data de Protocolo:</strong> ${currentDateFormatted}</div>
    <div><strong>Destinatária 1:</strong> Diretora Executiva do Consórcio Público CPSMS</div>
    <div><strong>Destinatária 2:</strong> Contadora Geral do CPSMS / Setor Contábil (ASPEC)</div>
    <div style="grid-column: span 2;">
      <strong>Assunto:</strong> Diagnóstico do Passivo Histórico (13 Anos), Segregação e Paralisação da Depreciação de Bens SESA/UFC no ASPEC, Regularização de Duplo Tombamento e Providências para o TCE-CE.
    </div>
  </div>

  <p><strong>Prezada Diretora Executiva e Prezada Contadora Geral,</strong></p>

  <p>
    Na qualidade de Gestora de Patrimônio recém-designada para atuar junto ao Consórcio Público de Saúde da Microrregião de Sobral (CPSMS), gerindo os ativos da Policlínica Regional Bernardo Félix da Silva, do Centro de Especialidades Odontológicas (CEO Sobral), do CER e da Base Administrativa, apresento este <strong>Relatório Circunstanciado de Diagnóstico Inicial e Notificação Técnica</strong> para formalizar o estado em que o patrimônio foi encontrado e requerer as medidas legais cabíveis.
  </p>

  <h3>1. Do Marco Zero e do Histórico de 13 Anos sem Equipe de Patrimônio</h3>
  <p>
    Constatou-se que este Consórcio permaneceu por aproximadamente 13 (treze) anos sem equipe de patrimônio instituída e sem inventários físicos periódicos anuais, em desacordo com as exigências dos artigos 94 a 96 da Lei Federal nº 4.320/1964. Fica formalmente consignado que as inconsistências fáticas, extravios antigos e descompassos contábeis pretéritos são anteriores à atual gestão, servindo o presente ofício como marco inicial e delimitador da responsabilidade pessoal da nova Gestora.
  </p>

  <h3>2. Da Inconsistência Contábil Grave: Bens SESA e UFC Sendo Depreciados no ASPEC</h3>
  <div class="highlight-box">
    <strong>ALINHAMENTO TÉCNICO NORMATIVO (MCASP / NBC TSP 07 / TCE-CE):</strong><br />
    Equipamentos cedidos pelo Estado do Ceará (SESA) e pela Universidade Federal do Ceará (UFC) sob termo de cessão/comodato foram indevidamente cadastrados no sistema ASPEC como patrimônio próprio ("Implantação") e vêm sofrendo depreciação mensal automática remetida ao Tribunal de Contas.
  </div>
  <p>
    Nos termos expressos do Manual de Contabilidade Aplicada ao Setor Público (MCASP) e da NBC TSP 07 (Ativo Imobilizado), <strong>bens de terceiros sob guarda não integram o ativo próprio e NÃO PODEM ser depreciados pelo Consórcio</strong>.
  </p>
  <p>
    <strong>Solicitação Formal à Contadoria:</strong> Promover a <u>paralisação e estorno imediato da depreciação contábil mensal</u> desses bens no sistema ASPEC e sua reclassificação para Contas de Controle/Compensação (Atos Potenciais Ativos), instruindo a prestação de contas com Nota Explicativa saneadora.
  </p>

  <div class="highlight-box" style="margin-top:10px;">
    <strong>2.1. Da Ocorrência de Duplo Tombamento (Padrão SESA de 6 Dígitos vs Padrão CPSMS de 4 Dígitos):</strong><br />
    Identificou-se tecnicamente que os bens próprios do Consórcio CPSMS adotam a codificação de 4 dígitos, ao passo que os bens transferidos pelo Governo do Estado do Ceará (SESA) possuem plaquetas originais padronizadas de 6 dígitos. Diversos equipamentos estaduais de 6 dígitos foram indevidamente retombados com plaquetas de 4 dígitos do Consórcio e lançados como implantação própria, gerando duplicidade física na plaqueta e inflação indevida do Ativo Imobilizado no ASPEC.
  </div>

  <table>
    <thead>
      <tr>
        <th>Origem do Tombo / Ente Cedente</th>
        <th style="text-align:center;">Quantidade de Bens</th>
        <th style="text-align:right;">Valor Histórico Lançado</th>
        <th>Tratamento Contábil Legal Exigido</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>SESA (Governo do Estado do Ceará - Cessão)</strong></td>
        <td style="text-align:center;">${sesaAssets.length} bens</td>
        <td style="text-align:right;">${formatBRL(totalSesaVal)}</td>
        <td>Conta de Compensação / Sem Depreciação no CPSMS</td>
      </tr>
      <tr>
        <td><strong>UFC (Universidade Federal do Ceará)</strong></td>
        <td style="text-align:center;">${ufcAssets.length} bens</td>
        <td style="text-align:right;">${formatBRL(totalUfcVal)}</td>
        <td>Conta de Compensação / Sem Depreciação no CPSMS</td>
      </tr>
      <tr>
        <td><strong>CPSMS (Próprio do Consórcio Público)</strong></td>
        <td style="text-align:center;">${ownAssets.length} bens</td>
        <td style="text-align:right;">${formatBRL(totalOwnVal)}</td>
        <td>Ativo Imobilizado Próprio (Sujeito à Depreciação)</td>
      </tr>
      <tr style="background:#f8fafc;font-weight:bold;">
        <td>TOTAL GERAL CONSOLIDADO</td>
        <td style="text-align:center;">${assets.length} bens</td>
        <td style="text-align:right;">${formatBRL(totalGeneralVal)}</td>
        <td>Segregação exigida pelo TCE-CE</td>
      </tr>
    </tbody>
  </table>

  <h3>3. Das Cargas em Nome de Servidores Desligados e Regularização de Trocas</h3>
  <p>
    Constatou-se que dezenas de equipamentos continuam vinculados no sistema a servidores já exonerados ou demitidos. Paralelamente, trocas informais entre salas ocorrem sem prévio termo de transferência. Solicita-se a expedição de <strong>Circular Normativa da Diretoria</strong> obrigando os atuais coordenadores de setor a assinarem os Termos de Fiel Depositário e proibindo a movimentação física de bens sem autorização prévia da Gestora.
  </p>

  <h3>4. Do Levantamento do "Cemitério de Inservíveis"</h3>
  <p>
    Foram identificados <strong>${inserviveis.length} bens danificados, obsoletos ou irrecuperáveis</strong> acumulados em depósitos. Propõe-se a emissão do Laudo Técnico de Inservibilidade para abertura de Processo de Desfazimento (leilão ou descarte ecológico) com baixa contábil aprovada junto ao TCE-CE.
  </p>

  <h3>5. Da Solicitação de Publicação da Portaria da Comissão Especial de Inventário</h3>
  <p>
    Requer-se a edição e publicação de Portaria formal designando a Comissão Especial de Inventário (Gestora de Patrimônio e dois servidores de apoio) para respaldar o cronograma de vistorias até a fiscalização final do Tribunal de Contas.
  </p>

  <div class="signatures">
    <div class="sig-grid">
      <div>
        <div class="sig-line"></div>
        <strong>MARIA GERLIANE ROCHA MAGALHÃES</strong><br />
        Gestora de Patrimônio<br />
        CPSMS
      </div>
      <div>
        <div class="sig-line"></div>
        <strong>DIRETORIA EXECUTIVA DO CPSMS</strong><br />
        [  ] Ciente e Homologado<br />
        Autorizo as Providências Administrativas
      </div>
      <div>
        <div class="sig-line"></div>
        <strong>CONTADORA GERAL DO CPSMS</strong><br />
        [  ] Ciente para Ajustes no ASPEC<br />
        Reclassificação e Notas Explicativas
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    const html = generateStandaloneHtml();
    executePrintHtml({
      title: 'Relatório de Diagnóstico Inicial - CPSMS',
      html,
      filename: `laudo_notificacao_diretoria_contabilidade_${new Date().toISOString().slice(0, 10)}.html`,
      onStatus: (status) => {
        if (status) {
          setStatusMsg(status.message);
          setTimeout(() => setStatusMsg(null), 5000);
        }
      }
    });
  };

  const handleDownloadHtml = () => {
    const html = generateStandaloneHtml();
    downloadPrintableHtml(`laudo_notificacao_diretoria_contabilidade_${new Date().toISOString().slice(0, 10)}.html`, html);
    setStatusMsg('Arquivo HTML oficial baixado com sucesso! Pronto para abrir e imprimir no Chrome ou Edge.');
    setTimeout(() => setStatusMsg(null), 5000);
  };

  if (!isOpen) return null;

  return (
    <div className="printable-modal-overlay fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
      <div className="printable-modal-card bg-white dark:bg-slate-900 text-slate-950 dark:text-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[96vh] flex flex-col border border-slate-200 dark:border-slate-800 my-auto">
        
        {/* Top Control Bar (Screen only - HIDDEN IN PRINT) */}
        <div className="no-print p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 rounded-t-2xl space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Ofício de Notificação: Diretora & Contadora</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-300">
                    Fase 1 · Marco Zero
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Documento formal para blindar a Gestora e requerer as providências no ASPEC e na Polícia Civil.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer min-h-[40px]"
                title="Copiar texto para colar em e-mail ou sistema de processo"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded-lg transition-colors cursor-pointer min-h-[40px]"
              >
                <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Baixar HTML p/ Imprimir</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 rounded-lg shadow-md transition-all cursor-pointer min-h-[40px]"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Salvar PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {statusMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-xs font-medium border border-emerald-300 flex items-center justify-between">
              <span>{statusMsg}</span>
              <button onClick={() => setStatusMsg(null)} className="text-emerald-700">✕</button>
            </div>
          )}
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="printable-report-scroll-container overflow-y-auto p-4 sm:p-8 space-y-6 flex-1 bg-white text-slate-950 font-sans">
          <div className="max-w-4xl mx-auto space-y-6 text-slate-950 font-serif leading-relaxed text-sm">
            
            {/* Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
                ESTADO DO CEARÁ · GOVERNO DO ESTADO DO CEARÁ
              </div>
              <div className="text-base font-black uppercase text-slate-950">
                CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS
              </div>
              <div className="text-xs text-slate-700 font-medium">
                POLICLÍNICA REGIONAL BERNARDO FÉLIX DA SILVA & CEO REGIONAL SOBRAL
              </div>
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pt-1">
                GERÊNCIA DE PATRIMÔNIO · CONTROLE INTERNO
              </div>
            </div>

            {/* Document Title & Protocol */}
            <div className="bg-slate-100 p-3 rounded border border-slate-300 text-center font-sans">
              <div className="text-sm font-black uppercase text-slate-900">
                RELATÓRIO CIRCUNSTANCIADO DE DIAGNÓSTICO INICIAL (MARCO ZERO) E NOTIFICAÇÃO TÉCNICA
              </div>
              <div className="text-xs text-slate-600 font-mono mt-0.5">
                Protocolo: {protocolNumber} · Emissão: {currentDateFormatted}
              </div>
            </div>

            {/* Recipients Info Box */}
            <div className="bg-slate-50 border border-slate-300 rounded p-3 text-xs font-sans space-y-1.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block uppercase text-[10px] font-bold">Destinatária 1:</span>
                  <strong className="text-slate-900 text-xs">À Senhora Diretora Executiva do CPSMS</strong>
                  <span className="text-slate-500 block text-[11px]">Gestão Regional de Saúde de Sobral</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px] font-bold">Destinatária 2:</span>
                  <strong className="text-slate-900 text-xs">À Senhora Contadora Geral do CPSMS / Setor Contábil</strong>
                  <span className="text-slate-500 block text-[11px]">Responsável Técnica pelo Sistema ASPEC</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-slate-200">
                <span className="text-slate-500 block uppercase text-[10px] font-bold">Assunto:</span>
                <span className="text-slate-900 font-medium text-xs leading-snug block">
                  Notificação de Achados de Gestão Patrimonial, Passivo Histórico de 13 Anos, Paralisação da Depreciação de Bens da SESA e da UFC no ASPEC, Regularização de Duplo Tombamento e Providências para o TCE-CE.
                </span>
              </div>
            </div>

            {/* Section 1 */}
            <div className="space-y-2 text-xs sm:text-sm">
              <h3 className="font-bold font-sans uppercase text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5 text-xs">
                <span>1. Do Histórico de 13 Anos e Delimitação da Responsabilidade da Gestora (Marco Zero)</span>
              </h3>
              <p className="text-justify leading-relaxed">
                Comunica-se formalmente que, ao assumir a titularidade da Gerência de Patrimônio do CPSMS, constatou-se que o Consórcio permaneceu por um lapso temporal de aproximadamente <strong>13 (treze) anos desprovido de equipe permanente de patrimônio</strong> e sem a realização periódica de inventários físicos gerais de conciliação contábil, contrariando as exigências expressas dos artigos 94 a 96 da Lei Federal nº 4.320/1964 e das normas do Tribunal de Contas do Estado do Ceará (TCE-CE).
              </p>
              <p className="text-justify leading-relaxed">
                Fica expressamente consignado que as inconsistências fáticas, extravios pretéritos e distorções contábeis apuradas constituem passivo herdado, <strong>iniciando-se a responsabilidade material e funcional da atual Gestora a partir de sua efetiva posse</strong> e da apresentação deste plano saneador.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-2 text-xs sm:text-sm">
              <h3 className="font-bold font-sans uppercase text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5 text-xs text-blue-900">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>2. Da Inconsistência Contábil Grave: Bens SESA e UFC Sendo Depreciados no ASPEC</span>
              </h3>
              <p className="text-justify leading-relaxed">
                Identificou-se que bens móveis e equipamentos clínicos cedidos a este Consórcio pelo Estado do Ceará (Secretaria de Saúde - SESA) e pela Universidade Federal do Ceará (UFC), sob a forma de <strong>Termos de Cessão de Uso ou Comodato</strong>, foram cadastrados no sistema contábil ASPEC como patrimônio de "Implantação/Ativo Próprio", estando a Contadoria a efetuar <strong>depreciação mensal indevida</strong> que vem sendo informada nas prestações de contas ao TCE-CE.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-600 p-3 rounded text-xs font-sans text-blue-950 space-y-1">
                <div className="font-bold">FUNDAMENTAÇÃO LEGAL (MCASP / NBC TSP 07 / TCE-CE):</div>
                <p className="text-[11px] leading-relaxed">
                  Conforme preceituam o <em>Manual de Contabilidade Aplicada ao Setor Público (MCASP - 10ª edição)</em> e a <em>Norma Brasileira de Contabilidade NBC TSP 07</em>, bens recebidos em cessão de uso/comodato não transferem a titularidade ao consórcio e continuam sob a propriedade do ente cedente (Estado/UFC). Logo, <strong>não podem compor o Ativo Imobilizado Próprio do consórcio nem sofrer depreciação por este ente</strong>.
                </p>
              </div>
              <p className="text-justify leading-relaxed">
                <strong>Solicitação Formal à Contadora Geral:</strong> Determinar a <u>paralisação imediata dos lançamentos mensais de depreciação desses bens no ASPEC</u> e sua reclassificação contábil para <em>Contas de Controle / Compensação (Atos Potenciais Ativos — Bens de Terceiros sob Guarda)</em>, elaborando a competente Nota Explicativa para fins de envio ao TCE-CE.
              </p>

              {/* Synthetic Table */}
              <table className="w-full text-left border-collapse text-xs border border-slate-300 font-sans mt-2">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                    <th className="p-2">Origem do Tombo / Ente Cedente</th>
                    <th className="p-2 text-center">Quantidade</th>
                    <th className="p-2 text-right">Valor Histórico</th>
                    <th className="p-2">Classificação Contábil Legal Correta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2 font-semibold">SESA (Governo do Estado do Ceará - Cessão)</td>
                    <td className="p-2 text-center font-bold">{sesaAssets.length} bens</td>
                    <td className="p-2 text-right font-mono font-bold">{formatBRL(totalSesaVal)}</td>
                    <td className="p-2 text-blue-900 font-semibold">Conta de Compensação / Sem Depreciação no CPSMS</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">UFC (Universidade Federal do Ceará)</td>
                    <td className="p-2 text-center font-bold">{ufcAssets.length} bens</td>
                    <td className="p-2 text-right font-mono font-bold">{formatBRL(totalUfcVal)}</td>
                    <td className="p-2 text-amber-900 font-semibold">Conta de Compensação / Sem Depreciação no CPSMS</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">CPSMS (Bens Próprios do Consórcio)</td>
                    <td className="p-2 text-center font-bold">{ownAssets.length} bens</td>
                    <td className="p-2 text-right font-mono font-bold">{formatBRL(totalOwnVal)}</td>
                    <td className="p-2 text-emerald-900 font-semibold">Ativo Imobilizado Próprio (Sujeito à Depreciação)</td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded text-xs font-sans text-amber-950 space-y-1 mt-2">
                <div className="font-bold">2.1. DA OCORRÊNCIA DE DUPLO TOMBAMENTO (PADRÃO SESA DE 6 DÍGITOS VS PADRÃO CPSMS DE 4 DÍGITOS):</div>
                <p className="text-[11px] leading-relaxed">
                  Identificou-se tecnicamente que os bens próprios do Consórcio CPSMS adotam a numeração de <strong>4 (quatro) dígitos</strong>, enquanto os bens cedidos pelo Governo do Estado (SESA) possuem plaqueta de origem padronizada com <strong>6 (seis) dígitos</strong>. Diversos equipamentos estaduais com tombamento de 6 dígitos receberam indevidamente uma nova plaqueta de 4 dígitos do Consórcio e foram inseridos no ASPEC como bens de implantação própria, gerando duplicidade física na plaqueta e inflação indevida no Ativo Imobilizado.
                </p>
              </div>
            </div>

            {/* Section 3, 4 & 5 */}
            <div className="space-y-2 text-xs sm:text-sm">
              <h3 className="font-bold font-sans uppercase text-slate-900 border-b border-slate-200 pb-1 text-xs">
                3. Das Cargas em Nome de Servidores Desligados e Regularização de Trocas
              </h3>
              <p className="text-justify leading-relaxed">
                Verificou-se que diversos bens ainda figuram sob a responsabilidade de ex-servidores demitidos ou exonerados, bem como a ocorrência de trocas informais entre salas. Solicita-se à Diretoria Executiva a expedição de <strong>Circular Normativa aos Coordenadores de Setor</strong>, determinando o dever funcional de guarda e assinatura compulsória dos Termos de Fiel Depositário (Art. 116 da Lei 8.112/90), sob pena de responsabilização administrativa.
              </p>

              <h3 className="font-bold font-sans uppercase text-slate-900 border-b border-slate-200 pb-1 text-xs pt-2">
                4. Do Levantamento de Inservíveis e Processo de Desfazimento
              </h3>
              <p className="text-justify leading-relaxed">
                Foram mapeados <strong>{inserviveis.length} bens danificados, obsoletos ou antieconômicos</strong>. Propõe-se a publicação formal do Laudo Técnico de Inservibilidade para instruir o processo de desfazimento regular (leilão ou descarte ecológico com baixa patrimonial autorizada pelo TCE-CE).
              </p>

              <h3 className="font-bold font-sans uppercase text-slate-900 border-b border-slate-200 pb-1 text-xs pt-2">
                5. Da Publicação da Portaria da Comissão Especial de Inventário
              </h3>
              <p className="text-justify leading-relaxed">
                Reitera-se a solicitação de publicação de Portaria formal instituindo a Comissão Especial de Inventário (Gestora + 2 servidores) para respaldar o cronograma de conferência sala a sala até o final do ano.
              </p>
            </div>

            {/* Signatures & Despachos */}
            <div className="pt-6 space-y-8 font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="border-b border-slate-900 pb-10 w-4/5 mx-auto" />
                  <div className="font-bold text-slate-950 pt-1.5">{currentProfile.nome}</div>
                  <div className="text-[10px] text-slate-600">Gestora de Patrimônio</div>
                </div>

                <div>
                  <div className="border-b border-slate-900 pb-10 w-4/5 mx-auto" />
                  <div className="font-bold text-slate-950 pt-1.5">Diretoria Executiva do CPSMS</div>
                  <div className="text-[10px] text-slate-600">[  ] Homologado e Autorizado</div>
                  <div className="text-[9px] text-slate-400 font-mono">Despacho Administrativo</div>
                </div>

                <div>
                  <div className="border-b border-slate-900 pb-10 w-4/5 mx-auto" />
                  <div className="font-bold text-slate-950 pt-1.5">Contadora Geral do CPSMS</div>
                  <div className="text-[10px] text-slate-600">[  ] Ciente para Ajustes no ASPEC</div>
                  <div className="text-[9px] text-slate-400 font-mono">Setor Contábil / Protocolo</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions (Screen only - HIDDEN IN PRINT) */}
        <div className="no-print p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl shrink-0">
          <div className="text-xs text-slate-500">
            Dica: você pode imprimir este laudo ou salvar em PDF para anexar ao processo de sindicância e enviar à contabilidade.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 rounded-lg cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-900 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 rounded-lg cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo HTML</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 rounded-lg shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
