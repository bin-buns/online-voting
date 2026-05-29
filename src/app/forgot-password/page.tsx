import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <section className="tsc-login">
      <span className="tsc-login__bg" aria-hidden="true" />
      <article className="tsc-login__card" style={{ marginTop: "4rem" }}>
        <h1 className="tsc-login__system" style={{ color: "#fff", marginBottom: "0.75rem" }}>
          Forgot password
        </h1>
        <p style={{ color: "rgb(255 255 255 / 0.9)", fontSize: "0.875rem", lineHeight: 1.5 }}>
          Contact your election administrator to reset your password, or use the email you
          registered with.
        </p>
        <Link href="/login" className="tsc-login__forgot" style={{ marginTop: "1.25rem" }}>
          Back to login
        </Link>
      </article>
    </section>
  );
}
