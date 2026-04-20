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
| **หน้าขายยา** | ค้นหาด้วยชื่อการค้า / ชื่อสามัญ / บาร์โค้ด · **Multi-unit** (เม็ด / แผง / กล่อง) · **Multi-tier pricing** (หน้าร้าน / ประจำ / ขายส่ง / custom) · Tier auto-apply ตามลูกค้า · **Oversell** (ขายก่อน-ตัดสต็อกทีหลัง · confirm modal) · ตะกร้า · ออกใบเสร็จ · ตัดสต็อก FEFO อัตโนมัติ · เตือนแพ้ยา · ส่วนลดระดับรายการ · ส่วนลดรวม (฿/%) · USB HID barcode scanner (รองรับ alt-unit barcode) |
| **พักบิล (Hold/Park)** | พัก 5 ช่อง · สลับตะกร้าขายคู่ขนาน · resume/swap/ยกเลิก · persist ใน localStorage |
| **ประวัติการขาย** | กรองวันที่ · ค้นหาบิล/ลูกค้า · ยกเลิกบิล · **คืนยา** (คืนบางส่วน เชื่อมบิลเดิม · คืนสต็อก FEFO · บันทึกเหตุผล) · SaleDetailModal แสดง badge "⏳ ขายล่วงหน้า N" (oversold) + "⚠ lot drift" (offline sync mismatch) |
| **สต็อกยา** | เพิ่ม/แก้ไขยา (inline alt-unit editor + tier price editor) · จัดการล็อต · ดูสถานะวันหมดอายุ · badge "ถัดไป" (FEFO) · click row → ประวัติปรับสต็อก · negative stock แสดง badge "ติดลบ · รอเข้าของ" เมื่อมี oversell ค้าง |
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
| **Offline mode** | PWA cache (NetworkFirst · drugs + customers 24h) · IndexedDB queue สำหรับ sales offline · Auto-sync on reconnect · Optimistic stock patch ตอน checkout offline · Persistent red pill เมื่อ sync failed · Lot snapshot carry ผ่าน queue เพื่อ audit ภายหลัง |

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

---

## Oversell Workflow (ขายก่อน-ตัดสต็อกทีหลัง)

| Step | UI / File | พฤติกรรม |
|------|-----------|---------|
| Add drug | `DrugCard.tsx` | stock ≤ 0 แสดง badge "ขายล่วงหน้า" สีส้ม แต่ยังคลิกเพิ่มได้ · Cart context ไม่ clamp qty |
| Checkout | `Cart.tsx` | เปรียบเทียบ `need = qty` vs `drug.stock` ต่อ item · ถ้าเกิน → แสดง `OversellConfirmModal` |
| Confirm | `OversellConfirmModal.tsx` | แสดง list ยาที่ขายเกิน + จำนวนที่ขาดสต็อก · checkbox ยืนยัน · Confirm → attach `allow_oversell: true` ต่อ line ที่เกี่ยว |
| Submit | `api/sales.ts` → backend | Backend drop `$gte` guard · ตัด lot FEFO เท่าที่มี · เก็บ `oversold_qty` บน SaleItem · `drug.stock` ติดลบได้ |
| Display | `DrugTable.tsx` · `StockBadge` · `SaleDetailModal.tsx` | Negative stock → ตัวเลขแดง + badge "ติดลบ · รอเข้าของ" · Sale item → badge "⏳ ขายล่วงหน้า N" |
| Auto-reconcile | Backend `Import.Confirm` / `StockAdjustment.Create` | Import lot → drain FIFO sold_at ASC · append real `LotDeduction` · Stock adjust (+) → drain · append synthetic `{ADJUST:<reason>}` · ไม่แตะ frontend — shown via next drug reload |

**Return rules** — คืนได้สูงสุด `Σ real LotSplits.qty − already_returned` (ไม่รวม synthetic adjustment-absorbed หรือ unreconciled) · `drug_returns.go` validate และ reject พร้อมข้อความ "มี N หน่วยยังไม่ผูกกับล็อตจริง"

---

## Offline Mode Architecture

| Layer | ไฟล์ | หน้าที่ |
|------|------|---------|
| PWA config | `vite.config.ts` | `vite-plugin-pwa` · NetworkFirst 24h cache สำหรับ `/api/drugs`, `/api/customers` |
| Online detection | `hooks/useOnlineStatus.ts` | `navigator.onLine` + event listener |
| Queue | `lib/offlineQueue.ts` | IndexedDB (idb v8) · store `pending_sales` · `enqueueSale` / `getPendingSales` / `markSaleError` / `removePendingSale` |
| Offline-aware API | `api/sales.ts` | `createSale` — offline → `enqueueSale` + return receipt ชั่วคราว `OFFLINE-xxx` · `_createSaleRaw` — direct (ใช้โดย sync loop) |
| Auto-sync | `hooks/useOfflineSync.ts` | Watch online state → replay queue · นับ `pending` + `failed` · เรียก `reloadDrugs()` หลัง sync สำเร็จเพื่อ reconcile optimistic stock |
| UI indicator | `components/layout/NetworkStatus.tsx` | Topbar pill: 🔴 ออฟไลน์ / 🟡 รอซิงค์ N / 🟠 กำลังซิงค์ / 🔴 ซิงค์ล้มเหลว N (click → retry) |
| Stock patch | `components/sell/Cart.tsx` | Offline checkout → compute optimistic `stock_updates` จาก local cache → `patchStocks()` ทันที |
| Lot snapshot | `types/sale.ts` → `SaleItemInput.lot_snapshot` | Cart แนบ `drug.next_lot` ต่อ item · backend `lot_mismatch` flag เมื่อ sync หลัง FEFO drift |

**Flow:**
1. Browser offline → DrugGrid ใช้ cache (NetworkFirst fallback) → cart ทำงานตามปกติ
2. Checkout → `navigator.onLine === false` → enqueue ใน IDB + optimistic `patchStocks()` → cashier เห็นเหมือนขายสำเร็จปกติ
3. Browser online → `useOfflineSync` auto-replay queue → success → remove from IDB · fail → `markSaleError` + persistent red pill
4. หลัง sync สำเร็จ → `reloadDrugs()` → server authoritative stock override optimistic

**รู้จัก limits:**
- Queue หายถ้า user clear IDB / site data
- Lot snapshot เก็บใน IDB ตาม SaleItemInput — carry through sync · backend compare actual FEFO vs snapshot → set `lot_mismatch`
- หาก Multiple offline sales ของยาเดียวกัน · stock ท้องถิ่นลดจาก optimistic · sync ทีละอัน · stock sync หลังสุดจะ override
