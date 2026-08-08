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

  // ----------------------------------------------------
  // Template: Receipt (1C - Biên lai)
  // ----------------------------------------------------
  if (templateId === 'receipt') {
    const cardWidth = 360;
    const cardHeight = 600;
    const innerPadding = 24;
    const qrDisplaySize = cardWidth - (innerPadding * 2);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">`;

    // Receipt Base (Slightly off-white)
    svg += `<rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" fill="#fcfcfc" />`;

    // Receipt Top Zigzag
    let zigzag = `M0,0 `;
    for (let i = 0; i < cardWidth; i += 10) {
      zigzag += `L${i+5},8 L${i+10},0 `;
    }
    svg += `<path d="${zigzag}" fill="#e5e7eb" />`;

    // QR Code Placement
    const qrY = innerPadding + 10;
    svg += `<svg x="${innerPadding}" y="${qrY}" width="${qrDisplaySize}" height="${qrDisplaySize}" viewBox="0 0 ${qrSize} ${qrSize}">`;
    svg += qrSvgStr;
    svg += `</svg>`;

    let currentY = qrY + qrDisplaySize + 20;

    // Dashed Divider
    svg += `<line x1="${innerPadding}" y1="${currentY}" x2="${cardWidth - innerPadding}" y2="${currentY}" stroke="#d1d5db" stroke-width="2" stroke-dasharray="6, 4" />`;
    currentY += 30;

    const rowHeight = 28;
    const labelX = innerPadding;
    const valueX = cardWidth - innerPadding;

    const drawRow = (label, value, isBold = false) => {
        if (!value) return;
        svg += `<text x="${labelX}" y="${currentY}" font-family="${fontStack}" font-size="14" fill="#6b7280" text-anchor="start">${label}</text>`;
        svg += `<text x="${valueX}" y="${currentY}" font-family="${fontStack}" font-size="14" font-weight="${isBold ? 'bold' : 'normal'}" fill="#111827" text-anchor="end">${value}</text>`;
        currentY += rowHeight;
    };

    drawRow('Ngân hàng', bankName, true);
    drawRow('Tài khoản', data.accountNo, true);
    drawRow('Chủ thẻ', data.accountName, true);

    currentY += 10;
    svg += `<line x1="${innerPadding}" y1="${currentY}" x2="${cardWidth - innerPadding}" y2="${currentY}" stroke="#d1d5db" stroke-width="2" stroke-dasharray="6, 4" />`;
    currentY += 30;

    if (amountStr) {
       svg += `<text x="${labelX}" y="${currentY}" font-family="${fontStack}" font-size="16" fill="#6b7280" text-anchor="start">Tổng tiền</text>`;
       svg += `<text x="${valueX}" y="${currentY}" font-family="${fontStack}" font-size="20" font-weight="900" fill="#2563eb" text-anchor="end">${amountStr}</text>`;
       currentY += rowHeight + 10;
    }

    if (data.purpose) {
       drawRow('Nội dung', data.purpose);
    }

    // Receipt Bottom Zigzag
    let bottomZigzag = `M0,${cardHeight} `;
    for (let i = 0; i < cardWidth; i += 10) {
      bottomZigzag += `L${i+5},${cardHeight-8} L${i+10},${cardHeight} `;
    }
    svg += `<path d="${bottomZigzag}" fill="#e5e7eb" />`;

    svg += `</svg>`;

    return {
      svg,
      dataURL: svgToDataURL(svg)
    };
  }

  // ----------------------------------------------------
  // Template: Boarding Pass (1B - Vé máy bay)
  // ----------------------------------------------------
  if (templateId === 'boarding-pass') {
    const cardWidth = 600;
    const cardHeight = 260;
    const leftWidth = 400; // Left section width
    const rightWidth = 200; // Right section width
    const qrDisplaySize = 160;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">`;

    // Boarding Pass Base
    svg += `<rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="16" fill="#1e3a8a" />`;

    // Right section background (White/light gray)
    svg += `<rect x="${leftWidth}" y="0" width="${rightWidth}" height="${cardHeight}" rx="16" fill="#ffffff" />`;
    // Fix the corner overlap between left and right sections
    svg += `<rect x="${leftWidth}" y="0" width="16" height="${cardHeight}" fill="#ffffff" />`;

    // Perforated line (dashed) dividing the two sections
    svg += `<line x1="${leftWidth}" y1="0" x2="${leftWidth}" y2="${cardHeight}" stroke="#9ca3af" stroke-width="2" stroke-dasharray="6, 6" />`;

    // Circular cutouts at top and bottom of the perforated line
    svg += `<circle cx="${leftWidth}" cy="0" r="10" fill="#1e3a8a" />`;
    svg += `<circle cx="${leftWidth}" cy="${cardHeight}" r="10" fill="#1e3a8a" />`;

    // --- Left Section (Details) ---
    const paddingLeft = 30;
    let currentYLeft = 40;

    // Header
    svg += `<text x="${paddingLeft}" y="${currentYLeft}" font-family="${fontStack}" font-size="14" font-weight="bold" fill="#93c5fd" text-anchor="start">VIETQR BOARDING PASS</text>`;
    currentYLeft += 40;

    // Amount & Bank Name
    svg += `<text x="${paddingLeft}" y="${currentYLeft}" font-family="${fontStack}" font-size="32" font-weight="900" fill="#ffffff" text-anchor="start">${amountStr || 'NO AMOUNT'}</text>`;
    currentYLeft += 25;
    svg += `<text x="${paddingLeft}" y="${currentYLeft}" font-family="${fontStack}" font-size="14" fill="#bfdbfe" text-anchor="start">${bankName || 'BANK'}</text>`;
    currentYLeft += 50;

    // Details row
    const drawLeftLabelValue = (x, y, label, value) => {
        svg += `<text x="${x}" y="${y}" font-family="${fontStack}" font-size="12" fill="#93c5fd" text-anchor="start">${label}</text>`;
        svg += `<text x="${x}" y="${y + 20}" font-family="${fontStack}" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="start">${value}</text>`;
    };

    drawLeftLabelValue(paddingLeft, currentYLeft, 'PASSENGER / ACCOUNT', data.accountName || 'UNKNOWN');
    drawLeftLabelValue(paddingLeft + 200, currentYLeft, 'ACCOUNT NO.', data.accountNo || 'UNKNOWN');
    currentYLeft += 50;

    drawLeftLabelValue(paddingLeft, currentYLeft, 'REMARK', data.purpose || 'N/A');

    // --- Right Section (QR Code) ---
    const qrX = leftWidth + (rightWidth - qrDisplaySize) / 2;
    const qrY = (cardHeight - qrDisplaySize) / 2;

    svg += `<svg x="${qrX}" y="${qrY}" width="${qrDisplaySize}" height="${qrDisplaySize}" viewBox="0 0 ${qrSize} ${qrSize}">`;
    svg += qrSvgStr;
    svg += `</svg>`;

    svg += `</svg>`;

    return {
      svg,
      dataURL: svgToDataURL(svg)
    };
  }

  throw new Error(`Unknown templateId: ${templateId}`);
}
