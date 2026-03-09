import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Reset Password | Homewise" };

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <ResetPasswordForm />
    </main>
  );
}
