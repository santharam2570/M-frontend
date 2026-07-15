// Shared modules and permissions data used across the application
// Used by: manage-users page, roles-permissions page, permission hooks

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

export type SystemRoleTemplateId = "super_admin";

interface CrudModuleConfig {
  moduleKey: string;
  label: string;
  viewDescription?: string;
  extraFunctions?: PermissionFunction[];
  includeViewScopes?: boolean;
}

function createViewScopePermissions(moduleKey: string, label: string): PermissionFunction[] {
  return [
    {
      id: `${moduleKey}_view_all`,
      name: "View All Records",
      description: `Gives the user permission to view all ${label} data`,
    },
    {
      id: `${moduleKey}_view_team`,
      name: "View Team Records",
      description: `Gives the user permission to view ${label} data from their team`,
    },
  ];
}

function createLeadViewScopePermissions(): PermissionFunction[] {
  return createViewScopePermissions("lead", "Lead");
}

function createCrudModulePermissions({
  moduleKey,
  label,
  viewDescription,
  extraFunctions = [],
  includeViewScopes = true,
}: CrudModuleConfig): PermissionFunction[] {
  const functions: PermissionFunction[] = [
    {
      id: moduleKey,
      name: `View ${label}`,
      description:
        viewDescription ??
        `Gives the user permission to access and view the ${label} module`,
    },
    {
      id: `add_${moduleKey}`,
      name: `Add ${label}`,
      description: `Gives the user permission to create new ${label} records`,
    },
    {
      id: `edit_${moduleKey}`,
      name: `Edit ${label}`,
      description: `Gives the user permission to edit existing ${label} information`,
    },
    {
      id: `delete_${moduleKey}`,
      name: `Delete ${label}`,
      description: `Gives the user permission to delete existing ${label} records`,
    },
  ];

  if (includeViewScopes) {
    functions.push(...createViewScopePermissions(moduleKey, label));
  }

  functions.push(...extraFunctions);
  return functions;
}

export const LEAD_PERMISSION_IDS = [
  "lead",
  "add_lead",
  "edit_lead",
  "delete_lead",
  "lead_view_all",
  "lead_view_team",
  "lead_view_own",
  "export_lead",
  "view_lead_documents",
  "add_lead_document",
  "delete_lead_document",
  "download_lead_document",
] as const;

export type LeadPermissionId = (typeof LEAD_PERMISSION_IDS)[number];

const LEAD_EXTRA_FUNCTIONS: PermissionFunction[] = [
  {
    id: "view_lead_documents",
    name: "View Documents",
    description: "Gives the user permission to view documents on the Lead details page",
  },
  {
    id: "add_lead_document",
    name: "Upload Documents",
    description: "Gives the user permission to upload documents on the Lead details page",
  },
  {
    id: "delete_lead_document",
    name: "Delete Documents",
    description: "Gives the user permission to delete documents from the Lead details page",
  },
  {
    id: "download_lead_document",
    name: "Download Documents",
    description:
      "Gives the user permission to download or open documents from the Lead details page",
  },
];

export const permissionModules: PermissionModule[] = [
  {
    id: "organization",
    name: "ORGANIZATION",
    color: "#6366f1",
    functions: [
      {
        id: "manage_branches",
        name: "Manage Branches",
        description: "Create and manage branches",
      },
      {
        id: "manage_admins",
        name: "Manage Admins",
        description: "Manage admin-tier users",
      },
      {
        id: "manage_branch_users",
        name: "Manage Branch Users",
        description: "Manage branch-level users",
      },
    ],
  },
  {
    id: "settings",
    name: "SETTINGS",
    color: "#8b5cf6",
    functions: [
      {
        id: "settings",
        name: "Settings Module",
        description: "Gives the user permission to access the Settings menu",
      },
      {
        id: "manage_settings",
        name: "Manage Settings",
        description: "Configure organization settings",
      },
      {
        id: "manage_users",
        name: "Manage Users",
        description: "Add and edit users",
      },
      {
        id: "manage_roles",
        name: "Manage Roles",
        description: "Create and edit permission roles",
      },
      {
        id: "manage_lead_settings",
        name: "Manage Lead Settings",
        description: "Configure lead fields and statuses",
      },
    ],
  },
  {
    id: "lead",
    name: "LEAD",
    color: "#22c55e",
    functions: [
      ...createCrudModulePermissions({
        moduleKey: "lead",
        label: "Lead",
        extraFunctions: LEAD_EXTRA_FUNCTIONS,
        includeViewScopes: false,
      }),
      ...createLeadViewScopePermissions(),
      {
        id: "lead_view_own",
        name: "View Own Leads",
        description: "See only leads assigned to you",
      },
      {
        id: "export_lead",
        name: "Export Leads",
        description: "Export lead records",
      },
    ],
  },
  {
    id: "projects",
    name: "PROJECTS",
    color: "#3b82f6",
    functions: [
      ...createCrudModulePermissions({
        moduleKey: "project",
        label: "Project",
      }),
      {
        id: "project_view_own",
        name: "View Own Projects",
        description: "See only own assigned projects",
      },
    ],
  },
  {
    id: "bookings",
    name: "BOOKINGS",
    color: "#f59e0b",
    functions: [
      ...createCrudModulePermissions({
        moduleKey: "booking",
        label: "Booking",
      }),
      {
        id: "booking_view_own",
        name: "View Own Bookings",
        description: "See only own bookings",
      },
    ],
  },
  {
    id: "agents",
    name: "AGENTS",
    color: "#6366f1",
    functions: [
      ...createCrudModulePermissions({
        moduleKey: "agent",
        label: "Agent",
      }),
      {
        id: "agent_view_own",
        name: "View Own Agents",
        description: "See only own assigned agents",
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
        description: "Gives the user permission to access the Reports menu",
      },
    ],
  },
];

export function getAllPermissionIds(): string[] {
  return permissionModules.flatMap((module) => module.functions.map((func) => func.id));
}

function buildEmptyPermissionMap(): Record<string, boolean> {
  return getAllPermissionIds().reduce(
    (defaults, id) => {
      defaults[id] = false;
      return defaults;
    },
    {} as Record<string, boolean>
  );
}

export function getPermissionDefaultForTemplate(
  _permissionId: string,
  templateId: SystemRoleTemplateId
): boolean {
  return templateId === "super_admin";
}

export function getStaticPermissionDefaults(
  templateId: SystemRoleTemplateId
): Record<string, boolean> {
  const defaults = buildEmptyPermissionMap();
  for (const permissionId of getAllPermissionIds()) {
    defaults[permissionId] = getPermissionDefaultForTemplate(permissionId, templateId);
  }
  return defaults;
}

export function getLeadPermissionModule(): PermissionModule | undefined {
  return permissionModules.find((module) => module.id.trim() === "lead");
}

export function getSystemRoleTemplateId(roleName: string): SystemRoleTemplateId | null {
  const normalized = roleName.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (
    normalized === "super admin" ||
    normalized === "superadmin" ||
    normalized === "administrator"
  ) {
    return "super_admin";
  }
  return null;
}

export function getStaticLeadPermissionDefaults(
  roleName: string
): Record<LeadPermissionId, boolean> {
  const templateId = getSystemRoleTemplateId(roleName);
  const defaults = buildEmptyPermissionMap();

  if (!templateId) {
    return LEAD_PERMISSION_IDS.reduce(
      (leadDefaults, id) => {
        leadDefaults[id] = false;
        return leadDefaults;
      },
      {} as Record<LeadPermissionId, boolean>
    );
  }

  const templateDefaults = getStaticPermissionDefaults(templateId);
  return LEAD_PERMISSION_IDS.reduce(
    (leadDefaults, id) => {
      leadDefaults[id] = templateDefaults[id] ?? false;
      return leadDefaults;
    },
    {} as Record<LeadPermissionId, boolean>
  );
}

export function applyStaticLeadPermissions(
  roleName: string,
  isSystemRole: boolean,
  permissions: Record<string, boolean>,
  options?: { forceStatic?: boolean }
): Record<string, boolean> {
  if (!isSystemRole || !options?.forceStatic) {
    return permissions;
  }

  const staticDefaults = getStaticLeadPermissionDefaults(roleName);
  const next = { ...permissions };
  for (const id of LEAD_PERMISSION_IDS) {
    next[id] = staticDefaults[id];
  }
  return next;
}

export default permissionModules;
