const BASE = "https://gharmitra-api.onrender.com";

export type AuthResponse = {
  token: string; expiresAtUtc: string; userId: string;
  fullName: string; email: string; role: string; isEmailVerified: boolean;
};

export type Profile = {
  id: string; fullName: string; email: string; phoneNumber: string;
  city: string; isVerified: boolean; isAvailable: boolean;
  rating: number; totalJobs: number;
  verifiedAtUtc: string | null; verificationNotes: string | null;
};

export type Assignment = {
  id: string; bookingId: string; bookingNumber: string;
  serviceName: string; customerName: string; customerPhone: string;
  addressLine: string; city: string; pincode: string | null; notes: string | null;
  scheduledStartUtc: string; durationMinutes: number; totalAmount: number;
  bookingStatus: string; assignedAtUtc: string;
  acceptedAtUtc: string | null; startedAtUtc: string | null; completedAtUtc: string | null;
};

export type Earnings = {
  totalEarnings: number; completedJobs: number;
  thisMonthEarnings: number; thisMonthJobs: number;
  last7Days: { date: string; amount: number; jobs: number }[];
};

export type VerificationStatus = {
  professionalId: string;
  status: string;
  idProofType: string | null;
  idProofUrl: string | null;
  selfieUrl: string | null;
  rejectionReason: string | null;
  submittedAtUtc: string | null;
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
    try { const body = await res.json(); msg = body.message ?? msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const partnerApi = {
  login: (body: unknown) => request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<Profile>("/api/partner/me"),
  assignments: () => request<Assignment[]>("/api/partner/assignments"),
  earnings: () => request<Earnings>("/api/partner/earnings"),
  accept: (id: string) => request<Assignment>(`/api/partner/assignments/${id}/accept`, { method: "POST" }),
  start: (id: string) => request<Assignment>(`/api/partner/assignments/${id}/start`, { method: "POST" }),
  complete: (id: string) => request<Assignment>(`/api/partner/assignments/${id}/complete`, { method: "POST" }),
  setAvailability: (isAvailable: boolean) => request<{message: string}>("/api/partner/availability", { method: "POST", body: JSON.stringify({ isAvailable }) }),
  getVerificationStatus: () => request<VerificationStatus>("/api/partner/verification/status"),
  submitVerification: (body: { idProofType: string; idProofUrl: string; selfieUrl: string }) =>
    request<VerificationStatus>("/api/partner/verification/upload", { method: "POST", body: JSON.stringify(body) }),
};