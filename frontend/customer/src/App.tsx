import { useEffect, useState } from "react";
import { api, setToken, type AuthResponse, type BookingDto, type ServiceCategoryDto } from "./lib/api";

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("narendra@example.com");
  const [password, setPassword] = useState("Test@1234");
  const [fullName, setFullName] = useState("Narendra Test");
  const [city, setCity] = useState("Pune");
  const [error, setError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<ServiceCategoryDto[]>([]);
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [address, setAddress] = useState("Flat 101, Baner");
  const [scheduledAt, setScheduledAt] = useState(
    () => new Date(Date.now() + 3600_000).toISOString().slice(0, 16)
  );

  useEffect(() => {
    api.services().then(setCatalog).catch(e => setError(e.message));
  }, []);

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = mode === "login"
        ? await api.login({ email, password })
        : await api.register({ fullName, email, phoneNumber: "9876543210", password, role: 1, city });
      setToken(res.token);
      setSession(res);
      setBookings(await api.myBookings());
    } catch (err) { setError((err as Error).message); }
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createBooking({
        serviceId,
        scheduledStartUtc: new Date(scheduledAt).toISOString(),
        durationMinutes: 60,
        addressLine: address,
        city,
        pincode: "411045",
        notes: "Please ring the bell.",
      });
      setBookings(await api.myBookings());
    } catch (err) { setError((err as Error).message); }
  }

  async function cancel(b: BookingDto) {
    if (!confirm(`Cancel booking ${b.bookingNumber}?`)) return;
    setError(null);
    try {
      await api.cancelBooking(b.id, "Customer requested cancellation");
      setBookings(await api.myBookings());
    } catch (err) { setError((err as Error).message); }
  }

  function logout() {
    setToken(null);
    setSession(null);
    setBookings([]);
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", fontFamily: "sans-serif" }}>
        <h1>GharMitra</h1>
        <p><i>Your Home. Our Care.</i></p>
        <div>
          <button onClick={() => setMode("login")} disabled={mode === "login"}>Login</button>
          <button onClick={() => setMode("register")} disabled={mode === "register"} style={{ marginLeft: 8 }}>Register</button>
        </div>
        <form onSubmit={submitAuth} style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {mode === "register" && (
            <>
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" />
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
            </>
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          <button type="submit">{mode === "login" ? "Login" : "Create account"}</button>
        </form>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Welcome, {session.fullName}</h1>
        <button onClick={logout}>Sign out</button>
      </div>

      <h2>Book a service</h2>
      <form onSubmit={submitBooking} style={{ display: "grid", gap: 8 }}>
        <select value={serviceId} onChange={e => setServiceId(e.target.value)} required>
          <option value="">Select a service</option>
          {catalog.flatMap(c =>
            c.services.map(s => (
              <option key={s.id} value={s.id}>{c.name} — {s.name} (₹{s.basePrice})</option>
            ))
          )}
        </select>
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" />
        <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        <button type="submit">Book now</button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <h2>My bookings</h2>
      {bookings.length === 0 && <p style={{ color: "#666" }}>No bookings yet.</p>}
      <ul style={{ paddingLeft: 0, listStyle: "none" }}>
        {bookings.map(b => {
          const cancellable = !["Completed", "Cancelled"].includes(b.status);
          return (
            <li key={b.id} style={{
              border: "1px solid #ddd", borderRadius: 6, padding: 12, marginBottom: 8,
              background: b.status === "Cancelled" ? "#f9fafb" : "#fff",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <strong>{b.bookingNumber}</strong> — {b.serviceName}
                  <div style={{ color: "#555", fontSize: 14 }}>
                    ₹{b.totalAmount} · {new Date(b.scheduledStartUtc).toLocaleString()}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 13,
                      background:
                        b.status === "Pending" ? "#fef3c7" :
                        b.status === "Assigned" ? "#dbeafe" :
                        b.status === "Accepted" ? "#d1fae5" :
                        b.status === "Completed" ? "#e5e7eb" :
                        b.status === "Cancelled" ? "#fee2e2" : "#f3f4f6",
                    }}>{b.status}</span>
                    {b.professionalName && (
                      <span style={{ marginLeft: 8, color: "#555", fontSize: 14 }}>
                        · Assigned to {b.professionalName}
                      </span>
                    )}
                  </div>
                </div>
                {cancellable && (
                  <button onClick={() => cancel(b)} style={{ color: "#b91c1c" }}>Cancel</button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}