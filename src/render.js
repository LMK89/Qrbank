import qrcode from 'qrcode-generator';

/**
 * Renders a VietQR payload onto a target element (canvas or div for SVG).
 * @param {HTMLElement} target The target element to render into (e.g. <canvas> or <div>)
 * @param {string} payload The VietQR payload string
 * @param {Object} [options]
 * @param {number} [options.size=256] The width and height of the rendered QR code in pixels
 * @param {number} [options.margin=4] The margin in modules
 * @param {string} [options.ecLevel='M'] Error correction level ('L', 'M', 'Q', 'H')
 * @param {string} [options.dark='#000000'] Color of dark modules
 * @param {string} [options.light='#FFFFFF'] Color of light modules
 */
export function renderVietQR(target, payload, options = {}) {
  if (!target) {
    throw new Error('renderVietQR: target element is required');
  }

  const {
    size = 256,
    margin = 4,
    dark = '#000000',
    light = '#FFFFFF',
    centerText,
    addPolaroidFrame = false,
    polaroidInfo = {}
  } = options;

  let ecLevel = options.ecLevel || 'M';

  if (centerText && options.ecLevel === undefined) {
    // Override ecLevel to High if centerText is used and no specific ecLevel is provided
    ecLevel = 'H';
  }

  // Generate QR code
  const qr = qrcode(0, ecLevel);
  qr.addData(payload);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const actualSize = size;
  let canvasHeight = size;
  const polaroidHeight = addPolaroidFrame ? Math.round(size * 0.4) : 0;

  if (addPolaroidFrame) {
    canvasHeight += polaroidHeight;
  }

  if (target.tagName && target.tagName.toLowerCase() === 'canvas') {
    // Render to Canvas
    const canvas = target;
    const ctx = canvas.getContext('2d');

    canvas.width = actualSize;
    canvas.height = canvasHeight;

    const tileW = size / (moduleCount + margin * 2);
    const tileH = size / (moduleCount + margin * 2);

    // Draw background (light)
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, actualSize, canvasHeight);

    // Draw dark modules
    ctx.fillStyle = dark;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          const x = (margin + col) * tileW;
          const y = (margin + row) * tileH;
          // Math.ceil prevents anti-aliasing gaps between modules
          ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(tileW), Math.ceil(tileH));
        }
      }
    }

    if (centerText) {
      const cx = actualSize / 2;
      const cy = actualSize / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Calculate font size relative to canvas size. We want the text to span most of the center
      const maxTextWidth = actualSize * 0.8;
      let fontSize = Math.max(12, Math.floor(maxTextWidth / (centerText.length * 0.6)));
      ctx.font = `bold 900 ${fontSize}px sans-serif`;

      // Optional: Add outline/stroke to make it pop against both light and dark modules
      ctx.strokeStyle = dark;
      ctx.lineWidth = Math.max(3, fontSize * 0.15);
      ctx.lineJoin = 'round';
      ctx.strokeText(centerText, cx, cy);

      // Draw center text (Cutout effect - color is light)
      ctx.fillStyle = light;
      ctx.fillText(centerText, cx, cy);
    }

    if (addPolaroidFrame) {
      const paddingX = Math.round(actualSize * 0.05);
      const startY = actualSize + Math.round(polaroidHeight * 0.1);
      const lineHeight = Math.round(polaroidHeight * 0.15);
      let currentY = startY + lineHeight;

      const maxTextWidth = actualSize - (paddingX * 2);

      // Draw Bank Name
      if (polaroidInfo.bankName) {
        ctx.fillStyle = dark;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = `bold ${Math.round(lineHeight * 1.2)}px sans-serif`;
        ctx.fillText(polaroidInfo.bankName, paddingX, currentY, maxTextWidth);
        currentY += lineHeight * 1.5;
      }

      // Draw Account Name / Number
      if (polaroidInfo.accountName) {
        ctx.fillStyle = dark;
        ctx.textAlign = 'left';
        ctx.font = `${Math.round(lineHeight)}px sans-serif`;
        ctx.fillText(polaroidInfo.accountName, paddingX, currentY, maxTextWidth);
        currentY += lineHeight * 1.2;
      }

      // Draw Amount
      if (polaroidInfo.amount) {
        ctx.fillStyle = dark;
        ctx.textAlign = 'left';
        ctx.font = `bold ${Math.round(lineHeight)}px sans-serif`;
        ctx.fillText(String(polaroidInfo.amount), paddingX, currentY, maxTextWidth);
        currentY += lineHeight * 1.2;
      }

      // Draw Remark
      if (polaroidInfo.remark) {
        ctx.fillStyle = dark;
        ctx.textAlign = 'left';
        ctx.font = `italic ${Math.round(lineHeight * 0.8)}px sans-serif`;
        ctx.fillText(polaroidInfo.remark, paddingX, currentY, maxTextWidth);
      }
    }

  } else {
    // Render as SVG string inside the target div
    const viewBoxW = moduleCount + margin * 2;
    const viewBoxH = viewBoxW + (addPolaroidFrame ? Math.round(viewBoxW * 0.4) : 0);
    const svgHeight = canvasHeight;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${actualSize}" height="${svgHeight}" viewBox="0 0 ${viewBoxW} ${viewBoxH}">`;

    // Background
    svg += `<rect width="100%" height="100%" fill="${light}"/>`;

    // Modules
    let path = '';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          path += `M${margin + col},${margin + row}h1v1h-1z`;
        }
      }
    }

    svg += `<path d="${path}" fill="${dark}"/>`;

    if (centerText) {
      const cx = margin + moduleCount / 2;
      const cy = margin + moduleCount / 2;

      // Font size in SVG modules units
      const maxTextWidthModules = moduleCount * 0.8;
      const fontSize = Math.max(2, maxTextWidthModules / (centerText.length * 0.6));
      const strokeWidth = fontSize * 0.15;

      // Draw center text (White cutout effect, with dark outline for readability)
      svg += `<text x="${cx}" y="${cy}" font-family="sans-serif" font-weight="900" font-size="${fontSize}" fill="${light}" stroke="${dark}" stroke-width="${strokeWidth}" stroke-linejoin="round" text-anchor="middle" dominant-baseline="middle">${centerText}</text>`;
    }

    if (addPolaroidFrame) {
      const paddingX = margin;
      const startY = viewBoxW + 2;
      const lineHeight = Math.max(1, Math.round((viewBoxH - viewBoxW) * 0.15));
      let currentY = startY + lineHeight;

      if (polaroidInfo.bankName) {
        svg += `<text x="${paddingX}" y="${currentY}" font-family="sans-serif" font-weight="bold" font-size="${lineHeight * 1.2}" fill="${dark}" text-anchor="start">${polaroidInfo.bankName}</text>`;
        currentY += lineHeight * 1.5;
      }

      if (polaroidInfo.accountName) {
        svg += `<text x="${paddingX}" y="${currentY}" font-family="sans-serif" font-size="${lineHeight}" fill="${dark}" text-anchor="start">${polaroidInfo.accountName}</text>`;
        currentY += lineHeight * 1.2;
      }

      if (polaroidInfo.amount) {
        svg += `<text x="${paddingX}" y="${currentY}" font-family="sans-serif" font-weight="bold" font-size="${lineHeight}" fill="${dark}" text-anchor="start">${polaroidInfo.amount}</text>`;
        currentY += lineHeight * 1.2;
      }

      if (polaroidInfo.remark) {
        svg += `<text x="${paddingX}" y="${currentY}" font-family="sans-serif" font-style="italic" font-size="${lineHeight * 0.8}" fill="${dark}" text-anchor="start">${polaroidInfo.remark}</text>`;
      }
    }

    svg += `</svg>`;

    target.innerHTML = svg;
  }
}
