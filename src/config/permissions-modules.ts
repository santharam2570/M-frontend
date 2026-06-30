// Shared modules and permissions data used across the application
// Used by: manage-users page

export interface PermissionFunction {
  id: string;
  name: string;
  description: string;
}

export interface PermissionModule {
  id: string;
  name: string;
  color: string;
  functions: PermissionFunction[];
}

export const permissionModules: PermissionModule[] = [
  {
    id: "organization",
    name: "ORGANIZATION",
    color: "#dc2626",
    functions: [
      {
        id: "manage_branches",
        name: "Manage Branches",
        description: "Create, update, and deactivate branches within the organization",
      },
      {
        id: "manage_admins",
        name: "Manage Admins",
        description: "Create and manage organization admin accounts (Super Admin only)",
      },
      {
        id: "manage_branch_managers",
        name: "Manage Branch Managers",
        description: "Assign and manage branch manager accounts",
      },
      {
        id: "manage_branch_users",
        name: "Manage Branch Users",
        description: "Create and manage users within assigned branches",
      },
    ],
  },
  {
    id: "settings",
    name: "SETTINGS",
    color: "#6366f1",
    functions: [
      {
        id: "manage_settings",
        name: "Manage Settings",
        description: "Gives the user the permission to manage user accounts, module settings and organization details",
      }
    ],
  },
  {
    id: "lead",
    name: "LEAD",
    color: "#6366f1",
    functions: [
      {
        id: "lead",
        name: "LEAD",
        description: "Gives the user the permission to create new company details",
      },
      {
        id: "add_lead",
        name: "Add Lead",
        description: "Gives the user the permission to create new Lead details",
      },
      {
        id: "edit_lead",
        name: "Edit Lead",
        description: "Gives the user the permission to edit existing Lead information",
      },
      {
        id: "delete_lead",
        name: "Delete Lead",
        description: "Gives the user the permission to delete existing Lead",
      },
      {
        id: "convert_to_opp",
        name: "Convert to Opportunity",
        description: "Gives the user the permission to convert Lead to Opportunity",
      },
      {
        id: "export_lead",
        name: "Exporting",
        description: "Gives the user permission to download data fields to excel format via Export option",
      },
      {
        id: "import_lead",
        name: "Importing",
        description: "Gives the user permission to import customers via Import function",
      },
      {
        id: "lead_view_all",
        name: "View All Records",
        description: "Gives the user the permission to view all Lead data",
      },
      {
        id: "lead_view_own",
        name: "View Own Records",
        description: "Gives the user the permission to view only their own Lead data",
      },
      {
        id: "lead_view_team",
        name: "View Team Records",
        description: "Gives the user the permission to view Lead data from their team",
      },
    ],
  },
  {
    id: "companies",
    name: "COMPANIES",
    color: "#6366f1",
    functions: [
      {
        id: "company",
        name: "Company",
        description: "Gives the user the permission to create new company details",
      },
      {
        id: "add_company",
        name: "Add Company",
        description: "Gives the user the permission to create new company details",
      },
      {
        id: "edit_company",
        name: "Edit Company",
        description: "Gives the user the permission to edit existing Company information",
      },
      {
        id: "delete_company",
        name: "Delete Company",
        description: "Gives the user the permission to delete existing company",
      },
      {
        id: "export_company",
        name: "Exporting",
        description: "Gives the user the permission to download data fields in excel format via Export option",
      },
      {
        id: "import_company",
        name: "Importing",
        description: "Gives the user the permission to import customers via Import function",
      },
      {
        id: "company_view_all",
        name: "View All Records",
        description: "Gives the user the permission to view all Company data",
      },
      {
        id: "company_view_own",
        name: "View Own Records",
        description: "Gives the user the permission to view only their own Company data",
      },
      {
        id: "company_view_team",
        name: "View Team Records",
        description: "Gives the user the permission to view Company data from their team",
      },
    ],
  },
  {
    id: "opportunities",
    name: "OPPORTUNITIES",
    color: "#6366f1",
    functions: [
      {
        id: "opportunity",
        name: "Opportunity",
        description: "Gives the user to create New opportunity for a company",
      },
      {
        id: "add_opportunity",
        name: "Add Opportunity",
        description: "Gives the user to create New opportunity for a company",
      },
      {
        id: "edit_opportunity",
        name: "Edit Opportunity",
        description: "Gives the user the permission to edit existing Opportunity information",
      },
      {
        id: "opportunity_view_all",
        name: "View All Records",
        description: "Gives the user the permission to view all Opportunity data",
      },
      {
        id: "opportunity_view_own",
        name: "View Own Records",
        description: "Gives the user the permission to view only their own Opportunity data",
      },
      {
        id: "opportunity_view_team",
        name: "View Team Records",
        description: "Gives the user the permission to view Opportunity data from their team",
      },
    ],
  },
  {
    id: "contacts",
    name: "CONTACTS",
    color: "#6366f1",
    functions: [
      {
        id: "contact",
        name: "Contact",
        description: "Gives the user the permission to create new contact for a company",
      },
      {
        id: "add_contact",
        name: "Add Contact",
        description: "Gives the user the permission to create new contact for a company",
      },
      {
        id: "edit_contact",
        name: "Edit Contact",
        description: "Gives the user the permission to edit existing Contact information",
      },
      {
        id: "delete_contact",
        name: "Delete Contact",
        description: "Gives the user the permission to delete existing contact",
      },
      {
        id: "contact_view_all",
        name: "View All Records",
        description: "Gives the user the permission to view all Contact data",
      },
      {
        id: "contact_view_own",
        name: "View Own Records",
        description: "Gives the user the permission to view only their own Contact data",
      },
      {
        id: "contact_view_team",
        name: "View Team Records",
        description: "Gives the user the permission to view Contact data from their team",
      },
    ],
  },
  {
    id: "products",
    name: "PRODUCTS",
    color: "#6366f1",
    functions: [
      {
        id: "product",
        name: "Product",
        description: "Gives the user the permission to create new product details",
      },
      {
        id: "add_product",
        name: "Add Product",
        description: "Gives the user the permission to create new product details",
      },
      {
        id: "edit_product",
        name: "Edit Product",
        description: "Gives the user the permission to edit existing product information",
      },
      {
        id: "delete_product",
        name: "Delete Product",
        description: "Gives the user the permission to delete existing product",
      },
      {
        id: "status_change",
        name: "Active / Inactive Status Change",
        description: "Gives the user to manage the product status to Active / Inactive",
      },
    ],
  },
  {
    id: "quotes",
    name: "QUOTES",
    color: "#6366f1",
    functions: [
      {
        id: "quote",
        name: "Quote",
        description: "Gives the user the permission to create new Quotation",
      },
      {
        id: "add_quote",
        name: "Add Quote",
        description: "Gives the user the permission to create new Quotation",
      },
      {
        id: "edit_quote",
        name: "Edit Quote",
        description: "Gives the user the permission to edit existing Quotation",
      },
      {
        id: "delete_quote",
        name: "Delete Quote",
        description: "Gives the user the permission to delete existing Quotation",
      },
      {
        id: "revise_quote",
        name: "Revise Quote",
        description: "Gives the user the permission to revise existing Quotation",
      },
      {
        id: "duplicate_quote",
        name: "Duplicate Quote",
        description: "Gives the user the permission to duplicate existing Quotation",
      },
      {
        id: "convert_to_proforma",
        name: "Convert to Proforma",
        description: "Gives the user the permission to convert Quote to Proforma",
      },
      {
        id: "convert_to_invoice",
        name: "Convert to Invoice",
        description: "Gives the user the permission to convert Quote to Invoice",
      },
      {
        id: "convert_to_sales_order",
        name: "Convert to Sales Order",
        description: "Gives the user the permission to convert Quote to Sales Order",
      },
      {
        id: "quote_view_all",
        name: "View All Records",
        description: "Gives the user the permission to view all Quote data",
      },
      {
        id: "quote_view_own",
        name: "View Own Records",
        description: "Gives the user the permission to view only their own Quote data",
      },
      {
        id: "quote_view_team",
        name: "View Team Records",
        description: "Gives the user the permission to view Quote data from their team",
      },
    ],
  },
  {
    id: "proforma",
    name: "PROFORMA",
    color: "#6366f1",
    functions: [
      {
        id: "proforma",
        name: "Proforma",
        description: "Gives the user the permission to access Proforma module",
      },
      {
        id: "edit_proforma",
        name: "Edit Proforma",
        description: "Gives the user the permission to edit existing Proforma",
      },
      {
        id: "delete_proforma",
        name: "Delete Proforma",
        description: "Gives the user the permission to delete existing Proforma",
      },
      {
        id: "convert_to_invoice",
        name: "Convert to Invoice",
        description: "Gives the user the permission to convert Proforma to Invoice",
      },
    ],
  },
  {
    id: "invoice",
    name: "INVOICE",
    color: "#6366f1",
    functions: [
      {
        id: "invoice",
        name: "Invoice",
        description: "Gives the user the permission to access Invoice module",
      },
      {
        id: "edit_invoice",
        name: "Edit Invoice",
        description: "Gives the user the permission to edit existing Invoice",
      },
      {
        id: "delete_invoice",
        name: "Delete Invoice",
        description: "Gives the user the permission to delete existing Invoice",
      },
    ],
  },
  {
    id: "documents",
    name: "DOCUMENTS",
    color: "#6366f1",
    functions: [
      {
        id: "document_all_control",
        name: "Document",
        description: "Gives the user the permission to create new Document",
      },
      {
        id: "create_folder_doc",
        name: "Create Folder",
        description: "Gives the user the permission to create new Folder",
      },
      {
        id: "upload_file",
        name: "Upload File",
        description: "Gives the user the permission to upload a new file",
      },
      {
        id: "rename_file",
        name: "Rename File",
        description: "Gives the user the permission to rename existing files",
      },
      {
        id: "delete_file",
        name: "Delete File",
        description: "Gives the user the permission to delete existing files",
      },
      {
        id: "rename_folder",
        name: "Rename Folder",
        description: "Gives the user the permission to rename existing folders",
      },
      {
        id: "delete_folder",
        name: "Delete Folder",
        description: "Gives the user the permission to delete existing folders",
      },
    ],
  },
  {
    id: "projects",
    name: "PROJECTS",
    color: "#6366f1",
    functions: [
      {
        id: "task_management",
        name: "Project",
        description: "Gives the user the permission to create new Project",
      },
      {
        id: "create_space",
        name: "Create Projects",
        description: "Gives the user the permission to create Project in the team Workspace",
      },
      {
        id: "create_folder_task",
        name: "Create Folder",
        description: "Gives the user the permission to create folder in the team Workspace",
      },
      {
        id: "create_list",
        name: "Create List",
        description: "Gives the user the permission to create list in the team Workspace",
      },
      {
        id: "create_task",
        name: "Create Tasks",
        description: "Gives the user the permission to create new tasks in the lists",
      },
      {
        id: "manage_space_folder_list",
        name: "Manage Projects, Folder & List",
        description: "Gives the user the permission to edit and manage Projects, Folder and list in the team workspace",
      },
      {
        id: "edit_task",
        name: "Edit Task",
        description: "Gives the user the permission to edit existing tasks",
      },
      {
        id: "delete_items_task",
        name: "Delete Tasks",
        description: "Gives the user the permission to delete tasks from list",
      },
      {
        id: "create_by_control",
        name: "Task Closure Deadline",
        description: "Only task creators are authorized to close their tasks, start date and due date",
      },
      {
        id: "projects_dashboard",
        name: "Projects Dashboard",
        description: "Gives the user the permission to access Projects Dashboard",
      },
      {
        id: "projects_everything",
        name: "Everything",
        description: "Gives the user the permission to access Projects Everything",
      },
    ],
  },
  {
    id: "add_task_field_control",
    name: "ADD TASK FIELD CONTROL",
    color: "#6366f1",
    functions: [
      {
        id: "fc_add_task_status",
        name: "Status",
        description: "Gives the user the permission to create folder in the team Workspace",
      },
      {
        id: "fc_add_task_assigned_to",
        name: "Assigned To",
        description: "Gives the user the permission to create new tasks in the lists",
      },
      {
        id: "fc_add_task_assigned_by",
        name: "Assigned by",
        description: "Gives the user the permission to create new tasks in the lists",
      },
      {
        id: "fc_add_task_priority",
        name: "Priority",
        description: "Gives the user the permission to delete tasks from list",
      },
      {
        id: "fc_add_task_start_date",
        name: "Start Date",
        description: "Only task creators are authorized to close their tasks",
      },
      {
        id: "fc_add_task_due_date",
        name: "Due Date",
        description: "Only task creators are authorized to close their tasks",
      },
    ],
  },
  {
    id: "sales_orders",
    name: "SALES ORDERS",
    color: "#6366f1",
    functions: [
      {
        id: "sales_order",
        name: "Sales Order",
        description: "Gives the user the permission to access Sales Order module",
      },
      {
        id: "edit_sales_order",
        name: "Edit Sales Order",
        description: "Gives the user the permission to edit existing Sales Order",
      },
      {
        id: "delete_sales_order",
        name: "Delete Sales Order",
        description: "Gives the user the permission to delete existing Sales Order",
      },
      {
        id: "sales_order_view_all",
        name: "View All Records",
        description: "Gives the user the permission to view all Sales Order data",
      },
      {
        id: "sales_order_view_own",
        name: "View Own Records",
        description: "Gives the user the permission to view only their own Sales Order data",
      },
      {
        id: "sales_order_view_team",
        name: "View Team Records",
        description: "Gives the user the permission to view Sales Order data from their team",
      },
    ],
  },
  {
    id: "sales_dashboard",
    name: "SALES DASHBOARD",
    color: "#6366f1",
    functions: [
      {
        id: "sales_dashboard",
        name: "Sales Dashboard",
        description: "Gives the user the permission to access Sales Dashboard",
      },
    ],
  },
  {
    id: "new_request",
    name: "PARTNERS",
    color: "#6366f1",
    functions: [
      {
        id: "new_request",
        name: "New Request",
        description: "Gives the user the permission to access New Request module",
      },
      {
        id: "onboarding",
        name: "Onboarding",
        description: "Gives the user the permission to manage onboarding requests",
      },
      {
        id: "partner",
        name: "Partner",
        description: "Gives the user the permission to access Partner module",
      },
      {
        id: "partner_view_all",
        name: "View All Records",
        description: "Gives the user the permission to view all Partner data",
      },
      {
        id: "partner_view_own",
        name: "View Own Records",
        description: "Gives the user the permission to view only their own Partner data",
      },
      {
        id: "partner_view_team",
        name: "View Team Records",
        description: "Gives the user the permission to view Partner data from their team",
      },
    ],
  },
  {
    id: "home",
    name: "HOME",
    color: "#6366f1",
    functions: [
      {
        id: "home",
        name: "Home",
        description: "Gives the user the permission to access Home dashboard",
      },
    ],
  },
  {
    id: "calendar",
    name: "CALENDAR",
    color: "#6366f1",
    functions: [
      {
        id: "calendar",
        name: "Calendar",
        description: "Gives the user the permission to access Calendar module",
      },
      {
        id: "calendar_view_all",
        name: "View All Records",
        description: "Gives the user the permission to view all Calendar events",
      },
      {
        id: "calendar_view_own",
        name: "View Own Records",
        description: "Gives the user the permission to view only their own Calendar events",
      },
      {
        id: "calendar_view_team",
        name: "View Team Records",
        description: "Gives the user the permission to view Calendar events from their team",
      },
    ],
  },
  {
    id: "reports",
    name: "REPORTS",
    color: "#6366f1",
    functions: [
      {
        id: "reports",
        name: "Reports",
        description: "Gives the user the permission to access Reports module",
      },
    ],
  },
  {
    id: "tickets",
    name: "TICKETS",
    color: "#6366f1",
    functions: [
      {
        id: "tickets",
        name: "Tickets",
        description: "Gives the user the permission to access Tickets module",
      },
      {
        id: "service_dashboard",
        name: "Service Dashboard",
        description: "Gives the user the permission to access Service Dashboard",
      },
      {
        id: "add_ticket",
        name: "Add Ticket",
        description: "Gives the user the permission to create new tickets",
      },
      {
        id: "edit_ticket",
        name: "Edit Ticket",
        description: "Gives the user the permission to edit existing tickets",
      },
      {
        id: "delete_ticket",
        name: "Delete Ticket",
        description: "Gives the user the permission to delete existing tickets",
      },
      {
        id: "service_quote",
        name: "Service Quote",
        description: "Gives the user the permission to create service quotes",
      },
      {
        id: "service_proforma",
        name: "Service Proforma",
        description: "Gives the user the permission to create service proforma",
      },
      {
        id: "ticket_view_all",
        name: "View All Records",
        description: "Gives the user the permission to view all Ticket data",
      },
      {
        id: "ticket_view_own",
        name: "View Own Records",
        description: "Gives the user the permission to view only their own Ticket data",
      },
      {
        id: "ticket_view_team",
        name: "View Team Records",
        description: "Gives the user the permission to view Ticket data from their team",
      },
    ],
  },
  {
    id: "installation",
    name: "INSTALLATION",
    color: "#6366f1",
    functions: [
      {
        id: "installation",
        name: "Installation",
        description: "Gives the user the permission to access Installation module",
      },
      {
        id: "edit_installation",
        name: "Edit Installation",
        description: "Gives the user the permission to edit existing installations",
      },
      {
        id: "delete_installation",
        name: "Delete Installation",
        description: "Gives the user the permission to delete existing installations",
      },
      {
        id: "installation_view_all",
        name: "View All Records",
        description: "Gives the user the permission to view all Installation data",
      },
      {
        id: "installation_view_own",
        name: "View Own Records",
        description: "Gives the user the permission to view only their own Installation data",
      },
      {
        id: "installation_view_team",
        name: "View Team Records",
        description: "Gives the user the permission to view Installation data from their team",
      },
    ],
  },
  {
    id: "amc",
    name: "AMC",
    color: "#6366f1",
    functions: [
      {
        id: "amc",
        name: "AMC",
        description: "Gives the user the permission to access AMC (Annual Maintenance Contract) module",
      },
    ],
  },
  {
    id: "strategy",
    name: "STRATEGY",
    color: "#6366f1",
    functions: [
      {
        id: "strategy",
        name: "Strategy",
        description: "Gives the user the permission to access Strategy module",
      },
    ],
  },
  {
    id: "planning",
    name: "PLANNING",
    color: "#6366f1",
    functions: [
      {
        id: "planning",
        name: "Planning",
        description: "Gives the user the permission to access Planning module",
      },
    ],
  },
];

export default permissionModules;

