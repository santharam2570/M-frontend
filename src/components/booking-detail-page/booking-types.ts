export interface BookingDetailRecord {
  _id: string
  project_id: string
  project_name?: string
  unit_id: string
  unit_no?: string
  customer_name: string
  receipt_number: string
  booking_date: string
  registration_date?: string | null
  amount_paid: number
  amount_in_words?: string
  payment_type: string
  transaction_type: string
  notes?: string
}

export interface BookingUnitContext {
  _id: string
  project_id: string
  project_name: string
  unit_no: string
  area_sqft?: number
  area_cents?: number
  customer_name?: string
  linked_lead_id?: string
  linked_booking_id?: string
}

export interface BookingDetailPageProps {
  projectId: string
  unitId: string
  bookingId?: string
  onSaved?: (booking: BookingDetailRecord) => void
}
