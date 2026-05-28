import Image from "next/image";
import Link from "next/link";
import { Clock, Users, CheckCircle, ArrowRight, CalendarDays, MapPin, Phone, Mail } from "lucide-react";

export const metadata = {
  title: "BCL Meetings — Time Well Meet.",
  description:
    "Streamlined appointment scheduling for BookSmart Consultancy Limited professionals. Schedule, manage, and sync meetings with Google Calendar.",
};

const features = [
  {
    icon: CalendarDays,
    title: "Smart Scheduling",
    description:
      "Schedule meetings in seconds. Select attendees, set the time, and send confirmations — all from one screen.",
  },
  {
    icon: Clock,
    title: "Google Calendar Sync",
    description:
      "Meetings you create sync automatically to your Google Calendar, keeping your schedule always up to date.",
  },
  {
    icon: Users,
    title: "Team Coordination",
    description:
      "Manage appointments across your entire team. Assign meetings, track attendance, and stay organized.",
  },
  {
    icon: CheckCircle,
    title: "Instant Notifications",
    description:
      "Real-time alerts keep everyone informed the moment a meeting is booked, updated, or cancelled.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">

      {/* Nav */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="BCL Meetings"
              width={90}
              height={28}
              className="object-contain dark:brightness-90"
              priority
            />
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-500 dark:text-slate-400 sm:flex">
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              Terms of Service
            </Link>
          </nav>
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl flex flex-col items-center">

          {/* Logo mark */}
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="BCL Meetings"
              width={160}
              height={50}
              className="object-contain dark:brightness-90"
              priority
            />
          </div>

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-600 dark:text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
            BCL Meetings — Professional Scheduling
          </div>

          <h1 className="mb-5 text-5xl font-bold tracking-tight leading-tight sm:text-6xl">
            Time Well Meet.
          </h1>
          <p className="mb-10 text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
            BCL Meetings helps your team schedule, manage, and track appointments
            — with seamless Google Calendar integration and real-time notifications.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/privacy"
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-6 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-2xl font-bold tracking-tight">
            Everything your team needs
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 dark:bg-blue-500/15">
                  <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">

            {/* Brand */}
            <div className="flex flex-col gap-3">
              <Image
                src="/logo.png"
                alt="BCL Meetings"
                width={80}
                height={25}
                className="object-contain dark:brightness-90"
              />
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                BookSmart Consultancy Limited — professional meeting scheduling platform.
              </p>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-2.5 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Parklands, Nairobi, Kenya</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <a href="tel:+254700298298" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  +254 700 298 298
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <a href="mailto:info@booksmartconsult.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  info@booksmartconsult.com
                </a>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-col gap-2.5 text-sm">
              <Link href="/privacy" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Terms of Service
              </Link>
              <Link href="/login" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Sign In
              </Link>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} BookSmart Consultancy Limited. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
