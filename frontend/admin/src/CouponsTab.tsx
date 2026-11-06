import { useEffect, useState } from "react";
import { adminApi, type CouponDto, type CreateCouponRequest, type CouponStatsDto } from "./lib/api";

const emptyForm: CreateCouponRequest = {
  code: "", description: "", discountType: 1, discountValue: 0,
  maxDiscountAmount: null, minOrderAmount: 0,
  validFromUtc: null, validUntilUtc: null,
  maxTotalUses: null, maxUsesPerCustomer: 1,
};

function statusOf(c: CouponDto): { label: string; cls: string } {
  if (!c.isActive) return { label: "Inactive", cls: "badge-pending" };
  const now = Date.now();
  if (c.validUntilUtc && new Date(c.validUntilUtc).getTime() < now) return { label: "Expired", cls: "badge-cancelled" };
  if (c.validFromUtc && new Date(c.validFromUtc).getTime() > now) return { label: "Scheduled", cls: "badge-assigned" };
  if (c.maxTotalUses != null && c.currentUses >= c.maxTotalUses) return { label: "Exhausted", cls: "badge-cancelled" };
  return { label: "Active", cls: "badge-accepted" };
}

export default function CouponsTab() {
  const [coupons, setCoupons] = useState<CouponDto[]>([]);
  const [stats, setStats] = useState<CouponStatsDto | null>(null);
  const [form, setForm] = useState<CreateCouponRequest>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function reload() {
    setLoading(true); setError(null);
    try {
      const [c, s] = await Promise.all([adminApi.coupons(), adminApi.couponStats()]);
      setCoupons(c); setStats(s);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setSuccess(null);
    try {
      const created = await adminApi.createCoupon({
        ...form,
        code: form.code.trim().toUpperCase(),
        validFromUtc: form.validFromUtc ? new Date(form.validFromUtc).toISOString() : null,
        validUntilUtc: form.validUntilUtc ? new Date(form.validUntilUtc).toISOString() : null,
      });
      setSuccess(`Created ${created.code}`);
      setForm(emptyForm);
      await reload();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      {/* Stats card */}
      {stats && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Discounts given</div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--success)" }}>₹{stats.totalDiscountGiven.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Redemptions</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.totalRedemptions}</div>
          </div>
          {stats.topCouponCode && (
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Top coupon</div>
              <div style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.topCouponCode}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{stats.topCouponUses} uses</div>
            </div>
          )}
        </div>
      )}

      {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>⚠️ {error}</div>}
      {success && <div style={{ background: "#D1FAE5", color: "#065F46", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>✅ {success}</div>}

      {/* Create form */}
      <form onSubmit={onSubmit} className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Create coupon</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem", marginBottom: "1rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            Code
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="WELCOME50" required style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            Description
            <input value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Welcome offer" style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            Type
            <select value={form.discountType} onChange={e => setForm({ ...form, discountType: Number(e.target.value) as 1 | 2 })} style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }}>
              <option value={1}>Percentage (%)</option>
              <option value={2}>Fixed (₹)</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            Value
            <input type="number" min="0" step="0.01" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: Number(e.target.value) })} required style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            Max discount (₹)
            <input type="number" min="0" step="0.01" value={form.maxDiscountAmount ?? ""} onChange={e => setForm({ ...form, maxDiscountAmount: e.target.value === "" ? null : Number(e.target.value) })} style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            Min order (₹)
            <input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: Number(e.target.value) })} required style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            Valid from
            <input type="datetime-local" value={form.validFromUtc ?? ""} onChange={e => setForm({ ...form, validFromUtc: e.target.value || null })} style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            Valid until
            <input type="datetime-local" value={form.validUntilUtc ?? ""} onChange={e => setForm({ ...form, validUntilUtc: e.target.value || null })} style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            Max total uses
            <input type="number" min="1" value={form.maxTotalUses ?? ""} onChange={e => setForm({ ...form, maxTotalUses: e.target.value === "" ? null : Number(e.target.value) })} style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            Max per customer
            <input type="number" min="1" value={form.maxUsesPerCustomer ?? 1} onChange={e => setForm({ ...form, maxUsesPerCustomer: Number(e.target.value) })} style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px" }} />
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={busy} style={{ padding: "0.7rem 1.5rem" }}>
          {busy ? "Creating…" : "Create coupon"}
        </button>
      </form>

      {/* Table */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>All coupons ({coupons.length})</h3>
        {loading ? <p style={{ color: "var(--text-muted)" }}>Loading…</p> : coupons.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No coupons yet — create one above.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--bg)" }}>
                <tr>
                  <th align="left">Code</th>
                  <th align="left">Type</th>
                  <th align="left">Value</th>
                  <th align="right">Min order</th>
                  <th align="right">Uses</th>
                  <th align="left">Valid until</th>
                  <th align="left">Status</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => {
                  const s = statusOf(c);
                  return (
                    <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td><strong>{c.code}</strong>{c.description && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.description}</div>}</td>
                      <td>{c.discountType}</td>
                      <td>{c.discountType === "Percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}{c.maxDiscountAmount ? ` (max ₹${c.maxDiscountAmount})` : ""}</td>
                      <td align="right">₹{c.minOrderAmount}</td>
                      <td align="right">{c.currentUses}{c.maxTotalUses != null ? ` / ${c.maxTotalUses}` : ""}</td>
                      <td>{c.validUntilUtc ? new Date(c.validUntilUtc).toLocaleDateString("en-IN") : "—"}</td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}