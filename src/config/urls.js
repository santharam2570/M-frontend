// Environment-based configuration
// URLs are automatically determined based on the current environment
// Local URLs are used when running on localhost
// Production URLs are used when deployed
// Update production URLs in src/config/environment.js

import { BASE_URL, APP_BASE_URL, MCP_MAIL_BASE_URL } from './environment';

const PROFILE_IMAGE_BASE_URL = `${BASE_URL}/uploads/profile`;
export const URLS = {

  SIGNUP: `${BASE_URL}/signup`,
  GOOGLE_SIGNUP: `${BASE_URL}/google_signup`,
  OTP_VERIFY_MATCH: `${BASE_URL}/otp_verify_match`,
  RESEND_OTP: `${BASE_URL}/resend_otp`,
  LOGIN_RESEND_OTP: `${BASE_URL}/login_resend_otp`,
  LOGIN: `${BASE_URL}/login`,
  GOOGLE_LOGIN: `${BASE_URL}/gmail_login`,
  FORGOT_PASSWORD: `${BASE_URL}/forgot_password_check`,
  CHANGE_PASSWORD: `${BASE_URL}/change_Password`,
  CREATE_NEW_PASSWORD: `${BASE_URL}/creat_new_password`,

  LEADS: `${BASE_URL}/add_lead`,
  ADD_LEAD: `${BASE_URL}/add_lead`,
  LEAD_LIST: `${BASE_URL}/lead_list`,
  BULK_DELETE: `${BASE_URL}/bulk_delete`,
  BULK_DELETE_LEADS: `${BASE_URL}/bulk_delete`,
  ACTIVITY_TIMELINE: `${BASE_URL}/timeline`,
  ADD_NOTES: `${BASE_URL}/notes`,
  LEAD_NOTES_DETAIL: `${BASE_URL}/sales_lead_notes_detail`,
  COMPANY_NOTES_DETAIL: `${BASE_URL}/company_notes_detail`,
  LEAD_METRICS: `${BASE_URL}/lead_metrics`,
  EXPORT_LEAD: `${BASE_URL}/export_lead`,
  LEAD_FILE_UPLOAD: `${BASE_URL}/lead_file_upload`,
  LEAD_UPLOAD_VIEW: `${BASE_URL}/lead_upload_view`,
  LEAD_MAPPING: `${BASE_URL}/lead_mapping`,
  BULK_SEARCH: `${BASE_URL}/bulk_search`,

  PROJECT_LIST: `${BASE_URL}/project_list`,
  ADD_PROJECT: `${BASE_URL}/add_project`,
  PROJECT_DETAIL: `${BASE_URL}/project_detail`,
  PROJECT_UPDATE: `${BASE_URL}/project_edit`,
  PROJECT_METRICS: `${BASE_URL}/project_metrics`,
  PROJECT_UNITS: `${BASE_URL}/project_units`,
  PROJECT_SITE_VISITS: `${BASE_URL}/project_site_visits`,
  PROJECT_MATCH_LEADS: `${BASE_URL}/project_match_leads`,
  LEAD_MATCH_PROJECTS: `${BASE_URL}/lead_match_projects`,
  PROJECT_DOCUMENTS: `${BASE_URL}/project_documents`,

  BOOKING_LIST: `${BASE_URL}/booking_list`,
  BOOKING_DETAIL: `${BASE_URL}/booking_detail`,
  BOOKING_METRICS: `${BASE_URL}/booking_metrics`,
  ADD_BOOKING: `${BASE_URL}/add_booking`,
  BOOKING_UPDATE: `${BASE_URL}/booking_edit`,
  BOOKING_DELETE: `${BASE_URL}/booking_delete`,

  ADD_PROJECT_SETTINGS: `${BASE_URL}/addprojectsettings`,
  PROJECT_SETTINGS_LIST: `${BASE_URL}/project_settings_list`,
  PROJECT_SETTINGS_BY_TYPE: `${BASE_URL}/project_settings`,
  UPDATE_PROJECT_SETTINGS: `${BASE_URL}/updateprojectsettings`,
  DELETE_PROJECT_SETTINGS: `${BASE_URL}/projectsettings`,
  PROJECT_SETTINGS_DEFAULT: `${BASE_URL}/projectsettings_default`,

  LEAD_DETAIL: `${BASE_URL}/lead_detail`,
  LEAD_ACTIVITY: `${BASE_URL}/sales_lead_activity`,
  LEAD_ASSOCIATES: `${BASE_URL}/lead_associates`,
  COMPANY_ASSOCIATES: `${BASE_URL}/company_associates`,
  OPPORTUNITY_ASSOCIATES: `${BASE_URL}/opportunity_associates`,
  PARTNER_ASSOCIATES: `${BASE_URL}/partner_associates`,
  TICKET_ASSOCIATES: `${BASE_URL}/ticket_associates`,
  INSTALLATION_ASSOCIATES: `${BASE_URL}/installation_associates`,
  CONTACT: `${BASE_URL}/contact`,
  CUSTOMFIELD_VALUES: `${BASE_URL}/customfield_values`,
  LEAD_UPDATE: `${BASE_URL}/lead_edit`,

  ADD_LEAD_SETTINGS: `${BASE_URL}/addleadsettings`,
  LEAD_SETTINGS_LIST: `${BASE_URL}/lead_settings_list`,
  LEAD_SETTINGS_BY_TYPE: `${BASE_URL}/lead_settings`,
  UPDATE_LEAD_SETTINGS: `${BASE_URL}/updateleadsettings`,
  DELETE_LEAD_SETTINGS: `${BASE_URL}/leadsettings`,
  LEAD_SETTINGS_DEFAULT: `${BASE_URL}/leadsettings_default`,
  REORDER_STATUS_SETTINGS: `${BASE_URL}/reorder_status_settings`,
  SALES_MODULE_ALL_SETTINGS_UPDATE: `${BASE_URL}/sales_module_all_settings_update`,

  LEAD_COLUMN_LIST: `${BASE_URL}/sales_leadColumnList`,
  COLUMN_CUSTOMIZE: `${BASE_URL}/column_customize`,

  GET_SAVED_FILTER: `${BASE_URL}/get_saved_filter`,

  LEAD_SETTINGS_DETAIL: `${BASE_URL}/lead_settings_list`,
  COMPANY_SETTINGS_DETAIL: `${BASE_URL}/company_settings_list`,

  CRM_TASKS: `${BASE_URL}/crm_tasks`,
  TASK_CALENDER: `${BASE_URL}/task_calender`,
  TASKS_COMPLETED: `${BASE_URL}/tasks_completed`,

  USERS_LIST: `${BASE_URL}/usersList`,
  ADD_USER: `${BASE_URL}/addUser`,
  USER_UPDATE: `${BASE_URL}/userUpdate`,
  USER_CHANGE_STATUS: `${BASE_URL}/userChangeStatus`,
  ROLES: `${BASE_URL}/roles`,
  ROLES_UPDATE: `${BASE_URL}/roles`,
  ADD_ROLES_LIST: `${BASE_URL}/roles`,
  ACTIVE_USERS_LIST: `${BASE_URL}/active_users_list`,

  BRANCH_LIST: `${BASE_URL}/branch_list`,
  ADD_BRANCH: `${BASE_URL}/add_branch`,
  BRANCH_UPDATE: `${BASE_URL}/branch_edit`,
  BRANCH_DELETE: `${BASE_URL}/branch_delete`,

  // Email compose & communication
  USERS_EMAIL: `${BASE_URL}/users_gmailList`,
  EMAIL_SIGNATURE: `${BASE_URL}/mail_signature_get`,
  EMAIL_TEMPLATES: `${BASE_URL}/emailTemplate`,
  EMAIL_TEMPLATE_HISTORY: `${BASE_URL}/history`,
  EMAIL_DOCUMENTS: `${BASE_URL}/emailDocuments`,
  SINGLE_EMAIL: `${BASE_URL}/single_email`,
  EMAIL_COMMUNICATION_STREAMLINED: `${BASE_URL}/email_communication_streamlined`,
  EMAIL_ATTACHMENT_DOWNLOAD: `${BASE_URL}/email_attachment`,
  folderList: `${BASE_URL}/folderList`,
  DOCUMENT_ADD: `${BASE_URL}/document`,
  DOCUMENT_BASE_URL: BASE_URL,

  CURRENCIES_LIST: `${BASE_URL}/currencies_list`,
  PROFILE_DATAS: `${BASE_URL}/profile_datas`,
  PROFILE_NEW: `${BASE_URL}/profile_datas`,
  DEMO_DATA_CHECK: `${BASE_URL}/demo_data_check`,
  DEMO_DATA_CLEAR: `${BASE_URL}/demo_data_clear`,
  CONVERT_2_OPPORTUNITY: `${BASE_URL}/convert_2_opportunity`,

  PRODUCT_SUBCATEGORY_SETTINGS_LIST: `${BASE_URL}/product_subcategory_settings_list`,
  PRODUCTS_BY_SUBCATEGORY: `${BASE_URL}/products_by_subcategory`,

  TICKET_MODULE_REQUEST_ACTIVITY: `${BASE_URL}/ticket_module_request_activity`,
  PARTNER_REQUEST_ACTIVITY: `${BASE_URL}/partner_request_activity`,
  ONBOARDING_REQUEST_ACTIVITY: `${BASE_URL}/onboarding_request_activity`,
  PARTNER_ACTIVITY: `${BASE_URL}/partner_activity`,

  GOOGLE_GEOCODING_API: "https://maps.googleapis.com/maps/api/geocode/json",
  GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",

  sharing_permissions: `${BASE_URL}/sharing_permissions`,
  everything_onespace_list: `${BASE_URL}/everything_onespace_list`,
  task_status_templates: `${BASE_URL}/task_status_templates`,
  onespace: `${BASE_URL}/onespace`,
  onefolder_add: `${BASE_URL}/onefolder_add`,
  onelist: `${BASE_URL}/onelist`,
  taskspace_rename: `${BASE_URL}/taskspace_rename`,
  taskfolder_rename: `${BASE_URL}/taskfolder_rename`,
  task_list_rename: `${BASE_URL}/task_list_rename`,
  spaces_delete: `${BASE_URL}/spaces_delete`,
  folder_delete: `${BASE_URL}/folder_delete`,
  onelist_delete: `${BASE_URL}/onelist_delete`,
  one_list_update: `${BASE_URL}/one_list_update`,

};

/**
 * Dynamically generate API URLs for any resource.
 * @param {string} resource - The resource name (e.g., 'company', 'invoice', 'quote')
 * @param {string} [id] - Optional resource ID
 * @returns {string} - The full API URL
 */
export function getApiUrl(resource, id) {
  if (!resource) throw new Error('Resource is required');
  const base = URLS[resource] || `${BASE_URL}/${resource}`;
  return id ? `${base}/${id}` : base;
}


export default URLS;

