import { renderVietQR } from './render.js';
import { buildVietQR } from './build.js';
import { findBank } from './index.js';

/**
 * Encodes an SVG string to a data URL
 */
function svgToDataURL(svg) {
  // Use encodeURIComponent to handle non-ASCII characters properly
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

/**
 * Converts a raw VietQR payload into a beautiful predefined SVG template.
 * @param {string} payload
 * @param {string} templateId - e.g., 'polaroid', 'minimal'
 * @param {Object} data
 * @param {string} data.bankBin
 * @param {string} data.accountNo
 * @param {number} [data.amount]
 * @param {string} [data.purpose]
 * @param {string} [data.accountName]
 * @param {string} [data.bankName]
 */
export function generateVietQRCard(payload, templateId = 'minimal', data = {}) {
  // Default font stack prioritizing system UI fonts
  const fontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const qrSize = 300;

  // Try to lookup bank name if not provided
  let bankName = data.bankName;
  if (!bankName && data.bankBin) {
     const b = findBank(data.bankBin);
     if (b) bankName = b.short;
  }

  // Format amount safely
  let amountStr = '';
  if (data.amount) {
     amountStr = data.amount.toLocaleString('vi-VN') + ' VND';
  }

  // Create a temporary container to extract the raw QR SVG from core renderer
  const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
  let qrSvgStr = '';

  if (tempDiv) {
    // Generate QR using SVG mode
    renderVietQR(tempDiv, payload, { size: qrSize });

    // The core renderer returns <svg>...</svg>.
    // We want to extract the inner contents (the rect and path)
    // to embed it into our own card SVG.
    const match = tempDiv.innerHTML.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    if (match) {
        qrSvgStr = match[1];
    }
  } else {
    throw new Error('generateVietQRCard requires a DOM environment (document) to parse core SVG.');
  }

  // ----------------------------------------------------
  // Template: Minimal (1E TỐI GIẢN - like the user image)
  // ----------------------------------------------------
  if (templateId === 'minimal') {
     const padding = 20;
     const headerHeight = 40;

     const cardWidth = qrSize + (padding * 2);
     const cardHeight = headerHeight + qrSize + (padding * 2);

     // 1E box parameters
     const badgeW = 36;
     const badgeH = 26;
     const badgeX = padding;
     const badgeY = padding;

     const titleX = badgeX + badgeW + 10;
     const titleY = badgeY + 18;

     let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">`;
     // Background
     svg += `<rect width="100%" height="100%" fill="#f4f4f4"/>`;

     // Header Badge "1E"
     svg += `<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" fill="#e62e10"/>`;
     svg += `<text x="${badgeX + badgeW/2}" y="${badgeY + 18}" font-family="${fontStack}" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle">1E</text>`;

     // Header Title
     svg += `<text x="${titleX}" y="${titleY}" font-family="${fontStack}" font-weight="900" font-size="16" fill="#1f2937">TỐI GIẢN</text>`;

     // QR Container (White box)
     const qrContainerY = headerHeight + padding;
     svg += `<rect x="${padding}" y="${qrContainerY}" width="${qrSize}" height="${qrSize}" fill="#ffffff" />`;

     // Inject Core QR inside a nested svg to easily translate it
     svg += `<svg x="${padding}" y="${qrContainerY}" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">`;
     svg += qrSvgStr;
     svg += `</svg>`;

     svg += `</svg>`;

     return {
       svg,
       dataURL: svgToDataURL(svg)
     };
  }

  // ----------------------------------------------------
  // Template: Polaroid (1A)
  // ----------------------------------------------------
  if (templateId === 'polaroid') {
    const cardWidth = 360;
    const cardHeight = 480;
    const innerPadding = 20;
    const qrDisplaySize = cardWidth - (innerPadding * 2);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">`;

    // Background shadow & card base
    svg += `<rect x="5" y="5" width="${cardWidth-10}" height="${cardHeight-10}" rx="12" fill="#000000" opacity="0.1"/>`;
    svg += `<rect x="0" y="0" width="${cardWidth-10}" height="${cardHeight-10}" rx="12" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>`;

    // QR Code Placement
    svg += `<svg x="${innerPadding}" y="${innerPadding}" width="${qrDisplaySize}" height="${qrDisplaySize}" viewBox="0 0 ${qrSize} ${qrSize}">`;
    svg += qrSvgStr;
    svg += `</svg>`;

    let currentY = innerPadding + qrDisplaySize + 30;

    // Bank Name
    if (bankName) {
       svg += `<text x="${cardWidth/2}" y="${currentY}" font-family="${fontStack}" font-weight="bold" font-size="16" fill="#6b7280" text-anchor="middle">${bankName}</text>`;
       currentY += 26;
    }

    // Account Name
    if (data.accountName) {
       svg += `<text x="${cardWidth/2}" y="${currentY}" font-family="${fontStack}" font-weight="900" font-size="20" fill="#111827" text-anchor="middle">${data.accountName}</text>`;
       currentY += 24;
    }

    // Account Number
    if (data.accountNo) {
       svg += `<text x="${cardWidth/2}" y="${currentY}" font-family="${fontStack}" font-size="16" fill="#374151" text-anchor="middle">${data.accountNo}</text>`;
       currentY += 30;
    }

    // Amount & Purpose
    if (amountStr) {
       svg += `<text x="${cardWidth/2}" y="${currentY}" font-family="${fontStack}" font-weight="bold" font-size="24" fill="#2563eb" text-anchor="middle">${amountStr}</text>`;
       currentY += 26;
    }

    if (data.purpose) {
       svg += `<text x="${cardWidth/2}" y="${currentY}" font-family="${fontStack}" font-size="14" font-style="italic" fill="#6b7280" text-anchor="middle">${data.purpose}</text>`;
    }

    svg += `</svg>`;

    return {
      svg,
      dataURL: svgToDataURL(svg)
    };
  }

  throw new Error(`Unknown templateId: ${templateId}`);
}
