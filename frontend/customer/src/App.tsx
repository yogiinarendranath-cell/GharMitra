import { useEffect, useState } from "react";
import "./App.css";
import { api, setToken, type AuthResponse, type BookingDto, type ServiceCategoryDto, type ServiceDto } from "./lib/api";
import { connectBookingHub, disconnectBookingHub } from "./lib/signalr";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  const [phoneNumber, setPhoneNumber] = useState("+919876543210");
  const [city, setCity] = useState("Pune");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<string | null>(null);

  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState("");

  const [catalog, setCatalog] = useState<ServiceCategoryDto[]>([]);
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceDto | null>(null);
  const [address, setAddress] = useState("Flat 101, Baner");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const future = new Date(Date.now() + 2 * 3600_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`;
  });

  useEffect(() => { api.services().then(setCatalog).catch(e => setError(e.message)); }, []);

  useEffect(() => {
    if (!session) return;
    connectBookingHub((method: string) => {
      setLive(`${method.replace('Booking', '')} update received`);
      api.myBookings().then(setBookings).catch(console.error);
    });
    return () => disconnectBookingHub();
  }, [session]);

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      if (mode === "login") {
        const res = await api.login({ email, password });
        setToken(res.token); setSession(res); setBookings(await api.myBookings());
      } else {
        const res = await api.register({ fullName, email, phoneNumber, password, role: 1, city });
        setToken(res.token);
        setSession(res);
        setBookings(await api.myBookings());
      }
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      const res = await api.verifyOtp({ email, code: otpCode });
      setToken(res.token);
      if (!res.isPhoneVerified) {
        setShowOtp(false);
        setShowPhoneOtp(true);
      } else {
        setSession(res);
        setBookings(await api.myBookings());
        setShowOtp(false);
      }
    } catch (err) { setError((err as Error).message); }
  }

  async function submitPhoneOtp(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      const res = await api.verifyPhone({ email, code: phoneOtpCode });
      setToken(res.token);
      setSession(res);
      setBookings(await api.myBookings());
      setShowPhoneOtp(false);
    } catch (err) { setError((err as Error).message); }
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault(); if (!selectedService) return setError("Select a service.");
    setError(null);
    try {
      await api.createBooking({
        serviceId: selectedService.id, scheduledStartUtc: new Date(scheduledAt).toISOString(),
        durationMinutes: selectedService.durationMinutes, addressLine: address, city,
        pincode: "411045", notes: "Please ring the bell.",
      });
      setBookings(await api.myBookings()); setSelectedService(null);
    } catch (err) { setError((err as Error).message); }
  }

  async function handlePay(b: BookingDto) {
    setError(null);
    try {
      const order = await api.payBooking(b.id);
      if (order.isMock) {
        if (!confirm(`[MOCK MODE] Simulate successful payment of ₹${order.amount}?`)) return;
        await api.verifyPayment(b.id, { razorpayOrderId: order.orderId, razorpayPaymentId: `pay_mock_${Date.now()}`, razorpaySignature: "mock_signature" });
        setBookings(await api.myBookings());
      }
    } catch (err) { setError((err as Error).message); }
  }

  async function cancel(b: BookingDto) {
    if (!confirm(`Cancel booking ${b.bookingNumber}?`)) return;
    try { await api.cancelBooking(b.id, "Customer cancelled"); setBookings(await api.myBookings()); }
    catch (err) { setError((err as Error).message); }
  }

  function logout() { disconnectBookingHub(); setToken(null); setSession(null); setBookings([]); setLive(null); setShowOtp(false); setShowPhoneOtp(false); }

  if (showPhoneOtp) {
    return (
      <div className="app-container">
        <header className="app-header"><div className="header-inner"><a href="#" className="logo">🏠 GharMitra</a></div></header>
        <main>
          <div className="card" style={{ maxWidth: 400, margin: "4rem auto", textAlign: "center" }}>
            <h2 style={{ marginBottom: "1rem" }}>Verify Your Phone</h2>
            <div style={{ background: "#D1FAE5", color: "#065F46", padding: "12px", borderRadius: "8px", marginBottom: "1.5rem", fontSize: "0.95rem", fontWeight: "500" }}>
              ✅ Email verified! Now let's verify your phone.
            </div>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              We sent a 6-digit SMS code to <strong>{phoneNumber}</strong>
            </p>
            <form onSubmit={submitPhoneOtp} style={{ display: "grid", gap: "1rem" }}>
              <input value={phoneOtpCode} onChange={e => setPhoneOtpCode(e.target.value)} placeholder="123456" maxLength={6}
                style={{ textAlign: "center", fontSize: "2rem", letterSpacing: "5px", padding: "1rem" }} required />
              <button type="submit" className="btn-primary" style={{ padding: "1rem" }}>Verify & Finish</button>
            </form>
            {error && <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</p>}
          </div>
        </main>
      </div>
    );
  }

  if (showOtp) {
    return (
      <div className="app-container">
        <header className="app-header"><div className="header-inner"><a href="#" className="logo">🏠 GharMitra</a></div></header>
        <main>
          <div className="card" style={{ maxWidth: 400, margin: "4rem auto", textAlign: "center" }}>
            <h2 style={{ marginBottom: "1rem" }}>Verify Your Email</h2>
            <div style={{ background: "#D1FAE5", color: "#065F46", padding: "12px", borderRadius: "8px", marginBottom: "1.5rem", fontSize: "0.95rem", fontWeight: "500" }}>
              ✅ Account created successfully! Please verify your email.
            </div>
            <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>We sent a 6-digit code to <strong>{email}</strong></p>
            <form onSubmit={submitOtp} style={{ display: "grid", gap: "1rem" }}>
              <input value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="123456" maxLength={6}
                style={{ textAlign: "center", fontSize: "2rem", letterSpacing: "5px", padding: "1rem" }} required />
              <button type="submit" className="btn-primary" style={{ padding: "1rem" }}>Verify Email</button>
            </form>
            {error && <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</p>}
            <p style={{ marginTop: "1.5rem", fontSize: "0.9rem" }}>
              <span style={{ color: "var(--primary)", cursor: "pointer" }} onClick={() => setShowOtp(false)}>Back to Login</span>
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-container">
        <header className="app-header"><div className="header-inner"><a href="#" className="logo">🏠 GharMitra</a><div className="header-nav"><button className="btn-outline" onClick={() => setMode("login")}>Sign In</button></div></div></header>
        <main>
          <div className="hero-main">
            <h1>Get House Help in 10 min</h1>
            <p>Trained, verified Experts for House Help, home cleaning, dishwashing, laundry and more, at your door in about 10 minutes.</p>
          </div>
          <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>{mode === "login" ? "Welcome Back" : "Create an Account"}</h2>
            <form onSubmit={submitAuth} style={{ display: "grid", gap: "1rem" }}>
              {mode === "register" && (
                <>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" required />
                  <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Phone (+919876543210)" required />
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" required />
                </>
              )}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
              <button type="submit" className="btn-primary" style={{ padding: "0.8rem" }}>{mode === "login" ? "Sign In" : "Create Account"}</button>
            </form>
            <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.9rem" }}>
              {mode === "login" ? "New here? " : "Already have an account? "}
              <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }} onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create an account" : "Sign In"}</span>
            </p>
            {error && <p style={{ color: "var(--danger)", marginTop: "1rem", textAlign: "center" }}>{error}</p>}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner"><a href="#" className="logo">🏠 GharMitra</a><div className="header-nav"><span className="user-greeting">Hi, {session.fullName}</span><button className="btn-outline" onClick={logout}>Sign out</button></div></div>
      </header>
      <main>
        {live && <div className="live-bar">📡 Live: {live}</div>}
        <h2 style={{ marginBottom: "1.5rem" }}>Our Services</h2>
        <div className="service-grid-full">
          {catalog.flatMap(c => c.services).map(s => (
            <div key={s.id} className="service-card-large">
              <img src={SERVICE_IMAGES[s.name] || DEFAULT_IMAGE} alt={s.name} />
              <div className="service-card-overlay">
                <h3>{s.name}</h3>
                <p>From ₹{s.basePrice} • {s.durationMinutes} min</p>
                <button className="btn-primary" style={{ marginTop: "10px", width: "100%", padding: "0.6rem" }} onClick={() => {
                  setSelectedService(s);
                  // Always suggest a time 2 hours in the future
                  const future = new Date(Date.now() + 2 * 3600_000);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  const local = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`;
                  setScheduledAt(local);
                }}>Book Now</button>
              </div>
            </div>
          ))}
        </div>
        <h2 style={{ marginBottom: "1.5rem", marginTop: "3rem" }}>My Bookings</h2>
        <div className="card" style={{ padding: 0 }}>
          {bookings.length === 0 && <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No bookings yet.</p>}
          {bookings.map(b => (
            <div key={b.id} className="booking-item">
              <div className="booking-info">
                <h4>{b.serviceName}</h4>
                <div className="booking-meta">₹{b.totalAmount} • {new Date(b.scheduledStartUtc).toLocaleString()}</div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
                  <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                  <span className={`badge ${b.paymentStatus === 'Paid' ? 'badge-accepted' : 'badge-pending'}`}>{b.paymentStatus}</span>
                  {b.professionalName && <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Pro: {b.professionalName}</span>}
                </div>
                {b.professionalLatitude && b.professionalLongitude && (
                  <div style={{ height: '200px', width: '100%', marginTop: '15px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <MapContainer center={[b.professionalLatitude, b.professionalLongitude]} zoom={14} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[b.professionalLatitude, b.professionalLongitude]}><Popup>{b.professionalName} is on the way!</Popup></Marker>
                    </MapContainer>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "100px" }}>
                {b.paymentStatus === "Unpaid" && b.status !== "Cancelled" && (
                  <button onClick={() => handlePay(b)} className="btn-primary btn-sm">Pay Now</button>
                )}
                {!["Completed", "Cancelled"].includes(b.status) && (
                  <button onClick={() => cancel(b)} className="btn-danger btn-sm">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      {selectedService && (
        <div className="modal-backdrop" onClick={() => setSelectedService(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0 }}>Book Service</h2>
              <button style={{ background: "transparent", fontSize: "1.5rem", color: "var(--text-muted)", padding: 0 }} onClick={() => setSelectedService(null)}>×</button>
            </div>
            <form onSubmit={submitBooking} style={{ display: "grid", gap: "1rem" }}>
              <div style={{ background: "#F9FAFB", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <strong>{selectedService.name}</strong><br/>
                <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>₹{selectedService.basePrice} • {selectedService.durationMinutes} mins</span>
              </div>
              <div><label style={{ fontSize: "0.9rem", fontWeight: 500, display: "block", marginBottom: "0.5rem" }}>Address</label><input value={address} onChange={e => setAddress(e.target.value)} required /></div>
              <div><label style={{ fontSize: "0.9rem", fontWeight: 500, display: "block", marginBottom: "0.5rem" }}>When?</label><input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required /></div>
              <button type="submit" className="btn-primary" style={{ padding: "1rem", marginTop: "0.5rem" }}>Confirm Booking</button>
            </form>
          </div>
        </div>
      )}
      <footer className="app-footer"><div className="footer-inner"><h3>GharMitra</h3><p>The trusted marketplace for home services in India.</p><div className="footer-bottom">© 2026 GharMitra. All rights reserved.</div></div></footer>
    </div>
  );
}