const BASE = "https://gharmitra-api.onrender.com";

export type AuthResponse = {
  token: string;
  expiresAtUtc: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
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
  refundedAtUtc?: string | null;
  refundAmount?: number | null;
};

export type ProfessionalDto = {
  id: string;
  fullName: string;
  city: string;
  isVerified: boolean;
  isAvailable: boolean;
  rating: number;
};

export type KpiDto = {
  totalRevenue: number;
  totalBookings: number;
  paidBookings: number;
  pendingBookings: number;
  assignedBookings: number;
  acceptedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  totalCustomers: number;
  totalProfessionals: number;
  activeProfessionals: number;
};

export type DailyRevenueDto = { date: string; revenue: number; bookings: number };
export type TopProfessionalDto = { id: string; fullName: string; city: string; totalJobs: number; totalRevenue: number; rating: number; isVerified: boolean };
export type TopServiceDto = { serviceName: string; bookingCount: number; revenue: number };
export type RecentBookingDto = { bookingNumber: string; serviceName: string; customerName: string; professionalName: string | null; amount: number; status: string; paymentStatus: string; createdAtUtc: string };

export type AnalyticsDto = {
  kpis: KpiDto;
  last7DaysRevenue: DailyRevenueDto[];
  topProfessionals: TopProfessionalDto[];
  topServices: TopServiceDto[];
  recentBookings: RecentBookingDto[];
};

export type CouponDto = {
  id: string;
  code: string;
  description: string | null;
  discountType: "Percentage" | "FixedAmount";
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  validFromUtc: string | null;
  validUntilUtc: string | null;
  maxTotalUses: number | null;
  currentUses: number;
  maxUsesPerCustomer: number | null;
  isActive: boolean;
  createdAtUtc: string;
  firstBookingOnly: boolean;
};

export type CreateCouponRequest = {
  code: string;
  description: string | null;
  discountType: 1 | 2;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  validFromUtc: string | null;
  validUntilUtc: string | null;
  maxTotalUses: number | null;
  maxUsesPerCustomer: number | null;
  firstBookingOnly: boolean;
};

export type CouponStatsDto = {
  totalDiscountGiven: number;
  totalRedemptions: number;
  topCouponCode: string | null;
  topCouponUses: number;
};

export type CouponDailyTrendDto = {
  date: string;
  redemptions: number;
  discount: number;
};

export type TopCouponDto = {
  code: string;
  uses: number;
  totalDiscount: number;
};

export type CouponAnalyticsDto = {
  totalDiscountGiven: number;
  totalRedemptions: number;
  conversionRate: number;
  appliedAndPaid: number;
  appliedButNotPaid: number;
  dailyTrend: CouponDailyTrendDto[];
  topCoupons: TopCouponDto[];
};


// ───── Referral types (admin) ─────
export type AdminReferralListDto = {
  id: string;
  referrerName: string;
  referrerEmail: string;
  referralCode: string;
  refereeName: string | null;
  refereeEmail: string | null;
  isRedeemed: boolean;
  redeemedAtUtc: string | null;
  referrerReward: number;
  createdAtUtc: string;
};

export type TopReferrerDto = {
  fullName: string;
  referralCode: string;
  successfulReferrals: number;
  totalEarned: number;
};

export type ReferralAdminStatsDto = {
  totalReferrals: number;
  redeemedReferrals: number;
  totalRewardsPaid: number;
  topReferrers: TopReferrerDto[];
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
  analytics: () => request<AnalyticsDto>("/api/admin/analytics"),
  assign: (bookingId: string, professionalId: string) =>
    request<void>(`/api/admin/bookings/${bookingId}/assign`, {
      method: "POST",
      body: JSON.stringify({ professionalId }),
    }),
  refundBooking: (bookingId: string, reason: string) =>
    request<{ success: boolean; amountRefunded: number; reason: string; message: string }>(
      `/api/admin/bookings/${bookingId}/refund`,
      { method: "POST", body: JSON.stringify({ reason }) }
    ),
  verify: (professionalId: string, notes?: string) =>
    request<void>(`/api/admin/professionals/${professionalId}/verify`, {
      method: "POST",
      body: JSON.stringify({ notes: notes ?? null }),
    }),
  coupons: () => request<CouponDto[]>("/api/admin/coupons"),
  createCoupon: (body: CreateCouponRequest) =>
    request<CouponDto>("/api/admin/coupons", { method: "POST", body: JSON.stringify(body) }),
  couponStats: (fromUtc?: string, toUtc?: string) => {
    const q = new URLSearchParams();
    if (fromUtc) q.set("fromUtc", fromUtc);
    if (toUtc) q.set("toUtc", toUtc);
    const qs = q.toString();
    return request<CouponStatsDto>(`/api/admin/coupons/stats${qs ? "?" + qs : ""}`);
  },
    referrals: () => request<AdminReferralListDto[]>("/api/admin/referrals"),
  referralStats: () => request<ReferralAdminStatsDto>("/api/admin/referrals/stats"),
    couponAnalytics: (days = 30) => {
    return request<CouponAnalyticsDto>(`/api/admin/coupons/analytics?days=${days}`);
  },
};