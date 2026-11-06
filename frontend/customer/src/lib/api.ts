const BASE = "https://gharmitra-api.onrender.com";

export type AuthResponse = {
  token: string;
  expiresAtUtc: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
};

export type ServiceDto = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  durationMinutes: number;
};

export type ServiceCategoryDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  services: ServiceDto[];
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
  paymentStatus: string;
  professionalName: string | null;
  professionalLatitude: number | null;
  professionalLongitude: number | null;
};

// ───── Referral types ─────
export type MyReferralCodeDto = {
  referralCode: string;
  shareUrl: string;
  successfulReferrals: number;
  totalEarned: number;
};

export type ReferralItemDto = {
  referralCode: string;
  refereeName: string | null;
  refereeEmail: string | null;
  isRedeemed: boolean;
  redeemedAtUtc: string | null;
  referrerReward: number;
  createdAtUtc: string;
};

export type MyReferralsListDto = {
  referralCode: string;
  shareUrl: string;
  totalShared: number;
  totalRedeemed: number;
  totalEarned: number;
  items: ReferralItemDto[];
};

export type AcceptReferralResponse = {
  success: boolean;
  message: string;
  refereeDiscount: number;
  referrerReward: number;
};

export const tokenKey = "gm_token";

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

export type ReviewDto = {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string;
  professionalName: string | null;
  serviceName: string;
  createdAtUtc: string;
};

export const api = {
  register: (body: unknown) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: unknown) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  verifyOtp: (body: { email: string; code: string }) =>
    request<AuthResponse>("/api/auth/verify-otp", { method: "POST", body: JSON.stringify(body) }),
  verifyPhone: (body: { email: string; code: string }) =>
    request<AuthResponse>("/api/auth/verify-phone", { method: "POST", body: JSON.stringify(body) }),
  services: () => request<ServiceCategoryDto[]>("/api/services"),
  createBooking: (body: unknown) =>
    request<BookingDto>("/api/bookings", { method: "POST", body: JSON.stringify(body) }),
  myBookings: () => request<BookingDto[]>("/api/bookings/my"),
  cancelBooking: (id: string, reason?: string) =>
    request<BookingDto>(`/api/bookings/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: reason ?? null }),
    }),
  payBooking: (id: string) => request<any>(`/api/bookings/${id}/pay`, { method: "POST" }),
  canReview: (id: string) => request<{ canReview: boolean }>(`/api/bookings/${id}/can-review`),
  submitReview: (id: string, body: { rating: number; comment?: string }) =>
    request<ReviewDto>(`/api/bookings/${id}/reviews`, { method: "POST", body: JSON.stringify(body) }),
  verifyPayment: (id: string, data: any) =>
    request<any>(`/api/bookings/${id}/verify-payment`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  applyCoupon: (bookingId: string, code: string) =>
    request<{ couponCode: string; discountApplied: number; originalAmount: number; newAmount: number }>(
      `/api/bookings/${bookingId}/apply-coupon`,
      { method: "POST", body: JSON.stringify({ code }) }
    ),
  removeCoupon: (bookingId: string) =>
    request<void>(`/api/bookings/${bookingId}/apply-coupon`, { method: "DELETE" }),

  // ───── Referral endpoints ─────
  myReferralCode: () => request<MyReferralCodeDto>("/api/referrals/my-code"),
  myReferrals: () => request<MyReferralsListDto>("/api/referrals/my"),
  acceptReferral: (body: { referralCode: string; refereeEmail: string }) =>
    request<AcceptReferralResponse>("/api/referrals/accept", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};