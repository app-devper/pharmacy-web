# Pharmacy Web

หน้าเว็บระบบ POS ร้านขายยา — React SPA สำหรับจัดการขาย, สต็อก, นำเข้า, ลูกค้า, รายงาน และแบบฟอร์ม ขย.

---

## Tech Stack

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

| Component | Detail |
|-----------|--------|
| Framework | React 19 |
| Language | TypeScript 6 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Chart | Recharts |
| PWA | vite-plugin-pwa |

---

## ฟีเจอร์

| หน้า | ความสามารถ |
|------|------------|
| **หน้าขายยา** | ค้นหาด้วยชื่อการค้า / ชื่อสามัญ / บาร์โค้ด · **Multi-unit** (เม็ด / แผง / กล่อง) · **Multi-tier pricing** (หน้าร้าน / ประจำ / ขายส่ง / custom) · Tier auto-apply ตามลูกค้า · ตะกร้า · ออกใบเสร็จ · ตัดสต็อก FEFO อัตโนมัติ · เตือนแพ้ยา · ส่วนลดระดับรายการ · ส่วนลดรวม (฿/%) · USB HID barcode scanner (รองรับ alt-unit barcode) |
| **พักบิล (Hold/Park)** | พัก 5 ช่อง · สลับตะกร้าขายคู่ขนาน · resume/swap/ยกเลิก · persist ใน localStorage |
| **ประวัติการขาย** | กรองวันที่ · ค้นหาบิล/ลูกค้า · ยกเลิกบิล · **คืนยา** (คืนบางส่วน เชื่อมบิลเดิม · คืนสต็อก FEFO · บันทึกเหตุผล) |
| **สต็อกยา** | เพิ่ม/แก้ไขยา (inline alt-unit editor + tier price editor) · จัดการล็อต · ดูสถานะวันหมดอายุ · badge "ถัดไป" (FEFO) · click row → ประวัติปรับสต็อก |
| **จัดการวันหมดอายุ** | กรอง 30/60/90/180 วัน + หมดอายุแล้ว · bulk write-off ตัดสต็อก · Export XLSX |
| **นำเข้าสินค้า** | สร้างใบนำเข้า (IMP-YYMMDD-NNN) · บันทึกแบบร่าง · ยืนยันรับสินค้า |
| **ลูกค้า** | บันทึกประวัติ · โรคประจำตัว / แพ้ยา · ประเภทลูกค้า (tier) · ยอดซื้อสะสม · ดูประวัติการซื้อ |
| **รายงาน** | สรุปยอดขาย · กราฟรายวัน · **Top 10 ยาขายดี** · **ยาขายไม่ออก** · **กราฟรายได้ vs ต้นทุนรายเดือน** · **EOD** (ปิดยอดประจำวัน) · Export XLSX/PDF |
| **กำไร** | กำไรแยกตามยา · margin% · กรองช่วงวันที่ / preset (วันนี้, สัปดาห์นี้, เดือนนี้, เดือนที่แล้ว) · Export XLSX |
| **แบบฟอร์ม ขย.9–12** | บันทึกถาวร · Export PDF ฟอนต์ไทย ตามมาตรฐาน อย. |
| **Movements** | log นำเข้า/ขาย/คืน/ปรับ/writeoff/void · กรองวันที่ + ประเภท + ชื่อยา · Export XLSX |
| **แจ้งเตือนหมดอายุ** | bell icon · badge แดง (หมดอายุแล้ว) / ส้ม (ใกล้หมด) · ลิงก์ไปหน้าจัดการ |
| **ตั้งค่า** | ข้อมูลร้าน · ใบเสร็จ (header/footer/paper 58/80) · Stock thresholds · เภสัชกร · ขย. toggle · **Timezone** (IANA, default Asia/Bangkok) · นำเข้าข้อมูล JSON |
| **จัดการผู้ใช้งาน** | ADMIN-only · สร้าง/ลบ user · กำหนด role (SUPER/ADMIN/USER) ผ่าน Um-Api |
| **Login** | เข้าสู่ระบบผ่าน Um-Api · แสดง role badge · ออกจากระบบ |

---

## โครงสร้างโปรเจกต์

```
frontend/
└── src/
    ├── api/           # API client functions (auto-inject Bearer token)
    │   └── client.ts  # apiFetch wrapper + 401 redirect
    ├── components/
    │   ├── layout/    # Layout, Sidebar, Topbar
    │   ├── sell/      # หน้าขาย + ตะกร้า + KY sale modal
    │   ├── stock/     # สต็อก · AltUnitForm (inline) · PriceTiersEditor · TierPriceModal · LotListModal · ReorderSuggestions
    │   ├── imports/   # นำเข้า
    │   ├── customers/ # ลูกค้า
    │   ├── report/    # รายงาน + EOD modal + charts
    │   ├── kyforms/   # แบบฟอร์ม ขย.
    │   ├── suppliers/ # ซัพพลายเออร์
    │   └── ui/        # Button, Modal, Badge, Spinner, DayPicker, …
    ├── context/
    │   ├── AuthContext.tsx      # JWT auth (login/logout/keep-alive)
    │   ├── AppContext.tsx       # Toast notifications
    │   ├── CartContext.tsx      # ตะกร้า + park slots + tier ตาม customer
    │   ├── DrugsContext.tsx     # shared drug cache + patchStocks
    │   └── SettingsContext.tsx  # settings + auto setAppTimezone()
    ├── hooks/         # useDrugs, useToast, useBarcodeScanner, useKeyboardShortcuts, useOnlineStatus, …
    ├── pages/         # SellPage, StockPage, AddDrugPage, EditDrugPage, ExpiryPage, SalesHistoryPage, ReportPage, ProfitPage, MovementsPage, SettingsPage, UsersPage, Ky9-12Page, …
    ├── types/         # TypeScript interfaces (drug, sale, lot, report, setting, customer, …)
    └── utils/         # formatters, exportXlsx, exportPdf, printReceipt, date (Bangkok TZ), lot (gen lot number), pricing (resolvePrice/getTierLabel)
```

---

## วิธีติดตั้งและรัน

### ข้อกำหนด

- Node.js 18+

### ตั้งค่า Environment

สร้างไฟล์ `.env`:

```env
VITE_UM_API_URL=http://localhost:8585
```

### รัน Development

```bash
npm install
npm run dev
# → http://localhost:5173
```

### Build Production

```bash
npm run build   # output → dist/
npm run preview # preview production build
```

---

## Deploy (Firebase Hosting)

ระบบถูก deploy ผ่าน Firebase Hosting โดยใช้ hosting target ชื่อ `dpharm`

### ข้อกำหนด

- ติดตั้ง Firebase CLI: `npm install -g firebase-tools`
- Login: `firebase login`
- ต้องมีสิทธิ์ใน Firebase project `devperpos`

### ไฟล์ config

| ไฟล์ | หน้าที่ |
|------|--------|
| `firebase.json` | ตั้งค่า hosting: `public: dist`, SPA rewrite → `/index.html`, target `dpharm` |
| `.firebaserc` | ผูก default project = `devperpos` และ target `dpharm` → site `dpharm` |

### ขั้นตอน Deploy

```bash
npm run build
firebase deploy --only hosting:dpharm
```

### URL

- Production: https://dpharm.web.app
- Firebase Console: https://console.firebase.google.com/project/devperpos/overview

### เพิ่ม/เปลี่ยน hosting target

```bash
firebase target:apply hosting <TARGET_NAME> <SITE_ID>
```

---

## Authentication Flow

1. เปิดเว็บ → ถ้าไม่มี token → redirect ไป `/login`
2. Login → เรียก Um-Api `POST /api/um/v1/auth/login` → ได้ JWT token
3. ทุก API call ไป Pharmacy API → แนบ `Authorization: Bearer <token>` อัตโนมัติ
4. Keep-alive ทุก 10 นาที → refresh token ผ่าน Um-Api
5. Logout → เรียก Um-Api → ลบ token → redirect `/login`
6. ถ้า API ตอบ 401 → ลบ token + redirect `/login` อัตโนมัติ
