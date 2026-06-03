import { apiUrl, readApiError } from "./api";

export type AdminProfile = {
  email: string;
  roles: string[];
  uid: string;
};

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
