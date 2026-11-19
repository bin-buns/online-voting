import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { VerifyOtpScreen } from "@/components/auth/VerifyOtpScreen";

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const cookieStore = await cookies();
  const pendingUserId = cookieStore.get("otp_pending")?.value;
  if (!pendingUserId) redirect("/login");

  const { error, message } = await searchParams;
  return <VerifyOtpScreen error={error} message={message} />;
}