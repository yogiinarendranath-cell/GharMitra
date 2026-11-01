import { useEffect, useState } from "react";
import "./App.css";
import { api, setToken, type AuthResponse, type BookingDto, type ServiceCategoryDto, type ServiceDto } from "./lib/api";
import { connectBookingHub, disconnectBookingHub } from "./lib/signalr";

const SERVICE_IMAGES: Record<string, string> = {
  "Standard Home Cleaning": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=600",
  "Deep Home Cleaning": "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=600",
  "Kitchen Cleaning": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=600",
  "Utensil Washing": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600",
  "Laundry & Folding": "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=600",
  "Home Cook (2 Hours)": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=600",
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=600";

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("gate@test.local");
  const [password, setPassword] = useState("Test@1234");
  const [fullName, setFullName] = useState("Test User");
  const [city, setCity] = useState("Pune");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<ServiceCategoryDto[]>([]);
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceDto | null>(null);
  const [address, setAddress] = useState("Flat 101, Baner");
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + 3600_000).toISOString().slice(0, 16));

  useEffect(() => { api.services().then(setCatalog).catch(e => setError(e.message)); }, []);

  useEffect(() => {
    if (!session) return;
    connectBookingHub((method) => {
      setLive(`${method.replace('Booking', '')} update received`);
      api.myBookings().then(setBookings).catch(console.error);
    });
    return () => disconnectBookingHub();
  }, [session]);

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
    if (!selectedService) return setError("Please select a service first.");
    setError(null);
    try {
      await api.createBooking({
        serviceId: selectedService.id,
        scheduledStartUtc: new Date(scheduledAt).toISOString(),
        durationMinutes: selectedService.durationMinutes,
        addressLine: address,
        city,
        pincode: "411045",
        notes: "Please ring the bell.",
      });
      setBookings(await api.myBookings());
      setSelectedService(null); // Reset form
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
    disconnectBookingHub(); setToken(null); setSession(null); setBookings([]); setLive(null);
  }

  if (!session) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-inner"><a href="#" className="logo">🏠 GharMitra</a></div>
        </header>
        <main>
          <div className="hero">
            <h1>Your Home. Our Care.</h1>
            <p>Book verified professionals for cleaning, cooking, and laundry in minutes.</p>
          </div>
          <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
              <button className={mode === "login" ? "btn-primary" : "btn-outline"} style={{ flex: 1 }} onClick={() => setMode("login")}>Login</button>
              <button className={mode === "register" ? "btn-primary" : "btn-outline"} style={{ flex: 1 }} onClick={() => setMode("register")}>Register</button>
            </div>
            <form onSubmit={submitAuth} style={{ display: "grid", gap: "1rem" }}>
              {mode === "register" && (
                <>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" required />
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" required />
                </>
              )}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
              <button type="submit" className="btn-primary" style={{ marginTop: "0.5rem", padding: "0.8rem" }}>
                {mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
            {error && <p style={{ color: "var(--danger)", marginTop: "1rem", fontSize: "0.9rem" }}>{error}</p>}
          </div>
        </main>
        <footer className="app-footer">
          <div className="footer-inner">
            <h3>GharMitra</h3>
            <p>The trusted marketplace for home services in India.</p>
            <div className="footer-bottom">© 2026 GharMitra. All rights reserved.</div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <a href="#" className="logo">🏠 GharMitra</a>
          <div className="header-nav">
            <span className="user-greeting">Hi, {session.fullName}</span>
            <button className="btn-outline" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      <main>
        {live && <div className="live-bar">📡 Live: {live}</div>}
        
        <div className="grid-dashboard">
          <div>
            <h2 style={{ marginBottom: "1.5rem" }}>Our Services</h2>
            <div className="grid-cards">
              {catalog.flatMap(c => c.services).map(s => (
                <div key={s.id} className={`card service-card ${selectedService?.id === s.id ? "selected" : ""}`} onClick={() => setSelectedService(s)}>
                  <img src={SERVICE_IMAGES[s.name] || DEFAULT_IMAGE} alt={s.name} />
                  <div className="service-card-content">
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                      <span className="service-price">₹{s.basePrice}</span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{s.durationMinutes} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="card" style={{ position: "sticky", top: "100px" }}>
              <h2 style={{ marginBottom: "1.5rem" }}>Book Selected Service</h2>
              {selectedService ? (
                <form onSubmit={submitBooking} style={{ display: "grid", gap: "1rem" }}>
                  <div style={{ background: "#F9FAFB", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <strong>{selectedService.name}</strong><br/>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>₹{selectedService.basePrice} • {selectedService.durationMinutes} mins</span>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.9rem", fontWeight: 500, display: "block", marginBottom: "0.5rem" }}>Address</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.9rem", fontWeight: 500, display: "block", marginBottom: "0.5rem" }}>When?</label>
                    <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn-primary" style={{ padding: "1rem", marginTop: "0.5rem" }}>Confirm Booking</button>
                </form>
              ) : (
                <p style={{ color: "var(--text-muted)" }}>Select a service from the left to book.</p>
              )}
            </div>

            <h2 style={{ margin: "2rem 0 1.5rem" }}>My Bookings</h2>
            <div className="card" style={{ padding: 0 }}>
              {bookings.length === 0 && <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No bookings yet.</p>}
              {bookings.map(b => {
                const cancellable = !["Completed", "Cancelled"].includes(b.status);
                return (
                  <div key={b.id} className="booking-item">
                    <div className="booking-info">
                      <h4>{b.serviceName}</h4>
                      <div className="booking-meta">₹{b.totalAmount} • {new Date(b.scheduledStartUtc).toLocaleString()}</div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
                        <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                        {b.professionalName && <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{b.professionalName}</span>}
                      </div>
                    </div>
                    {cancellable && <button onClick={() => cancel(b)} className="btn-danger btn-sm">Cancel</button>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <h3>GharMitra</h3>
          <p>The trusted marketplace for home services in India.</p>
          <div className="footer-bottom">© 2026 GharMitra. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}