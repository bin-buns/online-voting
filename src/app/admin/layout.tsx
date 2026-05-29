import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/dashboard");
  const { profile } = session;

  return (
    <AdminShell>
      <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* ── Sidebar ── */}
      <aside
        aria-label="Admin sidebar"
        style={{
          width: "240px",
          backgroundColor: "#0d6b34",
          color: "white",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          fontFamily: "'Open Sans', sans-serif",
          position: "sticky",   
          top: 0,               
          height: "100vh",      
          overflowY: "auto", 
        }}
      >
        {/* Accessibility toolbar */}
        <div style={{
          backgroundColor: "#0a5529",
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}>
          <span style={{
            fontSize: "10.5px",
            color: "rgba(255,255,255,0.6)",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}>
            Accessibility
          </span>
          <button title="Increase text size" aria-label="Increase text size" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "30px", height: "30px", borderRadius: "6px",
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 700,
            fontFamily: "'Open Sans', sans-serif",
          }}>A+</button>
          <button title="High contrast mode" aria-label="Toggle high contrast mode" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "30px", height: "30px", borderRadius: "6px",
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", cursor: "pointer", fontSize: "15px",
          }}>
            <i className="ti ti-circle-half-2" aria-hidden="true" />
          </button>
          <button title="Screen reader" aria-label="Toggle screen reader" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "30px", height: "30px", borderRadius: "6px",
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", cursor: "pointer", fontSize: "15px",
          }}>
            <i className="ti ti-volume" aria-hidden="true" />
          </button>
        </div>

        {/* Brand */}
        <div style={{
          padding: "22px 18px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.18)",
        }}>
          <div style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            lineHeight: 1.25,
          }}>
            Smart Voting<br />System
          </div>
          <p style={{
            fontSize: "12.5px",
            color: "rgba(255,255,255,0.75)",
            marginTop: "5px",
            fontWeight: 600,
            lineHeight: 1.4,
          }}>
            {profile.full_name}<br />
            ID: {profile.student_id}
          </p>
        </div>

        {/* Nav */}
        <nav aria-label="Admin navigation" style={{
          flex: 1, padding: "14px 10px",
          display: "flex", flexDirection: "column", gap: "4px",
        }}>
          {[
            { href: "/admin/dashboard", icon: "ti-home",      label: "Home" },
            { href: "/admin/candidacy", icon: "ti-file-text", label: "Candidacy" },
            { href: "/admin/candidates",icon: "ti-users",     label: "Candidates" },
            { href: "/admin/votes",     icon: "ti-chart-bar", label: "Live Voting" },
            { href: "/admin/results",   icon: "ti-trophy",    label: "Election Result" },
            { href: "/admin/settings",  icon: "ti-settings",  label: "Settings" },
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "13px 14px", borderRadius: "10px",
              color: "rgba(255,255,255,0.85)", fontSize: "15px",
              fontWeight: 600, textDecoration: "none",
              minHeight: "48px", border: "2px solid transparent",
            }}>
              <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize: "24px", width: "28px", textAlign: "center" }} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: "14px 10px 18px", borderTop: "1px solid rgba(255,255,255,0.18)" }}>
          <form action="/auth/signout" method="post">
            <button type="submit" aria-label="Sign out of admin panel" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "10px", width: "100%", padding: "13px 14px", minHeight: "48px",
              borderRadius: "10px", background: "rgba(255,255,255,0.12)",
              border: "1.5px solid rgba(255,255,255,0.3)", color: "white",
              fontSize: "15px", fontWeight: 700, cursor: "pointer",
              fontFamily: "'Open Sans', sans-serif",
            }}>
              <i className="ti ti-logout" aria-hidden="true" style={{ fontSize: "22px" }} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, padding: "1.5rem", backgroundColor: "#f9fafb" }}>
        {children}
      </main>

    </div>
    </AdminShell>
  );
}