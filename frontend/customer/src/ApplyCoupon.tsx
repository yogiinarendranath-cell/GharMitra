import { useState } from "react";
import { api } from "./lib/api";

export interface ApplyCouponProps {
  bookingId: string;
  originalAmount: number;
  initialCoupon?: { code: string; discount: number } | null;
  paid: boolean;
  initialCode?: string;
  onChange: (state: { code: string | null; discount: number; newAmount: number }) => void;
}

export default function ApplyCoupon({
  bookingId, originalAmount, initialCoupon, paid, initialCode, onChange,
}: ApplyCouponProps) {
  const [code, setCode] = useState(initialCode ?? "");
  const [applied, setApplied] = useState(initialCoupon ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (paid) return null;

  async function apply() {
    setBusy(true); setError(null);
    try {
      const r = await api.applyCoupon(bookingId, code.trim().toUpperCase());
      setApplied({ code: r.couponCode, discount: r.discountApplied });
      onChange({ code: r.couponCode, discount: r.discountApplied, newAmount: r.newAmount });
      setCode("");
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setError(null);
    try {
      await api.removeCoupon(bookingId);
      setApplied(null);
      onChange({ code: null, discount: 0, newAmount: originalAmount });
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ margin: "1rem 0" }}>
      {applied ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#D1FAE5", border: "1px solid #6EE7B7", color: "#065F46",
          padding: "0.55rem 0.85rem", borderRadius: "8px", fontSize: "0.9rem",
        }}>
          <span><strong>{applied.code}</strong> · ₹{applied.discount.toFixed(2)} off</span>
          <button onClick={remove} disabled={busy} aria-label="Remove coupon"
            style={{ background: "transparent", border: 0, color: "#065F46",
              fontSize: "1.3rem", cursor: "pointer", padding: "0 .35rem", lineHeight: 1 }}>
            ×
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Coupon code"
            disabled={busy}
            onKeyDown={e => e.key === "Enter" && code.trim() && apply()}
            style={{ flex: 1, padding: "0.6rem 0.75rem",
              border: "1px solid var(--border, #E9ECEF)", borderRadius: "8px",
              fontSize: "0.95rem", textTransform: "uppercase" }}
          />
          <button onClick={apply} disabled={busy || !code.trim()}
            className="btn-primary"
            style={{ padding: "0.6rem 1.2rem", opacity: busy || !code.trim() ? 0.6 : 1 }}>
            {busy ? "Applying…" : "Apply"}
          </button>
        </div>
      )}
      {error && (
        <div style={{ color: "#B91C1C", fontSize: "0.85rem", marginTop: "0.4rem" }}>{error}</div>
      )}
    </div>
  );
}