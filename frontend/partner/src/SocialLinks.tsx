export default function SocialLinks() {
  const links = [
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/company/145423988",
      ariaLabel: "GharMitra on LinkedIn",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
        </svg>
      ),
    },
    {
      name: "X",
      href: "https://x.com/TechMinds360",
      ariaLabel: "GharMitra on X",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M18.9 2H22l-7.4 8.5L23.3 22h-6.8l-5.3-7-6.1 7H2l7.9-9.1L1.3 2h7l4.8 6.4L18.9 2zm-2.4 18h1.9L7.6 3.9H5.6L16.5 20z"/>
        </svg>
      ),
    },
    {
      name: "Facebook",
      href: "https://www.facebook.com/GharMitraIndia",
      ariaLabel: "GharMitra on Facebook",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    {
      name: "GitHub",
      href: "https://github.com/yogiinarendranath-cell/GharMitra",
      ariaLabel: "GharMitra on GitHub",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
        </svg>
      ),
    },
    {
      name: "YouTube",
      href: "https://www.youtube.com/@TechMinds360",
      ariaLabel: "GharMitra on YouTube",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.65 31.65 0 000 12a31.65 31.65 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.65 31.65 0 0024 12a31.65 31.65 0 00-.5-5.81zM9.75 15.5v-7L15.5 12z"/>
        </svg>
      ),
    },
  ];

  return (
    <div style={{ margin: "1.5rem 0", textAlign: "center" }}>
      {/* Legal links row */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "1.5rem",
        marginBottom: "1.25rem",
        fontSize: "0.85rem",
      }}>
        <a href="/privacy" style={{ color: "#64748B", textDecoration: "none" }}>Privacy Policy</a>
        <a href="/terms" style={{ color: "#64748B", textDecoration: "none" }}>Terms of Service</a>
        <a href="/contact" style={{ color: "#64748B", textDecoration: "none" }}>Contact</a>
      </div>

      {/* Social icons row */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1.25rem" }}>
        {links.map(link => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.ariaLabel}
            style={{
              color: "#64748B",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#334155"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#64748B"; }}
          >
            {link.icon}
          </a>
        ))}
      </div>
    </div>
  );
}