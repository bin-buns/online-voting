import Image from "next/image";
import { verifyOtpAction, resendOtpAction } from "@/app/actions/otp";

type VerifyOtpScreenProps = { error?: string; message?: string };

export function VerifyOtpScreen({ error, message }: VerifyOtpScreenProps) {
  return (
    <section className="tsc-login" aria-labelledby="otp-heading">
      <div className="tsc-login__bg" aria-hidden="true">
        <Image src="/Background.jpg" alt="" fill priority style={{ objectFit: "cover", objectPosition: "center" }} />
      </div>
      <header className="tsc-login__brand">
        <Image src="/Logo.png" alt="Theresian School of Cavite" width={100} height={100} className="tsc-login__crest" priority />
        <h1 className="tsc-login__school">Theresian School of Cavite</h1>
        <p className="tsc-login__system">Online Voting System</p>
      </header>
      <div className="tsc-login__card tsc-login__card--verify">
        <div aria-hidden="true" className="tsc-login__verify-icon"><i className="ti ti-mail-check" /></div>
        <h2 id="otp-heading" className="tsc-login__verify-title">Verify your email</h2>
        <p className="tsc-login__verify-copy">Enter the 6-digit verification code we sent to your email. The code expires in 5 minutes.</p>
        {error && <p className="tsc-login__alert tsc-login__alert--error" role="alert">{error}</p>}
        {message && <p className="tsc-login__alert tsc-login__alert--ok" role="status">{message}</p>}
        <form action={verifyOtpAction} className="tsc-login__form">
          <label htmlFor="otp-code" className="tsc-login__verify-label">VERIFICATION CODE</label>
          <input id="otp-code" className="tsc-login__verify-input" type="text" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" autoComplete="one-time-code" aria-describedby="otp-help" required />
          <span id="otp-help" className="tsc-login__verify-help">Enter all six digits from the email.</span>
          <button type="submit" className="tsc-login__btn">VERIFY AND CONTINUE</button>
        </form>
        <form action={resendOtpAction} className="tsc-login__verify-resend"><button type="submit" className="tsc-login__forgot">Didn’t receive it? Resend code</button></form>
      </div>
    </section>
  );
}
