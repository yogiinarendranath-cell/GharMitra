import { useEffect, useState } from "react";
import { adminApi, type AdminReferralListDto, type ReferralAdminStatsDto } from "./lib/api";

export default function ReferralsTab() {
  const [stats, setStats] = useState<ReferralAdminStatsDto | null>(null);
  const [referrals, setReferrals] = useState<AdminReferralListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true); setError(null);
    try {
      const [s, r] = await Promise.all([
        adminApi.referralStats(),
        adminApi.referrals(),
      ]);
      setStats(s);
      setReferrals(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  const conversionRate = stats && stats.totalReferrals > 0
    ? ((stats.redeemedReferrals / stats.totalReferrals) * 100).toFixed(0)
    : "0";

  return (
    <div>
      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI cards */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>
              Total Referrals
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.totalReferrals}</div>
          </div>
          <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>
              Redeemed
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--success)" }}>{stats.redeemedReferrals}</div>
          </div>
          <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>
              Conversion Rate
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--primary)" }}>{conversionRate}%</div>
          </div>
          <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>
              Rewards Paid
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#F59E0B" }}>₹{stats.totalRewardsPaid.toFixed(0)}</div>
          </div>
        </div>
      )}

      {/* Top referrers leaderboard */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>🏆 Top Referrers</h3>
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : !stats || stats.topReferrers.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No referrals yet.</p>
        ) : (
          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--bg)" }}>
              <tr>
                <th align="left">#</th>
                <th align="left">Name</th>
                <th align="left">Referral Code</th>
                <th align="right">Successful</th>
                <th align="right">Total Earned</th>
              </tr>
            </thead>
            <tbody>
              {stats.topReferrers.map((r, i) => (
                <tr key={r.referralCode} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{i + 1}</td>
                  <td><strong>{r.fullName}</strong></td>
                  <td><code style={{ fontSize: "0.85rem" }}>{r.referralCode}</code></td>
                  <td align="right">{r.successfulReferrals}</td>
                  <td align="right" style={{ color: "var(--success)", fontWeight: 600 }}>
                    ₹{r.totalEarned.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent referrals */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Recent Referrals ({referrals.length})</h3>
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : referrals.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No referrals yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--bg)" }}>
                <tr>
                  <th align="left">Referrer</th>
                  <th align="left">Referee</th>
                  <th align="left">Code</th>
                  <th align="left">Status</th>
                  <th align="right">Reward</th>
                  <th align="left">Date</th>
                </tr>
              </thead>
              <tbody>
                {referrals.slice(0, 100).map(r => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td>
                      <strong>{r.referrerName}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{r.referrerEmail}</div>
                    </td>
                    <td>
                      {r.refereeName ? <strong>{r.refereeName}</strong> : <span style={{ color: "var(--text-muted)" }}>(pending)</span>}
                      {r.refereeEmail && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{r.refereeEmail}</div>}
                    </td>
                    <td><code style={{ fontSize: "0.85rem" }}>{r.referralCode}</code></td>
                    <td>
                      <span className={`badge ${r.isRedeemed ? "badge-accepted" : "badge-pending"}`}>
                        {r.isRedeemed ? "Redeemed" : "Pending"}
                      </span>
                    </td>
                    <td align="right" style={{ color: "var(--success)", fontWeight: 600 }}>
                      ₹{r.referrerReward.toFixed(0)}
                    </td>
                    <td>{new Date(r.createdAtUtc).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}