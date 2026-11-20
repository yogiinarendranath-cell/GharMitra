import { useState, useEffect } from "react";
import { adminApi } from "./lib/api";

export default function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) setToken(urlToken);
  }, []);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null); setLoading(true);
    try {
      const res = await adminApi.forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null); setLoading(true);
    try {
      if (!token) throw new Error("No token found in URL.");
      const res = await adminApi.resetPassword(token, newPassword);
      setMessage(res.message);
      window.history.replaceState({}, document.title, window.location.pathname);
      setToken(null);
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: "4rem auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
        {token ? "Set New Password" : "Forgot Password?"}
      </h2>
      {message && <p style={{ color: "green", textAlign: "center", marginBottom: "1rem" }}>{message}</p>}
      {error && <p style={{ color: "red", textAlign: "center", marginBottom: "1rem" }}>{error}</p>}

      {!token && !message && (
        <form onSubmit={handleSendLink} style={{ display: "grid", gap: "1rem" }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required />
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: "0.8rem" }}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}

      {token && (
        <form onSubmit={handleResetPassword} style={{ display: "grid", gap: "1rem" }}>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" required minLength={6} />
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: "0.8rem" }}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}

      <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }} onClick={onBack}>
          Back to Sign In
        </span>
      </p>
    </div>
  );
}