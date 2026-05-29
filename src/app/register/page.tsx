import Link from "next/link";
import { signUp } from "@/app/actions/auth";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="card space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-sm text-[var(--muted)]">
            Register as a voter or candidate. Admin accounts are created by your adviser in Supabase.
          </p>
        </div>
        {params.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
        )}
        <form action={signUp} className="space-y-4">
          <Field id="student_id" label="Student ID" />
          <Field id="full_name" label="Full name" />
          <Field id="email" label="Email" type="email" />
          <Field id="password" label="Password" type="password" minLength={8} />
          <div>
            <label className="label" htmlFor="role">
              Account type
            </label>
            <select className="input" id="role" name="role" defaultValue="voter">
              <option value="voter">Voter (cast votes)</option>
              <option value="candidate">Candidate (run + campaign)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Register
          </button>
        </form>
        <p className="text-center text-sm text-[var(--muted)]">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-[var(--primary)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  minLength,
}: {
  id: string;
  label: string;
  type?: string;
  minLength?: number;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input className="input" id={id} name={id} type={type} minLength={minLength} required />
    </div>
  );
}
