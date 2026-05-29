import { LoginScreen } from "@/components/auth/LoginScreen";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return <LoginScreen error={params.error} message={params.message} />;
}
