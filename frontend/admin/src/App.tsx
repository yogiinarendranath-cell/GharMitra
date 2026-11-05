import { useEffect, useState } from "react";
import "./App.css";
import { adminApi, setToken, type AuthResponse, type BookingDto, type ProfessionalDto, type AnalyticsDto } from "./lib/api";
import { connectBookingHub, disconnectBookingHub } from "./lib/signalr";

type Tab = "analytics" | "bookings" | "professionals";

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [tab, setTab] = useState<Tab>("analytics");
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [pros, setPros] = useState<ProfessionalDto[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<string | null>(null);
  const [email, setEmail] = useState("admin@gharmitra.local");
  const [password, setPassword] = useState("Admin@1234");

  async function refreshAll() {
    setBookings(await adminApi.bookings());
    setPros(await adminApi.professionals());
    setAnalytics(await adminApi.analytics());
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
          <div className="header-nav">
            <button className="btn-outline" onClick={() => refreshAll()} style={{ marginRight: "8px" }}>?? Refresh</button><button className="btn-outline" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      <main>
        {live && <div className="live-bar">📡 Live: {live}</div>}
        {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>⚠️ {error}</div>}

        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <button className={tab === "analytics" ? "btn-primary" : "btn-outline"} onClick={() => setTab("analytics")}>📊 Analytics</button>
          <button className={tab === "bookings" ? "btn-primary" : "btn-outline"} onClick={() => setTab("bookings")}>Bookings ({bookings.length})</button>
          <button className={tab === "professionals" ? "btn-primary" : "btn-outline"} onClick={() => setTab("professionals")}>Professionals ({pros.length})</button>
        </div>

        {tab === "analytics" && analytics && kpis && (
          <>
            {/* KPI Cards */}
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

            {/* Booking Status Breakdown */}
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

            {/* Last 7 Days Revenue Chart (Simple Bar Chart) */}
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

            {/* Top Professionals */}
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

            {/* Top Services */}
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

            {/* Recent Bookings */}
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
          <div className="table-container">
            <table>
              <thead><tr><th>Booking</th><th>Service</th><th>Amount</th><th>Status</th><th>Professional</th><th>Action</th></tr></thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td><strong>{b.bookingNumber}</strong><br/><span style={{fontSize:"0.8rem", color:"var(--text-muted)"}}>{b.city}</span></td>
                    <td>{b.serviceName}</td>
                    <td>₹{b.totalAmount}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                        <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                        <span className={`badge ${b.paymentStatus === 'Paid' ? 'badge-accepted' : 'badge-pending'}`}>{b.paymentStatus}</span>
                      </div>
                    </td>
                    <td>{b.professionalName ?? "—"}</td>
                    <td>
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

      <footer className="app-footer">
        <div className="footer-inner">
          <h3>GharMitra Admin</h3>
          <div className="footer-bottom">© 2026 GharMitra. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}