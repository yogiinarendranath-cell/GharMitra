import { useEffect, useState } from "react";
import "./App.css";
import { api, setToken, type AuthResponse, type BookingDto, type ServiceCategoryDto, type ServiceDto } from "./lib/api";
import { connectBookingHub, disconnectBookingHub } from "./lib/signalr";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ApplyCoupon from "./ApplyCoupon";

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
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
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

  useEffect(() => {
    let retries = 0;
    const load = () => {
      api.services()
        .then(setCatalog)
        .catch(e => {
          if (retries < 3) {
            retries++;
            setTimeout(load, 2000);
          } else {
            setError(`Failed to load services: ${e.message}`);
          }
        });
    };
    load();
  }, []);

  useEffect(() => {
    if (!session) return;
    connectBookingHub((method: string) => {
      setLive(`${method.replace('Booking', '')} update received`);
      api.myBookings().then(setBookings).catch(e => console.error("Bookings load failed:", e.message));
    });
    return () => disconnectBookingHub();
  }, [session]);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      const s = await api.login({ email, password });
      setToken(s.token); setSession(s);
      setBookings(await api.myBookings());
    } catch (err) { setError((err as Error).message); }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      const s = await api.register({ email, password, fullName, phoneNumber, city });
      setToken(s.token); setSession(s);
      setBookings(await api.myBookings());
    } catch (err) { setError((err as Error).message); }
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault(); if (!selectedService) return setError("Select a service.");
    setError(null);
    try {
      await api.createBooking({
        serviceId: selectedService.id, scheduledStartUtc: new Date(scheduledAt).toISOString(),
        durationMinutes: selectedService.durationMinutes, addressLine: address, city,
        pincode: "411001", notes: null
      });
      setBookings(await api.myBookings()); setSelectedService(null);
    } catch (err) { setError((err as Error).message); }
  }

  async function handlePay(b: BookingDto) {
    try {
      const order = await api.payBooking(b.id);
      if (!confirm(`[MOCK MODE] Simulate successful payment of ₹${order.amount}?`)) return;
      await api.verifyPayment(b.id, { razorpayOrderId: order.orderId, razorpayPaymentId: `pay_mock_${Date.now()}`, razorpaySignature: "mock_signature" });
      setBookings(await api.myBookings());
    } catch (err) { setError((err as Error).message); }
  }

  async function cancel(b: BookingDto) {
    if (!confirm(`Cancel booking ${b.bookingNumber}?`)) return;
    try { await api.cancelBooking(b.id); setBookings(await api.myBookings()); }
    catch (err) { setError((err as Error).message); }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault(); if (!reviewBookingId) return;
    try {
      await api.submitReview(reviewBookingId, { rating: reviewRating, comment: reviewComment });
      setReviewBookingId(null); setBookings(await api.myBookings());
    } catch (err) { setError((err as Error).message); }
  }

  function logout() {
    disconnectBookingHub(); setToken(null); setSession(null); setBookings([]); setLive(null);
  }

  if (!session) {
    return (
      <div className="app-container">
        <header className="app-header"><div className="header-inner"><a href="#" className="logo">🏠 GharMitra</a></div></header>
        <main>
          <div className="card" style={{ maxWidth: 400, margin: "4rem auto" }}>
            <h1 style={{ marginBottom: "1.5rem", textAlign: "center" }}>{mode === "login" ? "Sign in" : "Create account"}</h1>
            <form onSubmit={mode === "login" ? submitLogin : submitRegister} style={{ display: "grid", gap: "1rem" }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
              {mode === "register" && (
                <>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" required />
                  <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Phone (e.g. +919876543210)" required />
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" required />
                </>
              )}
              <button type="submit" className="btn-primary" style={{ padding: "0.8rem" }}>{mode === "login" ? "Sign in" : "Create account"}</button>
            </form>
            <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              {mode === "login" ? "No account?" : "Have an account?"}{" "}
              <button style={{ background: "none", border: 0, color: "var(--primary)", cursor: "pointer", padding: 0, textDecoration: "underline" }} onClick={() => setMode(mode === "login" ? "register" : "login")}>
                {mode === "login" ? "Register" : "Sign in"}
              </button>
            </p>
            {error && <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</p>}
          </div>
        </main>
        <footer className="app-footer"><div className="footer-inner">© 2026 GharMitra</div></footer>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <a href="#" className="logo">🏠 GharMitra</a>
          <div className="header-nav">
            <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{session.email}</span>
            <button className="btn-outline" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      <main>
        {live && <div className="live-bar">📡 Live: {live}</div>}
        {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>⚠️ {error}</div>}

        <h1 style={{ marginBottom: "2rem" }}>Our Services</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
          {catalog.map(cat => cat.services.map(s => {
            const img = SERVICE_IMAGES[s.name] ?? DEFAULT_IMAGE;
            return (
              <div key={s.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ height: "180px", background: `url(${img}) center/cover` }} />
                <div style={{ padding: "1rem" }}>
                  <h3 style={{ marginBottom: "0.5rem" }}>{s.name}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                    From ₹{s.basePrice} • {s.durationMinutes} min
                  </p>
                  <button className="btn-primary" style={{ width: "100%" }} onClick={() => {
                    setSelectedService(s);
                    const future = new Date(Date.now() + 2 * 3600_000);
                    const pad = (n: number) => String(n).padStart(2, "0");
                    const local = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`;
                    setScheduledAt(local);
                  }}>Book Now</button>
                </div>
              </div>
            );
          }))}
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
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "140px" }}>
                {b.paymentStatus === "Unpaid" && b.status !== "Cancelled" && (
                  <ApplyCoupon
                    bookingId={b.id}
                    originalAmount={b.totalAmount}
                    paid={false}
                    onChange={({ newAmount }) => {
                      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, totalAmount: newAmount } : x));
                    }}
                  />
                )}
                {b.paymentStatus === "Unpaid" && b.status !== "Cancelled" && (
                  <button onClick={() => handlePay(b)} className="btn-primary btn-sm">Pay Now</button>
                )}
                {b.status === "Completed" && (
                  <button onClick={() => setReviewBookingId(b.id)} className="btn-primary btn-sm">⭐ Rate Job</button>
                )}
                {!["Completed", "Cancelled"].includes(b.status) && (
                  <button onClick={() => cancel(b)} className="btn-danger btn-sm">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {reviewBookingId && (
        <div className="modal-backdrop" onClick={() => setReviewBookingId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: "0.5rem" }}>Rate Your Experience</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              How did we do? Your feedback helps other customers.
            </p>
            <form onSubmit={submitReview} style={{ display: "grid", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", fontSize: "2.5rem" }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setReviewRating(star)}
                    style={{ background: "none", border: 0, cursor: "pointer", color: star <= reviewRating ? "#F59E0B" : "var(--border)", padding: 0 }}>
                    ★
                  </button>
                ))}
              </div>
              <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Optional comments..." rows={3} style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "8px", fontFamily: "inherit" }} />
              <button type="submit" className="btn-primary" style={{ padding: "0.8rem" }}>Submit Review</button>
            </form>
          </div>
        </div>
      )}

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