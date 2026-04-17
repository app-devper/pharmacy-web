export interface ExpiringLot {
  id:           string
  drug_id:      string
  drug_name:    string
  lot_number:   string
  expiry_date:  string
  remaining:    number
  days_left:    number
}
