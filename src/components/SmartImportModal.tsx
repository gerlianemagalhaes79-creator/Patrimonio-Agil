import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Asset, Sector, UnitInfo, TomboOrigin, AssetCategory, AssetCondition } from '../types';
import { parseCurrencyValue, formatBRL } from '../utils/formatters';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  ArrowRight, 
  AlertTriangle, 
  X, 
  Sparkles, 
  ClipboardCopy, 
  Table, 
  Building2,
  FileCheck,
  FolderOpen,
  Eye,
  HelpCircle,
  RefreshCw,
  Tag,
  DollarSign,
  Calendar,
  Layers,
  MapPin,
  UserCheck,
  Package
} from 'lucide-react';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: UnitInfo[];
  sectors: Sector[];
  onImportCompleted: (importedAssets: Asset[], mode?: 'update' | 'replace') => void;
  existingCount?: number;
}

interface ColumnMapping {
  tombamento: string; // Número do Tombo
  descricao: string; // Nome do Patrimônio / Item (ex: Fogão, Cadeira, etc.)
  dataTombamento: string; // Data de Tombamento
  dataAquisicao: string; // Data de Aquisição
  formaAquisicao: string; // Forma de Aquisição (Compra, Doação, etc.)
  valor: string; // Valor do Bem (R$)
  notaFiscal: string; // NF caso tenha
  estado: string; // Estado de Conservação
  origemRecurso: string; // Origem do Recurso
  origemTombo: string; // Origem do Tombo (CPSMS / SESA / UFC)
  fornecedor: string; // Fornecedor / Cedente
  orgao: string; // Órgão
  area: string; // Área / Setor
  subarea: string; // Subárea / Sala
  responsavel: string; // Responsável
  categoria: string; // Categoria
  numeroSerie: string; // Número de Série
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({
  isOpen,
  onClose,
  units,
  sectors,
  onImportCompleted,
  existingCount = 0,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [csvRawData, setCsvRawData] = useState<any[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [sheetsList, setSheetsList] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawWorkbook, setRawWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [detectedRawRows, setDetectedRawRows] = useState<any[][]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Import mode
  const [importMode, setImportMode] = useState<'update' | 'replace'>(existingCount > 0 ? 'update' : 'replace');
  const [showConfirmMissingDialog, setShowConfirmMissingDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const anyFileInputRef = useRef<HTMLInputElement>(null);

  const [mapping, setMapping] = useState<ColumnMapping>({
    tombamento: '',
    descricao: '',
    dataTombamento: '',
    dataAquisicao: '',
    formaAquisicao: '',
    valor: '',
    notaFiscal: '',
    estado: '',
    origemRecurso: '',
    origemTombo: '',
    fornecedor: '',
    orgao: '',
    area: '',
    subarea: '',
    responsavel: '',
    categoria: '',
    numeroSerie: '',
  });

  const [defaultUnitId, setDefaultUnitId] = useState<string>('policlinica');
  const [defaultTomboOrigin, setDefaultTomboOrigin] = useState<TomboOrigin>('CPSMS (Próprio do Consórcio)');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState<{
    total: number;
    policlinica: number;
    ceo: number;
    sede: number;
    sesa: number;
    cpsms: number;
    ufc: number;
  } | null>(null);

  if (!isOpen) return null;

  const normalizeHeader = (str: string) => {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  /**
   * Prioritized multi-pass column matcher
   */
  const findBestColumn = (
    headers: string[],
    dataRows: any[],
    rules: {
      exact: string[];
      partial: string[];
      exclude?: string[];
      type?: 'text' | 'number';
    }
  ): string => {
    const normHeaders = headers.map(h => ({ raw: h, norm: normalizeHeader(h) }));
    const normExclude = (rules.exclude || []).map(e => normalizeHeader(e));

    // Pass 1: Exact normalized equality
    for (const kw of rules.exact) {
      const normKw = normalizeHeader(kw);
      for (const item of normHeaders) {
        if (normExclude.some(ex => item.norm.includes(ex))) continue;
        if (item.norm === normKw) {
          return item.raw;
        }
      }
    }

    // Pass 2: Word boundary or starts-with
    for (const kw of rules.exact) {
      const normKw = normalizeHeader(kw);
      for (const item of normHeaders) {
        if (normExclude.some(ex => item.norm.includes(ex))) continue;
        const words = item.norm.split(' ');
        if (item.norm.startsWith(normKw) || words.includes(normKw) || item.norm.includes(normKw)) {
          return item.raw;
        }
      }
    }

    // Pass 3: Partial substring match
    for (const kw of rules.partial) {
      const normKw = normalizeHeader(kw);
      for (const item of normHeaders) {
        if (normExclude.some(ex => item.norm.includes(ex))) continue;
        if (item.norm.includes(normKw)) {
          return item.raw;
        }
      }
    }

    // Pass 4: Content heuristic for numbers / currency
    if (rules.type === 'number' && dataRows.length > 0) {
      let bestNumCol = '';
      let maxNumMatches = 0;
      for (const item of normHeaders) {
        if (normExclude.some(ex => item.norm.includes(ex))) continue;
        let count = 0;
        const limit = Math.min(dataRows.length, 12);
        for (let i = 0; i < limit; i++) {
          const val = dataRows[i]?.[item.raw];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            const parsed = parseCurrencyValue(val);
            if (parsed > 0) count++;
          }
        }
        if (count > maxNumMatches && count >= 2) {
          maxNumMatches = count;
          bestNumCol = item.raw;
        }
      }
      if (bestNumCol) return bestNumCol;
    }

    // Pass 5: Content heuristic for long text (description/item name)
    if (rules.type === 'text' && dataRows.length > 0) {
      let bestTextCol = '';
      let maxAvgLength = 0;
      for (const item of normHeaders) {
        if (normExclude.some(ex => item.norm.includes(ex))) continue;
        let totalLen = 0;
        let nonNumeric = 0;
        const limit = Math.min(dataRows.length, 12);
        for (let i = 0; i < limit; i++) {
          const val = String(dataRows[i]?.[item.raw] || '').trim();
          if (val.length > 3 && isNaN(Number(val)) && !val.includes('http')) {
            totalLen += val.length;
            nonNumeric++;
          }
        }
        const avg = nonNumeric > 0 ? totalLen / nonNumeric : 0;
        if (avg > maxAvgLength && avg > 6) {
          maxAvgLength = avg;
          bestTextCol = item.raw;
        }
      }
      if (bestTextCol) return bestTextCol;
    }

    return '';
  };

  // Process 2D array of rows from Excel or CSV
  const process2DRows = (rows: any[][], sourceName: string, chosenHeaderIdx?: number) => {
    if (!rows || rows.length === 0) {
      setErrorMessage('Nenhum dado encontrado no arquivo ou na planilha selecionada.');
      return;
    }

    setDetectedRawRows(rows);

    // Auto-detect header row if not specified
    let bestHeaderIdx = chosenHeaderIdx !== undefined ? chosenHeaderIdx : 0;
    if (chosenHeaderIdx === undefined) {
      let maxScore = -1;
      const testLimit = Math.min(rows.length, 12);
      const headerKeywords = [
        'tombo', 'patrimonio', 'descricao', 'especificacao', 'discriminacao',
        'item', 'codigo', 'setor', 'unidade', 'valor', 'plaqueta', 'responsavel', 
        'situacao', 'conservacao', 'aquisicao', 'fornecedor', 'orgao', 'area'
      ];

      for (let r = 0; r < testLimit; r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;
        let score = 0;
        let filledCount = 0;
        for (const cell of row) {
          const str = normalizeHeader(cell);
          if (str.length > 0) filledCount++;
          for (const kw of headerKeywords) {
            if (str.includes(kw)) score += 3;
          }
        }
        if (filledCount >= 3) score += filledCount;
        if (score > maxScore) {
          maxScore = score;
          bestHeaderIdx = r;
        }
      }
    }

    setHeaderRowIndex(bestHeaderIdx);

    const rawHeadersRow = rows[bestHeaderIdx] || [];
    const headers: string[] = [];
    const usedColIndices: number[] = [];

    rawHeadersRow.forEach((cell: any, colIdx: number) => {
      let hName = String(cell || '').trim();
      if (!hName) {
        const hasData = rows.slice(bestHeaderIdx + 1, bestHeaderIdx + 6).some(r => r[colIdx] !== undefined && String(r[colIdx]).trim() !== '');
        if (hasData) {
          hName = `Coluna_${colIdx + 1}`;
        }
      }
      if (hName) {
        let uniqueName = hName;
        let counter = 2;
        while (headers.includes(uniqueName)) {
          uniqueName = `${hName}_${counter}`;
          counter++;
        }
        headers.push(uniqueName);
        usedColIndices.push(colIdx);
      }
    });

    if (headers.length === 0) {
      setErrorMessage('Não foi possível identificar as colunas na planilha. Tente mudar a linha de cabeçalho.');
      return;
    }

    // Convert rows into objects
    const dataObjects: any[] = [];
    for (let r = bestHeaderIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;
      const isRowEmpty = row.every((c: any) => c === undefined || c === null || String(c).trim() === '');
      if (isRowEmpty) continue;

      const obj: any = {};
      usedColIndices.forEach((colIdx, hIdx) => {
        const key = headers[hIdx];
        obj[key] = row[colIdx] !== undefined ? row[colIdx] : '';
      });
      dataObjects.push(obj);
    }

    if (dataObjects.length === 0) {
      setErrorMessage('A planilha possui cabeçalhos, mas nenhuma linha de dados válida após a linha de cabeçalho.');
      return;
    }

    setAvailableHeaders(headers);
    setCsvRawData(dataObjects);
    setFileName(sourceName);
    setErrorMessage(null);

    // 1. Número do Tombo
    const detectedTombamento = findBestColumn(headers, dataObjects, {
      exact: ['numero do tombo', 'nr tombo', 'nr_tombo', 'no tombo', 'n tombo', 'num tombo', 'tombo', 'tombamento', 'plaqueta', 'patrimonio', 'cod patrimonio', 'codigo patrimonio', 'id bem', 'cd bem', 'numero patrimonio', 'num patrimonio'],
      partial: ['tombo', 'plaqueta', 'patrimon', 'identificac'],
      exclude: ['origem', 'tipo', 'data', 'dt', 'valor', 'descricao']
    });

    // 2. Nome do Patrimônio / Nome do Item (ex: fogão, ar condicionado)
    const detectedDescricao = findBestColumn(headers, dataObjects, {
      exact: [
        'nome do patrimonio', 'nome do item', 'nome do bem', 'nome item', 'nome bem',
        'especificacao do bem', 'especificacao', 'descricao do bem', 'descricao', 
        'denominacao do bem', 'denominacao', 'discriminacao do bem', 'discriminacao do material', 
        'discriminacao', 'historico do bem', 'historico', 'item', 'bem', 'objeto', 
        'ds bem', 'ds item', 'descricao bem', 'especificacao bem', 'material equipamento', 
        'material', 'equipamento', 'detalhe', 'detalhamento', 'fogao', 'especificacao material'
      ],
      partial: ['especific', 'descric', 'denominac', 'discrimin', 'material', 'equipamento'],
      exclude: ['codigo', 'cod', 'tombo', 'plaqueta', 'data', 'dt', 'valor', 'vlr', 'vl', 'preco', 'custo', 'setor', 'area', 'unidade', 'sala', 'responsavel', 'situacao', 'estado', 'serie', 'numero', 'nr', 'nf', 'nota', 'fornecedor', 'orgao'],
      type: 'text'
    });

    // 3. Data de Tombamento
    const detectedDataTombamento = findBestColumn(headers, dataObjects, {
      exact: [
        'data de tombamento', 'data tombamento', 'dt tombamento', 'dt_tombamento', 
        'data tombo', 'dt tombo', 'data entrada', 'dt entrada', 'dt_entrada', 'data cadastro', 'dt cadastro'
      ],
      partial: ['tombamento', 'entrada', 'dt tombo'],
      exclude: ['aquisicao', 'compra', 'valor', 'tombo']
    });

    // 4. Data de Aquisição
    const detectedDataAquisicao = findBestColumn(headers, dataObjects, {
      exact: ['data de aquisicao', 'data aquisicao', 'dt aquisicao', 'dt_aquisicao', 'data compra', 'dt compra', 'data emissao', 'dt emissao', 'data'],
      partial: ['aquisic', 'compra'],
      exclude: ['tombamento', 'entrada', 'valor']
    });

    // 5. Forma de Aquisição
    const detectedFormaAquisicao = findBestColumn(headers, dataObjects, {
      exact: ['forma de aquisicao', 'forma aquisicao', 'modalidade de aquisicao', 'modalidade aquisicao', 'tipo de aquisicao', 'tipo aquisicao', 'forma', 'modalidade'],
      partial: ['forma', 'modalidade'],
      exclude: ['data', 'valor', 'custo']
    });

    // 6. Valor do Bem (R$) - Único e simples
    const detectedValor = findBestColumn(headers, dataObjects, {
      exact: [
        'valor', 'valor do bem', 'valor bem', 'vlr', 'vl', 'r$', 'preco', 'custo',
        'valor de aquisicao', 'valor aquisicao', 'vl aquisicao', 'vlr aquisicao',
        'valor contabil', 'vl contabil', 'vlr contabil', 'valor bruto', 'vl bruto',
        'valor liquido', 'vl liquido', 'valor total', 'vl total', 'preco unitario',
        'valor unitario', 'saldo', 'valor atual'
      ],
      partial: ['valor', 'preco', 'custo', 'vlr', 'aquisic'],
      exclude: ['data', 'dt', 'ano', 'exercicio', 'termo', 'numero', 'nr', 'codigo', 'cod', 'tombo', 'cpf', 'cnpj', 'serie'],
      type: 'number'
    });

    // 8. Nota Fiscal (NF) caso tenha
    const detectedNota = findBestColumn(headers, dataObjects, {
      exact: ['nota fiscal', 'nf', 'nfe', 'num nf', 'numero nf', 'nr nf', 'documento fiscal', 'doc fiscal', 'nota', 'documento', 'termo'],
      partial: ['nota', 'nf', 'nfe'],
      exclude: ['data', 'dt', 'valor']
    });

    // 9. Estado de Conservação
    const detectedEstado = findBestColumn(headers, dataObjects, {
      exact: ['estado de conservacao', 'estado conservacao', 'situacao do bem', 'condicao do bem', 'estado', 'situacao', 'conservacao', 'condicao'],
      partial: ['estado', 'conservac', 'situac', 'condic']
    });

    // 10. Origem do Recurso
    const detectedOrigemRecurso = findBestColumn(headers, dataObjects, {
      exact: ['origem do recurso', 'origem recurso', 'fonte de recurso', 'fonte recurso', 'recurso', 'fonte', 'origem dos recursos', 'fonte dos recursos'],
      partial: ['recurso', 'fonte'],
      exclude: ['tombo', 'data', 'valor']
    });

    // 11. Origem do Tombo (CPSMS / SESA / UFC)
    const detectedOrigemTombo = findBestColumn(headers, dataObjects, {
      exact: ['origem do tombo', 'origem tombo', 'proprietario', 'ente cedente', 'convenio', 'titular'],
      partial: ['origem', 'propriet'],
      exclude: ['recurso']
    });

    // 12. Fornecedor / Cedente
    const detectedFornecedor = findBestColumn(headers, dataObjects, {
      exact: ['fornecedor', 'forecedor', 'cedente', 'fabricante', 'empresa', 'razao social', 'razao_social', 'vendedor', 'doador'],
      partial: ['forneced', 'foreced', 'fabricant', 'cedente'],
      exclude: ['data', 'valor']
    });

    // 13. Órgão / Ente
    const detectedOrgao = findBestColumn(headers, dataObjects, {
      exact: ['orgao', 'ente', 'instituicao', 'entidade', 'secretaria', 'consorcio', 'unidade mantenedora'],
      partial: ['orgao', 'secretar', 'consorc']
    });

    // 14. Área / Setor
    const detectedArea = findBestColumn(headers, dataObjects, {
      exact: ['area', 'setor', 'departamento', 'bloco', 'divisao', 'localizacao', 'lotacao', 'unidade de saude', 'unidade'],
      partial: ['area', 'setor', 'depart', 'bloco'],
      exclude: ['sala', 'subsetor', 'consultorio']
    });

    // 15. Subárea / Sala
    const detectedSubarea = findBestColumn(headers, dataObjects, {
      exact: ['subarea', 'sub area', 'sala', 'subsetor', 'consultorio', 'gabinete', 'ambiente', 'box'],
      partial: ['subarea', 'sala', 'consultorio', 'subsetor', 'gabinete']
    });

    // 16. Responsável
    const detectedResponsavel = findBestColumn(headers, dataObjects, {
      exact: ['responsavel', 'rresponsavel', 'detentor', 'servidor', 'custodiante', 'titular da carga', 'nome responsavel', 'cargo', 'titular'],
      partial: ['responsav', 'rresponsav', 'detentor', 'servidor'],
      exclude: ['unidade', 'setor', 'area']
    });

    // 17. Categoria
    const detectedCategoria = findBestColumn(headers, dataObjects, {
      exact: ['categoria', 'grupo', 'classe', 'especie', 'conta'],
      partial: ['categoria', 'grupo', 'classe', 'especie']
    });

    // 18. Número de Série
    const detectedSerie = findBestColumn(headers, dataObjects, {
      exact: ['numero de serie', 'numero serie', 'nr serie', 'nr_serie', 'serie', 'serial', 'chassi', 'sn'],
      partial: ['serie', 'serial', 'chassi']
    });

    setMapping({
      tombamento: detectedTombamento || headers[0] || '',
      descricao: detectedDescricao,
      dataTombamento: detectedDataTombamento,
      dataAquisicao: detectedDataAquisicao,
      formaAquisicao: detectedFormaAquisicao,
      valor: detectedValor || '',
      notaFiscal: detectedNota,
      estado: detectedEstado,
      origemRecurso: detectedOrigemRecurso,
      origemTombo: detectedOrigemTombo,
      fornecedor: detectedFornecedor,
      orgao: detectedOrgao,
      area: detectedArea,
      subarea: detectedSubarea,
      responsavel: detectedResponsavel,
      categoria: detectedCategoria,
      numeroSerie: detectedSerie,
    });

    setStep(2);
  };

  const processWorkbookSheet = (wb: XLSX.WorkBook, sheetName: string, name: string) => {
    try {
      const ws = wb.Sheets[sheetName];
      if (!ws) {
        setErrorMessage(`A aba "${sheetName}" não foi encontrada no arquivo.`);
        return;
      }
      const raw2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
      process2DRows(raw2D, `${name} [${sheetName}]`);
    } catch (err: any) {
      setErrorMessage(`Erro ao processar aba do Excel: ${err.message}`);
    }
  };

  const processFile = (file: File) => {
    setErrorMessage(null);
    const name = file.name;
    const lowerName = name.toLowerCase();

    const reader = new FileReader();

    if (
      lowerName.endsWith('.xlsx') || 
      lowerName.endsWith('.xls') || 
      lowerName.endsWith('.xlsm') || 
      lowerName.endsWith('.xlsb') || 
      lowerName.endsWith('.ods')
    ) {
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          setRawWorkbook(workbook);
          setSheetsList(workbook.SheetNames);
          const firstSheet = workbook.SheetNames[0];
          setSelectedSheet(firstSheet);
          processWorkbookSheet(workbook, firstSheet, file.name);
        } catch (err: any) {
          setErrorMessage(`Falha ao ler arquivo Excel: ${err.message}. Tente salvar a planilha como .xlsx ou .csv.`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          if (workbook && workbook.SheetNames.length > 0) {
            setRawWorkbook(workbook);
            setSheetsList(workbook.SheetNames);
            setSelectedSheet(workbook.SheetNames[0]);
            processWorkbookSheet(workbook, workbook.SheetNames[0], file.name);
            return;
          }
        } catch {
          // fallback
        }

        Papa.parse(file, {
          header: false,
          skipEmptyLines: false,
          encoding: 'UTF-8',
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              process2DRows(results.data as any[][], file.name);
            } else {
              Papa.parse(file, {
                header: false,
                skipEmptyLines: false,
                encoding: 'ISO-8859-1',
                complete: (res2) => {
                  process2DRows(res2.data as any[][], file.name);
                },
                error: (err2) => {
                  setErrorMessage(`Erro ao ler CSV: ${err2.message}`);
                }
              });
            }
          },
          error: (err) => {
            setErrorMessage(`Erro ao ler arquivo: ${err.message}`);
          }
        });
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePasteProcess = () => {
    setErrorMessage(null);
    if (!pasteText.trim()) {
      setErrorMessage('Cole as linhas da sua planilha no campo de texto.');
      return;
    }

    try {
      const results = Papa.parse(pasteText.trim(), {
        header: false,
        skipEmptyLines: false,
      });

      if (results.data && results.data.length > 0) {
        process2DRows(results.data as any[][], 'Células Coladas do Excel');
      } else {
        setErrorMessage('Não foi possível identificar linhas ou colunas no texto colado.');
      }
    } catch (err: any) {
      setErrorMessage(`Erro ao processar texto: ${err.message}`);
    }
  };

  const handleSheetChange = (newSheet: string) => {
    if (rawWorkbook && newSheet) {
      setSelectedSheet(newSheet);
      processWorkbookSheet(rawWorkbook, newSheet, fileName.split(' [')[0]);
    }
  };

  const handleHeaderRowChange = (newRowIdx: number) => {
    if (detectedRawRows.length > 0) {
      process2DRows(detectedRawRows, fileName, newRowIdx);
    }
  };

  const handleInitiateImport = () => {
    if (!mapping.descricao) {
      setShowConfirmMissingDialog(true);
      return;
    }
    executeImport();
  };

  const executeImport = async () => {
    setShowConfirmMissingDialog(false);
    setIsProcessing(true);
    setProgress(5);

    const importedList: Asset[] = [];
    let poliCount = 0;
    let ceoCount = 0;
    let sedeCount = 0;
    let sesaCount = 0;
    let cpsmsCount = 0;
    let ufcCount = 0;

    const total = csvRawData.length;

    await new Promise(r => setTimeout(r, 50));

    for (let i = 0; i < total; i++) {
      const row = csvRawData[i];

      // 1. Número do Tombo
      const tombamentoVal = mapping.tombamento && row[mapping.tombamento] 
        ? String(row[mapping.tombamento]).trim() 
        : `CPSMS-${String(i + 1).padStart(5, '0')}`;

      // 2. Nome do Patrimônio / Nome do Item (ex: fogão, ar condicionado)
      let descricaoVal = '';
      if (mapping.descricao && row[mapping.descricao] !== undefined && row[mapping.descricao] !== null && String(row[mapping.descricao]).trim() !== '') {
        descricaoVal = String(row[mapping.descricao]).trim();
      }
      if (!descricaoVal) {
        descricaoVal = `Bem Patrimonial nº ${tombamentoVal}`;
      }

      // 3. Origem do Tombo (CPSMS / SESA / UFC)
      let origemVal: TomboOrigin = defaultTomboOrigin;
      const rawOrig = mapping.origemTombo ? String(row[mapping.origemTombo] || '') : '';
      const upperCheck = (rawOrig + ' ' + tombamentoVal).toUpperCase();

      if (upperCheck.includes('SESA') || upperCheck.includes('ESTADO') || upperCheck.includes('GOV')) {
        origemVal = 'SESA (Governo do Ceará - Cessão/Comodato)';
        sesaCount++;
      } else if (upperCheck.includes('UFC') || upperCheck.includes('UNIVERSIDADE')) {
        origemVal = 'UFC (Universidade Federal do Ceará)';
        ufcCount++;
      } else if (upperCheck.includes('MINISTERIO') || upperCheck.includes('MS') || upperCheck.includes('SUS')) {
        origemVal = 'Ministério da Saúde / SUS / Doação';
        cpsmsCount++;
      } else {
        origemVal = defaultTomboOrigin;
        if (defaultTomboOrigin.includes('SESA')) sesaCount++;
        else if (defaultTomboOrigin.includes('UFC')) ufcCount++;
        else cpsmsCount++;
      }

      // 4. Data de Tombamento e Data de Aquisição
      const dataTombamentoVal = mapping.dataTombamento && row[mapping.dataTombamento]
        ? String(row[mapping.dataTombamento]).trim()
        : undefined;

      const dataAquisicaoVal = mapping.dataAquisicao && row[mapping.dataAquisicao]
        ? String(row[mapping.dataAquisicao]).trim()
        : (dataTombamentoVal || new Date().toISOString().slice(0, 10));

      // 5. Forma de Aquisição
      const formaAquisicaoVal = mapping.formaAquisicao && row[mapping.formaAquisicao]
        ? String(row[mapping.formaAquisicao]).trim()
        : 'Compra / Pregão';

      // 6. Valor do Bem (R$)
      const valorVal = mapping.valor && row[mapping.valor] !== undefined
        ? parseCurrencyValue(row[mapping.valor])
        : 0;

      // 7. Nota Fiscal caso tenha
      const nfVal = mapping.notaFiscal && row[mapping.notaFiscal]
        ? String(row[mapping.notaFiscal]).trim()
        : 'S/N';

      // 8. Fornecedor / Cedente
      const fornecedorVal = mapping.fornecedor && row[mapping.fornecedor]
        ? String(row[mapping.fornecedor]).trim()
        : 'Fornecedor Cadastrado';

      // 9. Origem do Recurso
      const origemRecursoVal = mapping.origemRecurso && row[mapping.origemRecurso]
        ? String(row[mapping.origemRecurso]).trim()
        : 'Recurso Próprio CPSMS';

      // 10. Órgão
      const orgaoVal = mapping.orgao && row[mapping.orgao]
        ? String(row[mapping.orgao]).trim()
        : 'Consórcio Público de Saúde da Microrregião de Sobral (CPSMS)';

      // 11. Área e Subárea / Unidade e Setor
      const rawArea = mapping.area ? String(row[mapping.area] || '').trim() : '';
      const rawSubarea = mapping.subarea ? String(row[mapping.subarea] || '').trim() : '';
      const checkAreaUpper = (rawArea + ' ' + orgaoVal).toUpperCase();

      let unitObj = units.find(u => u.id === defaultUnitId) || units[0];
      if (checkAreaUpper.includes('CEO') || checkAreaUpper.includes('ODONTO')) {
        unitObj = units.find(u => u.id === 'ceo') || unitObj;
        ceoCount++;
      } else if (checkAreaUpper.includes('POLI') || checkAreaUpper.includes('BERNARDO') || checkAreaUpper.includes('FELIX')) {
        unitObj = units.find(u => u.id === 'policlinica') || unitObj;
        poliCount++;
      } else if (checkAreaUpper.includes('SEDE') || checkAreaUpper.includes('ADMIN')) {
        unitObj = units.find(u => u.id === 'sede-cpsms') || unitObj;
        sedeCount++;
      } else {
        if (defaultUnitId === 'ceo') ceoCount++;
        else if (defaultUnitId === 'policlinica') poliCount++;
        else sedeCount++;
      }

      const unitSectors = sectors.filter(s => s.unidadeId === unitObj.id);
      const matchedSector = unitSectors.find(s => 
        s.nome.toLowerCase().includes(rawArea.toLowerCase()) || 
        s.sigla.toLowerCase() === rawArea.toLowerCase()
      ) || unitSectors[0];

      // 12. Responsável
      const responsavelVal = mapping.responsavel && row[mapping.responsavel]
        ? String(row[mapping.responsavel]).trim()
        : matchedSector.responsavelNome;

      // 13. Categoria
      const rawCat = mapping.categoria ? String(row[mapping.categoria] || '').toLowerCase() : '';
      let categoriaVal: AssetCategory = 'Equipamentos Médicos & Odontológicos';
      if (rawCat.includes('ti') || rawCat.includes('info') || rawCat.includes('compu')) {
        categoriaVal = 'TI & Informática';
      } else if (rawCat.includes('mob') || rawCat.includes('cadeira') || rawCat.includes('mesa') || rawCat.includes('fogao') || rawCat.includes('armario')) {
        categoriaVal = 'Mobiliário Hospitalar & Escritório';
      } else if (rawCat.includes('clima') || rawCat.includes('ar') || rawCat.includes('eletro')) {
        categoriaVal = 'Aparelhos Eletroeletrônicos & Climatização';
      } else if (rawCat.includes('veic') || rawCat.includes('carro') || rawCat.includes('ambu')) {
        categoriaVal = 'Veículos & Ambulâncias';
      } else if (rawCat.includes('instru') || rawCat.includes('cme') || rawCat.includes('caixa')) {
        categoriaVal = 'Instrumentais & CME';
      }

      // 14. Estado de Conservação
      const rawEst = mapping.estado ? String(row[mapping.estado] || '').toLowerCase() : '';
      let estadoVal: AssetCondition = 'Bom';
      if (rawEst.includes('excel')) estadoVal = 'Excelente';
      else if (rawEst.includes('reg')) estadoVal = 'Regular';
      else if (rawEst.includes('ocio')) estadoVal = 'Ocioso';
      else if (rawEst.includes('inserv') || rawEst.includes('danif') || rawEst.includes('ruim') || rawEst.includes('quebr')) {
        estadoVal = 'Inservível / Danificado';
      }

      // 15. Número de Série
      const serieVal = mapping.numeroSerie && row[mapping.numeroSerie] ? String(row[mapping.numeroSerie]).trim() : '';

      importedList.push({
        id: `ast-${Date.now()}-${i}`,
        tombamento: tombamentoVal,
        origemTombo: origemVal,
        origemRecurso: origemRecursoVal,
        formaAquisicao: formaAquisicaoVal,
        orgao: orgaoVal,
        descricao: descricaoVal,
        unidadeId: unitObj.id,
        unidadeNome: unitObj.nome,
        area: rawArea || matchedSector.nome,
        subarea: rawSubarea || matchedSector.subsetores[0]?.nome || 'Geral',
        setorId: matchedSector.id,
        setorNome: rawArea || matchedSector.nome,
        subsetorNome: rawSubarea || matchedSector.subsetores[0]?.nome || 'Geral',
        responsavelNome: responsavelVal,
        responsavelCargo: matchedSector.responsavelCargo,
        responsavelMatricula: matchedSector.responsavelMatricula,
        categoria: categoriaVal,
        estado: estadoVal,
        valorAquisicao: valorVal,
        valorResidual: valorVal,
        valorBrutoContabil: valorVal,
        valorLiquidoContabil: valorVal,
        depreciacaoAcumulada: 0,
        dataAquisicao: dataAquisicaoVal,
        dataTombamento: dataTombamentoVal,
        notaFiscal: nfVal,
        fornecedor: fornecedorVal,
        numeroSerie: serieVal,
        observacoes: `Importado de documento/planilha (${fileName || 'Arquivo'}) em ${new Date().toLocaleDateString('pt-BR')}`,
        codigoASPEC: `ASP-${tombamentoVal}`,
        codigoSGPS: `SGPS-${tombamentoVal}`,
        auditoria: {
          conferido: false,
          statusDivergencia: 'conforme'
        }
      });

      if (i % 250 === 0) {
        setProgress(Math.round((i / total) * 90));
      }
    }

    setProgress(100);
    setImportStats({
      total: importedList.length,
      policlinica: poliCount,
      ceo: ceoCount,
      sede: sedeCount,
      sesa: sesaCount,
      cpsms: cpsmsCount,
      ufc: ufcCount,
    });
    setIsProcessing(false);
    setStep(3);

    onImportCompleted(importedList, importMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[94vh] overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Importador de Documento / Planilha Patrimonial · CPSMS
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Garante o salvamento completo de todas as 15 características patrimoniais e contábeis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Input options (File or Paste) */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInputMode('file')}
                className={`flex-1 py-2.5 px-4 font-semibold text-xs sm:text-sm border-b-2 flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px] ${
                  inputMode === 'file'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                1. Selecionar Arquivo (.xlsx, .xls, .csv)
              </button>
              <button
                type="button"
                onClick={() => setInputMode('paste')}
                className={`flex-1 py-2.5 px-4 font-semibold text-xs sm:text-sm border-b-2 flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px] ${
                  inputMode === 'paste'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <ClipboardCopy className="w-4 h-4" />
                2. Copiar e Colar Células do Excel
              </button>
            </div>

            {/* Option A: File Upload */}
            {inputMode === 'file' && (
              <div className="space-y-3">
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`p-6 sm:p-8 border-2 border-dashed rounded-2xl text-center space-y-4 transition-colors ${
                    isDragOver 
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/60 dark:bg-slate-850/60'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-base">
                      Clique para escolher ou arraste seu documento
                    </h5>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Compatível com <strong>qualquer planilha do Excel (.xlsx, .xls)</strong> e <strong>arquivos CSV (.csv, .tsv, .txt)</strong>.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Procurar Documento / Planilha
                    </button>

                    <button
                      type="button"
                      onClick={() => anyFileInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                      title="Clique caso seu arquivo não esteja visível na janela"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Abrir Todos os Arquivos (*.*)
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.tsv,.txt,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain,*/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <input
                      ref={anyFileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Option B: Direct Paste from Excel */}
            {inputMode === 'paste' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <ClipboardCopy className="w-3.5 h-3.5 text-emerald-500" />
                    Copie as linhas no Excel e cole no campo abaixo:
                  </label>
                  <p className="text-[11px] text-slate-500">
                    No Excel: selecione o cabeçalho e todas as linhas, pressione <kbd className="px-1 bg-slate-200 dark:bg-slate-700 rounded">Ctrl+C</kbd> e depois clique aqui dentro e aperte <kbd className="px-1 bg-slate-200 dark:bg-slate-700 rounded">Ctrl+V</kbd>.
                  </p>
                </div>

                <textarea
                  rows={8}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Cole aqui o conteúdo copiado do Excel... (ex: Tombo   Descrição/Item   Valor   Setor...)"
                  className="w-full p-3 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />

                <button
                  type="button"
                  onClick={handlePasteProcess}
                  disabled={!pasteText.trim()}
                  className="w-full py-3 px-4 text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-xl transition-colors min-h-[46px] cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Processar Linhas Coladas
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Sheet Selector + Header Row + Column Mapper + Live Preview */}
        {step === 2 && (
          <div className="space-y-4 text-xs sm:text-sm">
            {/* File Info & Sheet Selection */}
            <div className="p-3.5 bg-slate-100 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {csvRawData.length.toLocaleString('pt-BR')} itens identificados no documento!
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Arquivo: <strong>{fileName}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  Trocar Arquivo / Recarregar
                </button>
              </div>

              {/* Multi-sheet selector */}
              {sheetsList.length > 1 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-750 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                    Aba da Planilha:
                  </span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="p-1.5 text-xs rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {sheetsList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Header row adjuster */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-750 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Linha do Cabeçalho:
                  </span>
                  <select
                    value={headerRowIndex}
                    onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                    className="p-1.5 text-xs rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    {detectedRawRows.slice(0, 10).map((_, idx) => (
                      <option key={idx} value={idx}>
                        Linha {idx + 1} {idx === headerRowIndex ? '(Cabeçalho Selecionado)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[10px] text-slate-500">
                  Mude a linha caso sua planilha tenha títulos institucionais nas primeiras linhas.
                </span>
              </div>
            </div>

            {/* LIVE CARD: Conferência das características reconhecidas no 1º bem */}
            <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950 dark:text-emerald-300">
                <span className="flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Conferência das Características do 1º Bem Identificado:
                </span>
                <span className="text-[11px] font-normal text-emerald-800 dark:text-emerald-300">
                  Lido da 1ª linha de dados
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {/* 1. Tombo e Nome do Item */}
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block flex items-center gap-1">
                    <Tag className="w-3 h-3 text-emerald-500" /> Tombo & Nome do Item:
                  </span>
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {mapping.tombamento && csvRawData[0]?.[mapping.tombamento] 
                      ? String(csvRawData[0][mapping.tombamento]) 
                      : <span className="text-amber-600">CPSMS-00001 (Automático)</span>}
                  </div>
                  <div className="font-semibold text-xs text-emerald-700 dark:text-emerald-300 truncate" title={mapping.descricao && csvRawData[0]?.[mapping.descricao] ? String(csvRawData[0][mapping.descricao]) : ''}>
                    {mapping.descricao && csvRawData[0]?.[mapping.descricao] 
                      ? String(csvRawData[0][mapping.descricao]) 
                      : <span className="text-rose-600 font-bold">⚠️ Escolha a coluna do Item/Nome</span>}
                  </div>
                </div>

                {/* 2. Valor do Bem */}
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-500" /> Valor do Bem:
                  </span>
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-1">
                    {mapping.valor && csvRawData[0]?.[mapping.valor] !== undefined
                      ? formatBRL(parseCurrencyValue(csvRawData[0][mapping.valor]))
                      : 'R$ 0,00'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {mapping.valor ? `Coluna: "${mapping.valor}"` : 'Sem coluna de valor (R$ 0,00)'}
                  </div>
                </div>

                {/* 3. Datas e Forma */}
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-500" /> Datas & Aquisição:
                  </span>
                  <div className="text-[11px] truncate">
                    <span className="text-slate-500">Aquisição: </span>
                    <strong>{mapping.dataAquisicao && csvRawData[0]?.[mapping.dataAquisicao] ? String(csvRawData[0][mapping.dataAquisicao]) : 'Hoje'}</strong>
                  </div>
                  <div className="text-[11px] truncate">
                    <span className="text-slate-500">Tombamento: </span>
                    <strong>{mapping.dataTombamento && csvRawData[0]?.[mapping.dataTombamento] ? String(csvRawData[0][mapping.dataTombamento]) : '—'}</strong>
                  </div>
                  <div className="text-[11px] truncate text-slate-600 dark:text-slate-400">
                    Forma: {mapping.formaAquisicao && csvRawData[0]?.[mapping.formaAquisicao] ? String(csvRawData[0][mapping.formaAquisicao]) : 'Compra/Pregão'}
                  </div>
                </div>

                {/* 4. Localização e Responsável */}
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-500" /> Área, Subárea & Titular:
                  </span>
                  <div className="text-[11px] truncate font-semibold text-slate-800 dark:text-slate-200">
                    Área: {mapping.area && csvRawData[0]?.[mapping.area] ? String(csvRawData[0][mapping.area]) : 'Setor Padrão'}
                  </div>
                  <div className="text-[11px] truncate text-slate-600 dark:text-slate-400">
                    Subárea: {mapping.subarea && csvRawData[0]?.[mapping.subarea] ? String(csvRawData[0][mapping.subarea]) : 'Geral'}
                  </div>
                  <div className="text-[11px] truncate text-slate-500">
                    Detentor: {mapping.responsavel && csvRawData[0]?.[mapping.responsavel] ? String(csvRawData[0][mapping.responsavel]) : 'Responsável da Unidade'}
                  </div>
                </div>
              </div>

              {/* Warning if item name is missing */}
              {!mapping.descricao && (
                <div className="text-[11px] text-amber-900 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/60 p-2.5 rounded-lg font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>No campo <strong>"Nome do Patrimônio / Item"</strong>, selecione a coluna com o nome do bem (ex: <em>fogão, ar condicionado, especificacao, descricao</em>).</span>
                </div>
              )}
            </div>

            {/* Live Data Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  Visualização das Primeiras Linhas da sua Planilha:
                </span>
                <span className="text-[10px] text-slate-500">
                  Mostrando 3 de {csvRawData.length.toLocaleString('pt-BR')} linhas
                </span>
              </div>

              <div className="overflow-x-auto max-h-32 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-850">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold sticky top-0">
                    <tr>
                      <th className="p-2 border-b border-slate-300 dark:border-slate-700">#</th>
                      {availableHeaders.slice(0, 8).map(h => (
                        <th key={h} className="p-2 border-b border-slate-300 dark:border-slate-700 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                      {availableHeaders.length > 8 && (
                        <th className="p-2 border-b border-slate-300 dark:border-slate-700 text-slate-400">
                          +{availableHeaders.length - 8} colunas
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                    {csvRawData.slice(0, 3).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-100 dark:hover:bg-slate-800/50">
                        <td className="p-2 font-bold text-slate-400">{rIdx + 1}</td>
                        {availableHeaders.slice(0, 8).map(h => (
                          <td key={h} className="p-2 whitespace-nowrap max-w-[180px] truncate" title={String(row[h] || '')}>
                            {String(row[h] || '—')}
                          </td>
                        ))}
                        {availableHeaders.length > 8 && (
                          <td className="p-2 text-slate-400">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column Mapping Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                    <Table className="w-4 h-4 text-emerald-500" />
                    Mapeamento das 15 Características Patrimoniais
                  </h4>
                  <p className="text-xs text-slate-500">
                    Confirme qual coluna da sua planilha corresponde a cada campo exigido pelo controle de bens:
                  </p>
                </div>
              </div>

              {/* Grouped Mapping Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[42vh] overflow-y-auto p-1 pr-2">
                
                {/* 1. Número do Tombo */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>* Número do Tombo:</span>
                    <span className="text-[10px] text-emerald-600 font-bold">Obrigatório</span>
                  </label>
                  <select
                    value={mapping.tombamento}
                    onChange={(e) => setMapping({ ...mapping, tombamento: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione a coluna do Tombo --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>
                        {h} {csvRawData[0]?.[h] ? `— Ex: "${String(csvRawData[0][h]).slice(0, 16)}"` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Nome do Patrimônio / Nome do Item (ex: fogão) */}
                <div className={`p-2.5 rounded-xl border space-y-1 ${
                  mapping.descricao 
                    ? 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800' 
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                }`}>
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span className={!mapping.descricao ? 'text-rose-700 dark:text-rose-400' : ''}>
                      * Nome do Patrimônio / Item:
                    </span>
                    <span className={`text-[10px] font-bold ${!mapping.descricao ? 'text-rose-600' : 'text-emerald-600'}`}>
                      Obrigatório
                    </span>
                  </label>
                  <select
                    value={mapping.descricao}
                    onChange={(e) => setMapping({ ...mapping, descricao: e.target.value })}
                    className={`w-full p-2 text-xs rounded-lg font-medium ${
                      mapping.descricao
                        ? 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-slate-800 border-2 border-rose-400 text-rose-900 dark:text-rose-100 font-semibold'
                    }`}
                  >
                    <option value="">-- Coluna com o Nome (ex: Fogão) --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>
                        {h} {csvRawData[0]?.[h] ? `— Ex: "${String(csvRawData[0][h]).slice(0, 20)}"` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Valor do Bem (R$) */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Valor do Bem (R$):</span>
                    <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                  </label>
                  <select
                    value={mapping.valor}
                    onChange={(e) => setMapping({ ...mapping, valor: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione a coluna com o Valor (ou deixe vazio) --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>
                        {h} {csvRawData[0]?.[h] !== undefined ? `— Ex: "${String(csvRawData[0][h]).slice(0, 15)}"` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Data de Tombamento */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Data de Tombamento:
                  </label>
                  <select
                    value={mapping.dataTombamento}
                    onChange={(e) => setMapping({ ...mapping, dataTombamento: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione a coluna (ou vazio) --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Data de Aquisição */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Data de Aquisição:
                  </label>
                  <select
                    value={mapping.dataAquisicao}
                    onChange={(e) => setMapping({ ...mapping, dataAquisicao: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione a coluna (ou data atual) --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 7. Forma de Aquisição */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Forma de Aquisição:
                  </label>
                  <select
                    value={mapping.formaAquisicao}
                    onChange={(e) => setMapping({ ...mapping, formaAquisicao: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">Padrão: "Compra / Pregão" (ou selecione coluna)</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 8. Nota Fiscal caso tenha */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    NF (Nota Fiscal caso tenha):
                  </label>
                  <select
                    value={mapping.notaFiscal}
                    onChange={(e) => setMapping({ ...mapping, notaFiscal: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione a coluna (ou vazio) --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 9. Estado de Conservação */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Estado de Conservação:
                  </label>
                  <select
                    value={mapping.estado}
                    onChange={(e) => setMapping({ ...mapping, estado: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione a coluna (ou padrão 'Bom') --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 10. Origem do Recurso */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Origem do Recurso:
                  </label>
                  <select
                    value={mapping.origemRecurso}
                    onChange={(e) => setMapping({ ...mapping, origemRecurso: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">Padrão: "Recurso Próprio CPSMS" (ou selecione coluna)</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 11. Origem do Tombo (CPSMS/SESA/UFC) */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Origem Tombo (CPSMS/SESA/UFC):
                  </label>
                  <select
                    value={mapping.origemTombo}
                    onChange={(e) => setMapping({ ...mapping, origemTombo: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">Detectar no texto ou usar padrão abaixo</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 12. Fornecedor / Cedente */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Fornecedor / Cedente:
                  </label>
                  <select
                    value={mapping.fornecedor}
                    onChange={(e) => setMapping({ ...mapping, fornecedor: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione a coluna (ou padrão cadastrado) --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 13. Órgão */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Órgão / Ente Gestor:
                  </label>
                  <select
                    value={mapping.orgao}
                    onChange={(e) => setMapping({ ...mapping, orgao: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">Padrão: "Consórcio CPSMS" (ou selecione coluna)</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 14. Área (Setor / Lotação) */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Área / Setor / Lotação:
                  </label>
                  <select
                    value={mapping.area}
                    onChange={(e) => setMapping({ ...mapping, area: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione a coluna da Área --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 15. Subárea (Sala / Consultório) */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Subárea / Sala / Ambiente:
                  </label>
                  <select
                    value={mapping.subarea}
                    onChange={(e) => setMapping({ ...mapping, subarea: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione a coluna da Subárea --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 16. Responsável */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Responsável / Detentor:
                  </label>
                  <select
                    value={mapping.responsavel}
                    onChange={(e) => setMapping({ ...mapping, responsavel: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione a coluna (ou detentor padrão) --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 17. Categoria */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Categoria / Grupo do Bem:
                  </label>
                  <select
                    value={mapping.categoria}
                    onChange={(e) => setMapping({ ...mapping, categoria: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">Detectar automaticamente pelo nome</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 18. Número de Série */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Número de Série / Serial:
                  </label>
                  <select
                    value={mapping.numeroSerie}
                    onChange={(e) => setMapping({ ...mapping, numeroSerie: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione a coluna (ou vazio) --</option>
                    {availableHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Mode selection if existing assets are present */}
              {existingCount > 0 && (
                <div className="p-3 bg-slate-100 dark:bg-slate-850 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                    Como deseja aplicar no sistema? (Já existem {existingCount.toLocaleString('pt-BR')} bens salvos)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-colors ${
                      importMode === 'update' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-950 dark:text-emerald-200 font-semibold' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      <input
                        type="radio"
                        name="importMode"
                        value="update"
                        checked={importMode === 'update'}
                        onChange={() => setImportMode('update')}
                        className="mt-0.5 text-emerald-600"
                      />
                      <div>
                        <div className="font-bold">Atualizar e Preencher Bens Existentes (Recomendado)</div>
                        <div className="text-[11px] opacity-80">Preenche e atualiza todas as características pelo número do tombo, preservando auditorias já realizadas.</div>
                      </div>
                    </label>

                    <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-colors ${
                      importMode === 'replace' 
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-950 dark:text-rose-200 font-semibold' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="mt-0.5 text-rose-600"
                      />
                      <div>
                        <div className="font-bold">Substituir Toda a Base de Dados</div>
                        <div className="text-[11px] opacity-80">Limpa a base atual e cadastra o novo documento como base do zero.</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Fallback Defaults if missing in columns */}
              <div className="p-3 bg-slate-100 dark:bg-slate-850 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white text-xs block">
                  Valores Padrão (utilizados caso a coluna não exista no documento):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500">Unidade Principal Padrão:</span>
                    <select
                      value={defaultUnitId}
                      onChange={(e) => setDefaultUnitId(e.target.value)}
                      className="w-full mt-0.5 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                    >
                      {units.map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Origem Padrão do Tombamento:</span>
                    <select
                      value={defaultTomboOrigin}
                      onChange={(e) => setDefaultTomboOrigin(e.target.value as any)}
                      className="w-full mt-0.5 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="CPSMS (Próprio do Consórcio)">CPSMS (Próprio do Consórcio)</option>
                      <option value="SESA (Governo do Ceará - Cessão/Comodato)">SESA (Governo do Ceará - Cessão/Comodato)</option>
                      <option value="UFC (Universidade Federal do Ceará)">UFC (Universidade Federal do Ceará)</option>
                      <option value="Ministério da Saúde / SUS / Doação">Ministério da Saúde / SUS / Doação</option>
                    </select>
                  </div>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2 py-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Salvando características e gravando bens no banco de dados...</span>
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl min-h-[44px] cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleInitiateImport}
                  className="px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-2 min-h-[44px] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar {csvRawData.length.toLocaleString('pt-BR')} Bens com Todas as Características
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Missing Columns Confirmation Prompt */}
        {showConfirmMissingDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Colunas essenciais não selecionadas!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Você não mapeou as seguintes colunas do seu documento:
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                {!mapping.descricao && (
                  <div className="text-rose-700 dark:text-rose-300 font-semibold">
                    • <strong>Nome do Patrimônio / Item:</strong> Se não mapear, os itens ficarão sem o nome da planilha.
                  </div>
                )}
                {!mapping.valor && (
                  <div className="text-amber-800 dark:text-amber-300 font-semibold">
                    • <strong>Valor do Bem:</strong> Nenhuma coluna de valor foi selecionada (itens ficarão com R$ 0,00).
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Deseja voltar para escolher as colunas corretas ou prosseguir mesmo assim?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmMissingDialog(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl cursor-pointer min-h-[44px]"
                >
                  Voltar e Escolher Colunas
                </button>
                <button
                  type="button"
                  onClick={() => executeImport()}
                  className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl cursor-pointer"
                >
                  Continuar Mesmo Assim
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Success Summary */}
        {step === 3 && importStats && (
          <div className="space-y-5 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Importação Concluída com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto mt-1">
                Todos os <strong>{importStats.total.toLocaleString('pt-BR')} bens patrimoniais</strong> foram salvos com todas as suas características completas e valores contábeis no banco de dados.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left max-w-lg mx-auto">
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500">Policlínica Bernardo Félix</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{importStats.policlinica.toLocaleString('pt-BR')}</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500">CEO Sobral</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{importStats.ceo.toLocaleString('pt-BR')}</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500">Sede CPSMS</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{importStats.sede.toLocaleString('pt-BR')}</div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/60">
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Tombo SESA (Cessão)</span>
                <div className="text-lg font-bold text-blue-900 dark:text-blue-200 tabular-nums">{importStats.sesa.toLocaleString('pt-BR')}</div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Tombo Próprio CPSMS</span>
                <div className="text-lg font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">{importStats.cpsms.toLocaleString('pt-BR')}</div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60">
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Tombo UFC / Outros</span>
                <div className="text-lg font-bold text-amber-900 dark:text-amber-200 tabular-nums">{importStats.ufc.toLocaleString('pt-BR')}</div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-8 py-3 text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors shadow-xs min-h-[46px] cursor-pointer"
              >
                Visualizar Acervo no Painel de Bens
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
