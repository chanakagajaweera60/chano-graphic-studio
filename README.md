# CHANO GRAPHIC STUDIO — Portfolio Website

A stylish red + gold graphic design portfolio website with:

- 5 clear design categories
- Search + category filtering
- Fullscreen design preview
- WhatsApp contact buttons (074 360 2001)
- "Est. 2024" branding
- Admin gallery upload from device (up to 10 images at once)
- Server-side admin key for upload/delete actions
- Uploaded files stored in `/uploads`
- Gallery metadata stored in `/data/gallery.json`
- Responsive layout for phone, tablet and desktop

## 1) Install

Install Node.js 20+ on the computer/server, then open a terminal in this folder:

```bash
npm install
```

## 2) Set the admin key

Copy `.env.example` to `.env` and change the value:

```env
PORT=3000
ADMIN_KEY=YOUR_PRIVATE_ADMIN_KEY
```

## 3) Run

```bash
npm start
```

Open:

```text
http://localhost:3000
```

Click **Manage Gallery**, enter your admin key, choose the category, select images and upload.

## Important

This version is a real shared gallery when deployed to a host that supports Node.js and persistent disk storage. It is not just browser-local storage.

For public hosting, use a Node-capable host with persistent storage. If the host uses ephemeral storage, uploaded images can disappear after a redeploy/restart; in that case, connect the upload layer to object storage (for example S3-compatible storage or another persistent file service).

Replace the demo artworks in `public/assets/demo/` or remove the demo records from `data/gallery.json` before publishing.
