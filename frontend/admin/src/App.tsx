import { useState } from "react";
import { adminApi, setToken, type AuthResponse, type BookingDto, type ProfessionalDto } from "./lib/api";

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [pros, setPros] = useState<ProfessionalDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("admin@gharmitra.local");
  const [password, setPassword] = useState("Admin@1234");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const s = await adminApi.login({ email, password });
      if (s.role !== "Admin") throw new Error("Not an admin account");
      setToken(s.token);
      setSession(s);
      setBookings(await adminApi.bookings());
      setPros(await adminApi.professionals());
    } catch (err) { setError((err as Error).message); }
  }

  async function assign(bookingId: string) {
    const pro = pros.find(p => p.isAvailable && p.isVerified) ?? pros[0];
    if (!pro) { setError("No professionals available"); return; }
    try {
      await adminApi.assign(bookingId, pro.id);
      setBookings(await adminApi.bookings());
    } catch (err) { setError((err as Error).message); }
  }

  if (!session) {
    return (
      <form onSubmit={login} style={{ maxWidth: 320, margin: "60px auto", display: "grid", gap: 8, fontFamily: "sans-serif" }}>
        <h1>GharMitra Admin</h1>
        <input value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Login</button>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </form>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Admin — Bookings</h1>
      <table width="100%" cellPadding={6} border={1} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr><th>No</th><th>Service</th><th>City</th><th>Rs</th><th>Status</th><th>Professional</th><th /></tr>
        </thead>
        <tbody>
          {bookings.map(b => (
            <tr key={b.id}>
              <td>{b.bookingNumber}</td>
              <td>{b.serviceName}</td>
              <td>{b.city}</td>
              <td>{b.totalAmount}</td>
              <td>{b.status}</td>
              <td>{b.professionalName ?? "—"}</td>
              <td>{b.status === "Pending" && <button onClick={() => assign(b.id)}>Assign</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}