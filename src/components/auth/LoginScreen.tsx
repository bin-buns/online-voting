import Image from "next/image";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";

type LoginScreenProps = {
  error?: string;
  message?: string;
};

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16v12H4V6zm8 6.5L5.5 8h13L12 12.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 11V8a4 4 0 1 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoginScreen({ error, message }: LoginScreenProps) {
  return (
    <section className="tsc-login">
      <div className="tsc-login__bg" aria-hidden="true">
  <Image
    src="/Background.jpg"
    alt=""
    fill
    priority
    style={{ objectFit: "cover", objectPosition: "center" }}
  />
</div>

      <header className="tsc-login__brand">
        <Image
          src="/Logo.png"
          alt="Theresian School of Cavite"
          width={100}
          height={100}
          className="tsc-login__crest"
          priority
        />
        <h1 className="tsc-login__school">Theresian School of Cavite</h1>
        <p className="tsc-login__system">Online Voting System</p>
      </header>

      <div className="tsc-login__card">
        {error ? (
          <p className="tsc-login__alert tsc-login__alert--error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="tsc-login__alert tsc-login__alert--ok" role="status">
            {message}
          </p>
        ) : null}

        <form action={signIn} className="tsc-login__form">
          <label className="tsc-login__field">
            <span className="tsc-login__icon">
              <MailIcon />
            </span>
            <input
              type="email"
              name="email"
              placeholder="Email"
              autoComplete="email"
              required
            />
          </label>

          <label className="tsc-login__field">
            <span className="tsc-login__icon">
              <LockIcon />
            </span>
            <input
              type="password"
              name="password"
              placeholder="Password"
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className="tsc-login__btn">
            LOGIN
          </button>
        </form>

        <Link href="/forgot-password" className="tsc-login__forgot">
          Forgot your password?
        </Link>
      </div>
    </section>
  );
}
