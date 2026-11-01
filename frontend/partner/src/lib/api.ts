const BASE = "https://four-random-words-here.trycloudflare.com";

export type AuthResponse = {
  token: string;
  expiresAtUtc: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
};

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  city: string;
  isVerified: boolean;
  isAvailable: boolean;
  rating: number;
  totalJobs: number;
  verifiedAtUtc: string | null;
  verificationNotes: string | null;
};

export type Assignment = {
  id: string;
  bookingId: string;
  bookingNumber: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  addressLine: string;
  city: string;
  pincode: string | null;
  notes: string | null;
  scheduledStartUtc: string;
  durationMinutes: number;
  totalAmount: number;
  bookingStatus: string;
  assignedAtUtc: string;
  acceptedAtUtc: string | null;
};

export const tokenKey = "gm_partner_token";

export function setToken(t: string | null) {
  if (t) localStorage.setItem(tokenKey, t);
  else localStorage.removeItem(tokenKey);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(tokenKey);
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.message ?? msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const partnerApi = {
  login: (body: unknown) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<Profile>("/api/partner/me"),
  assignments: () => request<Assignment[]>("/api/partner/assignments"),
  accept: (id: string) =>
    request<Assignment>(`/api/partner/assignments/${id}/accept`, { method: "POST" }),
};






