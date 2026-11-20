import { useState, useEffect } from "react";
import { api } from "./lib/api";

export default function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if the URL has a token (meaning the user clicked the email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setToken(urlToken);
    }
  }, []);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (!token) throw new Error("No token found in URL.");
      const res = await api.resetPassword(token, newPassword);
      setMessage(res.message);
      // Clear URL token so they don't accidentally re-use it
      window.history.replaceState({}, document.title, window.location.pathname);
      setToken(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
        {token ? "Set New Password" : "Forgot Password?"}
      </h2>

      {message && <p style={{ color: "var(--success)", textAlign: "center", marginBottom: "1rem" }}>{message}</p>}
      {error && <p style={{ color: "var(--danger)", textAlign: "center", marginBottom: "1rem" }}>{error}</p>}

      {!token && !message && (
        <form onSubmit={handleSendLink} style={{ display: "grid", gap: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center" }}>
            Enter your email and we'll send you a link to reset your password.
          </p>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="Email address" 
            required 
          />
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: "0.8rem" }}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}

      {token && (
        <form onSubmit={handleResetPassword} style={{ display: "grid", gap: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center" }}>
            Enter a new password for your account.
          </p>
          <input 
            type="password" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)} 
            placeholder="New password" 
            required 
            minLength={6}
          />
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: "0.8rem" }}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}

      <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem" }}>
        <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }} onClick={onBack}>
          Back to Sign In
        </span>
      </p>
    </div>
  );
}