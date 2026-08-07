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

  if (target.tagName && target.tagName.toLowerCase() === 'canvas') {
    // Render to Canvas
    const canvas = target;
    const ctx = canvas.getContext('2d');

    canvas.width = size;
    canvas.height = size;

    const tileW = size / (moduleCount + margin * 2);
    const tileH = size / (moduleCount + margin * 2);

    // Draw background (light)
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, size, size);

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
  } else {
    // Render as SVG string inside the target div
    const viewBox = moduleCount + margin * 2;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${viewBox} ${viewBox}">`;

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
    svg += `</svg>`;

    target.innerHTML = svg;
  }
}
