const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-this-key';

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'gallery.json');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const categories = [
  'Social Media',
  'Posters & Flyers',
  'Branding & Logos',
  'Event & Music',
  'Creative & Other'
];

function readGallery() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeGallery(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
}

function safeExt(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
  return allowed.includes(ext) ? ext : '';
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = safeExt(file.originalname) || '.bin';
    const name = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (safeExt(file.originalname)) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  }
});

app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(PUBLIC_DIR));

app.get('/api/admin/verify', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ valid: false });
  }
  res.json({ valid: true });
});

app.get('/api/gallery', (_req, res) => {
  const items = readGallery().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ categories, items });
});

app.post('/api/upload', upload.array('images', 10), (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    for (const file of req.files || []) fs.unlinkSync(file.path);
    return res.status(401).json({ message: 'Invalid admin key.' });
  }

  const category = String(req.body.category || '').trim();
  const title = String(req.body.title || '').trim() || 'Untitled Design';
  const description = String(req.body.description || '').trim();

  if (!categories.includes(category)) {
    for (const file of req.files || []) fs.unlinkSync(file.path);
    return res.status(400).json({ message: 'Please choose a valid category.' });
  }

  if (!req.files || !req.files.length) {
    return res.status(400).json({ message: 'Please select at least one image.' });
  }

  const gallery = readGallery();
  const created = req.files.map((file, index) => ({
    id: crypto.randomUUID(),
    title: req.files.length > 1 ? `${title} ${index + 1}` : title,
    category,
    description,
    filename: `/uploads/${file.filename}`,
    originalName: file.originalname,
    createdAt: new Date().toISOString(),
    demo: false
  }));

  writeGallery([...gallery, ...created]);
  res.status(201).json({ message: `${created.length} design(s) uploaded successfully.`, items: created });
});

app.delete('/api/gallery/:id', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ message: 'Invalid admin key.' });
  }

  const gallery = readGallery();
  const item = gallery.find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Design not found.' });
  if (item.demo) return res.status(400).json({ message: 'Demo designs can only be removed from data/gallery.json.' });

  const next = gallery.filter((x) => x.id !== item.id);
  writeGallery(next);

  if (item.filename.startsWith('/uploads/')) {
    const filePath = path.join(UPLOAD_DIR, path.basename(item.filename));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  res.json({ message: 'Design deleted successfully.' });
});

app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ message: err.message || 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`CHANO GRAPHIC STUDIO running at http://localhost:${PORT}`);
});
