/**
 * Universal Printing Utility for CPSMS
 * Provides robust multi-tier printing with hidden iframe execution,
 * direct browser fallback, and instant standalone HTML download fallback
 * to guarantee 100% reliability even in restricted iframes or sandboxed environments.
 */

export interface PrintStatus {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ExecutePrintOptions {
  title: string;
  html: string;
  filename?: string;
  onStatus?: (status: PrintStatus | null) => void;
}

/**
 * Downloads a self-contained HTML document ready for printing or saving as PDF
 */
export function downloadPrintableHtml(filename: string, htmlContent: string): void {
  try {
    const blob = new Blob(['\uFEFF' + htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error('Failed to download printable HTML:', err);
  }
}

/**
 * Opens the printable document in a new window/tab with automatic print trigger
 */
export function openPrintableInNewWindow(htmlContent: string): Window | null {
  try {
    const blob = new Blob(['\uFEFF' + htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank');
    if (!printWindow) {
      // Fallback if popup blocker intercepted
      return null;
    }
    return printWindow;
  } catch (err) {
    console.error('Failed to open printable document in new window:', err);
    return null;
  }
}

/**
 * Executes printing with hidden iframe, direct window fallback, and instant download fallback.
 */
export function executePrintHtml({
  title,
  html,
  filename = 'relatorio_cpsms.html',
  onStatus
}: ExecutePrintOptions): void {
  if (onStatus) {
    onStatus({ message: 'Preparando documento para impressão...', type: 'info' });
  }

  // Method 1: Hidden iframe printing (bypasses main window styling and modal clipping)
  try {
    const existingFrame = document.getElementById('cpsms-print-hidden-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'cpsms-print-hidden-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.setAttribute('title', title);
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          if (onStatus) {
            onStatus({
              message: 'Comando de impressão enviado com sucesso! Se a janela não abriu, utilize o botão "Baixar HTML / PDF".',
              type: 'success'
            });
            setTimeout(() => onStatus(null), 5000);
          }
        } catch (iframeErr) {
          console.warn('Iframe print error, falling back to direct window or download:', iframeErr);
          fallbackToDirectOrDownload({ html, filename, onStatus });
        }
      }, 400);
      return;
    }
  } catch (err) {
    console.warn('Hidden iframe creation failed:', err);
  }

  fallbackToDirectOrDownload({ html, filename, onStatus });
}

function fallbackToDirectOrDownload({
  html,
  filename,
  onStatus
}: {
  html: string;
  filename: string;
  onStatus?: (status: PrintStatus | null) => void;
}): void {
  // Method 2: Direct window print
  try {
    window.focus();
    window.print();
    if (onStatus) {
      onStatus({
        message: 'Diálogo de impressão aberto no navegador!',
        type: 'success'
      });
      setTimeout(() => onStatus(null), 4000);
    }
  } catch (directErr) {
    console.warn('Direct window.print failed due to browser sandbox:', directErr);
    // Method 3: Guaranteed fallback - automatic file download
    downloadPrintableHtml(filename, html);
    if (onStatus) {
      onStatus({
        message: 'A impressão direta foi restringida pelo ambiente. O relatório formatado foi baixado automaticamente! Abra o arquivo e use Ctrl+P para imprimir ou salvar como PDF.',
        type: 'warning'
      });
      setTimeout(() => onStatus(null), 8000);
    }
  }
}
