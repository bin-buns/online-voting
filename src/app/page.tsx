import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center"
      style={{
        backgroundImage: "url('/Background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Green overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(74, 140, 74, 0.82) 0%, rgba(144, 195, 144, 0.65) 45%, rgba(74, 140, 74, 0.80) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-4 text-center">
        <Image
          src="/Background.jpg"
          alt="Theresian School of Cavite"
          width={80}
          height={80}
          className="object-contain drop-shadow-md"
          priority
        />

        <div>
          <h1
            className="text-3xl font-extrabold leading-tight"
            style={{ color: "#7a5c00" }}
          >
            Theresian School of Cavite
          </h1>
          <p className="mt-1 text-base font-semibold tracking-wide" style={{ color: "#1a5c1a" }}>
            Online Voting System
          </p>
        </div>

        <div
          className="mt-4 w-full max-w-sm rounded-2xl p-8 shadow-2xl"
          style={{ backgroundColor: "#2d6a2d" }}
        >
          <Link
            href="/login"
            className="block w-full rounded-lg bg-white py-3 text-center text-sm font-bold tracking-widest text-green-800 shadow-md transition hover:bg-green-50 active:scale-95"
          >
            LOGIN
          </Link>
        </div>
      </div>
    </div>
  );
}