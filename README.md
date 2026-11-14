# QR Generator

React app that creates profiles (social links, Google Maps, phones, product photos) and generates a scannable QR code for each one. Data is stored locally in `backend/data/qr_generator.json`.

## Features

- **CRUD** profiles
- Facebook / TikTok / YouTube links
- Google Maps location link
- Multiple phone numbers
- Product photo uploads
- QR code → public scan page (`/scan/:id`)

## Requirements

- Node.js 18+
- OpenSSH (for public QR scanning off WiFi)

## Setup

### 1. Backend

```bash
cd backend
npm install
npm run build --prefix ../frontend
npm run dev
```

API + app: http://localhost:5000  
Data file: `backend/data/qr_generator.json`

### 2. Frontend (dev)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 3. Scan from phone (any network)

Keep backend running, then open a second terminal:

```powershell
powershell -File scripts/start-tunnel.ps1
```

Copy the `https://....lhr.life` URL into `backend/.env` as `PUBLIC_URL=...`, restart backend, then **Save** again and download a new QR.

## Usage

1. Click **New Profile**
2. Fill name, social links, map, phones, photos
3. Save → view & download the QR code
4. Scanning the QR opens `/scan/:id` with all links and photos

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/profiles` | List profiles |
| GET | `/api/profiles/:id` | Get one |
| POST | `/api/profiles` | Create (multipart) |
| PUT | `/api/profiles/:id` | Update (multipart) |
| DELETE | `/api/profiles/:id` | Delete |
