import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { SocialAuthButton } from "@/components/auth/social-auth-button";

export const metadata: Metadata = {
  title: "Log In",
  description:
    "Sign in to your Home Wise Realty Group account to access saved searches, favorites, and property alerts.",
};

export default function LoginPage() {
  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-cream-50" />
      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-br from-navy-50/60 via-transparent to-transparent" />
      <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-crimson-50/40 blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-elevated border border-slate-100 p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-navy-600 mb-4">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15m-3 0l-3-3m0 0l3-3m-3 3H15" />
              </svg>
            </div>
            <h1 className="font-serif text-display-sm text-navy-700 mb-2">Welcome Back</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Sign in to access your dashboard and saved properties
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

          {/* Login form (wrapped in Suspense for useSearchParams) */}
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-crimson-600 hover:text-crimson-700 transition-colors">
              Register
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex rounded-lg bg-slate-100 h-9" />
      <div>
        <div className="h-4 w-12 bg-slate-100 rounded mb-1.5" />
        <div className="h-11 bg-slate-100 rounded-xl" />
      </div>
      <div>
        <div className="h-4 w-16 bg-slate-100 rounded mb-1.5" />
        <div className="h-11 bg-slate-100 rounded-xl" />
      </div>
      <div className="h-12 bg-slate-100 rounded-xl" />
    </div>
  );
}
