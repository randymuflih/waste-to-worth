# ♻️ Waste to Worth (WTW)
**E-Waste Circular Management Platform — Turning Electronic Waste into Value.**

Waste to Worth adalah platform inovatif yang dirancang untuk menangani masalah sampah elektronik (*e-waste*) melalui pendekatan sirkular. Platform ini menghubungkan masyarakat dengan pengelola sampah tingkat kecamatan untuk memastikan pembuangan e-waste yang bertanggung jawab, sekaligus memberikan imbalan (*rewards*) kepada pengguna.

---

## 🚀 Fitur Utama

### 1. 👥 Citizen Dashboard
*   **Submit E-Waste**: Pengguna dapat menyetor sampah elektronik melalui dua metode: **Dropbox** (Scan QR) atau **Pickup Request** (Penjemputan ke rumah).
*   **Gamification (Point System)**: Dapatkan poin untuk setiap gram sampah elektronik yang diverifikasi.
*   **Reward Marketplace**: Tukarkan poin dengan Token Listrik, Voucher Bengkel, atau Kredit Transportasi Umum.
*   **Impact Tracking**: Lihat kontribusi nyata Anda terhadap lingkungan melalui visualisasi data sampah yang berhasil diselamatkan.

### 2. 🛡️ District Admin Dashboard (Localized Management)
*   **Manajemen Wilayah**: Admin mengelola sampah secara spesifik per kecamatan untuk efisiensi logistik.
*   **Verifikasi Real-time**: Verifikasi fisik sampah yang masuk ke Dropbox atau Batch penjemputan.
*   **Monitoring Batch**: Kelola siklus pengumpulan sampah dari status OPEN hingga COMPLETED.

---

## 🛠️ Tech Stack
*   **Frontend**: Next.js 14 (App Router), Tailwind CSS.
*   **Backend**: Next.js API Routes.
*   **Database**: PostgreSQL (Supabase).
*   **ORM**: Prisma.
*   **Visualisasi**: Recharts & Lucide React.
*   **Autentikasi**: JWT & Jose.

---

## ⚙️ Instalasi & Persiapan Lokal

Ikuti langkah-langkah berikut untuk menjalankan proyek di komputer Anda:

### 1. Clone Repositori
```bash
git clone https://github.com/jerukkk/waste-to-worth.git
cd waste-to-worth
```

### 2. Instal Dependency
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Buat file `.env` di root direktori dan masukkan kredensial database Anda:
```env
DATABASE_URL="your_postgresql_url"
DIRECT_URL="your_direct_url" # Diperlukan untuk migrasi prisma
JWT_SECRET="your_secret_key"
```

### 4. Setup Database & Seeding
Jalankan perintah berikut untuk menyinkronkan skema database dan mengisi data awal (Admin & Contoh User):
```bash
npx prisma db push
npx prisma db seed
```

### 5. Jalankan Aplikasi
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🔄 Flow / Alur Penggunaan

### A. Alur Pengguna (Citizen)
1.  **Register/Login**: Masuk sebagai Citizen.
2.  **Submit**: Pilih menu "Submit E-Waste", pilih lokasi Dropbox terdekat atau isi form penjemputan.
3.  **Submission**: Masukkan detail item (Smartphone, Laptop, Kabel, dll).
4.  **Wait for Verification**: Tunggu Admin kecamatan memverifikasi kondisi dan berat sampah.
5.  **Earn Points**: Setelah diverifikasi, poin otomatis masuk ke saldo Anda.
6.  **Redeem**: Tukarkan poin di menu "Rewards".

### B. Alur Admin (District Admin)
1.  **Login Admin**: Gunakan akun admin kecamatan (misal: `admin.tamalanrea@waste2worth.id`),pass: admin123
2.  **Monitor**: Masuk ke menu "Batches" atau "Verifications".
3.  **Verify**: Cek sampah yang masuk, sesuaikan berat/jumlah jika perlu, lalu klik **Verify**.
4.  **Complete**: Tandai batch sampah sebagai "Completed" untuk siap dikirim ke pabrik daur ulang pusat.

---

## 📈 Impact Vision
Kami percaya bahwa dengan memberikan nilai ekonomi pada sampah elektronik, kita dapat meningkatkan partisipasi masyarakat dalam menjaga kelestarian bumi dan mendukung ekonomi sirkular yang berkelanjutan.

---
Created with ❤️ for Hackathon 2026.