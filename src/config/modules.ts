export interface EntityPageConfig {
  title: string
  moduleName: string
}

export const entityPages: Record<string, EntityPageConfig> = {
  company: { title: "Company", moduleName: "Company" },
  contact: { title: "Contact", moduleName: "Contact" },
  product: { title: "Product", moduleName: "Product" },
  opportunity: {
    title: "Opportunity",
    moduleName: "Opportunity",
  },
  quotes: { title: "Quotes", moduleName: "Quotes" },
  "sale-order": {
    title: "Sales Order",
    moduleName: "Sales Order",
  },
  proforma: {
    title: "Proforma",
    moduleName: "Proforma",
  },
  invoice: { title: "Invoice", moduleName: "Invoice" },
  "lead-values": {
    title: "Lead Values",
    moduleName: "Lead Values",
  },
  "partner-request": {
    title: "Partner Request",
    moduleName: "Partner Request",
  },
  "partner-onboarding": {
    title: "Partner Onboarding",
    moduleName: "Partner Onboarding",
  },
  partners: { title: "Partners", moduleName: "Partners" },
  ticket: { title: "Tickets", moduleName: "Tickets" },
  projects: { title: "Projects", moduleName: "Projects" },
  installation: {
    title: "Installation",
    moduleName: "Installation",
  },
  "service-quotes": {
    title: "Service Quotes",
    moduleName: "Service Quotes",
  },
  "service-proforma": {
    title: "Service Proforma",
    moduleName: "Service Proforma",
  },
}
