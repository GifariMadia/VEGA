# PROJECT TIMELINE

**VEGA — Variance Evaluation & Graphical Analytics**
Aplikasi Web Pemantauan Budget vs Actual — PT Omron Manufacturing of Indonesia

| Item | Keterangan |
|---|---|
| Disusun oleh | Nasyeila Nayla Nafiah (Ella) & Ihsan — MIS Division |
| Tanggal Dokumen | 24 Juli 2026 |
| Project Start | 28 Juli 2026 |
| Target Completion | November 2026 |
| Technology Stack | Backend: Python (FastAPI) · Frontend: React · Database: PostgreSQL |
| Versi Dokumen | 1.0 — Draft untuk Review Supervisor |

> Konversi dari `VEGA_ProjectTimeline.pdf` (15 halaman, dibuat 26 Agustus 2026). Isi bab 1–12 dipertahankan apa adanya, termasuk ketidakkonsistenan yang ada di PDF. Semua tanggal tanpa tahun adalah tahun 2026. Daftar konflik dengan keputusan proyek terkini ada di Lampiran A — bagian itu **bukan** bagian dari dokumen v1.0.

---

## Catatan Penting: Sumber Dokumen & Asumsi

Timeline ini disusun berdasarkan tiga dokumen sumber (Requirements-Spec, SRS PDF, Client-Presentation VEGA) yang ternyata memiliki beberapa perbedaan satu sama lain. Berikut keputusan final yang dipakai, telah dikonfirmasi langsung oleh penyusun:

- **Technology stack yang dipakai:** Python (FastAPI) untuk backend, React untuk frontend, PostgreSQL untuk database sesuai Requirements-Spec, BUKAN Laravel/Blade/MySQL yang tercantum di SRS PDF.
- **Alur data Actual/realisasi:** diperoleh dari unggah file General Ledger (GL) bulanan yang dibaca otomatis oleh sistem sesuai konsep VEGA, BUKAN input manual per transaksi seperti pada SRS PDF.

SRS PDF tetap digunakan sebagai referensi untuk business process, struktur ERD konseptual, dan daftar pertanyaan requirement gathering — bagian-bagian ini tidak bergantung pada pilihan stack teknis.

---

## 1. Ringkasan Eksekutif

VEGA (Variance Evaluation & Graphical Analytics) adalah aplikasi web internal untuk memantau anggaran (Budget) versus realisasi (Actual) per departemen di PT Omron Manufacturing of Indonesia, dikembangkan oleh 2 mahasiswa magang SI/MIS di bawah bimbingan Supervisor. Aplikasi diakses melalui jaringan lokal dari satu komputer host, tanpa instalasi di sisi pengguna.

| Aspek | Ringkasan |
|---|---|
| Project Start | 28 Juli 2026 |
| Target Completion | Awal November 2026 (3 November 2026) |
| Total Durasi Project | ± 10,5 minggu kerja (termasuk buffer) |
| Fase Utama | Initiation → Requirement & Analysis → Design → Architecture Setup → Development (Auth/COA, Excel Upload, Calculation & Dashboard) → Security & Backup → Testing & VEGA Reconciliation & UAT → Deployment → Handover |
| Milestone Kritikal | Minggu 9 (19–23 Okt 2026): VEGA vs Pivot Excel Reconciliation + UAT |
| Technology Stack | Python (FastAPI), React, PostgreSQL |
| Deliverable Utama | Aplikasi web fungsional, hasil rekonsiliasi VEGA vs Pivot Excel, UAT sign-off, User Manual, Technical Documentation, Handover Document |
| Risiko Kritis | Perbedaan angka VEGA vs Pivot Excel departemen; keterlambatan approval stakeholder; waktu bug fixing terbatas |

---

## 2. Project Overview

### Deskripsi

VEGA menggantikan proses rekonsiliasi Budget vs Actual yang selama ini dikerjakan manual di Excel (filter General Ledger, pemecahan kode akun, pivot manual). Aplikasi membaca file Budget (unggah 1× per fiscal year) dan file GL (unggah bulanan), lalu otomatis menghitung selisih, status (Overbudget/On-track/Underbudget), dan proyeksi posisi akhir tahun fiskal.

### Cakupan Awal

- 1 divisi, sekitar 6 pengguna
- 2 role: Administrator dan User biasa (read-only)
- Fiscal Year mengikuti perusahaan: April – Maret (FY26 = Apr 2026 – Mar 2027)

> **[TBC — perlu konfirmasi]** Konfirmasi penamaan tahun fiskal (FY26 dinamai menurut tahun awal atau akhir) — jika terbalik, seluruh label layar salah.
>
> **[Assumption — perlu approval]** Threshold status Overbudget/Underbudget: sementara dipakai ±5%, perlu approval resmi dari Finance/SPV.

### Out of Scope (v1.0)

- Integrasi langsung dengan ERP existing perusahaan
- Modul approval multi-level (workflow persetujuan berjenjang)
- Aplikasi mobile native
- Multi-currency dan multi-company
- Notifikasi email/WhatsApp otomatis
- Single Sign-On (SSO) dengan Active Directory perusahaan

---

## 3. Project Timeline Summary

Total durasi: 28 Juli 2026 – 3 November 2026 (± 10,5 minggu kerja, termasuk buffer akhir).

| Periode | Fokus Utama |
|---|---|
| Minggu 1 | Initiation, Requirement Gathering, Business Process Analysis |
| Minggu 2 | Requirement Spec, Use Case, ERD, Spesifikasi Format Excel — **Gate 1** |
| Minggu 3 | Mockup, API Design, Review & Persetujuan Desain — **Gate 2** |
| Minggu 4 | Technical Architecture & Environment Setup |
| Minggu 5 | Login, Hak Akses (RBAC), Master Data COA |
| Minggu 6 | Excel Upload & Validation (Budget & GL), uji anti-duplikasi |
| Minggu 7 | Calculation Engine, Status, Proyeksi & Dashboard |
| Minggu 8 | Security Hardening & Automated Backup — **Gate 3, Gate 4** |
| Minggu 9 | TESTING + VEGA vs Pivot Excel Reconciliation + UAT — **Gate 5, Gate 6** (MILESTONE PALING KRITIS) |
| Minggu 10 | Deployment ke Host, Dokumentasi, Training — **Gate 7** |
| Buffer | Kontingensi & Serah Terima Resmi — **Gate 8** (Project Closure) |

---

## 4. Detailed Project Timeline

Tabel berikut memecah setiap fase menjadi aktivitas konkret dengan tanggal, dependency, dan PIC. Baris **Milestone** menandai Approval Gate.

| No | Phase | Task | Start | End | Durasi | Deliverable | Dependency | PIC/Role | Status/Milestone |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Initiation | Kickoff meeting & re-scoping alignment (konfirmasi stack FastAPI/React/PostgreSQL & alur GL-upload) | 28 Juli | 28 Juli | 1 hari | Project Charter (update) | — | Ella & Partner + SPV | **Gate 0 – Kickoff** |
| 2 | Requirement Gathering | Requirement (adaptasi pertanyaan SRS, fokus format file, threshold, fiscal year, host) | 29 Juli | 31 Juli | 3 hari | Notes wawancara | Task 1 | Ella & Partner | |
| 3 | Business Analysis | Observasi proses Excel existing (filter GL, LEFT/RIGHT parsing kode akun, pivot manual) | 1 Ags | 5 Ags | 5 hari (paralel) | Catatan proses bisnis | Task 2 | Ella & Partner | |
| 4 | Business Analysis | Business Process Diagram + System Flowchart (Login–Upload–Kalkulasi–Dashboard) | 6 Ags | 9 Ags | 4 hari | Flowchart & BP Diagram | Task 2,3 | Ella & Partner | Deliverable Minggu 1 |
| 5 | Requirement Spec | Functional Requirement Document | 10 Ags | 14 Ags | 5 hari | BRD final | Task 4 | Ella & Partner | |
| 6 | System Analysis | Use Case Diagram (Admin, User) | 15 Ags | 17 Ags | 3 hari | Use Case Diagram | Task 5 | Partner | |
| 7 | System Design | ERD (Budget, Actual computed, COA, Fiscal Year, User, Upload History) | 18 Ags | 21 Ags | 3 hari | ERD draft | Task 5 | Partner | |
| 8 | Tech Architecture | Stack Comparison Discussion | 22 Ags | 25 Ags | 4 hari | Python, FastAPI, React, SQLite | | Ella | |
| 8 | System Design | Spesifikasi format Excel (Template Budget & GL, mapping kolom, aturan parsing kode akun) | 26 Ags | 29 Ags | 4 hari | Excel Template Spec | Task 5,7 | Ella | |
| 9 | Milestone | Gate 1 – Requirement Approval (sign-off tertulis SPV) | 4 Sep | 4 Sep | — | BRD, ERD, Use Case disetujui | Task 5–8 | SPV | **GATE 1** |
| 10 | UI/UX Design | Wireframe/mockup seluruh halaman (Login, Dashboard, Upload Budget/GL, Riwayat Unggahan, Master COA, dst) | 30 Sep | 1 Sep | 3 hari | Mockup / wireframe | Gate 1 | Ella | |
| 11 | Technical Architecture | Draf API contract (REST endpoint & payload) | 2 Sep | 4 Sep | 3 hari | API Design Doc (draft) | Task 7 | Partner | |
| 12 | Milestone | Review & persetujuan desain bersama stakeholder – Gate 2 Design Approval | 5 Sep | 6 Sep | 2 hari | Mockup & API Design disetujui | Task 10,11 | SPV | **GATE 2** |
| 13 | Tech Architecture | Setup Python environment & struktur project FastAPI | 7 Sep | 7 Sep | 1 hari | Repo backend (skeleton) | Gate 2 | Partner (BE) | |
| 14 | Tech Architecture | Setup React project (routing, base layout) | 8 Sep | 10 Sep | 3 hari | Repo frontend (skeleton) | Gate 2 | Ella (FE) | |
| 15 | Database | Setup PostgreSQL, finalisasi ERD menjadi migration, seed master data awal | 11 Sep | 13 Sep | 3 hari | DB schema live (kosong) | Task 7 | Partner | |
| 16 | Tech Architecture | Setup Git repo & branching strategy, environment config (.env), rencana jaringan host lokal terisolasi | 14 Sep | 16 Sep | 3 hari | Git repo + env config | Task 13,14 | Ella & Partner | |
| 17 | Tech Architecture | Desain arsitektur Auth (JWT) & RBAC (Admin/User) | 17 Sep | 18 Sep | 2 hari | Auth architecture doc | Task 11,13 | Partner | |
| 18 | Integration | Finalisasi kontrak API FE-BE (dummy JSON agar FE & BE dapat paralel) | 18 Sep | 18 Sep | 1 hari | API contract final | Task 11,17 | Ella & Partner | Skeleton app siap dev |
| 19 | Backend Dev | API Login/Logout, hashing password, JWT, middleware RBAC | 21 Sep | 23 Sep | 3 hari | Auth API | Task 17,18 | Partner | |
| 20 | Backend Dev | Master Data COA API (CRUD + nonaktifkan) | 23 Sep | 24 Sep | 2 hari | COA API | Task 15 | Partner | |
| 21 | Frontend Dev | Halaman Login + alur autentikasi (simpan token, redirect sesuai role) | 21 Sep | 23 Sep | 3 hari | Login page | Task 18 | Ella | |
| 22 | Frontend Dev | Halaman Master Data COA (list, tambah, ubah, nonaktifkan) | 23 Sep | 25 Sep | 3 hari | Halaman COA | Task 19,20 | Ella | |
| 23 | Integration & Test | Integrasi Login + COA end-to-end, uji role Admin vs User | 25 Sep | 25 Sep | 1 hari | Login & COA berfungsi | Task 19–22 | Ella & Partner | Deliverable Minggu 5 |
| 24 | Backend Dev | Endpoint upload Budget & GL (multipart), parsing file (pandas/openpyxl) | 28 Sep | 29 Sep | 2 hari | Upload API (raw) | Task 20 | Partner | |
| 25 | Backend Dev | Validasi template, tipe data, mandatory field, deteksi kode akun tak dikenal | 29 Sep | 30 Sep | 2 hari | Validation engine | Task 24 | Partner | |
| 26 | Backend Dev | Deteksi periode dari tanggal transaksi (stop-and-ask jika tidak cocok) + overwrite bulan sama (bukan append) | 30 Sep | 1 Okt | 2 hari | Period-detection & overwrite logic | Task 25 | Partner | Fitur kritikal anti-duplikasi |
| 27 | Backend Dev | Transactional save (all-or-nothing), Upload History log & fitur batalkan unggahan | 1 Okt | 2 Okt | 2 hari | Upload history API | Task 26 | Partner | |
| 28 | Frontend Dev | Halaman Upload Budget & Upload GL + laporan hasil unggah (baris masuk/ditolak + alasan) | 28 Sep | 1 Okt | 4 hari | Halaman upload | Task 24,25 | Ella | |
| 29 | Frontend Dev | Halaman Riwayat Unggahan (list + batalkan) | 1 Okt | 2 Okt | 2 hari | Halaman riwayat | Task 27 | Ella | |
| 30 | Testing | Uji unggah ulang (pastikan tidak menggandakan angka) + uji file rusak/kolom bergeser | 2 Okt | 2 Okt | 1 hari | Hasil uji re-upload | Task 24–29 | Ella & Partner | Deliverable Minggu 6 |
| 31 | Backend Dev | Engine perhitungan Variance (Budget − SUM Actual per COA, on-the-fly) | 5 Okt | 6 Okt | 2 hari | Variance engine | Task 26 | Partner | |
| 32 | Backend Dev | Status engine (Overbudget/On-track/Underbudget, threshold ±5%) | 6 Okt | 6 Okt | 1 hari | Status logic | Task 31 | Partner | Assumption – perlu approval |
| 33 | Backend Dev | Logic proyeksi akhir tahun fiskal + endpoint agregasi dashboard (summary, per kategori, tren kuartal) | 6 Okt | 8 Okt | 3 hari | Dashboard API | Task 31,32 | Partner | |
| 34 | Frontend Dev | Dashboard: kartu ringkasan, grafik batang, grafik tren kuartal, kartu proyeksi, indikator warna, filter | 5 Okt | 9 Okt | 5 hari | Dashboard UI | Task 33 | Ella | |
| 35 | Integration & Test | Integrasi & uji dashboard end-to-end (skenario over/under budget) | 9 Okt | 9 Okt | 1 hari | Dashboard berfungsi | Task 33,34 | Ella & Partner | Deliverable Minggu 7 |
| 36 | Security | Audit RBAC di seluruh endpoint, proteksi SQL Injection & XSS | 12 Okt | 13 Okt | 2 hari | Security checklist | Task 19–35 | Partner | |
| 37 | Security | Password policy, session timeout, rate-limit percobaan login | 13 Okt | 14 Okt | 2 hari | Auth hardening | Task 36 | Partner | |
| 38 | Backup | Backup otomatis terjadwal (pg_dump) + backup otomatis sebelum data lama ditimpa | 14 Okt | 15 Okt | 2 hari | Backup service | Task 15 | Partner | |
| 39 | Frontend Dev | Penyempurnaan role-based UI, error handling/notifikasi, responsive layout | 12 Okt | 15 Okt | 4 hari | UI polish | Task 34 | Ella | |
| 40 | Milestone | Gate 3 – Development Completion (core BE/FE/DB/business logic selesai) | 15 Okt | 15 Okt | — | Aplikasi fungsional lengkap | Task 19–39 | SPV | **GATE 3** |
| 41 | Milestone | Gate 4 – Internal Testing Readiness (security & backup selesai) | 16 Okt | 16 Okt | — | Security & backup checklist | Task 36–38 | SPV | **GATE 4** |
| 42 | Testing | Unit Testing (calculation engine, validation, auth) | 19 Okt | 19 Okt | 1 hari | Unit test report | Gate 4 | Ella & Partner | |
| 43 | Testing | Backend/API Testing & Database Testing | 19 Okt | 20 Okt | 1,5 hari | API/DB test report | Task 42 | Partner | |
| 44 | Testing | Frontend Testing & Integration Testing (end-to-end) | 19 Okt | 20 Okt | 1,5 hari | FE/Integration test report | Task 42 | Ella | |
| 45 | Testing | Excel Upload Testing, Calculation Testing, Validation Testing | 20 Okt | 20 Okt | 1 hari | Test report | Task 43,44 | Ella & Partner | |
| 46 | VEGA Reconciliation | Baseline data dari Pivot Excel + tentukan dataset & periode pengujian | 19 Okt | 19 Okt | 1 hari | Baseline dataset | Data departemen | Ella & Partner | Lihat Bagian 7 |
| 47 | VEGA Reconciliation | Jalankan calculation VEGA, bandingkan dgn Pivot Excel, identifikasi variance | 20 Okt | 20 Okt | 1 hari | Hasil komparasi | Task 46 | Ella & Partner | Gate 5 belum lolos jika beda |
| 48 | VEGA Reconciliation | Tracing sumber perbedaan, bug fixing/adjustment kalkulasi, re-run & reconciliation ulang | 21 Okt | 22 Okt | 2 hari | Fix & re-test | Task 47 | Partner | Risiko utama proyek |
| 49 | VEGA Reconciliation | Final verification & stakeholder confirmation | 22 Okt | 22 Okt | 1 hari | Sign-off internal | Task 48 | Ella & Partner + SPV | **GATE 5** |
| 50 | Security & Backup Testing | Security Testing (RBAC, SQLi, XSS) + Backup & Restore Testing | 21 Okt | 22 Okt | 2 hari | Test report | Task 36–38 | Partner | |
| 51 | UAT | User Acceptance Testing bersama Supervisor | 22 Okt | 23 Okt | 1,5 hari | UAT result | Task 49,50 | SPV | |
| 52 | UAT | Regression Testing + Final Validation | 23 Okt | 23 Okt | 1 hari | Final validation report | Task 51 | Ella & Partner | |
| 53 | Milestone | Gate 6 – UAT Sign-off | 23 Okt | 23 Okt | — | UAT Sign-off tertulis | Task 51,52 | SPV | **GATE 6** |
| 54 | Deployment | Setup environment production di komputer host (terisolasi), izin admin lokal, buka port | 26 Okt | 27 Okt | 2 hari | Host siap | Gate 6 | Partner | |
| 55 | Deployment | Deploy backend + frontend, migrasi database final, seed master data riil | 27 Okt | 28 Okt | 2 hari | Aplikasi live di host | Task 54 | Ella & Partner | |
| 56 | Deployment | Smoke test pasca-deploy (login, upload, dashboard, export) | 28 Okt | 28 Okt | 1 hari | Smoke test lulus | Task 55 | Ella & Partner | |
| 57 | Documentation | Technical Documentation (arsitektur, API, ERD, panduan deploy) | 27 Okt | 29 Okt | 3 hari | Technical Doc | Task 55 | Partner | |
| 58 | Documentation | User Manual (termasuk catatan keamanan HTTP jaringan lokal) | 28 Okt | 29 Okt | 2 hari | User Manual | Task 56 | Ella | |
| 59 | Handover | Training singkat untuk sekitar 6 pengguna departemen | 29 Okt | 29 Okt | 1 hari | Notulen training | Task 58 | Ella & Partner | |
| 60 | Milestone | Gate 7 – Production/Host Deployment | 30 Okt | 30 Okt | — | Aplikasi terpasang, smoke test lulus | Task 54–59 | SPV | **GATE 7** |
| 61 | Buffer | Buffer kontingensi (bug minor pasca-UAT, feedback tambahan, penyelesaian dokumentasi) | 2 Nov | 2 Nov | 1 hari | Outstanding item closed | Gate 7 | Ella & Partner | Lihat Bagian 10 – Risiko |
| 62 | Handover | Serah terima resmi (dokumen handover, source code, kredensial) – Gate 8 Handover | 3 Nov | 3 Nov | 1 hari | Handover Document (signed) | Task 61 | Ella & Partner + SPV | **GATE 8 – PROJECT CLOSURE** |

---

## 5. Technology & Development Breakdown

### Backend — Python / FastAPI

- Setup Python environment & dependency management
- Setup struktur project FastAPI
- Konfigurasi koneksi database (SQLAlchemy)
- Environment configuration (.env)
- Autentikasi (JWT)
- Otorisasi & Role-Based Access Control
- Master Data COA API (CRUD)
- Endpoint upload file Budget & GL
- Validasi file Excel (template, tipe data, mandatory field)
- Deteksi periode dari tanggal transaksi & penanganan mismatch
- Logic overwrite per-bulan (anti-duplikasi saat re-upload)
- Data processing & transformasi hasil unggahan
- Calculation logic (Variance = Budget − Actual)
- Status engine (Overbudget/On-track/Underbudget)
- Projection calculation (proyeksi akhir tahun fiskal)
- Dashboard aggregation API (summary, per kategori, tren)
- Upload history API (log & pembatalan unggahan)
- Error handling & logging
- Security implementation (SQL Injection, XSS, rate limit)
- API testing & integration testing

### Frontend — React

- React project setup (Vite) & struktur folder
- Routing antar halaman
- Halaman Login & alur autentikasi
- Penyimpanan token & redirect berbasis role
- Dashboard (kartu ringkasan, grafik, filter)
- Halaman Master Data COA
- Halaman Upload Budget
- Halaman Upload GL
- Tampilan laporan hasil unggah (baris masuk/ditolak + alasan)
- Halaman Riwayat Unggahan (+ pembatalan)
- Tampilan Variance & indikator status
- Tampilan proyeksi akhir tahun fiskal
- Notifikasi error/sukses (toast)
- Role-based UI (sembunyikan menu sesuai role)
- Responsive/penyempurnaan layout
- Integrasi frontend dengan FastAPI
- Frontend testing

### Database — PostgreSQL

- Setup database PostgreSQL
- Finalisasi ERD
- Pembuatan tabel (migration, mis. Alembic)
- Primary key / foreign key
- Constraints (unique, not null, check)
- Indexing (kode COA, periode, upload batch)
- Seed / master data awal
- Migration strategy (version-controlled, dapat rollback)
- Data validation di level database
- Backup otomatis terjadwal
- Uji restore dari backup

---

## 6. Excel Upload & Data Validation Flow

Dua hal ditangani secara khusus di desain (bukan diserahkan ke ketelitian pengguna): (1) periode ditentukan dari tanggal transaksi di dalam file, bukan dropdown pengguna — jika tidak cocok, unggahan berhenti dan bertanya; (2) unggah ulang bulan yang sama meng-overwrite, bukan menambah (append), sehingga angka tidak pernah tergandakan.

- Analisis format Excel (Budget & GL)
- Mapping kolom Excel ke struktur data
- Template validation (sheet & kolom sesuai standar)
- Data type validation
- Mandatory field validation
- Duplicate & kode-akun-tidak-dikenal detection
- Upload validation (baris valid vs ditolak + alasan)
- Re-upload validation (overwrite periode yang sama, bukan append)
- Deteksi periode dari tanggal transaksi + stop-and-ask jika mismatch
- Data transformation (agregasi ke struktur variance)
- Data storage (transactional, all-or-nothing)
- Reconciliation trigger (tersedia untuk proses Bagian 7)

### Penanganan file bermasalah

| Kondisi | Perlakuan |
|---|---|
| Sheet/kolom tidak sesuai | File ditolak seluruhnya, dengan penjelasan kolom mana yang bergeser |
| Kode akun tidak ada padanan di COA | Baris dilaporkan, tidak dibuang diam-diam |
| Nominal negatif/bukan angka/desimal koma | Baris disisihkan beserta alasan |
| Tidak ada baris valid | Unggahan ditolak, tidak ada yang tersimpan |
| Gagal di tengah proses simpan | Seluruh proses dibatalkan (tidak ada bulan tersimpan setengah) |

---

## 7. VEGA vs Pivot Excel Reconciliation Plan

Ini adalah uji terima yang paling menentukan (Minggu 9). Prinsip yang dipegang:

> "VEGA result is considered valid only after successful reconciliation with the approved departmental Pivot Excel."

Jika VEGA ≠ Pivot Excel, hasil VEGA dianggap belum valid sampai penyebab perbedaan ditemukan dan verifikasi ulang dilakukan — angka aplikasi tidak otomatis dianggap benar hanya karena sistem menghasilkan angka.

| No | Aktivitas | Tanggal | PIC | Output |
|---|---|---|---|---|
| 1 | Menentukan baseline data dari Pivot Excel departemen | 19 Okt (pagi) | Ella & Partner | Baseline dataset disepakati |
| 2 | Menentukan periode & dataset pengujian (bulan berjalan, 1 fiscal year) | 19 Okt (pagi) | Ella & Partner | Cakupan uji ditetapkan |
| 3 | Menentukan calculation rules final (formula variance, threshold status) | 19 Okt (siang) | Partner + SPV | Rules terkunci [Assumption threshold ±5%] |
| 4 | Menjalankan calculation di VEGA dengan dataset uji | 20 Okt (pagi) | Partner | Output kalkulasi VEGA |
| 5 | Membandingkan hasil VEGA dengan Pivot Excel | 20 Okt (siang) | Ella & Partner | Tabel komparasi |
| 6 | Identifikasi variance / selisih (jika ada) | 20 Okt (siang) | Ella & Partner | Daftar selisih per COA |
| 7 | Tracing sumber perbedaan (mapping kolom, rounding, periode) | 21 Okt (pagi) | Partner | Root cause teridentifikasi |
| 8 | Bug fixing / calculation adjustment | 21 Okt | Partner | Patch kalkulasi |
| 9 | Re-run calculation | 22 Okt (pagi) | Partner | Output kalkulasi baru |
| 10 | Reconciliation ulang | 22 Okt (pagi) | Ella & Partner | Komparasi ulang |
| 11 | Final verification | 22 Okt (siang) | Ella & Partner | Angka VEGA = Pivot Excel |
| 12 | Stakeholder confirmation | 22 Okt (siang) | SPV / Finance | Konfirmasi tertulis |
| 13 | UAT sign-off (menyatu dengan Gate 6) | 23 Okt | SPV | GATE 5 & GATE 6 tercapai |

---

## 8. Testing & QA Plan

Testing dipecah menjadi 13 jenis pengujian dengan objective, scope, expected result, dan dependency masing-masing:

| Jenis Testing | Objective | Test Scope | Expected Result | Output/Deliverable | Dependency |
|---|---|---|---|---|---|
| Unit Testing | Memastikan fungsi individual (kalkulasi, validasi, auth) benar | Fungsi VarianceEngine, validator, hashing/JWT | Semua unit test lulus, coverage memadai | Unit test report | Kode backend selesai per modul |
| Backend/API Testing | Memastikan endpoint FastAPI sesuai kontrak API | Seluruh endpoint Auth, COA, Upload, Variance, Dashboard | Response sesuai schema, error handling benar | API test report (Postman/pytest) | API contract final (Task 18) |
| Frontend Testing | Memastikan komponen React berjalan sesuai desain | Login, Dashboard, Upload, Master COA | Komponen render benar, interaksi sesuai wireframe | FE test report | Mockup disetujui (Gate 2) |
| Database Testing | Memastikan integritas skema & data PostgreSQL | Constraint, FK, indexing, migration | Tidak ada orphan record, query performan | DB test report | Migration final |
| Integration Testing | Memastikan FE-BE-DB terintegrasi end-to-end | Alur Login sampai Dashboard | Data konsisten lintas layer | Integration test report | Modul terkait selesai |
| Excel Upload Testing | Memastikan upload Budget/GL benar & anti-duplikasi | Upload normal, re-upload, file rusak | Baris valid tersimpan, baris invalid ditolak + alasan, re-upload tidak duplikat | Upload test report | Task 24–29 selesai |
| Calculation Testing | Memastikan rumus Variance & proyeksi akurat | Skenario Under/Over Budget, proyeksi akhir tahun | Hasil sesuai perhitungan manual | Calculation test report | Task 31–33 selesai |
| Validation Testing | Memastikan seluruh validasi form & file berjalan | Form input, validasi upload | Pesan error jelas & tepat sasaran | Validation test report | Terkait modul upload & form |
| Security Testing | Memastikan aplikasi aman dari akses tidak sah | RBAC, SQL Injection, XSS, password hashing | Tidak ada celah kritikal ditemukan | Security test report | Gate 4 – Security hardening selesai |
| Backup & Restore Testing | Memastikan backup otomatis & proses restore berjalan | Backup terjadwal, backup sebelum overwrite, restore manual | Restore berhasil tanpa kehilangan data | Backup/restore test report | Task 38 selesai |
| User Acceptance Testing | Memastikan sistem diterima oleh pengguna bisnis | Seluruh fitur wajib pada scope (Bab 2) | Disetujui tertulis oleh SPV/Finance | UAT result / sign-off | Gate 5 – VEGA Reconciliation Passed |
| Regression Testing | Memastikan perbaikan bug tidak merusak fitur lain | Fitur yang terdampak bug fixing W9 | Fitur lama tetap berjalan normal | Regression test report | Bug fixing selesai |
| Final Validation | Validasi menyeluruh sebelum deployment | Seluruh sistem end-to-end | Sistem siap deploy tanpa bug kritikal | Final validation checklist | Semua testing di atas selesai |

---

## 9. Milestone & Approval Gates

| Gate | Deskripsi | Target Tanggal | Approver |
|---|---|---|---|
| Gate 1 | Requirement Approval — Requirement & business process disetujui | 4 Sep 2026 | SPV |
| Gate 2 | Design Approval — Mockup, ERD, arsitektur, dan technical design disetujui | 11 Sep 2026 | SPV |
| Gate 3 | Development Completion — Core backend, frontend, database, business logic selesai | 15 Okt 2026 | SPV |
| Gate 4 | Internal Testing Readiness — Security & backup selesai, siap uji internal | 16 Okt 2026 | SPV |
| Gate 5 | VEGA Reconciliation Passed — Angka VEGA cocok dengan Pivot Excel baseline | 22 Okt 2026 | SPV / Finance |
| Gate 6 | UAT Sign-off — User/stakeholder menyatakan sistem dapat diterima | 23 Okt 2026 | SPV |
| Gate 7 | Production/Host Deployment — Aplikasi terpasang di komputer host | 30 Okt 2026 | SPV / IT |
| Gate 8 | Handover — Dokumentasi, User Manual, training, serah terima selesai | 3 Nov 2026 | SPV |

---

## 10. Risk & Mitigation

| Risk | Impact | Probability | Mitigation | Contingency |
|---|---|---|---|---|
| Requirement berubah di tengah jalan | Sedang-Tinggi | Sedang | Kunci requirement dengan sign-off tertulis di Gate 1; perubahan besar masuk backlog v1.1 | Evaluasi ulang jadwal & lingkup bersama SPV |
| Approval stakeholder terlambat (mockup/UAT) | Tinggi | Sedang | Jadwalkan slot review di awal minggu terkait, follow-up H-1 | Gunakan buffer minggu terakhir untuk menyerap keterlambatan |
| Perbedaan hasil VEGA dengan Pivot Excel | Tinggi | Sedang-Tinggi | Alokasi 2 hari khusus tracing & fix di Minggu 9 (Task 48) | Perpanjang UAT beberapa hari memakai buffer Nov |
| Format Excel Budget/GL berubah dari yang disepakati | Sedang | Sedang | Kunci template di Gate 1 (Task 8), validasi ketat saat upload | Rilis ulang template & re-training user |
| Duplicate data saat re-upload | Tinggi | Rendah (mitigasi desain) | Logic overwrite per-bulan (bukan append) dibangun sejak Task 26 | Audit log upload history untuk investigasi jika terjadi |
| Calculation logic tidak sesuai ekspektasi Finance | Tinggi | Sedang | Validasi rumus & threshold bersama SPV sebelum Task 31 mulai | Sesi klarifikasi ulang rumus + revisi cepat |
| Integration issue FE-BE | Sedang | Rendah-Sedang | Kontrak API dikunci di Task 18 sebelum development paralel | Sesi debugging bersama, prioritas critical path |
| Database issue (skema tidak scalable) | Sedang | Rendah | ERD divalidasi 3NF sebelum migration (Gate 2) | Migration tambahan terkendali via Alembic |
| Security issue (jaringan HTTP tanpa enkripsi) | Sedang | Menengah (keputusan sadar) | Isolasi jaringan, hashing password, RBAC ketat, disclosure di User Manual | Tambahkan HTTPS di fase berikutnya jika diminta |
| Deployment issue (perbedaan environment) | Sedang | Sedang | Environment production disiapkan H-3 sebelum deploy (Task 54) | Rollback ke backup pra-migrasi |
| UAT feedback terlalu banyak | Sedang | Sedang | Fokuskan UAT pada fitur wajib in-scope, catat future improvement terpisah | Gunakan buffer Nov untuk perbaikan prioritas tinggi |
| Waktu bug fixing terlalu sedikit | Tinggi | Sedang | Buffer khusus 2–3 hari sebelum Gate 6 & buffer akhir Nov | Prioritaskan bug kritikal, bug minor masuk changelog pasca-handover |

---

## 11. Deliverables

| Fase | Deliverable |
|---|---|
| Requirement & Analysis | Business Requirement Document, Business Process Diagram, System Flowchart |
| System Design | Use Case Diagram, ERD, Excel Template Spec (Budget & GL), API Design Doc |
| UI/UX | Approved Mockup / Wireframe |
| Technical Architecture | Repo skeleton (BE & FE), DB schema live, Git workflow, Auth architecture doc |
| Development | Aplikasi fungsional: Auth & RBAC, Master COA, Upload Budget/GL, Variance Engine, Dashboard |
| Security & Backup | Security checklist, backup service otomatis |
| Testing | Test Case Document, Test Result Report (per jenis testing), Bug Report |
| VEGA Reconciliation | VEGA vs Pivot Excel Validation Result, stakeholder confirmation |
| UAT | UAT Result / Sign-off |
| Deployment | Aplikasi live di komputer host, smoke test result |
| Documentation | Technical Documentation, User Manual, README |
| Handover | Handover Document, training notes, project closure report |

---

## 12. Final Handover & Project Closure

### Checklist Serah Terima

- [ ] Aplikasi terpasang & berjalan stabil di komputer host departemen
- [ ] Seluruh source code tersimpan di repository (akses diserahkan ke SPV/IT)
- [ ] Kredensial admin & dokumentasi environment production diserahkan
- [ ] Technical Documentation lengkap (arsitektur, API, ERD, panduan deploy)
- [ ] User Manual (termasuk catatan keamanan jaringan lokal) diserahkan & sudah dilatihkan ke pengguna
- [ ] Hasil VEGA vs Pivot Excel Reconciliation & UAT Sign-off terlampir
- [ ] Backup awal (baseline) sudah dijalankan dan diverifikasi
- [ ] Daftar Future Improvement dicatat terpisah untuk fase berikutnya
- [ ] Dokumen Handover ditandatangani oleh SPV

### Future Improvement (di luar scope v1.0)

- Integrasi langsung dengan sistem ERP/SAP perusahaan
- Notifikasi otomatis (email/WhatsApp) saat mendekati/melewati budget
- Dashboard drill-down interaktif ke detail transaksi
- Penambahan HTTPS bila dinilai perlu oleh IT Omron
- Perluasan ke divisi lain di luar cakupan awal (~6 pengguna)

---

## Lampiran A — Catatan Konversi (bukan bagian dokumen v1.0)

Bagian ini ditambahkan saat konversi PDF → Markdown. Isinya dua hal: cacat internal yang ada di PDF, dan pertentangan antara PDF ini dengan keputusan teknis yang sudah dikunci di dokumen lain.

### A.1 Cacat internal PDF (perlu diperbaiki di v1.1)

| Lokasi | Masalah |
|---|---|
| Bagian 4, No 8 | Nomor 8 dipakai dua kali (Stack Comparison Discussion dan Spesifikasi format Excel). Penomoran setelahnya bergeser. |
| Bagian 4, No 8 | Kolom Deliverable berisi "Python, FastAPI, React, SQLite" — sudah menyebut SQLite, bertentangan dengan header dokumen yang menyebut PostgreSQL. |
| Bagian 4, No 10 | Start 30 Sep, End 1 Sep — mundur. Yang dimaksud hampir pasti 30 Ags – 1 Sep. |
| Bagian 4 vs Bagian 9 | Gate 2 di tabel task selesai 6 Sep, tetapi tabel Gate menargetkan 11 Sep 2026. |
| Bagian 4, No 9 | Gate 1 tertulis 4 Sep, sedangkan Bagian 3 menempatkan Gate 1 di Minggu 2 (pertengahan Agustus). |
| Header | "Tanggal Dokumen 24 Juli 2026", tetapi metadata PDF dibuat 26 Agustus 2026. |
| Bagian 4, No 3 | Durasi "5 hari (paralel)" untuk 1–5 Ags, sedangkan Task 4 mulai 6 Ags — tidak benar-benar paralel. |

### A.2 Pertentangan dengan keputusan teknis yang sudah dikunci

Urutan prioritas dokumen: `Excel-Template-Spec.md` dan `Requirements-Spec.md` menang atas timeline ini.

| Topik | Isi PDF | Keputusan terkini |
|---|---|---|
| Database | PostgreSQL (header, Bagian 5, Bagian 8) | **Cocok — PDF benar.** PostgreSQL 18 adalah keputusan klien; lihat `Stack-Comparison.md` §0. Driver `psycopg` v3, skema URL `postgresql+psycopg://` |
| Backup | `pg_dump` terjadwal (Task 38) | **Cocok — PDF benar.** `pg_dump --format=custom`, timer di dalam aplikasi, uvicorn 1 worker |
| Threshold status | ±5%, ditandai Assumption (Task 32, Bagian 7 No 3) | **Zero tolerance** — selisih apa pun = UNDER/OVER, pembulatan 2 desimal sekali sebelum dibandingkan. Status `ALOKASI` untuk budget bulanan negatif |
| Parsing Excel | "pandas/openpyxl" (Task 24) | **openpyxl saja, tanpa pandas** |
| Master COA | COA API CRUD + halaman COA (Task 20, 22) | **Tidak ada CRUD COA.** VEGA membaca dan mengekstrak, tidak memelihara. COA master ditulis oleh upload budget + auto-registrasi GL, dikoreksi dengan unggah ulang. CRUD tergarap hanya lewat Users |
| Alur upload | Validasi lalu simpan, plus fitur batalkan unggahan | **Dua langkah konfirmasi:** (1) Preview di memori — tidak ada yang ditulis sebelum admin setuju; (2) keputusan GANTI DATA / BATALKAN bila periode sudah terisi |
| Penamaan fiscal year | Ditandai [TBC] | Sudah terkunci: FY26 = Apr 2026 – Mar 2027 |
| Proyeksi akhir tahun | Tidak dirinci | Pembagi adalah `months_loaded` (jumlah bulan yang benar-benar punya data GL), bukan bulan kalender berjalan |
| Anomali/fraud detection | Tidak disebut | Eksplisit di luar scope; tidak ada jalur AI di proyek ini |
| Klaim sumber stack | "PostgreSQL sesuai Requirements-Spec" (Catatan Penting) | **Kesimpulannya benar, alasannya salah — perbaiki di v1.1.** `Requirements-Spec.md` tidak menyebut engine database sama sekali. PostgreSQL benar karena diminta klien (`Stack-Comparison.md` §0), bukan karena tercantum di Requirements-Spec. |
| Presisi angka uang | Tidak dibahas | `ERD.md` §Money: `NUMERIC(18,2)` → `Decimal`, tidak pernah `float`. Dengan PostgreSQL ini dijamin oleh database, bukan oleh konvensi kode. Ini keuntungan terbesar dari keputusan Opsi C. |

### A.3 Status jadwal terhadap tanggal hari ini

Sumber PDF disimpan berdampingan di `Docs/Client/VEGA_ProjectTimeline.pdf` (dipindah dari root repo).

Per 27 Agustus 2026, **proyek sesuai jadwal dan tidak perlu di-baseline ulang.**

Yang dipakai untuk menilai adalah tabel bertanggal di Bagian 4, bukan penomoran minggu di Bagian 3 — keduanya memang bertentangan (lihat A.1), dan tabel bertanggal yang menang.

| Tanggal di Bagian 4 | Task | Status nyata |
|---|---|---|
| 22–25 Ags | Stack Comparison Discussion | Selesai — `Stack-Comparison.md` |
| 26–29 Ags | Spesifikasi format Excel | Selesai — `Excel-Template-Spec.md` |
| 30 Ags – 1 Sep (tertulis "30 Sep", lihat A.1) | Mockup seluruh halaman | Selesai lebih awal |
| 4 Sep | **Gate 1 — Requirement Approval** | Menunggu SPV |
| 5–6 Sep | **Gate 2 — Design Approval** | Belum |
| 7 Sep | Setup FastAPI — **kode fitur baru dimulai di sini** | Belum, dan memang belum waktunya |
| 11–13 Sep | Setup PostgreSQL, migration pertama, seed | Instalasi PostgreSQL sudah dikerjakan lebih awal (27 Ags) |

Belum adanya model, endpoint, atau ingestion per 27 Agustus **bukan keterlambatan** — itu memang isi rencananya. Yang ada sekarang, scaffolding hello-world FastAPI + halaman React, sudah cukup untuk posisi tanggal ini.

Satu catatan biaya yang perlu diluruskan: `Stack-Comparison.md` §6 menyebut Opsi C berbiaya 2–3 hari lebih mahal dari Opsi A. **Biaya itu tidak perlu ditambahkan ke timeline ini**, karena timeline ini memang tidak pernah mengasumsikan SQLite — Task 15 sudah mengalokasikan 3 hari untuk setup PostgreSQL sejak awal. Selisih 2–3 hari itu hanya berlaku bagi rencana yang berangkat dari SQLite, bukan bagi jadwal ini.
