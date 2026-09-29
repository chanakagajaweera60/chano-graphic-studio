const state = {
  items: [],
  categories: [],
  activeCategory: 'All Work',
  search: '',
  adminKey: sessionStorage.getItem('chanoAdminKey') || ''
};

const $ = (selector) => document.querySelector(selector);

const els = {
  categoryBar: $('#categoryBar'),
  gallery: $('#gallery'),
  empty: $('#emptyState'),
  resultCount: $('#resultCount'),
  search: $('#searchInput'),
  lightbox: $('#lightbox'),
  lightboxImage: $('#lightboxImage'),
  lightboxCategory: $('#lightboxCategory'),
  lightboxTitle: $('#lightboxTitle'),
  lightboxDescription: $('#lightboxDescription'),
  lightboxWhatsapp: $('#lightboxWhatsapp'),
  adminModal: $('#adminModal'),
  loginView: $('#loginView'),
  uploadView: $('#uploadView'),
  adminKey: $('#adminKey'),
  adminLogin: $('#adminLogin'),
  uploadForm: $('#uploadForm'),
  designTitle: $('#designTitle'),
  designCategory: $('#designCategory'),
  designDescription: $('#designDescription'),
  imageFiles: $('#imageFiles'),
  fileNames: $('#fileNames'),
  uploadStatus: $('#uploadStatus'),
  adminList: $('#adminList'),
  toast: $('#toast')
};

$('#year').textContent = new Date().getFullYear();

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add('hidden'), 3200);
}

function assetUrl(filename) {
  if (!filename) return '';
  return filename.startsWith('/') ? filename : `/${filename}`;
}

async function loadGallery() {
  try {
    const response = await fetch('/api/gallery', { cache: 'no-store' });
    const data = await response.json();
    state.items = data.items || [];
    state.categories = ['All Work', ...(data.categories || [])];
    renderCategories();
    renderGallery();
    populateAdminCategories(data.categories || []);
    renderAdminList();
  } catch (error) {
    els.resultCount.textContent = 'Gallery unavailable';
    showToast('Could not load the gallery. Is the server running?');
  }
}

function renderCategories() {
  els.categoryBar.innerHTML = '';
  state.categories.forEach((category) => {
    const button = document.createElement('button');
    button.className = `category-btn ${category === state.activeCategory ? 'active' : ''}`;
    button.type = 'button';
    button.textContent = category;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', category === state.activeCategory ? 'true' : 'false');
    button.addEventListener('click', () => {
      state.activeCategory = category;
      renderCategories();
      renderGallery();
    });
    els.categoryBar.appendChild(button);
  });
}

function getFilteredItems() {
  const search = state.search.trim().toLowerCase();
  return state.items.filter((item) => {
    const categoryMatch = state.activeCategory === 'All Work' || item.category === state.activeCategory;
    const text = `${item.title} ${item.category} ${item.description || ''}`.toLowerCase();
    const searchMatch = !search || text.includes(search);
    return categoryMatch && searchMatch;
  });
}

function renderGallery() {
  const items = getFilteredItems();
  els.gallery.innerHTML = '';
  els.resultCount.textContent = `${items.length} design${items.length === 1 ? '' : 's'} shown`;
  els.empty.classList.toggle('hidden', items.length > 0);

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-media">
        <img loading="lazy" src="${assetUrl(item.filename)}" alt="${escapeHtml(item.title)}" />
        <div class="card-overlay"><span class="view-pill">View Full Design ↗</span></div>
      </div>
      <div class="card-info">
        <h3>${escapeHtml(item.title)}</h3>
        <div class="card-meta">
          <span class="pill">${escapeHtml(item.category)}</span>
          ${item.demo ? '<span class="demo-tag">Demo artwork</span>' : ''}
        </div>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(item));
    els.gallery.appendChild(card);
  });
}

function openLightbox(item) {
  els.lightboxImage.src = assetUrl(item.filename);
  els.lightboxImage.alt = item.title;
  els.lightboxCategory.textContent = item.category;
  els.lightboxTitle.textContent = item.title;
  els.lightboxDescription.textContent = item.description || 'Custom graphic design by CHANO GRAPHIC STUDIO.';
  const message = encodeURIComponent(`Hi Chano Graphic Studio, I'm interested in the design "${item.title}" in ${item.category}.`);
  els.lightboxWhatsapp.href = `https://wa.me/94743602001?text=${message}`;
  els.lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.add('hidden');
  if (els.lightbox.classList.contains('hidden') && els.adminModal.classList.contains('hidden')) {
    document.body.style.overflow = '';
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function populateAdminCategories(categories) {
  els.designCategory.innerHTML = categories.map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
}

function openAdmin() {
  els.adminModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  syncAdminView();
  if (!state.adminKey) setTimeout(() => els.adminKey.focus(), 60);
}

function syncAdminView() {
  const unlocked = Boolean(state.adminKey);
  els.loginView.classList.toggle('hidden', unlocked);
  els.uploadView.classList.toggle('hidden', !unlocked);
  if (unlocked) renderAdminList();
}

async function verifyKey(key) {
  const response = await fetch('/api/admin/verify', { headers: { 'x-admin-key': key }, cache: 'no-store' });
  return response.ok;
}

async function loginAdmin() {
  const key = els.adminKey.value.trim();
  if (!key) return showToast('Enter your admin key first.');
  try {
    const valid = await verifyKey(key);
    if (!valid) return showToast('Invalid admin key.');
    state.adminKey = key;
    sessionStorage.setItem('chanoAdminKey', key);
    syncAdminView();
    showToast('Gallery unlocked.');
  } catch {
    showToast('Could not connect to the gallery server.');
  }
}

function lockAdmin() {
  state.adminKey = '';
  sessionStorage.removeItem('chanoAdminKey');
  els.adminKey.value = '';
  syncAdminView();
  showToast('Gallery locked.');
}

async function uploadDesigns(event) {
  event.preventDefault();
  const files = Array.from(els.imageFiles.files || []);
  if (!files.length) return showToast('Select at least one image.');
  if (!state.adminKey) return showToast('Unlock the gallery first.');

  const form = new FormData();
  form.append('title', els.designTitle.value.trim() || 'Untitled Design');
  form.append('category', els.designCategory.value);
  form.append('description', els.designDescription.value.trim());
  files.forEach((file) => form.append('images', file));

  els.uploadStatus.textContent = 'Uploading…';
  try {
    const response = await fetch('/api/upload', { method: 'POST', headers: { 'x-admin-key': state.adminKey }, body: form });
    const data = await response.json();
    if (response.status === 401) {
      lockAdmin();
      throw new Error('Invalid admin key. Please unlock again.');
    }
    if (!response.ok) throw new Error(data.message || 'Upload failed.');
    els.uploadStatus.textContent = '';
    els.uploadForm.reset();
    els.fileNames.textContent = 'No files selected';
    showToast(data.message || 'Uploaded successfully.');
    await loadGallery();
  } catch (error) {
    els.uploadStatus.textContent = '';
    showToast(error.message);
  }
}

async function deleteItem(item) {
  if (item.demo) return showToast('Demo designs are part of the starter pack.');
  if (!confirm(`Delete "${item.title}" from the gallery?`)) return;
  try {
    const response = await fetch(`/api/gallery/${encodeURIComponent(item.id)}`, { method: 'DELETE', headers: { 'x-admin-key': state.adminKey } });
    const data = await response.json();
    if (response.status === 401) {
      lockAdmin();
      throw new Error('Admin key expired or is incorrect.');
    }
    if (!response.ok) throw new Error(data.message || 'Delete failed.');
    showToast(data.message || 'Deleted.');
    await loadGallery();
  } catch (error) {
    showToast(error.message);
  }
}

function renderAdminList() {
  if (!els.adminList) return;
  if (!state.items.length) {
    els.adminList.innerHTML = '<div class="admin-note">No designs yet.</div>';
    return;
  }
  els.adminList.innerHTML = state.items.map((item) => `
    <div class="admin-item">
      <img src="${assetUrl(item.filename)}" alt="" />
      <div class="admin-item-copy">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.category)}${item.demo ? ' • demo' : ''}</span>
      </div>
      ${item.demo ? '' : `<button type="button" class="delete-btn" data-delete-id="${escapeHtml(item.id)}">Delete</button>`}
    </div>
  `).join('');
  els.adminList.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = state.items.find((x) => x.id === button.dataset.deleteId);
      if (item) deleteItem(item);
    });
  });
}

els.search.addEventListener('input', () => {
  state.search = els.search.value;
  renderGallery();
});
$('#manageBtn').addEventListener('click', openAdmin);
$('#lightboxClose').addEventListener('click', () => closeModal(els.lightbox));
$('#adminClose').addEventListener('click', () => closeModal(els.adminModal));
els.lightbox.addEventListener('click', (event) => { if (event.target === els.lightbox) closeModal(els.lightbox); });
els.adminModal.addEventListener('click', (event) => { if (event.target === els.adminModal) closeModal(els.adminModal); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!els.lightbox.classList.contains('hidden')) closeModal(els.lightbox);
    else if (!els.adminModal.classList.contains('hidden')) closeModal(els.adminModal);
  }
});
els.adminLogin.addEventListener('click', loginAdmin);
$('#lockGallery').addEventListener('click', lockAdmin);
els.uploadForm.addEventListener('submit', uploadDesigns);
els.imageFiles.addEventListener('change', () => {
  const files = Array.from(els.imageFiles.files || []);
  els.fileNames.textContent = files.length ? files.map((file) => file.name).join(', ') : 'No files selected';
});
els.adminKey.addEventListener('keydown', (event) => { if (event.key === 'Enter') loginAdmin(); });

loadGallery();
