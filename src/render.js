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
    ecLevel = 'M',
    dark = '#000000',
    light = '#FFFFFF'
  } = options;

  // Generate QR code
  const qr = qrcode(0, ecLevel);
  qr.addData(payload);
  qr.make();

  const moduleCount = qr.getModuleCount();

  const watermarkText = 'qr.lmk.vn';

  if (target.tagName && target.tagName.toLowerCase() === 'canvas') {
    // Render to Canvas
    const canvas = target;
    const ctx = canvas.getContext('2d');

    const tileW = size / (moduleCount + margin * 2);
    const tileH = size / (moduleCount + margin * 2);

    // Watermark space calculation (about 4% of size or at least 12px)
    const watermarkHeight = Math.max(12, Math.round(size * 0.04));
    const canvasHeight = size + watermarkHeight;

    canvas.width = size;
    canvas.height = canvasHeight;

    // Draw background (light)
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, size, canvasHeight);

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

    // Draw watermark
    ctx.fillStyle = dark;
    ctx.globalAlpha = 0.5; // Slight transparency
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(watermarkHeight * 0.7)}px Arial, Helvetica, sans-serif`;
    ctx.fillText(watermarkText, size / 2, size + (watermarkHeight / 2));
    ctx.globalAlpha = 1.0;

  } else {
    // Render as SVG string inside the target div
    const viewBoxW = moduleCount + margin * 2;

    // Add extra height for watermark (around 4% of height, proportionally)
    const watermarkHeightModule = viewBoxW * 0.04;
    const viewBoxH = viewBoxW + watermarkHeightModule;
    const svgHeight = size + Math.max(12, Math.round(size * 0.04));

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${svgHeight}" viewBox="0 0 ${viewBoxW} ${viewBoxH}">`;

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

    // Add watermark text
    const cx = viewBoxW / 2;
    const cy = viewBoxW + (watermarkHeightModule / 2);
    const fontSize = watermarkHeightModule * 0.7;

    svg += `<text x="${cx}" y="${cy}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${fontSize}" fill="${dark}" opacity="0.5" text-anchor="middle" dominant-baseline="middle">${watermarkText}</text>`;

    svg += `</svg>`;

    target.innerHTML = svg;
  }
}
