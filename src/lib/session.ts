import { apiUrl, CHEFU_ADMIN_APP_ID, CHEFU_APP_HEADER, readApiError } from "./api";

export type AdminProfile = {
  email: string;
  roles: string[];
  uid: string;
};

export async function syncAdminSession(idToken: string) {
  const response = await fetch(apiUrl("/auth/session"), {
    credentials: "include",
    headers: {
      Authorization: `Bearer ${idToken}`,
      [CHEFU_APP_HEADER]: CHEFU_ADMIN_APP_ID,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Unable to start an admin session."),
    );
  }
}

export async function fetchAdminProfile() {
  const response = await fetch(apiUrl("/auth/me"), {
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Admin session required."));
  }

  const data = (await response.json()) as {
    user?: AdminProfile;
  };

  return data.user || null;
}

export async function clearAdminSession() {
  await fetch(apiUrl("/auth/session"), {
    credentials: "include",
    method: "DELETE",
  });
}
