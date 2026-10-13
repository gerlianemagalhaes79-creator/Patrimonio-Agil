import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Asset, Sector, UserProfile } from '../types';
import { formatBRL } from './formatters';
import { 
  doesAssetOfficiallyMatchRoom, 
  doesAssetPhysicallyMatchRoom, 
  getAssetFullLocation,
  normalizeLoc
} from './locationHelper';

export interface GenerateAspecPdfParams {
  sector: Sector | { 
    id: string; 
    nome: string; 
    responsavel?: string; 
    responsavelNome?: string; 
    responsavelCargo?: string;
    responsavelOriginalAspec?: string;
    liderAlterado?: boolean;
    novoLider?: string;
    novoCargo?: string;
  } | null;
  unit: { id: string; nome: string; sigla: string };
  assets: Asset[];
  currentProfile: UserProfile;
  leaderChange?: {
    originalLeader: string;
    newLeader: string;
    newCargo?: string;
  };
}

export interface AspecRoomAuditStats {
  sectorName: string;
  isRoomAllOk: boolean;
  totalAspec: number;
  confirmedCount: number;
  missingCount: number;
  findingsCount: number;
  aspecRegisteredAssets: Asset[];
  confirmedPresent: Asset[];
  markedMissing: Asset[];
  physicalFindingsInRoom: Asset[];
}

export function computeRoomAuditStats(
  sector: GenerateAspecPdfParams['sector'],
  assets: Asset[]
): AspecRoomAuditStats {
  const sectorName = sector?.nome || 'Sala';

  // 1. Bens cadastrados oficialmente no ASPEC para esta sala
  const aspecRegisteredAssets = assets.filter(a => {
    if (a.foraDoAspec) return false;
    return doesAssetOfficiallyMatchRoom(a, sectorName);
  });

  // 1.1 Bens confirmados presentes (OK)
  const confirmedPresent = aspecRegisteredAssets.filter(
    a => a.auditoria?.conferido && a.auditoria?.statusDivergencia !== 'nao_encontrado'
  );

  // 1.2 Bens marcados como não encontrados nesta sala (X)
  const markedMissing = aspecRegisteredAssets.filter(
    a => a.auditoria?.statusDivergencia === 'nao_encontrado'
  );

  // 2. Bens encontrados fisicamente nesta sala mas com lotação anterior em outro lugar ou fora do ASPEC
  const physicalFindingsInRoom = assets.filter(a => {
    const isMissing = a.auditoria?.statusDivergencia === 'nao_encontrado';
    if (isMissing) return false;

    const isAuditedHere = doesAssetPhysicallyMatchRoom(a, sectorName);
    const isOriginallyHere = doesAssetOfficiallyMatchRoom(a, sectorName);

    if (a.foraDoAspec && isAuditedHere) return true;
    if (isAuditedHere && !isOriginallyHere) return true;
    return false;
  });

  const isRoomAllOk = markedMissing.length === 0 && physicalFindingsInRoom.length === 0 && aspecRegisteredAssets.length > 0;

  return {
    sectorName,
    isRoomAllOk,
    totalAspec: aspecRegisteredAssets.length,
    confirmedCount: confirmedPresent.length,
    missingCount: markedMissing.length,
    findingsCount: physicalFindingsInRoom.length,
    aspecRegisteredAssets,
    confirmedPresent,
    markedMissing,
    physicalFindingsInRoom
  };
}

/**
 * Generates and downloads the official PDF document for the room audit
 * contrasting physical inventory vs. ASPEC registered system data.
 */
export function downloadAspecRoomPdf({
  sector,
  unit,
  assets,
  currentProfile,
  leaderChange
}: GenerateAspecPdfParams): { filename: string; isAllOk: boolean } {
  const stats = computeRoomAuditStats(sector, assets);
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateFileSafe = now.toISOString().slice(0, 10);
  const sectorFileSafe = (sector?.nome || 'Sala').replace(/[^a-zA-Z0-9_\-]/g, '_');

  // 0. Detect Leader Change (Líder alterado in loco vs cadastrado no ASPEC)
  let leaderChangeInfo: { originalLeader: string; newLeader: string; newCargo?: string } | null = null;
  if (leaderChange && leaderChange.newLeader && leaderChange.originalLeader && leaderChange.newLeader.trim().toLowerCase() !== leaderChange.originalLeader.trim().toLowerCase()) {
    leaderChangeInfo = leaderChange;
  } else {
    try {
      const rawChanges = typeof localStorage !== 'undefined' ? localStorage.getItem('cpsms_room_leader_changes') : null;
      if (rawChanges) {
        const parsed = JSON.parse(rawChanges);
        const secKey = sector?.nome || '';
        const secId = (sector && 'id' in sector ? (sector as any).id : '') || '';
        const foundChange = parsed[secKey] || parsed[secId] || parsed[normalizeLoc(secKey)] || (secId ? parsed[normalizeLoc(secId)] : null);
        if (foundChange && foundChange.newLeader && foundChange.originalLeader && foundChange.newLeader.trim().toLowerCase() !== foundChange.originalLeader.trim().toLowerCase()) {
          leaderChangeInfo = {
            originalLeader: foundChange.originalLeader,
            newLeader: foundChange.newLeader,
            newCargo: foundChange.newCargo
          };
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!leaderChangeInfo && sector && 'responsavelOriginalAspec' in sector && (sector as any).responsavelOriginalAspec) {
    const orig = (sector as any).responsavelOriginalAspec;
    const current = (sector as any).responsavelNome || (sector as any).responsavel;
    if (orig && current && orig.trim().toLowerCase() !== current.trim().toLowerCase()) {
      leaderChangeInfo = {
        originalLeader: orig,
        newLeader: current,
        newCargo: (sector as any).responsavelCargo
      };
    }
  }

  if (!leaderChangeInfo && sector && (sector as any).liderAlterado && (sector as any).responsavelOriginalAspec) {
    leaderChangeInfo = {
      originalLeader: (sector as any).responsavelOriginalAspec,
      newLeader: (sector as any).responsavelNome || (sector as any).responsavel || '',
      newCargo: (sector as any).responsavelCargo
    };
  }

  const sectorResponsavel = leaderChangeInfo?.newLeader ||
    (sector && 'responsavelNome' in sector ? sector.responsavelNome : '') ||
    (sector && 'responsavel' in sector ? (sector as any).responsavel : '') ||
    'Não definido';
  const sectorCargo = leaderChangeInfo?.newCargo ||
    (sector && 'responsavelCargo' in sector ? sector.responsavelCargo : '') || 
    'Responsável Setorial';

  // Create jsPDF in A4 portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 14;

  // 1. Official Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(10, currentY, pageWidth - 20, 1.2, 'F');
  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('ESTADO DO CEARÁ · CONSÓRCIO PÚBLICO DE SAÚDE DA MICRORREGIÃO DE SOBRAL — CPSMS', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('GERÊNCIA DE PATRIMÔNIO · COMISSÃO DE INVENTÁRIO FÍSICO 2026', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(`${unit.nome.toUpperCase()} (${unit.sigla})`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  // 2. Title Box
  if (stats.isRoomAllOk && !leaderChangeInfo) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.roundedRect(10, currentY, pageWidth - 20, 11, 2, 2, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.text('TERMO DE CONFERÊNCIA PATRIMONIAL REGULAR — SALA 100% CONFORME AO ASPEC', pageWidth / 2, currentY + 4.5, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87);
    doc.text('DISPENSA QUALQUER ALTERAÇÃO OU MOVIMENTAÇÃO DE CARGA NO SISTEMA CONTÁBIL ASPEC', pageWidth / 2, currentY + 8.5, { align: 'center' });
    currentY += 14;
  } else if (stats.isRoomAllOk && leaderChangeInfo) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(217, 119, 6); // amber-600
    doc.roundedRect(10, currentY, pageWidth - 20, 12.5, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(146, 64, 14); // amber-900
    doc.text('TERMO DE CONFERÊNCIA COM ALTERAÇÃO DE LÍDER — EXIGÊNCIA DE ATUALIZAÇÃO NO ASPEC', pageWidth / 2, currentY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text('BENS FÍSICOS CONFORMES · OBRIGATÓRIO ALTERAR O LÍDER DESTA SALA NO SISTEMA ASPEC CONTÁBIL', pageWidth / 2, currentY + 9, { align: 'center' });
    currentY += 15.5;
  } else {
    doc.setFillColor(255, 247, 237); // orange-50
    doc.setDrawColor(234, 88, 12); // orange-600
    doc.roundedRect(10, currentY, pageWidth - 20, 12.5, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(154, 52, 18); // orange-800
    doc.text(
      leaderChangeInfo 
        ? 'RELATÓRIO DE DIVERGÊNCIAS E ALTERAÇÃO DE LÍDER PARA ATUALIZAÇÃO NO ASPEC'
        : 'RELATÓRIO DE MOVIMENTAÇÃO E DIVERGÊNCIAS PARA ATUALIZAÇÃO NO ASPEC', 
      pageWidth / 2, 
      currentY + 4.5, 
      { align: 'center' }
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(194, 65, 12);
    doc.text(
      leaderChangeInfo
        ? 'REGISTRO DE BENS E EXIGÊNCIA OBRIGATÓRIA DE ALTERAÇÃO DO LÍDER NO SISTEMA ASPEC'
        : 'REGISTRO DE BENS ENCONTRADOS, TRANSFERÊNCIAS DE OUTRAS SALAS E APURAÇÃO DE SAÍDAS',
      pageWidth / 2, 
      currentY + 9, 
      { align: 'center' }
    );
    currentY += 15.5;
  }

  // 3. Metadata Box
  const metaBoxH = leaderChangeInfo ? 23 : 19;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(10, currentY, pageWidth - 20, metaBoxH, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.text('Ambiente / Sala:', 14, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.sectorName}`, 38, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Unidade Gestora:', 14, currentY + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${unit.nome} (${unit.sigla})`, 38, currentY + 9);

  if (leaderChangeInfo) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text('Líder no ASPEC:', 14, currentY + 13.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${leaderChangeInfo.originalLeader} (Anterior)`, 38, currentY + 13.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70);
    doc.text('Novo Líder (Físico):', 14, currentY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${leaderChangeInfo.newLeader} (${sectorCargo}) [ALTERADO IN LOCO]`, 42, currentY + 18);
    doc.setTextColor(30, 41, 59);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.text('Responsável Sala:', 14, currentY + 13.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${sectorResponsavel} (${sectorCargo})`, 38, currentY + 13.5);
  }

  // Column 2
  const col2X = 110;
  doc.setFont('helvetica', 'bold');
  doc.text('Data/Hora Vistoria:', col2X, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dateStr} às ${timeStr}`, col2X + 27, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Vistoriador(a):', col2X, currentY + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${currentProfile.nome} (${currentProfile.cargo || 'Gestão Patrimônio'})`, col2X + 27, currentY + 9);

  doc.setFont('helvetica', 'bold');
  doc.text('Carga no ASPEC:', col2X, currentY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.totalAspec} bem(ns) cadastrados`, col2X + 27, currentY + 13.5);

  currentY += metaBoxH + 4;

  // 4. Summary Badges (cards)
  const cardW = (pageWidth - 26) / 3;
  const cardH = 11;

  // Card 1: Confirmados OK
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(10, currentY, cardW, cardH, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text(`CONFIRMADOS OK: ${stats.confirmedCount}`, 10 + cardW / 2, currentY + 4.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Bens mantidos nesta sala', 10 + cardW / 2, currentY + 8.5, { align: 'center' });

  // Card 2: Entradas nesta Sala
  const card2X = 10 + cardW + 3;
  doc.setFillColor(254, 252, 232);
  doc.setDrawColor(253, 224, 71);
  doc.roundedRect(card2X, currentY, cardW, cardH, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(133, 77, 14);
  doc.text(`ENTRADAS FÍSICAS: ${stats.findingsCount}`, card2X + cardW / 2, currentY + 4.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Transferir de outra sala / Inclusão', card2X + cardW / 2, currentY + 8.5, { align: 'center' });

  // Card 3: Saídas / Não Localizados
  const card3X = card2X + cardW + 3;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(252, 165, 165);
  doc.roundedRect(card3X, currentY, cardW, cardH, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  doc.text(`SAÍDAS / AUSENTES: ${stats.missingCount}`, card3X + cardW / 2, currentY + 4.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Não encontrados aqui (apuração)', card3X + cardW / 2, currentY + 8.5, { align: 'center' });

  currentY += 15;

  // 4.1 Caixa Oficial de Destaque: EXIGÊNCIA DE ALTERAÇÃO DE LÍDER NO ASPEC
  if (leaderChangeInfo) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(217, 119, 6); // amber-600
    doc.roundedRect(10, currentY, pageWidth - 20, 24, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14); // amber-900
    doc.text('⚠️ ATENÇÃO CONTABILIDADE: NO SISTEMA ASPEC TEM QUE ALTERAR O LÍDER DESTA SALA', 14, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(120, 53, 15); // amber-950
    doc.text('Durante a vistoria in loco, foi formalizada a substituição do líder/responsável setorial pela guarda da carga patrimonial:', 14, currentY + 8.5);

    doc.setFont('helvetica', 'bold');
    doc.text('• LÍDER ANTERIOR NO ASPEC:', 14, currentY + 12.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${leaderChangeInfo.originalLeader} (Titular Anterior)`, 62, currentY + 12.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70);
    doc.text('• NOVO LÍDER (INVENTÁRIO FÍSICO):', 14, currentY + 16.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${leaderChangeInfo.newLeader} (${sectorCargo}) — NOVO TITULAR`, 68, currentY + 16.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`DETERMINAÇÃO OBRIGATÓRIA: NO SISTEMA ASPEC TEM QUE ALTERAR O LÍDER desta sala de "${leaderChangeInfo.originalLeader}" para "${leaderChangeInfo.newLeader}".`, 14, currentY + 21);

    currentY += 27;
  }

  // Helper to format responsible for an asset
  const getAssetResponsible = (a: Asset): string => {
    return a.responsavelNome || a.auditoria?.responsavelConferencia || sectorResponsavel || '—';
  };

  // IF ROOM HAS DIVERGENCES:
  if (!stats.isRoomAllOk) {
    // TABLE 1: ENTRADAS / BENS ENCONTRADOS NESTA SALA
    if (stats.physicalFindingsInRoom.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(133, 77, 14); // amber-800
      doc.text(`1. ENTRADAS NESTA SALA (${stats.physicalFindingsInRoom.length} itens) — Bens que estavam no ASPEC em outra sala ou fora do ASPEC`, 10, currentY);
      currentY += 2;

      const findingsData = stats.physicalFindingsInRoom.map(a => {
        const fullLoc = getAssetFullLocation(a);
        const originDesc = a.foraDoAspec 
          ? 'NÃO CONSTAVA NO ASPEC (ACHADO FÍSICO)' 
          : `${fullLoc.subarea || fullLoc.area || 'Outra sala'} (${fullLoc.area})`;
        
        const actionDesc = a.foraDoAspec 
          ? '[INCLUSÃO CONTÁBIL]\nCadastrar no ASPEC' 
          : `[TRANSFERÊNCIA]\nMudar de "${fullLoc.subarea || 'Outra sala'}" para esta sala`;

        return [
          a.tombamento,
          a.tomboOrigemSesa || '—',
          a.descricao + (a.semPlaqueta ? ' [SEM PLAQUETA]' : ''),
          originDesc,
          getAssetResponsible(a),
          actionDesc
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Tombo', 'SESA', 'Descrição do Bem', 'Origem Anterior (ASPEC)', 'Responsável', 'Ação no ASPEC']],
        body: findingsData,
        theme: 'grid',
        headStyles: {
          fillColor: [180, 83, 9], // amber-700
          textColor: 255,
          fontSize: 7,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold' },
          1: { cellWidth: 16 },
          2: { cellWidth: 46 },
          3: { cellWidth: 38 },
          4: { cellWidth: 26 },
          5: { cellWidth: 44 }
        },
        margin: { left: 10, right: 10 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // TABLE 2: SAÍDAS / BENS COM X NÃO ENCONTRADOS
    if (stats.markedMissing.length > 0) {
      // Check if page needs break
      if (currentY > 230) {
        doc.addPage();
        currentY = 15;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(153, 27, 27); // red-800
      doc.text(`2. SAÍDAS / NÃO ENCONTRADOS NESTA SALA (${stats.markedMissing.length} itens) — Constavam no ASPEC mas não vistos aqui`, 10, currentY);
      currentY += 2;

      const missingData = stats.markedMissing.map(a => [
        a.tombamento,
        a.tomboOrigemSesa || '—',
        a.descricao,
        stats.sectorName,
        getAssetResponsible(a),
        '[EM APURAÇÃO / AGUARDAR DEMAIS SALAS]\nNão dar baixa imediata. Se localizado em outra sala, o sistema transitará.'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Tombo', 'SESA', 'Descrição do Bem', 'Lotação Original', 'Responsável', 'Ação no ASPEC']],
        body: missingData,
        theme: 'grid',
        headStyles: {
          fillColor: [185, 28, 28], // red-700
          textColor: 255,
          fontSize: 7,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold' },
          1: { cellWidth: 16 },
          2: { cellWidth: 46 },
          3: { cellWidth: 32 },
          4: { cellWidth: 26 },
          5: { cellWidth: 50 }
        },
        margin: { left: 10, right: 10 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // TABLE 3: BENS CONFORMES / PRESENTES NO LOCAL
  if (currentY > 220) {
    doc.addPage();
    currentY = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text(
    stats.isRoomAllOk
      ? `RELAÇÃO DE TODOS OS BENS CONFORMES E LOCALIZADOS NESTA SALA (${stats.aspecRegisteredAssets.length} itens)`
      : `3. BENS MANTIDOS E CONFORMES NESTA SALA (${stats.confirmedPresent.length} itens) — Dispensa alteração no ASPEC`,
    10,
    currentY
  );
  currentY += 2;

  const presentList = stats.isRoomAllOk ? stats.aspecRegisteredAssets : stats.confirmedPresent;
  const presentData = presentList.map(a => [
    a.tombamento,
    a.tomboOrigemSesa || '—',
    a.descricao,
    a.estado || 'BOM',
    formatBRL(a.valorAquisicao || 0),
    getAssetResponsible(a),
    '✓ CONFORME'
  ]);

  if (presentData.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Tombo', 'SESA', 'Descrição do Bem', 'Estado', 'Valor', 'Responsável', 'Situação']],
      body: presentData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 7,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 6.5,
        cellPadding: 1.5,
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 16 },
        2: { cellWidth: 54 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 32 },
        6: { cellWidth: 26, halign: 'center', fontStyle: 'bold' }
      },
      margin: { left: 10, right: 10 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Certification Note
  if (currentY > 235) {
    doc.addPage();
    currentY = 15;
  }

  const metaNoteH = leaderChangeInfo ? 19 : 15;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, currentY, pageWidth - 20, metaNoteH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PARECER CONCLUSIVO DA COMISSÃO DE INVENTÁRIO PATRIMONIAL:', 13, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  let parecertxt = '';
  if (leaderChangeInfo) {
    parecertxt = `Certifico para os devidos fins de controle interno e prestação de contas (TCE-CE), que foi concluída a auditoria física in loco na sala "${stats.sectorName}". NOTIFICAÇÃO OBRIGATÓRIA: CONSTA ALTERAÇÃO DO LÍDER/RESPONSÁVEL SETORIAL. NO SISTEMA ASPEC TEM QUE ALTERAR O LÍDER DESTA SALA DE "${leaderChangeInfo.originalLeader}" PARA O NOVO LÍDER "${leaderChangeInfo.newLeader}" (${sectorCargo}), transferindo a titularidade da carga contábil e emitindo o respectivo Termo de Responsabilidade atualizado.`;
  } else if (stats.isRoomAllOk) {
    parecertxt = `Certifico para os devidos fins de controle interno, prestação de contas (TCE-CE) e consolidação do inventário anual do CPSMS, que a sala "${stats.sectorName}" encontra-se em total conformidade com a base contábil do sistema ASPEC, permanecendo inalterada a sua carga patrimonial e todos os responsáveis identificados.`;
  } else {
    parecertxt = `Certifico que foi realizada a conferência física in loco na sala "${stats.sectorName}". O presente relatório aponta as divergências apuradas (entradas e saídas) em relação ao sistema ASPEC para que o Setor de Contabilidade execute os lançamentos de transferência e inclusão patrimonial devidos.`;
  }

  const splitParecer = doc.splitTextToSize(parecertxt, pageWidth - 26);
  doc.text(splitParecer, 13, currentY + 8);

  currentY += metaNoteH + 6;

  // Signatures
  if (currentY > 240) {
    doc.addPage();
    currentY = 25;
  }

  const sigCol1 = 20;
  const sigCol2 = pageWidth / 2 + 10;
  const sigLineW = (pageWidth / 2) - 30;

  // Line 1
  doc.setDrawColor(15, 23, 42);
  doc.line(sigCol1, currentY + 12, sigCol1 + sigLineW, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(currentProfile.nome, sigCol1 + sigLineW / 2, currentY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Presidente da Comissão / Gestão de Patrimônio', sigCol1 + sigLineW / 2, currentY + 19.5, { align: 'center' });
  doc.text('CPSMS', sigCol1 + sigLineW / 2, currentY + 22.5, { align: 'center' });

  // Line 2
  doc.line(sigCol2, currentY + 12, sigCol2 + sigLineW, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(sectorResponsavel || 'Responsável Setorial', sigCol2 + sigLineW / 2, currentY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(sectorCargo || 'Responsável pelo Setor / Diretor', sigCol2 + sigLineW / 2, currentY + 19.5, { align: 'center' });
  const subSigText = leaderChangeInfo 
    ? 'Novo Líder Designado (Alterar no ASPEC)' 
    : 'Atesto de Presença e Guarda dos Bens';
  doc.text(subSigText, sigCol2 + sigLineW / 2, currentY + 22.5, { align: 'center' });

  // Filename
  const prefix = stats.isRoomAllOk ? 'TERMO_CONFERENCIA_REGULAR_ASPEC' : 'RELATORIO_DIVERGENCIAS_MOVIMENTACAO_ASPEC';
  const filename = `${prefix}_${sectorFileSafe}_${dateFileSafe}.pdf`;

  // Trigger Save / Download
  doc.save(filename);

  return {
    filename,
    isAllOk: stats.isRoomAllOk
  };
}
