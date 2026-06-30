/**
 * Environment Configuration
 * Resolves API/app URLs from environment variables with safe fallbacks.
 *
 * Configure these in your hosting provider (e.g. Vercel) or a local
 * `.env.local` file. Client-exposed values MUST use the NEXT_PUBLIC_ prefix:
 *   NEXT_PUBLIC_API_BASE_URL
 *   NEXT_PUBLIC_APP_BASE_URL
 *   NEXT_PUBLIC_MCP_MAIL_BASE_URL
 */

// Fallback URLs used when no environment variables are provided.
const PRODUCTION_URLS = {
    API_BASE_URL: "http://13.232.63.210:5000",
    APP_BASE_URL: "https://map-frontend.vercel.app",
    MCP_MAIL_BASE_URL: "https://localhost:8001",
};

const LOCAL_URLS = {
    API_BASE_URL: "http://13.232.63.210:5000",
    APP_BASE_URL: "http://localhost:3000",
    MCP_MAIL_BASE_URL: "https://localhost:8001",
};

/**
 * Detects if the app is running in local development.
 * Checks both server-side (NODE_ENV) and client-side (window.location).
 */
function isLocalEnvironment() {
    if (typeof window === 'undefined') {
        return process.env.NODE_ENV === 'development';
    }

    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
}

/**
 * Gets the appropriate fallback URLs based on the current environment.
 */
function getEnvironmentUrls() {
    return isLocalEnvironment() ? LOCAL_URLS : PRODUCTION_URLS;
}

const fallbackUrls = getEnvironmentUrls();

// Environment variables take precedence; fallbacks keep the app working
// even if they are not configured.
export const BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || fallbackUrls.API_BASE_URL;
export const APP_BASE_URL =
    process.env.NEXT_PUBLIC_APP_BASE_URL || fallbackUrls.APP_BASE_URL;
export const MCP_MAIL_BASE_URL =
    process.env.NEXT_PUBLIC_MCP_MAIL_BASE_URL || fallbackUrls.MCP_MAIL_BASE_URL;

// Exported for debugging / reuse.
export { isLocalEnvironment, getEnvironmentUrls, PRODUCTION_URLS, LOCAL_URLS };
