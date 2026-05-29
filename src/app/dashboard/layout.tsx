import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role === "admin") redirect("/admin/dashboard");
  const { profile } = session;

  return (
    <>
      {/* ── Sidebar — truly fixed, never moves ── */}
      <aside
        aria-label="Voter sidebar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "240px",
          height: "100vh",
          backgroundColor: "#0d6b34",
          color: "white",
          display: "flex",
          flexDirection: "column",
          zIndex: 20,
          fontFamily: "'Open Sans', sans-serif",
        }}
      >
        {/* Brand */}
        <div style={{
          padding: "22px 18px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.18)",
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: "10px", textAlign: "center",
        }}>
          <Image
            src="/Logo.png"
            alt="Theresian School of Cavite"
            width={52}
            height={52}
            style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.2))" }}
          />
          <div>
            <div style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: "14px", fontWeight: 700,
              letterSpacing: "0.05em", textTransform: "uppercase",
              lineHeight: 1.25, color: "#fff",
            }}>
              Smart Voting<br />System
            </div>
            <p style={{
              fontSize: "11px", color: "rgba(255,255,255,0.7)",
              marginTop: "5px", fontWeight: 600, lineHeight: 1.4, margin: "5px 0 0",
            }}>
              {profile.full_name}<br />
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>
                ID: {profile.student_id}
              </span>
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav aria-label="Voter navigation" style={{
          flex: 1, padding: "14px 10px",
          display: "flex", flexDirection: "column", gap: "4px",
        }}>
          {[
  { href: "/dashboard",            icon: "ti-home",      label: "Home"             },
  { href: "/dashboard/candidacy",  icon: "ti-file-text", label: "Submit Candidacy" },
  ...(profile.role === "candidate" ? [
    { href: "/dashboard/campaign", icon: "ti-speakerphone", label: "My Posters" },
  ] : []),
  { href: "/dashboard/candidates", icon: "ti-users",     label: "Candidates"       },
  { href: "/dashboard/vote",       icon: "ti-writing",   label: "Vote"             },
  { href: "/dashboard/results",    icon: "ti-trophy",    label: "Election Result"  },
  { href: "/dashboard/settings",   icon: "ti-settings",  label: "Settings"         },
].map(({ href, icon, label }) => (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "13px 14px", borderRadius: "10px",
              color: "rgba(255,255,255,0.85)", fontSize: "14px",
              fontWeight: 600, textDecoration: "none",
              minHeight: "48px", border: "2px solid transparent",
              transition: "background 0.15s, color 0.15s",
            }}>
              <i className={`ti ${icon}`} aria-hidden="true"
                style={{ fontSize: "22px", width: "26px", textAlign: "center" }} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: "14px 10px 18px", borderTop: "1px solid rgba(255,255,255,0.18)" }}>
          <form action="/auth/signout" method="post">
            <button type="submit" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "10px", width: "100%", padding: "13px 14px", minHeight: "48px",
              borderRadius: "10px", background: "rgba(255,255,255,0.12)",
              border: "1.5px solid rgba(255,255,255,0.3)", color: "white",
              fontSize: "14px", fontWeight: 700, cursor: "pointer",
              fontFamily: "'Open Sans', sans-serif",
            }}>
              <i className="ti ti-logout" aria-hidden="true" style={{ fontSize: "22px" }} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Content — offset by sidebar width, scrolls freely ── */}
      <div
        data-scroll-container
        style={{
          marginLeft: "240px",
          minHeight: "100vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {children}
      </div>
    </>
  );
}