export interface CalendarTask {
  id: string
  title: string
  date: string
  time?: string | null
  completed?: boolean
  category?: string | null
  type?: string | null
  module?: string | null
  associateId?: string | null
  companyId?: string | null
}
