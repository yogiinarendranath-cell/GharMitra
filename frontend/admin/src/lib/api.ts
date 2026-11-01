const BASE = import.meta.env.VITE_API_URL || "http://localhost:5080";

export type AuthResponse = {
  token: string;
  expiresAtUtc: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
};

export type BookingDto = {
  id: string;
  bookingNumber: string;
  serviceName: string;
  scheduledStartUtc: string;
  durationMinutes: number;
  addressLine: string;
  city: string;
  totalAmount: number;
  status: string;
  professionalName: string | null;
};

export type ProfessionalDto = {
  id: string;
  fullName: string;
  city: string;
  isVerified: boolean;
  isAvailable: boolean;
  rating: number;
};

export const tokenKey = "gm_admin_token";

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

export const adminApi = {
  login: (body: unknown) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  bookings: () => request<BookingDto[]>("/api/admin/bookings"),
  professionals: () => request<ProfessionalDto[]>("/api/admin/professionals"),
  assign: (bookingId: string, professionalId: string) =>
    request<void>(`/api/admin/bookings/${bookingId}/assign`, {
      method: "POST",
      body: JSON.stringify({ professionalId }),
    }),
  verify: (professionalId: string, notes?: string) =>
    request<void>(`/api/admin/professionals/${professionalId}/verify`, {
      method: "POST",
      body: JSON.stringify({ notes: notes ?? null }),
    }),
};
