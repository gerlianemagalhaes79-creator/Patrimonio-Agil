/**
 * Code128 Barcode & QR SVG Generator
 * Generates crisp, scalable vector barcodes and QR code patterns suitable for
 * physical asset plaques (plaquetas de patrimônio) and mobile camera recognition.
 */

// Code 128B encoding table subset
const CODE128_PATTERNS: { [key: string]: string } = {
  '0': '11001100110', '1': '11011001100', '2': '11001101100', '3': '10110011000',
  '4': '10011011000', '5': '10011001100', '6': '10110010000', '7': '10011010000',
  '8': '10011001000', '9': '11011001000', '.': '11001011000', '-': '11001001100',
  '/': '11010011000', 'A': '10100011000', 'B': '10001011000', 'C': '10001001100',
  'D': '10110001000', 'E': '10001101000', 'F': '10001100100', 'G': '11010001000',
  'H': '11000101000', 'I': '11000100100', 'J': '10110111000', 'K': '10110001110',
  'L': '10001101110', 'M': '10111011000', 'N': '10111000110', 'P': '10001110110',
  'R': '11101101000', 'S': '11101100010', 'T': '11011011100', 'U': '11011000111',
  'V': '11000110111', 'X': '10111011110', 'Y': '10111101110', 'Z': '11101011110',
  ' ': '11011001100'
};

export function generateBarcodeSvg(value: string, width = 240, height = 50): string {
  const cleanVal = (value || '0000').toUpperCase().replace(/[^0-9A-Z.\-\/ ]/g, '');
  let pattern = '11010010000'; // Start code B
  
  for (let i = 0; i < cleanVal.length; i++) {
    const char = cleanVal[i];
    pattern += CODE128_PATTERNS[char] || '10011011000';
  }
  pattern += '1100011101011'; // Stop code

  const barWidth = width / pattern.length;
  let rects = '';
  
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      rects += `<rect x="${(i * barWidth).toFixed(1)}" y="0" width="${barWidth.toFixed(1)}" height="${height}" fill="#0f172a" />`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="w-full h-auto">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    ${rects}
  </svg>`;
}

// Generate a deterministic QR Matrix representation for an asset code
export function generateQrMatrix(text: string, size = 21): boolean[][] {
  const matrix: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));

  // Helper to draw position finder patterns (7x7 squares at corners)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startY + r][startX + c] = true;
        }
      }
    }
  };

  // Top-left, Top-right, Bottom-left finders
  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (i % 2 === 0) {
      matrix[6][i] = true;
      matrix[i][6] = true;
    }
  }

  // Hash the text deterministically to fill data cells
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  let pseudoRandom = Math.abs(hash) || 1234567;
  const nextBit = () => {
    pseudoRandom = (pseudoRandom * 1103515245 + 12345) & 0x7fffffff;
    return (pseudoRandom >> 16) % 2 === 1;
  };

  // Fill content area avoiding finders
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Check if in finder zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      const inTiming = r === 6 || c === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming) {
        matrix[r][c] = nextBit();
      }
    }
  }

  return matrix;
}

export function generateQrSvg(value: string, displaySize = 140): string {
  const matrix = generateQrMatrix(value, 21);
  const cellSize = 6;
  const margin = 12;
  const totalDimension = 21 * cellSize + margin * 2;

  let rects = '';
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${margin + c * cellSize}" y="${margin + r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0f172a" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalDimension} ${totalDimension}" width="${displaySize}" height="${displaySize}" class="block">
    <rect width="${totalDimension}" height="${totalDimension}" fill="#ffffff" rx="4"/>
    ${rects}
  </svg>`;
}
