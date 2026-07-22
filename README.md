# Cuan Ledger

Aplikasi pencatatan keuangan dan penilaian kesehatan finansial untuk UMKM, dibangun untuk INSEVENT 2026 (Subtema SDG 8 - Digital Innovation for Economic Challenges).

## Latar Belakang

Banyak pelaku UMKM masih mencatat keuangan secara manual atau bahkan tidak sama sekali, sehingga sulit menilai kesehatan finansial bisnis mereka maupun mengajukan akses pembiayaan. Cuan Ledger hadir sebagai solusi pencatatan transaksi sederhana yang otomatis menghasilkan laporan dan skor kesehatan keuangan.

## Fitur

- Autentikasi pengguna (register & login)
- Pencatatan transaksi pemasukan & pengeluaran dengan kategori kustom
- Ringkasan keuangan (total pemasukan, pengeluaran, saldo)
- Skor kesehatan keuangan berbasis rasio tabungan

## Tech Stack

- **Frontend**: React (Vite)
- **Backend**: Express.js
- **Database**: PostgreSQL (Prisma ORM)
- **Auth**: JWT

## Cara Menjalankan (Development)

### Backend

\`\`\`bash
cd backend
npm install
cp .env.example .env
npm run dev
\`\`\`

### Frontend

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`