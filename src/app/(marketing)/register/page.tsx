import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { SocialAuthButton } from "@/components/auth/social-auth-button";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Register for free MLS access, saved searches, property alerts, and more with Home Wise Realty Group.",
};

export default function RegisterPage() {
  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-cream-50" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-navy-50/60 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-crimson-50/40 blur-3xl -translate-x-1/3 translate-y-1/3" />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-elevated border border-slate-100 p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-navy-600 mb-4">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h1 className="font-serif text-display-sm text-navy-700 mb-2">Create Your Account</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Get free MLS access, saved searches, and property alerts
            </p>
          </div>

          {/* Google OAuth */}
          <SocialAuthButton />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider">or</span>
            </div>
          </div>

          {/* Register form */}
          <RegisterForm />

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-crimson-600 hover:text-crimson-700 transition-colors">
              Log In
            </Link>
          </p>
        </div>

        {/* Trust indicators */}
        <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
          <br />
          Your data is protected and will never be shared.
        </p>
      </div>
    </section>
  );
}
