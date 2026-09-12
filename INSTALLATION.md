# Panduan Instalasi dan Penyiapan Lingkungan

Dokumen ini berisi langkah-langkah teknis untuk menginstal dan menjalankan proyek Backend API Sistem Absensi pada lingkungan lokal.

## Prasyarat Sistem

Sebelum memulai instalasi, pastikan perangkat kamu telah terpasang perangkat lunak berikut:

1. Node.js (Versi 18.x atau yang lebih baru)
2. npm (Node Package Manager)
3. MySQL Database Server (Dapat menggunakan XAMPP, MariaDB, atau MySQL Standalone Server)

## Langkah-Langkah Instalasi

### 1. Kloning Repositori Proyek

Masuk ke direktori kerja dan kloning repositori proyek ini:

git clone <URL_REPOSITORI>
cd "Project Attendance"

### 2. Instalasi Dependensi Utama

Jalankan perintah berikut untuk menginstal paket-paket produksi:

npm install express cors bcrypt jsonwebtoken express-validator

### 3. Instalasi Dependensi Pengembangan

Jalankan perintah berikut untuk menginstal paket-paket pendukung pengembangan (development dependencies):

npm install -D typescript ts-node-dev @types/express @types/cors @types/bcrypt @types/jsonwebtoken @types/node

### 4. Konfigurasi Variabel Lingkungan (.env)

Buat file bernama `.env` di akar direktori proyek, lalu isi dengan konfigurasi berikut:

DATABASE_URL="mysql://root:@localhost:3306/db_absensi"
JWT_SECRET=""
PORT=5000

Catatan: Sesuaikan username, password, port, dan nama database pada `DATABASE_URL` dengan konfigurasi MySQL lokal kamu.

### 5. Migrasi Skema Database

Pastikan layanan database MySQL di XAMPP/Server lokal kamu sudah aktif, kemudian jalankan migrasi database menggunakan Prisma:

npx prisma migrate dev --name sync_with_erd

Perintah di atas akan membuat database `db_absensi` (jika belum ada) dan seluruh tabel yang sesuai dengan skema Prisma.

## Jalur Eksekusi Aplikasi

### Memulai Server dalam Mode Pengembangan

Untuk menjalankan server dengan fitur auto-reload saat terjadi perubahan kode:

npm run dev

### Membuka Prisma Studio

Untuk mengelola dan melihat data pada database secara visual melalui antarmuka browser:

npx prisma studio

Aplikasi Prisma Studio dapat diakses melalui URL: http://localhost:5555
