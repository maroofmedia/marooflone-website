const justifiedLayout = require('justified-layout');
const path = require('path');
const fs = require('fs');
const { DateTime } = require('luxon');

let imageSizeModule = null;
try {
  imageSizeModule = require('image-size');
} catch (e) { }

function probeDiskDimensions(src) {
  if (!src) return null;
  try {
    const rel = src.replace(/^\/+/, '');
    const diskPath = path.join(__dirname, '..', '..', rel);
    if (!fs.existsSync(diskPath)) return null;

    if (imageSizeModule && imageSizeModule.imageSize) {
      const fd = fs.openSync(diskPath, 'r');
      const buffer = Buffer.alloc(65536);
      fs.readSync(fd, buffer, 0, 65536, 0);
      fs.closeSync(fd);
      const res = imageSizeModule.imageSize(buffer);
      if (res && res.width && res.height) {
        if (res.orientation && res.orientation >= 5 && res.orientation <= 8) {
          return { width: res.height, height: res.width };
        }
        return { width: res.width, height: res.height };
      }
    }
  } catch (err) { }
  return null;
}

// Cache gallery metadata
let cachedMeta = null;
function getGalleryMeta() {
  if (cachedMeta) return cachedMeta;
  try {
    const metaPath = path.join(__dirname, '..', '..', '_data', 'galleryMeta.json');
    if (fs.existsSync(metaPath)) {
      cachedMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      return cachedMeta;
    }
  } catch (e) { }
  return {};
}

function formatDate(dateObj) {
  if (!dateObj) return '';
  let dt;
  if (dateObj instanceof Date) {
    dt = DateTime.fromJSDate(dateObj, { zone: 'utc' });
  } else if (typeof dateObj === 'string') {
    dt = DateTime.fromISO(dateObj, { zone: 'utc' });
    if (!dt.isValid) dt = DateTime.fromFormat(dateObj, 'yyyy-MM-dd', { zone: 'utc' });
  } else {
    dt = DateTime.fromJSDate(new Date(dateObj), { zone: 'utc' });
  }
  return dt.isValid ? dt.toFormat('MMM d, yyyy') : '';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 11ty Shortcode: Builds a Google Photos Justified Layout at build-time using justified-layout
 *
 * @param {Array} items - Array of 11ty post items or image objects { src, originalWidth, originalHeight, ... }
 * @param {Object} options - Layout configuration
 * @returns {string} HTML markup
 */
function justifiedGalleryShortcode(items, options = {}) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return '';
  }

  const metaMap = getGalleryMeta();

  function resolveDimensions(src, directW, directH) {
    if (directW && directH) return { width: directW, height: directH };
    const meta = metaMap[src];
    if (meta && meta.width && meta.height) return { width: meta.width, height: meta.height };
    const disk = probeDiskDimensions(src);
    if (disk) return disk;
    return { width: 1200, height: 800 };
  }

  // Normalize image objects from raw image objects or 11ty collection posts
  const normalized = items.map((item) => {
    // 11ty collection post format
    if (item.data) {
      const src = item.data.image || '';
      const dims = resolveDimensions(src, null, null);
      const galleryTags = Array.isArray(item.data.galleryTags) ? item.data.galleryTags : (item.data.galleryTags ? [item.data.galleryTags] : []);
      const isAiEdit = galleryTags.includes('ai-edit') || galleryTags.includes('ai');
      return {
        src,
        width: dims.width,
        height: dims.height,
        alt: item.data.alt || '',
        date: formatDate(item.data.date),
        location: item.data.location || '',
        desc: item.data.description || '',
        isAiEdit
      };
    }

    // Direct object format { src, originalWidth, originalHeight, alt, date, location, desc, galleryTags }
    const src = item.src || '';
    const dims = resolveDimensions(src, item.originalWidth || item.width, item.originalHeight || item.height);
    const galleryTags = Array.isArray(item.galleryTags) ? item.galleryTags : (item.galleryTags ? [item.galleryTags] : []);
    const isAiEdit = Boolean(item.isAiEdit || galleryTags.includes('ai-edit') || galleryTags.includes('ai'));
    return {
      src,
      width: dims.width,
      height: dims.height,
      alt: item.alt || '',
      date: item.date ? formatDate(item.date) : '',
      location: item.location || '',
      desc: item.desc || item.caption || item.description || '',
      isAiEdit
    };
  });

  const sizes = normalized.map((item) => ({
    width: item.width,
    height: item.height
  }));

  // Desktop Configuration: 1040px max width, 280px target row height, 12px uniform gap
  const dContainerWidth = options.containerWidth || 1040;
  const dTargetRowHeight = options.targetRowHeight || 280;
  const dBoxSpacing = options.boxSpacing !== undefined ? options.boxSpacing : 12;

  const dLayout = justifiedLayout(sizes, {
    containerWidth: dContainerWidth,
    targetRowHeight: dTargetRowHeight,
    boxSpacing: dBoxSpacing,
    containerPadding: 0,
    showWidows: true,
    targetRowHeightTolerance: 0.25
  });

  // Mobile Configuration: 360px container, 175px target row height, 8px gap
  const mContainerWidth = 360;
  const mTargetRowHeight = 175;
  const mBoxSpacing = 8;

  const mLayout = justifiedLayout(sizes, {
    containerWidth: mContainerWidth,
    targetRowHeight: mTargetRowHeight,
    boxSpacing: mBoxSpacing,
    containerPadding: 0,
    showWidows: true,
    targetRowHeightTolerance: 0.25
  });

  const dContainerH = Math.round(dLayout.containerHeight);
  const mContainerH = Math.round(mLayout.containerHeight);

  const cardsHtml = normalized.map((item, index) => {
    const dBox = dLayout.boxes[index];
    const mBox = mLayout.boxes[index];

    const dTop = Math.round(dBox.top);
    const dLeft = Math.round(dBox.left);
    const dW = Math.round(dBox.width);
    const dH = Math.round(dBox.height);

    const mTop = Math.round(mBox.top);
    const mLeft = Math.round(mBox.left);
    const mW = Math.round(mBox.width);
    const mH = Math.round(mBox.height);

    const isAboveTheFold = (options.globalPhotoIndex !== undefined ? options.globalPhotoIndex + index : index) < 4;

    return `
      <figure class="gallery-card" data-gallery-item
        data-src="${item.src}"
        data-alt="${escapeHtml(item.alt)}"
        data-date="${escapeHtml(item.date)}"
        data-location="${escapeHtml(item.location)}"
        data-desc="${escapeHtml(item.desc)}"
        data-ai-edit="${item.isAiEdit ? 'true' : 'false'}"
        style="--top: ${dTop}; --left: ${dLeft}; --w: ${dW}; --h: ${dH}; --top-m: ${mTop}; --left-m: ${mLeft}; --w-m: ${mW}; --h-m: ${mH};">
        <button type="button" class="gallery-card__btn" aria-label="View photograph: ${escapeHtml(item.alt)}" aria-haspopup="dialog">
          <div class="gallery-card__img-wrap">
            <img src="${item.src}" alt="${escapeHtml(item.alt)}"
              width="${dW}" height="${dH}"
              ${isAboveTheFold ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'}
              decoding="async"
              class="gallery-card__img">
          </div>
          <div class="gallery-card__overlay">
            <div class="gallery-card__meta">
              ${item.location ? `
              <span class="gallery-card__location">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${escapeHtml(item.location)}
              </span>` : ''}
            </div>
            <div class="gallery-card__zoom-indicator" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </div>
          </div>
        </button>
      </figure>`.trim();
  }).join('\n');

  return `
    <div class="gallery-masonry" style="--container-w: ${dContainerWidth}; --container-h: ${dContainerH}; --container-w-m: ${mContainerWidth}; --container-h-m: ${mContainerH};">
      ${cardsHtml}
    </div>
  `.trim();
}

module.exports = justifiedGalleryShortcode;
