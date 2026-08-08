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
 * Escapes text for safe embedding inside SVG element content/attributes.
 * Without this, values like `&`, `<` or `"` in user-supplied fields
 * (account name, purpose...) would produce invalid XML and the whole
 * data URL would silently fail to render (broken image).
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Design tokens ("Modernist" design system: Archivo font, sharp corners,
// red accent, ink-tinted neutrals). Font names are single-quoted because
// this string is embedded inside a double-quoted SVG `font-family="..."`
// attribute — double quotes there would prematurely close the attribute
// and produce invalid XML.
const FONT = "'Archivo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const COLOR = {
  text: '#201e1d',
  accent: '#ec3013',
  white: '#ffffff',
  neutral100: '#f8f4f4',
  neutral300: '#d7d3d3',
  neutral400: '#bab6b6',
  neutral600: '#7d7979',
  neutral700: '#605d5d',
  divider: '#201e1d',
};

// A throwaway canvas used purely to measure text width via the browser's
// real font metrics (see `text()`'s `maxWidth` option below) — far more
// accurate than an average-glyph-width guess, and cheap since 2D canvas
// contexts don't touch layout/paint.
const measureCtx = typeof document !== 'undefined'
  ? document.createElement('canvas').getContext('2d')
  : null;

function measureTextWidth(str, size, weight) {
  if (!measureCtx) return str.length * size * 0.6;
  measureCtx.font = `${weight} ${size}px ${FONT}`;
  return measureCtx.measureText(str).width;
}

/**
 * Builds an SVG <text> element. `opts.upper` uppercases the string itself
 * (rather than relying on CSS text-transform, which some SVG->PNG/canvas
 * pipelines ignore).
 *
 * `opts.maxWidth` keeps arbitrary-length user text (account holder name,
 * purpose...) from overlapping neighboring fields: SVG doesn't wrap text
 * automatically, so on a fixed-width card a long value would otherwise run
 * straight into whatever sits to its right. Rather than truncate, the font
 * size is scaled down (down to a legibility floor) so the whole string
 * still fits on one line.
 */
function text(str, x, y, opts = {}) {
  const {
    size = 14,
    weight = 400,
    color = COLOR.text,
    opacity,
    anchor = 'start',
    spacing,
    upper,
    maxWidth,
  } = opts;
  const content = upper ? String(str).toUpperCase() : str;
  let fontSize = size;
  if (maxWidth) {
    const w = measureTextWidth(content, fontSize, weight);
    if (w > maxWidth) {
      fontSize = Math.max((size * maxWidth) / w, size * 0.5);
    }
  }
  let attrs = `font-family="${FONT}" font-size="${fontSize}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"`;
  if (opacity != null) attrs += ` fill-opacity="${opacity}"`;
  if (spacing) attrs += ` letter-spacing="${spacing}"`;
  return `<text x="${x}" y="${y}" ${attrs}>${escapeXml(content)}</text>`;
}

/** A hairline/heavy divider rendered as a thin ink-tinted rect. */
function divider(x, y, w, { h = 2, opacity = 0.4, color = COLOR.divider } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity="${opacity}"/>`;
}

/** Soft ink-tinted drop shadow matching the design system's elevation scale. */
function shadowFilter(id, dy, stdDeviation, opacity) {
  return `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${stdDeviation}" flood-color="#2d2b2b" flood-opacity="${opacity}"/></filter>`;
}

/** Masks an account number down to its last 4 digits, e.g. "••7890". */
function maskAccountNo(accountNo) {
  if (!accountNo) return '';
  return '••' + String(accountNo).slice(-4);
}

/** Only accepts strict 6-digit-hex colors — this gets interpolated straight
 * into an SVG `fill="..."` attribute, so anything else (including a stray
 * `"`) could break the markup the same way the old font-family string did. */
function isHexColor(str) {
  return typeof str === 'string' && /^#[0-9a-fA-F]{6}$/.test(str);
}

/** WCAG relative luminance, used to pick a readable text color for an
 * arbitrary user-chosen accent background. */
function relativeLuminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Picks white or ink text depending on which reads better on `bgHex`. */
function textOn(bgHex) {
  return relativeLuminance(bgHex) > 0.5 ? COLOR.text : COLOR.white;
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
 * @param {string} [data.accountName] - Account holder name. Optional: when
 *   omitted, templates fall back to a lightweight identity string
 *   ("{bank} ••{last4}") so the card never shows an empty/placeholder name.
 * @param {string} [data.bankName]
 * @param {string} [data.accentColor] - Hex color (e.g. "#2563eb") replacing
 *   the default red accent. Must be a strict 6-digit hex; anything else is
 *   ignored and the default is used. Text drawn on top of the accent color
 *   automatically switches between white and ink depending on which reads
 *   better against it, so a light user-chosen color doesn't wash out.
 */
export function generateVietQRCard(payload, templateId = 'minimal', data = {}) {
  const qrSize = 300;
  const accent = isHexColor(data.accentColor) ? data.accentColor : COLOR.accent;
  const onAccent = textOn(accent);

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

  // Lightweight fallback identity ("Vietcombank ••7890") used whenever the
  // account holder's name wasn't supplied — bank + account number are
  // always available (they're required to build the payload at all), so
  // the recipient stays recognizable without forcing the user to type a name.
  const fallbackIdentity = [bankName, maskAccountNo(data.accountNo)].filter(Boolean).join(' ')
    || data.accountNo || '';

  // Create a temporary container to extract the raw QR SVG from core renderer
  const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
  let qrSvgStr = '';
  // The core renderer's own viewBox is sized in QR-module units (e.g.
  // "0 0 53 55"), not `qrSize` pixels — the module count depends on the
  // payload length. Reusing `qrSize` as the nested <svg>'s viewBox (as an
  // earlier version of this function did) put the QR content in the wrong
  // coordinate system entirely, rendering it as a tiny sliver in the
  // corner instead of filling the box.
  let qrViewBoxSize = qrSize;

  if (tempDiv) {
    // Generate QR using SVG mode
    renderVietQR(tempDiv, payload, { size: qrSize });

    // The core renderer returns <svg width height viewBox="0 0 W H">...</svg>,
    // where H is slightly taller than W to make room for its own baked-in
    // "qr.lmk.vn" watermark strip under the modules. Card templates render
    // their own site-url caption already, so we only want the pure QR
    // modules: capture W and re-use it as a *square* viewBox — anything
    // drawn beyond it (the watermark text) gets clipped by the nested
    // <svg>'s implicit overflow:hidden.
    const outer = tempDiv.innerHTML.match(/<svg[^>]*viewBox="0 0 ([\d.]+) [\d.]+"[^>]*>([\s\S]*?)<\/svg>/i);
    if (outer) {
        qrViewBoxSize = parseFloat(outer[1]);
        qrSvgStr = outer[2];
    }
  } else {
    throw new Error('generateVietQRCard requires a DOM environment (document) to parse core SVG.');
  }

  // Embeds the extracted core-QR markup into a nested <svg> viewport so it
  // can be scaled/positioned independently of the card around it.
  function qrBlock(x, y, size) {
    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 ${qrViewBoxSize} ${qrViewBoxSize}">${qrSvgStr}</svg>`;
  }

  function wrap(cardWidth, cardHeight, filterDef, background, body) {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">`;
    if (filterDef) svg += `<defs>${filterDef}</defs>`;
    svg += background;
    svg += body;
    svg += `</svg>`;
    return { svg, dataURL: svgToDataURL(svg) };
  }

  // ----------------------------------------------------
  // Template: Polaroid (1A)
  // ----------------------------------------------------
  if (templateId === 'polaroid') {
    const cardWidth = 400;
    const pad = 26;
    const contentW = cardWidth - pad * 2;
    const qrBoxPad = 22;
    const qrDisplaySize = contentW - qrBoxPad * 2;

    // Name is optional: promote amount, then a masked bank/account
    // identity, to the headline slot so the card never shows a blank title.
    let titleText = data.accountName;
    let titleMode = 'name';
    if (!titleText) {
      if (amountStr) { titleText = amountStr; titleMode = 'amount'; }
      else { titleText = fallbackIdentity; titleMode = 'fallback'; }
    }
    const showMetaRow = titleMode !== 'fallback';
    const showAmountInRow = titleMode !== 'amount' && amountStr;

    let body = '';
    let y = pad;

    body += `<rect x="${pad}" y="${y}" width="${contentW}" height="${contentW}" fill="${COLOR.neutral100}"/>`;
    body += qrBlock(pad + qrBoxPad, y + qrBoxPad, qrDisplaySize);
    y += contentW + 24;

    body += text(titleText, pad, y, { size: 26, weight: 700, maxWidth: contentW });
    y += 34;

    if (showMetaRow) {
      let x = pad;
      if (bankName) {
        body += text(bankName, x, y, { size: 13, color: COLOR.neutral700 });
        x += measureTextWidth(bankName, 13, 400) + 12;
        body += text('/', x, y, { size: 13, color: COLOR.neutral400 });
        x += 12;
      }
      body += text(data.accountNo || '', x, y, { size: 13, color: COLOR.neutral700, maxWidth: cardWidth - pad - x });
      y += 24;
    }

    y += 6;
    body += divider(pad, y, contentW);
    y += 30;

    if (showAmountInRow || data.purpose) {
      const amountMaxW = data.purpose ? contentW - 130 : contentW;
      if (showAmountInRow) {
        body += text(amountStr, pad, y, { size: 34, weight: 700, color: accent, maxWidth: amountMaxW });
      }
      if (data.purpose) {
        body += text(data.purpose, cardWidth - pad, y - (showAmountInRow ? 6 : 0), { size: 13, anchor: 'end', maxWidth: 150 });
      }
      y += showAmountInRow ? 30 : 14;
    }

    y += 6;
    body += text('qr.lmk.vn', pad, y, { size: 11, spacing: '0.14em', upper: true, color: COLOR.neutral600 });
    y += pad;

    const cardHeight = y;
    const background = `<g filter="url(#sh)"><rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" fill="${COLOR.white}"/></g>`;
    return wrap(cardWidth, cardHeight, shadowFilter('sh', 3, 5, 0.16), background, body);
  }

  // ----------------------------------------------------
  // Template: Vé xé / Boarding Pass (1B)
  // ----------------------------------------------------
  if (templateId === 'boarding-pass') {
    const cardHeight = 260;
    const leftW = 400;
    const rightW = 210;
    const cardWidth = leftW + rightW;
    const pad = 24;

    const holder = data.accountName || fallbackIdentity;

    let body = '';
    let ly = pad + 6;
    body += text('Chuyển tiền', pad, ly, { size: 13, weight: 700, spacing: '0.14em', upper: true });
    body += text('qr.lmk.vn', leftW - pad, ly, { size: 11, spacing: '0.14em', upper: true, anchor: 'end', color: accent });
    ly += 12;
    body += divider(pad, ly, leftW - pad * 2);
    ly += 30;

    const colGap = 20;
    const colW = (leftW - pad * 2 - colGap) / 2;
    const drawField = (x, yy, label, value) => {
      body += text(label, x, yy, { size: 10, spacing: '0.14em', upper: true, color: COLOR.neutral600 });
      body += text(value || '', x, yy + 20, { size: 15, weight: 700, maxWidth: colW });
    };
    drawField(pad, ly, 'Ngân hàng', bankName);
    drawField(pad + colW + colGap, ly, 'Số tài khoản', data.accountNo);
    ly += 44;
    drawField(pad, ly, 'Chủ tài khoản', holder);
    if (data.purpose) {
      body += text('Nội dung', pad + colW + colGap, ly, { size: 10, spacing: '0.14em', upper: true, color: COLOR.neutral600 });
      body += text(data.purpose, pad + colW + colGap, ly + 18, { size: 14, maxWidth: colW });
    }

    const amountY = cardHeight - 24;
    body += divider(pad, amountY - 34, leftW - pad * 2);
    body += text('Số tiền', pad, amountY, { size: 10, spacing: '0.14em', upper: true, color: COLOR.neutral600 });
    body += text(amountStr || '—', pad + 62, amountY, { size: 30, weight: 700, color: accent, maxWidth: leftW - pad * 2 - 62 });

    // Perforated divider between the two halves
    body += `<line x1="${leftW}" y1="0" x2="${leftW}" y2="${cardHeight}" stroke="${COLOR.divider}" stroke-opacity="0.4" stroke-width="2" stroke-dasharray="6,6"/>`;

    // Right: QR stub
    body += `<rect x="${leftW}" y="0" width="${rightW}" height="${cardHeight}" fill="${COLOR.neutral100}"/>`;
    const qrRight = rightW - pad * 2;
    body += qrBlock(leftW + pad, (cardHeight - qrRight) / 2 - 8, qrRight);
    body += text('Quét để trả', leftW + rightW / 2, cardHeight - 16, { size: 11, spacing: '0.1em', upper: true, anchor: 'middle', color: COLOR.neutral600 });

    const background = `<g filter="url(#sh)"><rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" fill="${COLOR.white}"/></g>`;
    return wrap(cardWidth, cardHeight, shadowFilter('sh', 3, 5, 0.16), background, body);
  }

  // ----------------------------------------------------
  // Template: Hoá đơn dọc / Receipt (1C)
  // ----------------------------------------------------
  if (templateId === 'receipt') {
    const cardWidth = 340;
    const pad = 20;
    const contentW = cardWidth - pad * 2;

    // Name is optional: fall back to the bank name (still a receipt-style
    // header, just not tied to a person), then the masked identity string.
    const titleText = data.accountName || bankName || fallbackIdentity;

    let body = '';

    // Header banner
    const headerH = 68;
    body += `<rect x="0" y="0" width="${cardWidth}" height="${headerH}" fill="${accent}"/>`;
    body += text('Yêu cầu thanh toán', pad, 24, { size: 11, spacing: '0.18em', upper: true, color: onAccent });
    body += text(titleText, pad, 48, { size: 22, weight: 700, color: onAccent, maxWidth: contentW });
    let y = headerH + pad;

    const row = (label, value) => {
      body += text(label, pad, y, { size: 13, color: COLOR.neutral600 });
      body += text(value, cardWidth - pad, y, { size: 13, weight: 700, anchor: 'end', maxWidth: contentW - 100 });
      y += 10;
      body += divider(pad, y, contentW, { h: 1, opacity: 1, color: COLOR.neutral300 });
      y += 20;
    };
    if (bankName) row('Ngân hàng', bankName);
    if (data.accountNo) row('Số tài khoản', data.accountNo);
    if (data.purpose) {
      body += text('Nội dung', pad, y, { size: 13, color: COLOR.neutral600 });
      body += text(data.purpose, cardWidth - pad, y, { size: 13, weight: 700, anchor: 'end', maxWidth: contentW - 100 });
      y += 10;
      body += divider(pad, y, contentW);
      y += 24;
    }

    body += text('Tổng', pad, y, { size: 10, spacing: '0.14em', upper: true, color: COLOR.neutral600 });
    body += text(amountStr || '—', cardWidth - pad, y + 4, { size: 32, weight: 700, anchor: 'end', maxWidth: contentW - 90 });
    y += 24;

    const qrBoxPad = 18;
    const qrDisplaySize = contentW - qrBoxPad * 2;
    body += `<rect x="${pad}" y="${y}" width="${contentW}" height="${contentW}" fill="${COLOR.neutral100}"/>`;
    body += qrBlock(pad + qrBoxPad, y + qrBoxPad, qrDisplaySize);
    y += contentW + 24;

    body += text('qr.lmk.vn', cardWidth / 2, y, { size: 11, spacing: '0.14em', upper: true, anchor: 'middle', color: COLOR.neutral600 });
    y += pad;

    const cardHeight = y;
    const background = `<g filter="url(#sh)"><rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" fill="${COLOR.white}"/></g>`;
    return wrap(cardWidth, cardHeight, shadowFilter('sh', 3, 5, 0.16), background, body);
  }

  // ----------------------------------------------------
  // Template: Poster lưới (1D)
  // ----------------------------------------------------
  if (templateId === 'poster') {
    const cardWidth = 440;
    const pad = 26;
    const holder = data.accountName || fallbackIdentity;

    let body = '';

    const headerH = 118;
    body += text('Quét — chuyển — xong', pad, 35, { size: 11, spacing: '0.2em', upper: true, color: onAccent });
    body += text(amountStr || 'QUÉT MÃ', pad, 81, { size: 42, weight: 700, color: onAccent, maxWidth: cardWidth - pad * 2 });
    let y = headerH;

    const contentW = cardWidth - pad * 2;
    const qrBoxPad = 26;
    const qrDisplaySize = contentW - qrBoxPad * 2;
    body += `<rect x="0" y="${y}" width="${cardWidth}" height="${contentW}" fill="${COLOR.white}"/>`;
    body += qrBlock(pad + qrBoxPad, y + qrBoxPad, qrDisplaySize);
    y += contentW;

    const cellW = cardWidth / 2;
    const cellH = 66;
    const cell = (col, row, label, value) => {
      const x = col * cellW;
      const cy = y + row * cellH;
      body += `<rect x="${x}" y="${cy}" width="${cellW}" height="${cellH}" fill="${accent}"/>`;
      if (col === 0) body += `<rect x="${cellW - 2}" y="${cy}" width="2" height="${cellH}" fill="${onAccent}" fill-opacity="0.35"/>`;
      if (row === 1) body += `<rect x="${x}" y="${cy}" width="${cellW}" height="2" fill="${onAccent}" fill-opacity="0.35"/>`;
      body += text(label, x + 18, cy + 24, { size: 10, spacing: '0.14em', upper: true, color: onAccent, opacity: 0.8 });
      body += text(value || '—', x + 18, cy + 48, { size: 15, weight: 700, color: onAccent, maxWidth: cellW - 36 });
    };
    cell(0, 0, 'Ngân hàng', bankName);
    cell(1, 0, 'Số tài khoản', data.accountNo);
    cell(0, 1, 'Chủ tài khoản', holder);
    cell(1, 1, 'Nội dung', data.purpose);
    y += cellH * 2;

    body += `<rect x="0" y="${y}" width="${cardWidth}" height="2" fill="${onAccent}" fill-opacity="0.35"/>`;
    body += text('qr.lmk.vn', pad, y + 32, { size: 12, spacing: '0.16em', upper: true, color: onAccent });
    y += 46;

    const cardHeight = y;
    const background = `<g filter="url(#sh)"><rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" fill="${accent}"/></g>`;
    return wrap(cardWidth, cardHeight, shadowFilter('sh', 12, 16, 0.22), background, body);
  }

  // ----------------------------------------------------
  // Template: Tối giản / Minimal (1E)
  // ----------------------------------------------------
  if (templateId === 'minimal') {
    const cardWidth = 260;
    const pad = 20;
    const qrDisplaySize = cardWidth - pad * 2;
    const cardHeight = pad + qrDisplaySize + 12 + 22;

    let body = '';
    body += qrBlock(pad, pad, qrDisplaySize);
    body += text('qr.lmk.vn', cardWidth / 2, cardHeight - 14, { size: 9, spacing: '0.14em', upper: true, anchor: 'middle', color: COLOR.neutral600 });

    const background = `<g filter="url(#sh)"><rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" fill="${COLOR.white}"/></g>`;
    return wrap(cardWidth, cardHeight, shadowFilter('sh', 1, 1, 0.14), background, body);
  }

  throw new Error(`Unknown templateId: ${templateId}`);
}
