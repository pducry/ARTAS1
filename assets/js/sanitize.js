// Shared helpers for untrusted profile, artwork, and board fields.
// Prefer textContent / createElement at the call site. escapeHtml is for the
// rare case a string must be interpolated into markup.

const RELATIVE_IMAGE = /^[\w.\-]+\.(?:jpe?g|png|gif|webp)$/i;

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Accept https URLs (including Firebase Storage download URLs) and same-folder
// gallery filenames. Reject javascript:, data:, blob:, and http:.
export function safeImageUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 2048) return '';
  if (trimmed.startsWith('//') || trimmed.includes('\\') || /[\u0000-\u001F\u007F]/.test(trimmed)) return '';

  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    if (trimmed.startsWith('/') || trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('?') || trimmed.includes('#')) {
      return '';
    }
    return RELATIVE_IMAGE.test(trimmed) ? trimmed : '';
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'https:') return '';
  if (parsed.username || parsed.password) return '';
  if (!parsed.hostname) return '';
  return parsed.href;
}

export function isHttpsImageUrl(url) {
  return safeImageUrl(url).startsWith('https://');
}

// First-party avatar used when a profile has no safe https photo.
// The data: URL is generated here; safeImageUrl still rejects data: input.
export function fallbackAvatar(name, size = 56) {
  const sizeNum = Number(size);
  const px = Number.isFinite(sizeNum) && sizeNum > 0 && sizeNum <= 512 ? Math.round(sizeNum) : 56;
  const initial = String(name || '?').trim().charAt(0).toUpperCase();
  const letter = /^[A-Z0-9]$/.test(initial) ? initial : '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}"><rect width="${px}" height="${px}" rx="${px / 2}" fill="#333"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ccc" font-size="${px * 0.45}" font-family="sans-serif" font-weight="500">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function applyAvatar(img, url, name, size = 56) {
  const fallback = fallbackAvatar(name, size);
  const safe = safeImageUrl(url);
  img.alt = name ? String(name) : 'User';
  img.onerror = () => {
    img.onerror = null;
    img.src = fallback;
  };
  img.src = safe && safe.startsWith('https://') ? safe : fallback;
}

export function appendSafeImage(parent, url, { alt = '', loading = 'lazy' } = {}) {
  const safe = safeImageUrl(url);
  if (!safe) return null;
  const img = document.createElement('img');
  img.src = safe;
  img.alt = alt == null ? '' : String(alt);
  if (loading) img.loading = loading;
  parent.appendChild(img);
  return img;
}

export function appendCoverSlots(parent, urls, { slots = 4, emptyClass = 'empty' } = {}) {
  const list = Array.isArray(urls) ? urls : [];
  for (let i = 0; i < slots; i += 1) {
    const img = appendSafeImage(parent, list[i] || '', { alt: '' });
    if (!img) {
      const empty = document.createElement('div');
      empty.className = emptyClass;
      parent.appendChild(empty);
    }
  }
}

export function textEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text == null ? '' : String(text);
  return node;
}

export function renderLocalBoardsAndImages({ images, boards, imageHref }) {
  const count = document.getElementById('images-count');
  if (count) count.textContent = String(images.length);

  const boardsGrid = document.getElementById('boards-grid');
  boards.forEach((board) => {
    const card = document.createElement('div');
    card.className = 'board-card';
    const preview = document.createElement('div');
    preview.className = 'board-preview';
    appendCoverSlots(preview, board.images, { emptyClass: 'empty-slot' });
    const info = document.createElement('div');
    info.className = 'board-info';
    info.append(
      textEl('span', 'board-name', board.name),
      textEl('span', 'board-count', String(board.images.length))
    );
    card.append(preview, info);
    if (boardsGrid) boardsGrid.appendChild(card);
  });

  const grid = document.getElementById('images-grid');
  images.forEach((src, index) => {
    if (!safeImageUrl(src) || !grid) return;
    const item = document.createElement('div');
    item.className = 'grid-item';
    appendSafeImage(item, src, { alt: `Artwork ${index + 1}` });
    if (imageHref) {
      item.addEventListener('click', () => {
        window.location.href = imageHref(src);
      });
    }
    grid.appendChild(item);
  });
}
