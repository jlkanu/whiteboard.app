/**
 * Export Pipeline (PNG, SVG, JSON)
 */

import { getCombinedBounds } from '../canvas/hit-testing.js';
import { getAssetFromDB } from '../storage/database.js';
import { ObjectTypes, ShapeTypes } from '../documents/schema.js';
import { CanvasRenderer } from '../canvas/renderer.js';
import { Viewport } from '../canvas/coordinates.js';
import { showToast } from '../app/notifications.js';

/**
 * Export active board as portable JSON file.
 */
export function exportJSON(doc) {
  const jsonStr = JSON.stringify(doc, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  triggerDownload(blob, `${slugify(doc.title)}.whiteboard.json`);
  showToast('Exported JSON document', 'success');
}

/**
 * Export active page artwork as high-resolution PNG image.
 */
export async function exportPNG(page, gridStyle = 'blank') {
  if (!page || page.objects.length === 0) {
    showToast('Canvas is empty', 'warning');
    return;
  }

  const bounds = getCombinedBounds(page.objects);
  const padding = 40;
  const width = Math.ceil(bounds.width + padding * 2);
  const height = Math.ceil(bounds.height + padding * 2);

  const offscreen = document.createElement('canvas');
  offscreen.width = width * 2; // 2x DPI render
  offscreen.height = height * 2;

  const renderer = new CanvasRenderer(offscreen);
  const tempViewport = new Viewport();
  tempViewport.dpr = 2;
  tempViewport.zoom = 1.0;
  tempViewport.x = -bounds.x + padding;
  tempViewport.y = -bounds.y + padding;

  renderer.render({
    viewport: tempViewport,
    page,
    gridStyle,
    selectedObjectIds: []
  });

  offscreen.toBlob((blob) => {
    if (blob) {
      triggerDownload(blob, `${slugify(page.name || 'whiteboard')}.png`);
      showToast('Exported PNG image', 'success');
    }
  }, 'image/png');
}

/**
 * Export active page artwork as clean SVG document.
 */
export async function exportSVG(page) {
  if (!page || page.objects.length === 0) {
    showToast('Canvas is empty', 'warning');
    return;
  }

  const bounds = getCombinedBounds(page.objects);
  const padding = 20;
  const minX = Math.floor(bounds.x - padding);
  const minY = Math.floor(bounds.y - padding);
  const width = Math.ceil(bounds.width + padding * 2);
  const height = Math.ceil(bounds.height + padding * 2);

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">\n`;
  svgContent += `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#ffffff"/>\n`;

  for (const obj of page.objects) {
    svgContent += await objectToSVG(obj);
  }

  svgContent += `</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  triggerDownload(blob, `${slugify(page.name || 'whiteboard')}.svg`);
  showToast('Exported SVG vector document', 'success');
}

async function objectToSVG(obj) {
  const opacity = obj.opacity !== undefined ? obj.opacity : 1;
  const stroke = obj.strokeColor || '#172033';
  const strokeWidth = obj.strokeWidth || 2;
  const fill = obj.fillColor || 'none';

  if (obj.type === ObjectTypes.STROKE && obj.points && obj.points.length > 0) {
    let pathData = `M ${obj.points[0].x} ${obj.points[0].y}`;
    for (let i = 1; i < obj.points.length; i++) {
      pathData += ` L ${obj.points[i].x} ${obj.points[i].y}`;
    }
    return `  <path d="${pathData}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>\n`;
  }

  if (obj.type === ObjectTypes.SHAPE) {
    if (obj.shapeType === ShapeTypes.RECTANGLE) {
      return `  <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" opacity="${opacity}"/>\n`;
    }
    if (obj.shapeType === ShapeTypes.ELLIPSE) {
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      return `  <ellipse cx="${cx}" cy="${cy}" rx="${Math.abs(obj.width / 2)}" ry="${Math.abs(obj.height / 2)}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" opacity="${opacity}"/>\n`;
    }
    if (obj.shapeType === ShapeTypes.LINE || obj.shapeType === ShapeTypes.ARROW) {
      return `  <line x1="${obj.x}" y1="${obj.y}" x2="${obj.x + obj.width}" y2="${obj.y + obj.height}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>\n`;
    }
  }

  if (obj.type === ObjectTypes.TEXT) {
    const lines = (obj.text || '').split('\n');
    const fontSize = obj.fontSize || 20;
    let textSvg = `  <text x="${obj.x}" y="${obj.y}" font-size="${fontSize}" fill="${obj.textColor || stroke}" font-family="sans-serif">\n`;
    lines.forEach((line, i) => {
      textSvg += `    <tspan x="${obj.x}" dy="${i === 0 ? fontSize : fontSize * 1.2}">${escapeXml(line)}</tspan>\n`;
    });
    textSvg += `  </text>\n`;
    return textSvg;
  }

  if (obj.type === ObjectTypes.STICKY) {
    let stickySvg = `  <g opacity="${opacity}">\n`;
    stickySvg += `    <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" rx="8" fill="${obj.fillColor || '#FEF08A'}" stroke="#EAB308" stroke-width="1"/>\n`;
    const lines = (obj.text || '').split('\n');
    const fontSize = obj.fontSize || 16;
    stickySvg += `    <text x="${obj.x + 12}" y="${obj.y + 12}" font-size="${fontSize}" fill="${obj.textColor || '#172033'}" font-family="sans-serif">\n`;
    lines.forEach((line, i) => {
      stickySvg += `      <tspan x="${obj.x + 12}" dy="${i === 0 ? fontSize : fontSize * 1.25}">${escapeXml(line)}</tspan>\n`;
    });
    stickySvg += `    </text>\n  </g>\n`;
    return stickySvg;
  }

  if (obj.type === ObjectTypes.IMAGE && obj.assetId) {
    try {
      const dataUrl = await getAssetFromDB(obj.assetId);
      if (dataUrl) {
        return `  <image x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" href="${dataUrl}" opacity="${opacity}"/>\n`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  return '';
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(text) {
  return (text || 'board').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
