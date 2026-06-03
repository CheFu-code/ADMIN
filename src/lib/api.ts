export const CHEFU_APP_HEADER = "x-chefu-app";
export const CHEFU_ADMIN_APP_ID = "admin";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.chefuinc.com";
export const ACCOUNT_APP_URL =
  process.env.NEXT_PUBLIC_ACCOUNT_APP_URL || "https://myaccount.chefuinc.com";

export function apiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, "")}${
    path.startsWith("/") ? path : `/${path}`
  }`;
}

export async function readApiError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    requestId?: string;
  };
  const message = data.error || data.message || fallback;
  return data.requestId ? `${message} Request ID: ${data.requestId}` : message;
}

export function accountLoginUrl(returnTo: string) {
  const loginUrl = new URL("/login", ACCOUNT_APP_URL);
  loginUrl.searchParams.set("app", CHEFU_ADMIN_APP_ID);
  loginUrl.searchParams.set("returnTo", returnTo);

  return loginUrl.toString();
}
