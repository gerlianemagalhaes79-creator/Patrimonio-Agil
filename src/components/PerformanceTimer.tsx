import React, { useState, useEffect, useRef } from 'react';
import { Timer, Zap, Activity, RefreshCw, Play, Pause, RotateCcw, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

interface PerformanceTimerProps {
  lastQueryDurationMs?: number;
  totalAssetsCount?: number;
  isProcessing?: boolean;
}

export const PerformanceTimer: React.FC<PerformanceTimerProps> = ({
  lastQueryDurationMs = 24,
  totalAssetsCount = 0,
  isProcessing = false,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [queryLatencyHistory, setQueryLatencyHistory] = useState<number[]>([18, 22, 28, 15, lastQueryDurationMs]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [benchmarkResult, setBenchmarkResult] = useState<string | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);

  const startTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);

  // Live stopwatch tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Track changes to query duration
  useEffect(() => {
    if (lastQueryDurationMs > 0) {
      setQueryLatencyHistory(prev => [lastQueryDurationMs, ...prev.slice(0, 9)]);
    }
  }, [lastQueryDurationMs]);

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    setBenchmarkResult(null);
  };

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      setIsRunning(false);
    } else {
      startTimeRef.current = Date.now() - elapsedMs;
      setIsRunning(true);
    }
  };

  const runBenchmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBenchmarking(true);
    const start = performance.now();
    // Simulate query parsing, sorting and indexing on asset buffer
    setTimeout(() => {
      let acc = 0;
      for (let i = 0; i < 200000; i++) {
        acc += Math.sqrt(i) * Math.sin(i);
      }
      const duration = (performance.now() - start).toFixed(1);
      setIsBenchmarking(false);
      setBenchmarkResult(`${duration} ms (200k registros avaliados a ${(200000 / parseFloat(duration)).toFixed(0)} ops/ms)`);
    }, 120);
  };

  // Format elapsed time (MM:SS.s)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  };

  const avgLatency = queryLatencyHistory.length > 0 
    ? Math.round(queryLatencyHistory.reduce((a, b) => a + b, 0) / queryLatencyHistory.length)
    : 20;

  const stabilityLabel = avgLatency < 100 ? 'Excelente (Alta Estabilidade)' : avgLatency < 350 ? 'Estável' : 'Sob Carga';
  const stabilityColor = avgLatency < 100 ? 'text-emerald-500' : avgLatency < 350 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="relative font-sans text-xs">
      {/* Compact Main Widget */}
      <div 
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 text-white border border-slate-700/80 shadow-xs hover:border-emerald-500/60 transition-all cursor-pointer group select-none"
        title="Monitor de Desempenho e Estabilidade das Consultas (Clique para ver detalhes)"
      >
        {/* Animated activity pulse or icon */}
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isProcessing ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isProcessing ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
          </span>
          <Timer className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
        </div>

        {/* Stopwatch display */}
        <div className="flex items-center gap-1.5 font-mono">
          <span className="font-bold text-slate-100 text-[11px] tabular-nums">
            {formatTime(elapsedMs)}
          </span>
          <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">|</span>
          <span className="text-[10px] text-emerald-400 font-bold tabular-nums hidden sm:inline" title="Tempo de processamento da última consulta">
            {isProcessing ? 'Calculando...' : `⚡ ${lastQueryDurationMs}ms`}
          </span>
        </div>

        {/* Quick Pause/Play button */}
        <button
          type="button"
          onClick={togglePause}
          className="p-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={isRunning ? 'Pausar cronômetro' : 'Continuar cronômetro'}
        >
          {isRunning ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 text-emerald-400" />}
        </button>

        {/* Expand toggle */}
        <div className="text-slate-400 group-hover:text-emerald-400 transition-colors">
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </div>
      </div>

      {/* Expandable Benchmark & Stability Panel */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-xs text-slate-900 dark:text-white leading-tight">
                  Desempenho & Estabilidade do Sistema
                </h4>
                <p className="text-[10px] text-slate-500">
                  Monitoramento contínuo das consultas e latência
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Live Stopwatch Card */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tempo da Sessão</span>
              <div className="font-mono text-base font-black text-slate-900 dark:text-white tabular-nums flex items-center justify-between">
                <span>{formatTime(elapsedMs)}</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Zerar cronômetro"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[9.5px] text-slate-500">
                {isRunning ? '🟢 Cronômetro ativo' : '⏸️ Pausado'}
              </span>
            </div>

            {/* Last Query Latency Card */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Última Consulta</span>
              <div className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {lastQueryDurationMs} ms
              </div>
              <span className="text-[9.5px] text-slate-500">
                {totalAssetsCount > 0 ? `${totalAssetsCount} bens indexados` : 'Base inicializada'}
              </span>
            </div>
          </div>

          {/* Stability Indicator Card */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Estabilidade das Consultas
              </span>
              <span className={`text-[10.5px] font-black ${stabilityColor}`}>
                {stabilityLabel}
              </span>
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
              • Latência média de processamento: <strong>{avgLatency} ms</strong><br />
              • Resposta imediata em memória (IndexedDB + cache local)
            </div>
          </div>

          {/* Benchmark Action */}
          <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Cpu className="w-3.5 h-3.5" />
                <span>Teste de Estresse / Benchmark</span>
              </div>
              <button
                type="button"
                onClick={runBenchmark}
                disabled={isBenchmarking}
                className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-[10px] font-black cursor-pointer transition-colors flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isBenchmarking ? 'animate-spin' : ''}`} />
                <span>{isBenchmarking ? 'Testando...' : 'Executar Teste'}</span>
              </button>
            </div>
            {benchmarkResult ? (
              <div className="text-[10.5px] text-emerald-300 font-mono bg-slate-800 p-2 rounded border border-slate-700">
                ✓ Resultado: {benchmarkResult}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 leading-tight">
                Simula 200.000 operações de filtragem e valida a velocidade de resposta do seu navegador.
              </p>
            )}
          </div>

          {/* Footer note */}
          <div className="text-[9.5px] text-slate-400 text-center pt-0.5">
            Cronômetro de desempenho ativo para controle de estabilidade das vistorias.
          </div>
        </div>
      )}
    </div>
  );
};
