import { useEffect, useState } from "react";
import "./App.css";
import { adminApi, setToken, type AuthResponse, type BookingDto, type ProfessionalDto, type AnalyticsDto, type VerificationStatusDto } from "./lib/api";
import { connectBookingHub, disconnectBookingHub } from "./lib/signalr";
import CouponsTab from "./CouponsTab";
import ReferralsTab from "./ReferralsTab";
import SocialLinks from "./SocialLinks";

type Tab = "analytics" | "bookings" | "professionals" | "coupons" | "referrals" | "verifications";

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [tab, setTab] = useState<Tab>("analytics");
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [pros, setPros] = useState<ProfessionalDto[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState("admin@gharmitra.local");
  const [password, setPassword] = useState("Admin@1234");
  const [refundTarget, setRefundTarget] = useState<BookingDto | null>(null);
  const [showOnlyRefunded, setShowOnlyRefunded] = useState(false);
  const [showTestBookings, setShowTestBookings] = useState(false);
  const [verificationQueue, setVerificationQueue] = useState<VerificationStatusDto[]>([]);
  const [verifBusy, setVerifBusy] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VerificationStatusDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function refreshAll() {
    setBookings(await adminApi.bookings());
    setPros(await adminApi.professionals());
    setAnalytics(await adminApi.analytics());
    try { setVerificationQueue(await adminApi.getVerificationQueue()); } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!session) return;
    connectBookingHub((method: string) => {
      setLive(`${method.replace('Booking', '')} event`);
      refreshAll().catch(console.error);
    });
    return () => disconnectBookingHub();
  }, [session]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      const s = await adminApi.login({ email, password });
      if (s.role !== "Admin") throw new Error("Not an admin account");
      setToken(s.token); setSession(s); await refreshAll();
    } catch (err) { setError((err as Error).message); }
  }

  async function approvePro(proId: string) {
    setVerifBusy(proId);
    setError(null);
    try {
      await adminApi.approveVerification(proId);
      await refreshAll();
    } catch (err) { setError((err as Error).message); }
    finally { setVerifBusy(null); }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setVerifBusy(rejectTarget.professionalId);
    setError(null);
    try {
      await adminApi.rejectVerification(rejectTarget.professionalId, rejectReason || "No reason given");
      setRejectTarget(null);
      setRejectReason("");
      await refreshAll();
    } catch (err) { setError((err as Error).message); }
    finally { setVerifBusy(null); }
  }

  async function assign(bookingId: string, professionalId: string) {
    setError(null);
    try { await adminApi.assign(bookingId, professionalId); await refreshAll(); }
    catch (err) { setError((err as Error).message); }
  }

  async function verify(professionalId: string) {
    setError(null);
    try { await adminApi.verify(professionalId, "Verified via admin panel"); await refreshAll(); }
    catch (err) { setError((err as Error).message); }
  }

  function refund(b: BookingDto) {
    setRefundTarget(b);
  }

  async function confirmRefund(reason: string) {
    if (!refundTarget) return;
    try {
      await adminApi.refundBooking(refundTarget.id, reason);
      await refreshAll();
      setRefundTarget(null);
    } catch (err) {
      setError("Refund failed: " + (err as Error).message);
    }
  }

  function isTestBooking(b: BookingDto): boolean {
    const testPatterns = [
      'e2e', 'test', 'refund', 'diag', 'coupon', 'rate limit',
      'revert', 'restore', 'hotfix', '500', 'no verified', 'no payment',
      'live test', 'full refund flow', 'first only', 'next day',
      'final test', 'eod', 'post-', 'morning rate', 'pay diag',
      'rate test', 'rate limit test', 'payment diag', 'final rate'
    ];
    const address = (b.addressLine || '').toLowerCase();
    return testPatterns.some(p => address.includes(p));
  }
  function logout() {
    disconnectBookingHub(); setToken(null); setSession(null); setBookings([]); setPros([]); setAnalytics(null); setLive(null);
  }

  if (!session) {
    return (
      <div className="app-container">
        <header className="app-header"><div className="header-inner"><a href="#" className="logo">🏠 GharMitra Admin</a></div></header>
        <main>
          <div className="card" style={{ maxWidth: 400, margin: "4rem auto" }}>
            <h1 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Admin Portal</h1>
            <form onSubmit={login} style={{ display: "grid", gap: "1rem" }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
              <button type="submit" className="btn-primary" style={{ padding: "0.8rem" }}>Sign in</button>
            </form>
            {error && <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</p>}
          </div>
        </main>
        <footer className="app-footer"><div className="footer-inner">© 2026 GharMitra Admin</div></footer>
      </div>
    );
  }

  const verifiedPros = pros.filter(p => p.isVerified && p.isAvailable);
  const kpis = analytics?.kpis;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <a href="#" className="logo">🏠 GharMitra Admin</a>
          <button className="mobile-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? "✕" : "☰"}</button>
          <div className="header-nav">
            <button className="btn-outline" onClick={() => refreshAll()} style={{ marginRight: "8px" }}>🔄 Refresh</button>
            <button className="btn-outline" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      <main>
        {live && <div className="live-bar">📡 Live: {live}</div>}
        {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>⚠️ {error}</div>}

        <div className="nav-tabs-desktop" style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <button className={tab === "analytics" ? "btn-primary" : "btn-outline"} onClick={() => setTab("analytics")}>📊 Analytics</button>
          <button className={tab === "bookings" ? "btn-primary" : "btn-outline"} onClick={() => setTab("bookings")}>Bookings ({bookings.length})</button>
          <button className={tab === "professionals" ? "btn-primary" : "btn-outline"} onClick={() => setTab("professionals")}>Professionals ({pros.length})</button>
          <button className={tab === "coupons" ? "btn-primary" : "btn-outline"} onClick={() => setTab("coupons")}>Coupons</button>
          <button className={tab === "referrals" ? "btn-primary" : "btn-outline"} onClick={() => setTab("referrals")}>Referrals</button>
          <button className={tab === "verifications" ? "btn-primary" : "btn-outline"} onClick={() => setTab("verifications")}>🛡️ Verifications ({verificationQueue.length})</button>
        </div>

        {mobileOpen && (
          <div className="nav-tabs-mobile">
            <button className={tab === "analytics" ? "btn-primary" : "btn-outline"} onClick={() => { setTab("analytics"); setMobileOpen(false); }}>📊 Analytics</button>
            <button className={tab === "bookings" ? "btn-primary" : "btn-outline"} onClick={() => { setTab("bookings"); setMobileOpen(false); }}>Bookings ({bookings.length})</button>
            <button className={tab === "professionals" ? "btn-primary" : "btn-outline"} onClick={() => { setTab("professionals"); setMobileOpen(false); }}>Professionals ({pros.length})</button>
            <button className={tab === "coupons" ? "btn-primary" : "btn-outline"} onClick={() => { setTab("coupons"); setMobileOpen(false); }}>Coupons</button>
            <button className={tab === "referrals" ? "btn-primary" : "btn-outline"} onClick={() => { setTab("referrals"); setMobileOpen(false); }}>Referrals</button>
          </div>
        )}

        {tab === "coupons" && <CouponsTab />}
        
        {tab === "referrals" && <ReferralsTab />}

        {tab === "verifications" && (
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ marginBottom: "1rem" }}>🛡️ Verification Queue</h2>
            {verificationQueue.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No professionals awaiting verification.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Professional ID</th><th>ID Type</th><th>Submitted</th><th>Documents</th><th>Action</th></tr></thead>
                  <tbody>
                    {verificationQueue.map(v => (
                      <tr key={v.professionalId}>
                        <td><code style={{ fontSize: "0.75rem" }}>{v.professionalId.slice(0, 8)}...</code></td>
                        <td>{v.idProofType || "—"}</td>
                        <td>{v.submittedAtUtc ? new Date(v.submittedAtUtc).toLocaleDateString() : "—"}</td>
                        <td>
                          {v.idProofUrl && <a href={v.idProofUrl} target="_blank" rel="noopener noreferrer" style={{ marginRight: "0.5rem" }}>📄 ID</a>}
                          {v.selfieUrl && <a href={v.selfieUrl} target="_blank" rel="noopener noreferrer">🤳 Selfie</a>}
                        </td>
                        <td>
                          <button onClick={() => approvePro(v.professionalId)} disabled={verifBusy === v.professionalId} className="btn-primary btn-sm" style={{ marginRight: "0.5rem" }}>
                            {verifBusy === v.professionalId ? "..." : "✅ Approve"}
                          </button>
                          <button onClick={() => { setRejectTarget(v); setRejectReason(""); }} disabled={verifBusy === v.professionalId} className="btn-danger btn-sm">
                            ❌ Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {rejectTarget && (
          <div className="modal-backdrop" onClick={() => setRejectTarget(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "480px" }}>
              <h2 style={{ marginBottom: "0.5rem" }}>Reject Verification</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                Professional: {rejectTarget.professionalId.slice(0, 8)}...
              </p>
              <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.35rem" }}>
                Rejection reason (sent to professional)
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g., ID photo is blurry, please re-upload"
                style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit", fontSize: "0.9rem" }}
              />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button onClick={() => setRejectTarget(null)} className="btn-outline" disabled={!!verifBusy} style={{ flex: 1, padding: "0.75rem" }}>Cancel</button>
                <button onClick={confirmReject} disabled={!!verifBusy} className="btn-danger" style={{ flex: 1, padding: "0.75rem", background: "#DC2626", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                  {verifBusy ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "analytics" && analytics && kpis && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>Total Revenue</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--success)" }}>₹{kpis.totalRevenue.toLocaleString()}</div>
              </div>
              <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>Total Bookings</div>
                <div style={{ fontSize: "2rem", fontWeight: 700 }}>{kpis.totalBookings}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>{kpis.paidBookings} paid</div>
              </div>
              <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>Customers</div>
                <div style={{ fontSize: "2rem", fontWeight: 700 }}>{kpis.totalCustomers}</div>
              </div>
              <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>Professionals</div>
                <div style={{ fontSize: "2rem", fontWeight: 700 }}>{kpis.totalProfessionals}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--success)", marginTop: "4px" }}>{kpis.activeProfessionals} active</div>
              </div>
              <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>Cancellation Rate</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: kpis.cancellationRate > 20 ? "var(--danger)" : "var(--text-main)" }}>{kpis.cancellationRate}%</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
              <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
                <div style={{ color: "var(--warning)", fontWeight: 700, fontSize: "1.5rem" }}>{kpis.pendingBookings}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Pending</div>
              </div>
              <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
                <div style={{ color: "#3B82F6", fontWeight: 700, fontSize: "1.5rem" }}>{kpis.assignedBookings}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Assigned</div>
              </div>
              <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
                <div style={{ color: "var(--success)", fontWeight: 700, fontSize: "1.5rem" }}>{kpis.acceptedBookings}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Accepted</div>
              </div>
              <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
                <div style={{ color: "var(--danger)", fontWeight: 700, fontSize: "1.5rem" }}>{kpis.cancelledBookings}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Cancelled</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem" }}>Last 7 Days Revenue</h3>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "150px", gap: "8px" }}>
                {analytics.last7DaysRevenue.map((day) => {
                  const maxRevenue = Math.max(...analytics.last7DaysRevenue.map(d => d.revenue), 1);
                  const height = (day.revenue / maxRevenue) * 100;
                  return (
                    <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>₹{day.revenue}</div>
                      <div style={{
                        width: "100%",
                        height: `${Math.max(height, 3)}%`,
                        background: day.revenue > 0 ? "var(--primary)" : "var(--border)",
                        borderRadius: "4px 4px 0 0",
                        transition: "height 0.3s ease"
                      }} />
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        {new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem" }}>🏆 Top Professionals</h3>
              {analytics.topProfessionals.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No professional data yet.</p>
              ) : (
                <table width="100%" cellPadding={6} style={{ borderCollapse: "collapse" }}>
                  <thead style={{ background: "var(--bg)" }}>
                    <tr>
                      <th align="left">#</th>
                      <th align="left">Name</th>
                      <th align="left">City</th>
                      <th align="right">Jobs</th>
                      <th align="right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topProfessionals.map((p, i) => (
                      <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td>{i + 1}</td>
                        <td><strong>{p.fullName}</strong> {p.isVerified && "✅"}</td>
                        <td>{p.city}</td>
                        <td align="right">{p.totalJobs}</td>
                        <td align="right" style={{ color: "var(--success)", fontWeight: 600 }}>₹{p.totalRevenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem" }}>📈 Top Services</h3>
              {analytics.topServices.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No service data yet.</p>
              ) : (
                <table width="100%" cellPadding={6} style={{ borderCollapse: "collapse" }}>
                  <thead style={{ background: "var(--bg)" }}>
                    <tr>
                      <th align="left">Service</th>
                      <th align="right">Bookings</th>
                      <th align="right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topServices.map((s, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                        <td><strong>{s.serviceName}</strong></td>
                        <td align="right">{s.bookingCount}</td>
                        <td align="right" style={{ color: "var(--success)", fontWeight: 600 }}>₹{s.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem" }}>🕒 Recent Bookings</h3>
              {analytics.recentBookings.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No bookings yet.</p>
              ) : (
                <table width="100%" cellPadding={6} style={{ borderCollapse: "collapse" }}>
                  <thead style={{ background: "var(--bg)" }}>
                    <tr>
                      <th align="left">#</th>
                      <th align="left">Service</th>
                      <th align="left">Customer</th>
                      <th align="left">Professional</th>
                      <th align="right">Amount</th>
                      <th align="left">Status</th>
                      <th align="left">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentBookings.map((b, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                        <td>{b.bookingNumber}</td>
                        <td>{b.serviceName}</td>
                        <td>{b.customerName}</td>
                        <td>{b.professionalName ?? "—"}</td>
                        <td align="right">₹{b.amount}</td>
                        <td><span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span></td>
                        <td><span className={`badge ${b.paymentStatus === 'Paid' ? 'badge-accepted' : 'badge-pending'}`}>{b.paymentStatus}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === "analytics" && !analytics && (
          <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)" }}>Loading analytics...</p>
          </div>
        )}

        {tab === "bookings" && (
          <>
          {/* Admin filter: refunded only */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={showOnlyRefunded}
              onChange={e => setShowOnlyRefunded(e.target.checked)}
            />
            Show only refunded bookings
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={showTestBookings}
              onChange={e => setShowTestBookings(e.target.checked)}
            />
            Show test bookings (dev)
          </label>
          <div className="table-container">
            <table>
              <thead><tr><th>Booking</th><th>Service</th><th>Amount</th><th>Status</th><th>Professional</th><th>Action</th></tr></thead>
              <tbody>
                {bookings.filter(b => !showOnlyRefunded || !!b.refundedAtUtc).filter(b => showTestBookings || !isTestBooking(b)).map(b => (
                  <tr key={b.id}>
                    <td><strong>{b.bookingNumber}</strong><br/><span style={{fontSize:"0.8rem", color:"var(--text-muted)"}}>{b.city}</span></td>
                    <td>{b.serviceName}</td>
                    <td>₹{b.totalAmount}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                        <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                        <span className={`badge ${b.paymentStatus === 'Paid' ? 'badge-accepted' : 'badge-pending'}`}>{b.paymentStatus}</span>
                        {/* Admin refund UI: badge */}
                        {b.refundedAtUtc && (
                          <span style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 600 }}>
                            {"\u21A9"} {"\u20b9"}{b.refundAmount?.toFixed(2)} refunded
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{b.professionalName ?? "—"}</td>
                    <td>
                      {/* Admin refund UI: button */}
                      {b.status === "Cancelled" && b.paymentStatus === "Paid" && !b.refundedAtUtc && (
                        <button
                          onClick={() => refund(b)}
                          style={{
                            marginBottom: "0.4rem",
                            padding: "0.35rem 0.7rem",
                            fontSize: "0.75rem",
                            background: "#DC2626",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Refund {"\u20b9"}{b.totalAmount.toFixed(2)}
                        </button>
                      )}
                      {b.status === "Pending" && (
                        b.paymentStatus !== 'Paid'
                          ? <span style={{ color: "var(--warning)", fontSize: "0.85rem", fontWeight: "bold" }}>Awaiting Payment</span>
                          : verifiedPros.length === 0
                            ? <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No verified pros</span>
                            : <select defaultValue="" onChange={e => { if (e.target.value) assign(b.id, e.target.value); }} style={{ minWidth: "180px", padding: "0.4rem" }}>
                                <option value="">Select a pro…</option>
                                {verifiedPros.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                              </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {tab === "professionals" && (
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>City</th><th>Rating</th><th>Available</th><th>Verified</th><th>Action</th></tr></thead>
              <tbody>
                {pros.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.fullName}</strong></td>
                    <td>{p.city}</td>
                    <td>⭐ {p.rating.toFixed(1)}</td>
                    <td>{p.isAvailable ? "Yes" : "No"}</td>
                    <td>{p.isVerified ? <span style={{color:"var(--success)"}}>✅ Yes</span> : <span style={{color:"var(--warning)"}}>⏳ No</span>}</td>
                    <td>{!p.isVerified && <button onClick={() => verify(p.id)} className="btn-primary btn-sm">Verify</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {refundTarget && (
        <RefundConfirmModal
          booking={refundTarget}
          onConfirm={confirmRefund}
          onClose={() => setRefundTarget(null)}
        />
      )}
      <footer className="app-footer">
        <div className="footer-inner">
          <h3>GharMitra Admin</h3>
          <SocialLinks />
          <div className="footer-bottom">{"\u00a9"} 2026 GharMitra. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

// ───── Admin Refund Confirm Modal ─────
function RefundConfirmModal({
  booking,
  onConfirm,
  onClose,
}: {
  booking: BookingDto;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("Admin refund");
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm(reason);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "480px" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Refund Booking?</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {booking.bookingNumber} {"\u00b7"} {booking.serviceName}
        </p>

        <div style={{
          padding: "1rem",
          borderRadius: "8px",
          background: "#FEF2F2",
          border: "1px solid #DC2626",
          marginBottom: "1rem",
        }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "4px" }}>
            Full refund amount
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#DC2626" }}>
            {"\u20b9"}{booking.totalAmount.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            This action calls Razorpay and returns money to the customer. It cannot be undone.
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.35rem" }}>
            Reason
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            style={{
              width: "100%",
              padding: "0.6rem",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontFamily: "inherit",
              fontSize: "0.9rem",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={onClose}
            className="btn-outline"
            disabled={busy}
            style={{ flex: 1, padding: "0.75rem" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="btn-danger"
            style={{ flex: 1, padding: "0.75rem", background: "#DC2626", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
          >
            {busy ? "Refunding..." : `Refund \u20b9${booking.totalAmount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
