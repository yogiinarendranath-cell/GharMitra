import { useEffect, useState } from "react";
import "./App.css";
import { partnerApi, setToken, type AuthResponse, type Profile, type Assignment } from "./lib/api";
import { connectBookingHub, disconnectBookingHub } from "./lib/signalr";

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<string | null>(null);
  const [email, setEmail] = useState("sweta@gharmitra.local");
  const [password, setPassword] = useState("Test@1234");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    connectBookingHub((method) => {
      setLive(`${method.replace('Booking', '')} event`);
      partnerApi.assignments().then(setAssignments).catch(console.error);
    });
    return () => disconnectBookingHub();
  }, [session]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const s = await partnerApi.login({ email, password });
      if (s.role !== "Professional") throw new Error("Not a professional account");
      setToken(s.token); setSession(s);
      setProfile(await partnerApi.me());
      setAssignments(await partnerApi.assignments());
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function accept(a: Assignment) {
    setError(null);
    try { await partnerApi.accept(a.id); setAssignments(await partnerApi.assignments()); }
    catch (err) { setError((err as Error).message); }
  }

  function logout() {
    disconnectBookingHub(); setToken(null); setSession(null); setProfile(null); setAssignments([]); setLive(null);
  }

  if (!session) {
    return (
      <div className="app-container">
        <header className="app-header"><div className="header-inner"><a href="#" className="logo">🏠 GharMitra Partner</a></div></header>
        <main>
          <div className="card" style={{ maxWidth: 400, margin: "4rem auto" }}>
            <h1 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Partner Portal</h1>
            <form onSubmit={login} style={{ display: "grid", gap: "1rem" }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
              <button type="submit" className="btn-primary" disabled={busy} style={{ padding: "0.8rem" }}>{busy ? "Signing in..." : "Sign in"}</button>
            </form>
            {error && <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</p>}
          </div>
        </main>
        <footer className="app-footer"><div className="footer-inner">© 2026 GharMitra Partner</div></footer>
      </div>
    );
  }

  const verified = profile?.isVerified ?? false;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <a href="#" className="logo">🏠 GharMitra Partner</a>
          <div className="header-nav">
            <span className="user-greeting">{profile?.fullName}</span>
            <button className="btn-outline" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      <main>
        {live && <div className="live-bar">📡 Live: {live}</div>}

        {!verified ? (
          <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem" }}>
            <h3 style={{ color: "#92400E", marginBottom: "0.5rem" }}>⏳ Verification Pending</h3>
            <p style={{ color: "#92400E" }}>Your profile is not yet verified. You cannot accept assignments until an admin verifies you.</p>
          </div>
        ) : (
          <div style={{ background: "#D1FAE5", border: "1px solid #10B981", padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem" }}>
            <h3 style={{ color: "#065F46", marginBottom: "0.5rem" }}>✅ Verified Professional</h3>
            <p style={{ color: "#065F46" }}>You are ready to accept assignments. Verified at {new Date(profile!.verifiedAtUtc!).toLocaleString()}</p>
          </div>
        )}

        <h2 style={{ marginBottom: "1.5rem" }}>My Assignments</h2>
        {assignments.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>No assignments yet. Waiting for admin allocation.</div>
        ) : (
          <div className="grid-cards">
            {assignments.map(a => (
              <div key={a.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "1.1rem" }}>{a.serviceName}</strong>
                  <span className={`badge badge-${a.bookingStatus.toLowerCase()}`}>{a.bookingStatus}</span>
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                  <div>📅 {new Date(a.scheduledStartUtc).toLocaleString()} ({a.durationMinutes} min)</div>
                  <div>📍 {a.addressLine}, {a.city}</div>
                  <div>👤 {a.customerName} • {a.customerPhone}</div>
                </div>
                {a.notes && <div style={{ background: "#F9FAFB", padding: "0.5rem", borderRadius: "4px", fontSize: "0.85rem", fontStyle: "italic" }}>"{a.notes}"</div>}
                <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
                  {a.bookingStatus === "Assigned" && verified && (
                    <button onClick={() => accept(a)} className="btn-primary" style={{ width: "100%" }}>Accept Assignment</button>
                  )}
                  {a.bookingStatus === "Assigned" && !verified && (
                    <button disabled className="btn-outline" style={{ width: "100%" }}>Verify profile to accept</button>
                  )}
                  {a.bookingStatus === "Cancelled" && (
                    <p style={{ textAlign: "center", color: "var(--danger)", fontSize: "0.85rem", fontWeight: 500 }}>Assignment Cancelled</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <h3>GharMitra Partner</h3>
          <div className="footer-bottom">© 2026 GharMitra. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}