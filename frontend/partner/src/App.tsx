import { useState } from "react";
import {
  partnerApi, setToken,
  type AuthResponse, type Profile, type Assignment,
} from "./lib/api";

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("pro@gharmitra.local");
  const [password, setPassword] = useState("Pro@1234");
  const [busy, setBusy] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const s = await partnerApi.login({ email, password });
      if (s.role !== "Professional") throw new Error("Not a professional account");
      setToken(s.token);
      setSession(s);
      setProfile(await partnerApi.me());
      setAssignments(await partnerApi.assignments());
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function accept(a: Assignment) {
    setError(null);
    try {
      await partnerApi.accept(a.id);
      setAssignments(await partnerApi.assignments());
    } catch (err) { setError((err as Error).message); }
  }

  function logout() {
    setToken(null);
    setSession(null);
    setProfile(null);
    setAssignments([]);
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 360, margin: "60px auto", fontFamily: "sans-serif" }}>
        <h1>GharMitra Partner</h1>
        <p style={{ color: "#666" }}>Sign in with your professional account</p>
        <form onSubmit={login} style={{ display: "grid", gap: 8 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
        </form>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </div>
    );
  }

  const verified = profile?.isVerified ?? false;

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>GharMitra Partner</h1>
          <p style={{ margin: "4px 0", color: "#666" }}>
            {profile?.fullName} · {profile?.city}
          </p>
        </div>
        <button onClick={logout}>Sign out</button>
      </div>

      {!verified && (
        <div style={{
          background: "#fef3c7", border: "1px solid #f59e0b", padding: 12,
          borderRadius: 6, margin: "16px 0",
        }}>
          <strong>⏳ Verification pending</strong>
          <p style={{ margin: "4px 0" }}>
            Your profile is not yet verified. You cannot accept assignments until an admin verifies you.
          </p>
        </div>
      )}

      {verified && (
        <div style={{
          background: "#ecfdf5", border: "1px solid #10b981", padding: 12,
          borderRadius: 6, margin: "16px 0",
        }}>
          <strong>✅ Verified professional</strong>
          {profile?.verifiedAtUtc && (
            <p style={{ margin: "4px 0", fontSize: 13, color: "#065f46" }}>
              Verified at {new Date(profile.verifiedAtUtc).toLocaleString()}
            </p>
          )}
        </div>
      )}

      <h2>My assignments</h2>
      {assignments.length === 0 ? (
        <p style={{ color: "#666" }}>No assignments yet. Waiting for admin allocation.</p>
      ) : (
        <table width="100%" cellPadding={8} border={1} style={{ borderCollapse: "collapse" }}>
          <thead style={{ background: "#f3f4f6" }}>
            <tr>
              <th align="left">Booking</th>
              <th align="left">Service</th>
              <th align="left">Customer</th>
              <th align="left">When</th>
              <th align="left">Address</th>
              <th align="left">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => (
              <tr key={a.id}>
                <td>{a.bookingNumber}</td>
                <td>{a.serviceName}</td>
                <td>
                  {a.customerName}<br />
                  <small style={{ color: "#666" }}>{a.customerPhone}</small>
                </td>
                <td>{new Date(a.scheduledStartUtc).toLocaleString()}<br />
                  <small style={{ color: "#666" }}>{a.durationMinutes} min</small>
                </td>
                <td>
                  {a.addressLine}, {a.city} {a.pincode}
                  {a.notes && <><br /><small style={{ color: "#666" }}>Note: {a.notes}</small></>}
                </td>
                <td>{a.bookingStatus}{a.acceptedAtUtc && " ✓"}</td>
                <td>
                  {a.bookingStatus === "Assigned" && verified && (
                    <button onClick={() => accept(a)}>Accept</button>
                  )}
                  {a.bookingStatus === "Assigned" && !verified && (
                    <small style={{ color: "#999" }}>Verify first</small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}