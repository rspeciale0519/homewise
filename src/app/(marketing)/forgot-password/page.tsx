import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Forgot Password | Homewise" };

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <ForgotPasswordForm />
    </main>
  );
}
