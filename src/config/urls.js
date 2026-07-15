// Environment-based configuration
// URLs are automatically determined based on the current environment
// Local URLs are used when running on localhost
// Production URLs are used when deployed
// Update production URLs in src/config/environment.js

import { BASE_URL } from './environment';

export const URLS = {

  SIGNUP: `${BASE_URL}/signup`,
  OTP_VERIFY_MATCH: `${BASE_URL}/otp_verify_match`,
  RESEND_OTP: `${BASE_URL}/resend_otp`,
  LOGIN_RESEND_OTP: `${BASE_URL}/login_resend_otp`,
  LOGIN: `${BASE_URL}/login`,
  FORGOT_PASSWORD: `${BASE_URL}/forgot_password_check`,
  CHANGE_PASSWORD: `${BASE_URL}/change_Password`,
  CREATE_NEW_PASSWORD: `${BASE_URL}/creat_new_password`,

  ADD_LEAD: `${BASE_URL}/add_lead`,
  LEAD_LIST: `${BASE_URL}/lead_list`,
  BULK_DELETE: `${BASE_URL}/bulk_delete`,
  BULK_DELETE_LEADS: `${BASE_URL}/bulk_delete`,
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
  LEAD_SUGGESTED_PROJECTS: `${BASE_URL}/lead_suggested_projects`,
  AI_CHAT: `${BASE_URL}/ai_chat`,
  PROJECT_DOCUMENTS: `${BASE_URL}/project_documents`,

  BOOKING_LIST: `${BASE_URL}/booking_list`,
  BOOKING_METRICS: `${BASE_URL}/booking_metrics`,
  ADD_BOOKING: `${BASE_URL}/add_booking`,
  BOOKING_UPDATE: `${BASE_URL}/booking_edit`,
  BOOKING_DELETE: `${BASE_URL}/booking_delete`,

  AGENT_LIST: `${BASE_URL}/agent_list`,
  AGENT_DETAIL: `${BASE_URL}/agent_detail`,
  AGENT_UPDATE: `${BASE_URL}/agent_edit`,
  AGENT_DELETE: `${BASE_URL}/agent_delete`,
  AGENT_METRICS: `${BASE_URL}/agent_metrics`,
  AGENT_STATUS: `${BASE_URL}/agent_status`,

  ADD_PROJECT_SETTINGS: `${BASE_URL}/addprojectsettings`,
  PROJECT_SETTINGS_LIST: `${BASE_URL}/project_settings_list`,
  UPDATE_PROJECT_SETTINGS: `${BASE_URL}/updateprojectsettings`,
  DELETE_PROJECT_SETTINGS: `${BASE_URL}/projectsettings`,
  PROJECT_SETTINGS_DEFAULT: `${BASE_URL}/projectsettings_default`,

  LEAD_DETAIL: `${BASE_URL}/lead_detail`,
  LEAD_ACTIVITY: `${BASE_URL}/sales_lead_activity`,
  LEAD_ASSOCIATES: `${BASE_URL}/lead_associates`,
  COMPANY_ASSOCIATES: `${BASE_URL}/company_associates`,
  PARTNER_ASSOCIATES: `${BASE_URL}/partner_associates`,
  TICKET_ASSOCIATES: `${BASE_URL}/ticket_associates`,
  INSTALLATION_ASSOCIATES: `${BASE_URL}/installation_associates`,
  CONTACT: `${BASE_URL}/contact`,
  CUSTOMFIELD_VALUES: `${BASE_URL}/customfield_values`,
  LEAD_UPDATE: `${BASE_URL}/lead_edit`,

  ADD_LEAD_SETTINGS: `${BASE_URL}/addleadsettings`,
  LEAD_SETTINGS_LIST: `${BASE_URL}/lead_settings_list`,
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
  USER_PERMISSIONS: `${BASE_URL}/users`,
  USER_SELF_PERMISSIONS: `${BASE_URL}/user_permissions`,
  ROLES: `${BASE_URL}/roles`,
  ROLES_UPDATE: `${BASE_URL}/roles`,
  ADD_ROLES_LIST: `${BASE_URL}/roles`,
  PERMISSIONS_CATALOG: `${BASE_URL}/permissions/catalog`,
  ACTIVE_USERS_LIST: `${BASE_URL}/active_users_list`,

  BRANCH_LIST: `${BASE_URL}/branch_list`,
  ADD_BRANCH: `${BASE_URL}/add_branch`,
  BRANCH_UPDATE: `${BASE_URL}/branch_edit`,
  BRANCH_DELETE: `${BASE_URL}/branch_delete`,

  // Email compose & communication
  USERS_EMAIL: `${BASE_URL}/users_gmailList`,
  EMAIL_SIGNATURE: `${BASE_URL}/mail_signature_get`,
  EMAIL_SIGNATURE_UPDATE: `${BASE_URL}/mail_Signature`,
  EMAIL_TEMPLATES: `${BASE_URL}/emailTemplate`,
  EMAIL_TEMPLATE_HISTORY: `${BASE_URL}/history`,
  EMAIL_DOCUMENTS: `${BASE_URL}/emailDocuments`,
  SINGLE_EMAIL: `${BASE_URL}/single_email`,
  EMAIL_COMMUNICATION_STREAMLINED: `${BASE_URL}/email_communication_streamlined`,
  EMAIL_ATTACHMENT_DOWNLOAD: `${BASE_URL}/email_attachment`,
  folderList: `${BASE_URL}/folderList`,
  DOCUMENT_ADD: `${BASE_URL}/document`,
  DOCUMENT_BASE_URL: BASE_URL,

  PROFILE_DATAS: `${BASE_URL}/profile_datas`,
  PROFILE_NEW: `${BASE_URL}/profile_datas`,
  ORGANIZATION_PROFILE: `${BASE_URL}/organization_profile`,

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

export default URLS;

