import Link from "next/link";
import type { Profile } from "@/types/database";

const navByRole: Record<Profile["role"], { href: string; label: string }[]> = {
  admin: [
    { href: "/dashboard", label: "Overview" },
    { href: "/admin/election", label: "Election schedule" },
    { href: "/admin/positions", label: "Positions" },
    { href: "/admin/candidates", label: "Candidates" },
    { href: "/admin/votes", label: "Votes" },
    { href: "/results", label: "Results" },
  ],
  voter: [
    { href: "/dashboard", label: "Home" },
    { href: "/candidates", label: "Candidates" },
    { href: "/vote", label: "Vote" },
    { href: "/results", label: "Results" },
  ],
  candidate: [
    { href: "/dashboard", label: "Home" },
    { href: "/candidate/profile", label: "My candidacy" },
    { href: "/candidate/campaign", label: "My Posters" },
    { href: "/candidates", label: "All candidates" },
    { href: "/results", label: "Results" },
  ],
};

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const links = navByRole[profile.role];

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)]">
              Smart Voting System
            </p>
            <p className="text-xs text-[var(--muted)]">
              {profile.full_name} · {profile.student_id}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn btn-secondary text-sm">
              Sign out
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--foreground)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}