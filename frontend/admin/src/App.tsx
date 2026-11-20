import { useEffect, useState } from "react";
import "./App.css";
import { adminApi, setToken, type AuthResponse } from "./lib/api";
import { connectBookingHub, disconnectBookingHub } from "./lib/signalr";
import CouponsTab from "./CouponsTab";
import ReferralsTab from "./ReferralsTab";
import SocialLinks from "./SocialLinks";
import ForgotPassword from "./ForgotPassword";

type Tab = "analytics" | "bookings" | "professionals" | "coupons" | "referrals" | "verifications";

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      const s = await adminApi.login({ email, password });
      if (s.role !== "Admin") throw new Error("Not an admin account");
      setToken(s.token); setSession(s);
    } catch (err) { setError((err as Error).message); }
  }

  function logout() { setToken(null); setSession(null); }

  if (!session) {
    const hasToken = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("token");
    return (
      <div className="app-container">
        <header className="app-header"><div className="header-inner"><a href="#" className="logo">GharMitra Admin</a></div></header>
        <main>
          {showForgot || hasToken ? (
            <ForgotPassword onBack={() => { setShowForgot(false); window.history.replaceState({}, document.title, window.location.pathname); }} />
          ) : (
            <div className="card" style={{ maxWidth: 400, margin: "4rem auto" }}>
              <h1 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Admin Portal</h1>
              <form onSubmit={login} style={{ display: "grid", gap: "1rem" }}>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
                <p style={{ textAlign: "right", margin: 0, fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }} onClick={() => setShowForgot(true)}>Forgot Password?</span>
                </p>
                <button type="submit" className="btn-primary" style={{ padding: "0.8rem" }}>Sign in</button>
              </form>
              {error && <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</p>}
            </div>
          )}
        </main>
        <footer className="app-footer"><div className="footer-inner">2026 GharMitra Admin</div></footer>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <a href="#" className="logo">GharMitra Admin</a>
          <div className="header-nav"><button className="btn-outline" onClick={logout}>Sign out</button></div>
        </div>
      </header>
      <main><div className="card" style={{ padding: "2rem" }}><h2>Welcome, {session.fullName}</h2><p>Dashboard loaded.</p></div></main>
      <footer className="app-footer"><div className="footer-inner">2026 GharMitra Admin</div></footer>
    </div>
  );
}
