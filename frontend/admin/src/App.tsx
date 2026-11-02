import { useEffect, useState } from "react";
import "./App.css";
import { api, setToken, type AuthResponse, type BookingDto, type ServiceCategoryDto, type ServiceDto } from "./lib/api";
import { connectBookingHub, disconnectBookingHub } from "./lib/signalr";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icons in React
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
    connectBookingHub((method: string) => {
      setLive(`${method.replace('Booking', '')} update received`);
      api.myBookings().then(setBookings).catch(console.error);
    });
    return () => disconnectBookingHub();
  }, [session]);

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      const res = mode === "login" ? await api.login({ email, password })
        : await api.register({ fullName, email, phoneNumber: "9876543210", password, role: 1, city });
      setToken(res.token); setSession(res); setBookings(await api.myBookings());
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
      } else {
        const options = {
          key: order.keyId, amount: order.amount * 100, currency: order.currency, name: "GharMitra",
          description: `Booking ${order.bookingNumber}`, order_id: order.orderId,
          handler: async function (response: any) {
            await api.verifyPayment(b.id, { razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature });
            setBookings(await api.myBookings());
          },
          prefill: { name: order.customerName, email: order.customerEmail, contact: order.customerPhone },
          theme: { color: "#D81B60" }
        };
        new (window as any).Razorpay(options).open();
      }
    } catch (err) { setError((err as Error).message); }
  }

  async function cancel(b: BookingDto) {
    if (!confirm(`Cancel booking ${b.bookingNumber}?`)) return;
    try { await api.cancelBooking(b.id, "Customer cancelled"); setBookings(await api.myBookings()); }
    catch (err) { setError((err as Error).message); }
  }

  function logout() { disconnectBookingHub(); setToken(null); setSession(null); setBookings([]); setLive(null); }

  if (!session) {
    return (
      <div className="app-container">
        <header className="app-header"><div className="header-inner"><a href="#" className="logo">🏠 GharMitra</a><div className="header-nav"><button className="btn-outline" onClick={() => { setMode("login"); window.scrollTo(0, 0); }}>Sign In</button></div></div></header>
        <main>
          <div className="hero-main">
            <h1>Get House Help in 10 min</h1>
            <p>Trained, verified Experts for House Help, home cleaning, dishwashing, laundry and more, at your door in about 10 minutes.</p>
            <button className="btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.2rem", background: "var(--primary)" }} onClick={() => { setMode("register"); window.scrollTo(0, 500); }}>Book Now</button>
          </div>
          <div className="how-it-works">
            <div className="step-card"><div className="step-number">1</div><h3>Choose your service</h3><p>Select from home cleaning, cooking, or laundry.</p></div>
            <div className="step-card"><div className="step-number">2</div><h3>Pick a time</h3><p>Book instantly or schedule for a future date.</p></div>
            <div className="step-card"><div className="step-number">3</div><h3>Sit back and relax</h3><p>A trained Expert arrives on time.</p></div>
          </div>
          <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>{mode === "login" ? "Welcome Back" : "Create an Account"}</h2>
            <form onSubmit={submitAuth} style={{ display: "grid", gap: "1rem" }}>
              {mode === "register" && (<><input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" required /><input value={city} onChange={e => setCity(e.target.value)} placeholder="City" required /></>)}
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
        <footer className="app-footer"><div className="footer-inner"><h3>GharMitra</h3><p>The trusted marketplace for home services in India.</p><div className="footer-bottom">© 2026 GharMitra. All rights reserved.</div></div></footer>
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
            <div key={s.id} className="service-card-large" onClick={() => setSelectedService(s)}>
              <img src={SERVICE_IMAGES[s.name] || DEFAULT_IMAGE} alt={s.name} />
              <div className="service-card-overlay">
                <h3>{s.name}</h3>
                <p>From ₹{s.basePrice} • {s.durationMinutes} min</p>
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
                
                {/* LIVE MAP */}
                {b.professionalLatitude && b.professionalLongitude && (
                  <div style={{ height: '200px', width: '100%', marginTop: '15px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <MapContainer 
                      center={[b.professionalLatitude, b.professionalLongitude]} 
                      zoom={14} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer 
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                      />
                      <Marker position={[b.professionalLatitude, b.professionalLongitude]}>
                        <Popup>{b.professionalName} is on the way!</Popup>
                      </Marker>
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
      <footer className="app-footer"><div className="footer-inner"><h3>GharMitra</h3><p>The trusted marketplace for home services in India.</p><div className="footer-bottom">© 2026 GharMitra. All rights reserved.</div></div></footer>
    </div>
  );
}