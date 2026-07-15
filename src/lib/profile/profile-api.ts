import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"
import { AUTH_USER_STORAGE_KEY, getStoredAuthUser } from "@/lib/auth"

export interface ProfileData {
  name?: string
  email?: string
  phone?: string
  profile_image?: string
  role?: string
  role_name?: string
  branch_name?: string
  [key: string]: unknown
}

interface ProfileApiEnvelope {
  code?: number
  msg?: string
  data?: ProfileData
}

interface EmailSignatureEnvelope {
  code?: number
  msg?: string
  data?: Array<{ mail_signature?: string | null }> | { mail_signature?: string | null }
}

function extractMailSignature(
  data: EmailSignatureEnvelope["data"]
): string {
  if (!data) return ""

  if (Array.isArray(data)) {
    if (data.length === 0) return ""
    const signature = data[0]?.mail_signature
    return typeof signature === "string" ? signature : ""
  }

  const signature = data.mail_signature
  return typeof signature === "string" ? signature : ""
}

export function getProfileAuthToken(): string | null {
  const stored = getStoredAuthUser()
  if (stored?.access_token) return stored.access_token

  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { access_token?: string }
    return parsed.access_token ?? null
  } catch {
    return null
  }
}

export function resolveProfileImageUrl(profileImage?: string | null): string {
  if (!profileImage || typeof profileImage !== "string") return ""

  if (profileImage.startsWith("http")) return profileImage

  const baseUrl = URLS.DOCUMENT_BASE_URL || ""
  return baseUrl ? `${baseUrl}/uploads/profile/${profileImage}` : ""
}

export async function fetchProfile(token: string): Promise<ProfileData | null> {
  try {
    const response = await fetch(URLS.PROFILE_NEW, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) return null

    const result = await parseJsonResponse<ProfileApiEnvelope>(response)
    if (result.code !== 200 || !result.data) return null

    return result.data
  } catch {
    return null
  }
}

export interface UpdateProfileInput {
  name: string
  phone?: string
  profileImage?: File | null
}

export interface UpdateOrganizationProfileInput {
  userName: string
  organizationName: string
}

export interface OrganizationProfileData extends ProfileData {
  organization_name?: string
}

interface OrganizationProfileEnvelope {
  code?: number
  msg?: string
  data?: OrganizationProfileData
  organization?: {
    organization_name?: string
    user_name?: string
    [key: string]: unknown
  }
}

export async function updateOrganizationProfile(
  token: string,
  input: UpdateOrganizationProfileInput
): Promise<{
  success: boolean
  message?: string
  data?: OrganizationProfileData
  organization?: OrganizationProfileEnvelope["organization"]
}> {
  try {
    const response = await fetch(URLS.ORGANIZATION_PROFILE, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_name: input.userName.trim(),
        organization_name: input.organizationName.trim(),
      }),
    })

    const result = await parseJsonResponse<OrganizationProfileEnvelope>(response)

    if (!response.ok || result.code !== 200) {
      return {
        success: false,
        message: result.msg || "Failed to save organization profile.",
      }
    }

    return {
      success: true,
      message: result.msg,
      data: result.data,
      organization: result.organization,
    }
  } catch {
    return {
      success: false,
      message: "Failed to save organization profile. Please try again.",
    }
  }
}

export async function updateProfile(
  token: string,
  input: UpdateProfileInput
): Promise<{ success: boolean; message?: string; data?: ProfileData }> {
  const formData = new FormData()
  formData.append("name", input.name)
  formData.append("phone", input.phone ?? "")

  if (input.profileImage) {
    formData.append("profile_image", input.profileImage)
  }

  const response = await fetch(URLS.PROFILE_DATAS, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const result = await parseJsonResponse<ProfileApiEnvelope>(response)

  if (!response.ok || result.code !== 200) {
    return {
      success: false,
      message: result.msg || "Failed to update profile.",
    }
  }

  return {
    success: true,
    message: result.msg,
    data: result.data,
  }
}

export async function changePassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(URLS.CHANGE_PASSWORD, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ new_password: newPassword }),
    })

    const result = await parseJsonResponse<{ code?: number; msg?: string }>(response)

    if (!response.ok || result.code !== 200) {
      return {
        success: false,
        message: result.msg || "Failed to change password.",
      }
    }

    return {
      success: true,
      message: result.msg,
    }
  } catch {
    return {
      success: false,
      message: "Failed to change password. Please try again.",
    }
  }
}

export async function fetchEmailSignature(token: string): Promise<string> {
  try {
    const response = await fetch(URLS.EMAIL_SIGNATURE, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) return ""

    const result = await parseJsonResponse<EmailSignatureEnvelope>(response)
    if (result.code !== 200) return ""

    return extractMailSignature(result.data)
  } catch {
    return ""
  }
}

export async function updateEmailSignature(
  token: string,
  signature: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(URLS.EMAIL_SIGNATURE_UPDATE, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mail_signature: signature }),
    })

    const result = await parseJsonResponse<{ code?: number; msg?: string }>(response)

    if (!response.ok || result.code !== 200) {
      return {
        success: false,
        message: result.msg || "Failed to save email signature.",
      }
    }

    return {
      success: true,
      message: result.msg,
    }
  } catch {
    return {
      success: false,
      message: "Failed to save email signature. Please try again.",
    }
  }
}
