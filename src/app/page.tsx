import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
      <div className="card space-y-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
          Capstone · Organization Elections
        </p>
        <h1 className="text-4xl font-bold">Smart Voting System</h1>
        <p className="text-[var(--muted)]">
          Students log in to review candidates, read campaign posts, and cast
          secure votes. Results publish automatically on the date set by the admin.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/login" className="btn btn-primary">
            Student login
          </Link>
          <Link href="/register" className="btn btn-secondary">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
