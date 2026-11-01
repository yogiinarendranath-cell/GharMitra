import { useState } from "react";
import {
  adminApi, setToken,
  type AuthResponse, type BookingDto, type ProfessionalDto,
} from "./lib/api";

type Tab = "bookings" | "professionals";

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [tab, setTab] = useState<Tab>("bookings");
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [pros, setPros] = useState<ProfessionalDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("admin@gharmitra.local");
  const [password, setPassword] = useState("Admin@1234");

  async function refreshAll() {
    setBookings(await adminApi.bookings());
    setPros(await adminApi.professionals());
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const s = await adminApi.login({ email, password });
      if (s.role !== "Admin") throw new Error("Not an admin account");
      setToken(s.token);
      setSession(s);
      await refreshAll();
    } catch (err) { setError((err as Error).message); }
  }

  async function assign(bookingId: string, professionalId: string) {
    setError(null);
    try {
      await adminApi.assign(bookingId, professionalId);
      await refreshAll();
    } catch (err) { setError((err as Error).message); }
  }

  async function verify(professionalId: string) {
    setError(null);
    try {
      await adminApi.verify(professionalId, "Verified via admin panel");
      await refreshAll();
    } catch (err) { setError((err as Error).message); }
  }

  if (!session) {
    return (
      <form onSubmit={login} style={{ maxWidth: 320, margin: "60px auto", display: "grid", gap: 8, fontFamily: "sans-serif" }}>
        <h1>GharMitra Admin</h1>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit">Sign in</button>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </form>
    );
  }

  const verifiedPros = pros.filter(p => p.isVerified && p.isAvailable);

  return (
    <div style={{ maxWidth: 1050, margin: "30px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>GharMitra Admin</h1>
        <div>
          <button onClick={() => setTab("bookings")} disabled={tab === "bookings"}>Bookings ({bookings.length})</button>
          <button onClick={() => setTab("professionals")} disabled={tab === "professionals"} style={{ marginLeft: 8 }}>
            Professionals ({pros.length})
          </button>
        </div>
      </div>

      {tab === "bookings" && (
        <>
          <h2>All bookings</h2>
          <table width="100%" cellPadding={6} border={1} style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
                <th align="left">No</th><th align="left">Service</th><th align="left">City</th>
                <th align="left">Amount</th><th align="left">Status</th><th align="left">Professional</th>
                <th align="left">Assign to</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td>{b.bookingNumber}</td>
                  <td>{b.serviceName}</td>
                  <td>{b.city}</td>
                  <td>₹{b.totalAmount}</td>
                  <td>{b.status}</td>
                  <td>{b.professionalName ?? "—"}</td>
                  <td>
                    {b.status === "Pending" && (
                      verifiedPros.length === 0
                        ? <small style={{ color: "#999" }}>No verified pros</small>
                        : <select
                            defaultValue=""
                            onChange={e => {
                              if (e.target.value) assign(b.id, e.target.value);
                            }}
                          >
                            <option value="">Select a verified pro…</option>
                            {verifiedPros.map(p => (
                              <option key={p.id} value={p.id}>{p.fullName} — {p.city}</option>
                            ))}
                          </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === "professionals" && (
        <>
          <h2>Professionals</h2>
          <table width="100%" cellPadding={6} border={1} style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
                <th align="left">Name</th><th align="left">City</th>
                <th align="left">Rating</th><th align="left">Available</th>
                <th align="left">Verified</th><th />
              </tr>
            </thead>
            <tbody>
              {pros.map(p => (
                <tr key={p.id}>
                  <td>{p.fullName}</td>
                  <td>{p.city}</td>
                  <td>{p.rating.toFixed(2)}</td>
                  <td>{p.isAvailable ? "Yes" : "No"}</td>
                  <td>{p.isVerified ? "✅ Yes" : "⏳ No"}</td>
                  <td>
                    {!p.isVerified && (
                      <button onClick={() => verify(p.id)}>Verify</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}