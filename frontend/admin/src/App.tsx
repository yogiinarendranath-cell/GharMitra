import { useEffect, useState } from "react";
import "./App.css";
import { adminApi, setToken, type AuthResponse, type BookingDto, type ProfessionalDto } from "./lib/api";
import { connectBookingHub, disconnectBookingHub } from "./lib/signalr";

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [tab, setTab] = useState<"bookings" | "professionals">("bookings");
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [pros, setPros] = useState<ProfessionalDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<string | null>(null);
  const [email, setEmail] = useState("admin@gharmitra.local");
  const [password, setPassword] = useState("Admin@1234");

  async function refreshAll() {
    setBookings(await adminApi.bookings());
    setPros(await adminApi.professionals());
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
    disconnectBookingHub(); setToken(null); setSession(null); setBookings([]); setPros([]); setLive(null);
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

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <a href="#" className="logo">🏠 GharMitra Admin</a>
          <div className="header-nav">
            <button className="btn-outline" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      <main>
        {live && <div className="live-bar">📡 Live: {live}</div>}

        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <button className={tab === "bookings" ? "btn-primary" : "btn-outline"} onClick={() => setTab("bookings")}>Bookings ({bookings.length})</button>
          <button className={tab === "professionals" ? "btn-primary" : "btn-outline"} onClick={() => setTab("professionals")}>Professionals ({pros.length})</button>
        </div>

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
                    <td><span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span></td>
                    <td>{b.professionalName ?? "—"}</td>
                    <td>
                      {b.status === "Pending" && (
                        verifiedPros.length === 0
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
