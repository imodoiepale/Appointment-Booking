import { LoginForm } from "@/components/auth/LoginForm";
import { Calendar, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(13,170,138,0.28),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(59,130,246,0.20),transparent_26%),linear-gradient(135deg,#020617_0%,#0f172a_48%,#10211f_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-slate-950/40 md:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden bg-slate-950 p-8 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#0DAA8A] shadow-lg shadow-[#0DAA8A]/25">
              <Calendar className="h-5 w-5" />
            </div>
            <h1 className="mt-8 text-3xl font-bold tracking-tight">BCL Appointments</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
              A focused workspace for booked meetings, confirmations, reschedules, and calendar sync.
            </p>
          </div>

          <div className="grid gap-3">
            {["Secure session cookies", "Google Calendar sync", "Client-ready meeting records"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                <ShieldCheck className="h-4 w-4 text-[#0DAA8A]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-8 md:hidden">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#0DAA8A] text-white shadow-lg shadow-[#0DAA8A]/25">
              <Calendar className="h-6 w-6" />
            </div>
          </div>

          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0DAA8A]">Secure access</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Sign in to Meeting Dashboard</h2>
            <p className="mt-2 text-sm text-slate-500">Use your BCL account to continue.</p>
          </div>

          <LoginForm />

          <p className="mt-6 text-xs text-slate-400">
            BCL Meetings - Powered by Booksmart Consult Limited
          </p>
        </div>
      </div>
    </div>
  );
}
