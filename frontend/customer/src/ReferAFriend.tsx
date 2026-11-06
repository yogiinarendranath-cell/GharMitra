import { useEffect, useState } from "react";
import { api, type MyReferralCodeDto } from "./lib/api";

export default function ReferAFriend() {
  const [data, setData] = useState<MyReferralCodeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    api.myReferralCode()
      .then(setData)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const copy = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      // Clipboard may fail on insecure contexts — silent fallback
    }
  };

  if (loading) return null;
  if (error || !data) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
      border: "1px solid #FFB74D",
      borderRadius: "12px",
      padding: "1.5rem",
      margin: "2rem 0",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "1.8rem" }}>{"\uD83C\uDF81"}</span>
        <h3 style={{ margin: 0, color: "#E65100" }}>
          Refer a Friend, Get {"\u20b9"}100
        </h3>
      </div>

      <p style={{ color: "#5D4037", margin: "0 0 1rem 0", fontSize: "0.95rem" }}>
        Share your code. Your friend gets {"\u20b9"}50 off their first booking.
        You get {"\u20b9"}100 off your next booking. Win-win.
      </p>

      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.8rem", color: "#8D6E63", marginBottom: "4px", fontWeight: 600 }}>
          YOUR REFERRAL CODE
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <code style={{
            flex: 1,
            background: "#FFFFFF",
            padding: "0.7rem 1rem",
            borderRadius: "8px",
            border: "1px solid #FFB74D",
            fontSize: "1.1rem",
            fontWeight: 700,
            letterSpacing: "1px",
            color: "#E65100",
            fontFamily: "monospace",
          }}>
            {data.referralCode}
          </code>
          <button
            onClick={() => copy(data.referralCode, setCopiedCode)}
            className="btn-primary"
            style={{ padding: "0.7rem 1.2rem", minWidth: "80px" }}
          >
            {copiedCode ? "\u2705 Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.8rem", color: "#8D6E63", marginBottom: "4px", fontWeight: 600 }}>
          SHARE THIS LINK
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <code style={{
            flex: 1,
            background: "#FFFFFF",
            padding: "0.7rem 1rem",
            borderRadius: "8px",
            border: "1px solid #FFB74D",
            fontSize: "0.85rem",
            color: "#5D4037",
            fontFamily: "monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {data.shareUrl}
          </code>
          <button
            onClick={() => copy(data.shareUrl, setCopiedLink)}
            className="btn-primary"
            style={{ padding: "0.7rem 1.2rem", minWidth: "80px" }}
          >
            {copiedLink ? "\u2705 Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div style={{
        display: "flex",
        gap: "2rem",
        paddingTop: "1rem",
        borderTop: "1px solid #FFB74D",
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "#8D6E63", textTransform: "uppercase", letterSpacing: "1px" }}>
            Friends Joined
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#E65100" }}>
            {data.successfulReferrals}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "0.75rem", color: "#8D6E63", textTransform: "uppercase", letterSpacing: "1px" }}>
            Total Earned
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#E65100" }}>
            {"\u20b9"}{data.totalEarned.toFixed(0)}
          </div>
        </div>
      </div>
    </div>
  );
}