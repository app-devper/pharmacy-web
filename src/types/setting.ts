export interface StoreInfo {
  name: string
  address: string
  phone: string
  tax_id: string
}

export interface ReceiptSettings {
  header: string            // optional tagline above items
  footer: string            // thank-you message
  paper_width: '58' | '80'
  show_pharmacist: boolean  // pulls name from Settings.pharmacist when true
}

export interface PharmacistInfo {
  name: string              // ชื่อ-นามสกุล (ใช้ใน Receipt footer + ขย.11 auto-fill)
  license_no: string        // เลขที่ใบประกอบวิชาชีพ
}

export interface KYSettings {
  skip_auto: boolean              // true = ข้าม KySaleModal ตอนขาย (ร้านไม่บันทึก compliance)
  default_buyer_address: string   // pre-fill ช่อง "ที่อยู่" ใน ขย.10
}

export interface StockSettings {
  low_stock_threshold: number   // default 20 — used when drug.min_stock = 0
  reorder_days: number          // default 30 — reorder lookback window
  reorder_lookahead: number     // default 14 — target cover days
  expiring_days: number         // default 60 — expiry-alert window
}

export interface Settings {
  store: StoreInfo
  receipt: ReceiptSettings
  stock: StockSettings
  pharmacist: PharmacistInfo
  ky: KYSettings
  updated_at: string
}

export interface SettingsInput {
  store: StoreInfo
  receipt: ReceiptSettings
  stock: StockSettings
  pharmacist: PharmacistInfo
  ky: KYSettings
}

export const defaultSettings: Settings = {
  store: { name: 'ร้านยา', address: '', phone: '', tax_id: '' },
  receipt: {
    header: '',
    footer: 'ขอบคุณที่ใช้บริการ',
    paper_width: '58',
    show_pharmacist: false,
  },
  stock: {
    low_stock_threshold: 20,
    reorder_days: 30,
    reorder_lookahead: 14,
    expiring_days: 60,
  },
  pharmacist: { name: '', license_no: '' },
  ky: { skip_auto: false, default_buyer_address: '' },
  updated_at: '',
}
