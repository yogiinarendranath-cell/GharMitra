import { useState } from "react";
import "./App.css";
import { partnerApi, setToken, type AuthResponse, type Profile, type Assignment, type Earnings, type VerificationStatus } from "./lib/api";
import SocialLinks from "./SocialLinks";

type Tab = "jobs" | "earnings" | "verification";

const STATUS_COLORS: Record<string, string> = {
  Pending: "#FEF3C7",
  Assigned: "#DBEAFE",
  Accepted: "#C7D2FE",
  InProgress: "#FED7AA",
  Completed: "#D1FAE5",
  Cancelled: "#FEE2E2",
};

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [verifForm, setVerifForm] = useState({ idProofType: "Aadhaar", idProofUrl: "", selfieUrl: "" });
  const [verifSubmitting, setVerifSubmitting] = useState(false);
  const [tab, setTab] = useState<Tab>("jobs");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("pro@gharmitra.local");
  const [password, setPassword] = useState("Pro@1234");
  const [busy, setBusy] = useState(false);

  async function refreshAll() {
    setProfile(await partnerApi.me());
    setAssignments(await partnerApi.assignments());
    setEarnings(await partnerApi.earnings());
  }

  async function login(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const s = await partnerApi.login({ email, password });
      if (s.role !== "Professional") throw new Error("Not a professional account");
      setToken(s.token); setSession(s); await refreshAll();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function toggleAvailability() {
    if (!profile) return;
    try {
      await partnerApi.setAvailability(!profile.isAvailable);
      await refreshAll();
    } catch (err) { setError((err as Error).message); }
  }

  async function action(id: string, kind: "accept" | "start" | "complete") {
    setError(null);
    try {
      await partnerApi[kind](id);
      await refreshAll();
    } catch (err) { setError((err as Error).message); }
  }

  function logout() {
    setToken(null); setSession(null); setProfile(null); setAssignments([]); setEarnings(null);
  }

  if (!session) {
    return (
      <div className="app-container">
        <header className="app-header"><div className="header-inner"><a href="#" className="logo">🏠 GharMitra Partner</a></div></header>
        <main>
          <div className="card" style={{ maxWidth: 400, margin: "4rem auto" }}>
            <h1 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Partner Portal</h1>
            <form onSubmit={login} style={{ display: "grid", gap: "1rem" }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
              <button type="submit" className="btn-primary" disabled={busy} style={{ padding: "0.8rem" }}>
                {busy ? "Signing in..." : "Sign in"}
              </button>
            </form>
            {error && <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</p>}
          </div>
        </main>
        <footer className="app-footer"><div className="footer-inner">🏠 GharMitra Partner</div></footer>
      </div>
    );
  }

  const verified = profile?.isVerified ?? false;
  const activeJobs = assignments.filter(a => !["Completed", "Cancelled"].includes(a.bookingStatus));
  const completedJobs = assignments.filter(a => a.bookingStatus === "Completed");

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <a href="#" className="logo">🏠 GharMitra Partner</a>
          <div className="header-nav" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={toggleAvailability}
              className={profile?.isAvailable ? "btn-primary" : "btn-outline"}
              style={{ padding: "0.4rem 1rem", fontSize: "0.9rem" }}
              disabled={!verified}
            >
              {profile?.isAvailable ? "🟢 Online" : "⚪ Offline"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: "var(--primary)", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700
              }}>
                {(profile?.fullName ?? "P").charAt(0).toUpperCase()}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{profile?.fullName} {profile?.rating ? `⭐ ${profile.rating.toFixed(1)}` : ""}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{profile?.city}</div>
              </div>
            </div>
            <button className="btn-outline" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      <main>
        {!verified && (
          <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
            <strong>⏳ Verification pending</strong> — an admin must verify your profile before you can accept jobs.
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <button className={tab === "jobs" ? "btn-primary" : "btn-outline"} onClick={() => setTab("jobs")}>
            💼 Jobs ({activeJobs.length})
          </button>
          <button className={tab === "earnings" ? "btn-primary" : "btn-outline"} onClick={() => setTab("earnings")}>
            💰 Earnings
          </button>
        </div>

        {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>⚠️ {error}</div>}

        {tab === "jobs" && (
          <>
            <h2 style={{ marginBottom: "1rem" }}>Active Jobs</h2>
            {activeJobs.length === 0 && (
              <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                No active jobs right now. {profile?.isAvailable ? "We'll notify you when a new job arrives." : "Go online to receive jobs."}
              </div>
            )}
            <div style={{ display: "grid", gap: "1rem" }}>
              {activeJobs.map((a) => (
                <div key={a.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <div>
                      <h3 style={{ marginBottom: "4px" }}>{a.serviceName}</h3>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{a.bookingNumber}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--success)" }}>₹{a.totalAmount}</div>
                      <span style={{
                        display: "inline-block", padding: "2px 10px", borderRadius: "999px",
                        fontSize: "0.75rem", fontWeight: 600, marginTop: "4px",
                        background: STATUS_COLORS[a.bookingStatus] ?? "#F3F4F6"
                      }}>
                        {a.bookingStatus}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Customer</div>
                      <div><strong>{a.customerName}</strong></div>
                      <div>{a.customerPhone}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>When</div>
                      <div>{new Date(a.scheduledStartUtc).toLocaleString()}</div>
                      <div style={{ color: "var(--text-muted)" }}>{a.durationMinutes} min</div>
                    </div>
                  </div>

                  <div style={{ background: "var(--bg)", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.9rem" }}>
                    📍 {a.addressLine}, {a.city} {a.pincode}
                    {a.notes && <div style={{ marginTop: "4px", fontStyle: "italic", color: "var(--text-muted)" }}>"{a.notes}"</div>}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {a.bookingStatus === "Assigned" && verified && (
                      <button className="btn-primary" onClick={() => action(a.id, "accept")} style={{ flex: 1, padding: "0.6rem" }}>
                        Accept Job
                      </button>
                    )}
                    {a.bookingStatus === "Accepted" && (
                      <button className="btn-primary" onClick={() => action(a.id, "start")} style={{ flex: 1, padding: "0.6rem" }}>
                        Start Job
                      </button>
                    )}
                    {a.bookingStatus === "InProgress" && (
                      <button className="btn-primary" onClick={() => action(a.id, "complete")} style={{ flex: 1, padding: "0.6rem", background: "var(--success)" }}>
                        Mark as Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {completedJobs.length > 0 && (
              <>
                <h2 style={{ margin: "2rem 0 1rem" }}>Completed Jobs ({completedJobs.length})</h2>
                <div className="card" style={{ padding: 0 }}>
                  {completedJobs.map((a) => (
                    <div key={a.id} style={{ padding: "1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <strong>{a.serviceName}</strong>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          {a.bookingNumber} · {new Date(a.scheduledStartUtc).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>₹{a.totalAmount}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "verification" && (
          <div className="card" style={{ padding: "1.5rem", maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ marginBottom: "1rem" }}>🛡️ Verification Status</h2>

            {!verification && (
              <p style={{ color: "var(--text-muted)" }}>Loading...</p>
            )}

            {verification && verification.status === "Verified" && (
              <div style={{ padding: "1rem", background: "#D1FAE5", borderRadius: "8px", border: "1px solid #10B981" }}>
                <p style={{ fontWeight: 700, color: "#065F46", marginBottom: "0.5rem" }}>✅ Verified</p>
                <p style={{ fontSize: "0.9rem", color: "#065F46" }}>
                  Your identity has been verified. You can accept jobs.
                </p>
                {verification.submittedAtUtc && (
                  <p style={{ fontSize: "0.8rem", color: "#065F46", marginTop: "0.5rem" }}>
                    Submitted: {new Date(verification.submittedAtUtc).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {verification && verification.status === "UnderReview" && (
              <div style={{ padding: "1rem", background: "#FEF3C7", borderRadius: "8px", border: "1px solid #F59E0B" }}>
                <p style={{ fontWeight: 700, color: "#92400E", marginBottom: "0.5rem" }}>⏳ Under Review</p>
                <p style={{ fontSize: "0.9rem", color: "#92400E" }}>
                  Your documents are being reviewed by our team. This usually takes 1–2 business days.
                </p>
                {verification.submittedAtUtc && (
                  <p style={{ fontSize: "0.8rem", color: "#92400E", marginTop: "0.5rem" }}>
                    Submitted: {new Date(verification.submittedAtUtc).toLocaleDateString()}
                  </p>
                )}
                <p style={{ fontSize: "0.8rem", color: "#92400E", marginTop: "0.25rem" }}>
                  ID Type: {verification.idProofType}
                </p>
              </div>
            )}

            {verification && verification.status === "Rejected" && (
              <div style={{ padding: "1rem", background: "#FEE2E2", borderRadius: "8px", border: "1px solid #DC2626", marginBottom: "1rem" }}>
                <p style={{ fontWeight: 700, color: "#991B1B", marginBottom: "0.5rem" }}>❌ Rejected</p>
                <p style={{ fontSize: "0.9rem", color: "#991B1B" }}>
                  Reason: {verification.rejectionReason || "No reason provided"}
                </p>
                <p style={{ fontSize: "0.85rem", color: "#991B1B", marginTop: "0.5rem" }}>
                  Please re-submit with correct documents below.
                </p>
              </div>
            )}

            {verification && (verification.status === "Pending" || verification.status === "Rejected") && (
              <form onSubmit={submitVerification} style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.35rem" }}>
                    ID Proof Type
                  </label>
                  <select
                    value={verifForm.idProofType}
                    onChange={e => setVerifForm({ ...verifForm, idProofType: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px" }}
                  >
                    <option value="Aadhaar">Aadhaar</option>
                    <option value="PAN">PAN</option>
                    <option value="VoterID">Voter ID</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.35rem" }}>
                    ID Proof Document URL
                  </label>
                  <input
                    type="url"
                    value={verifForm.idProofUrl}
                    onChange={e => setVerifForm({ ...verifForm, idProofUrl: e.target.value })}
                    placeholder="https://example.com/aadhaar.jpg"
                    required
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px" }}
                  />
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Upload your ID to Google Drive, Dropbox, or imgur and paste the public URL here.
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.35rem" }}>
                    Selfie URL
                  </label>
                  <input
                    type="url"
                    value={verifForm.selfieUrl}
                    onChange={e => setVerifForm({ ...verifForm, selfieUrl: e.target.value })}
                    placeholder="https://example.com/selfie.jpg"
                    required
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px" }}
                  />
                </div>

                {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={verifSubmitting}
                  style={{ padding: "0.75rem" }}
                >
                  {verifSubmitting ? "Submitting..." : "Submit for Verification"}
                </button>
              </form>
            )}
          </div>
        )}
        {tab === "earnings" && earnings && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Total Earnings</div>
                <div style={{ fontSize: "2.2rem", fontWeight: 700, color: "var(--success)", marginTop: "0.5rem" }}>
                  ₹{earnings.totalEarnings.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  {earnings.completedJobs} jobs completed
                </div>
              </div>
              <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>This Month</div>
                <div style={{ fontSize: "2.2rem", fontWeight: 700, color: "var(--primary)", marginTop: "0.5rem" }}>
                  ₹{earnings.thisMonthEarnings.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  {earnings.thisMonthJobs} jobs
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: "1rem" }}>Last 7 Days Earnings</h3>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "150px", gap: "8px" }}>
                {earnings.last7Days.map((day) => {
                  const max = Math.max(...earnings.last7Days.map(d => d.amount), 1);
                  const height = (day.amount / max) * 100;
                  return (
                    <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>₹{day.amount}</div>
                      <div style={{ width: "100%", height: `${Math.max(height, 3)}%`, background: day.amount > 0 ? "var(--success)" : "var(--border)", borderRadius: "4px 4px 0 0" }} />
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        {new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
      <footer className="app-footer">
        <div className="footer-inner">
          <h3>🏠 GharMitra Partner</h3>
          <SocialLinks />
          <div className="footer-bottom">© 2026 GharMitra. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}