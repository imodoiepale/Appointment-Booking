import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — BookSmart",
  description: "Privacy Policy for BookSmart meeting scheduling application.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 px-4 py-12 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">BookSmart — meetings.booksmartportals.com</p>
          </div>
        </div>

        <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
          Last updated: May 2026
        </p>

        <div className="space-y-8 text-sm leading-7 text-slate-600 dark:text-slate-300">

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">1. Overview</h2>
            <p>
              BookSmart ("we", "our", or "the app") is a meeting scheduling and calendar
              management tool operated by BookSmart Consultancy Limited. This Privacy Policy
              explains how we collect, use, and protect your information when you use our
              application at{" "}
              <span className="text-teal-600 dark:text-teal-400">meetings.booksmartportals.com</span>.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">2. Information We Collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-slate-800 dark:text-white">Account information:</strong> Your name, email
                address, username, and role within the organisation, provided during account
                creation or login.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-white">Google account data:</strong> When you connect
                your Google account, we access your Google email address and Google Calendar
                to create, update, or delete calendar events on your behalf. We store an
                OAuth refresh token to maintain this connection.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-white">Meeting data:</strong> Details of meetings you
                schedule or attend, including client names, dates, times, locations, and
                attendee lists.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-white">Usage data:</strong> Basic session information
                such as login timestamps and last-active records.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">3. How We Use Your Information</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>To authenticate you and manage your session securely.</li>
              <li>
                To sync meetings to your personal Google Calendar when you choose to connect it.
              </li>
              <li>To display your meeting schedule and allow you to manage bookings.</li>
              <li>To send meeting reminders and notifications via WhatsApp or other channels you opt into.</li>
              <li>To improve the application and fix issues.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">4. Google API Data Usage</h2>
            <p>
              BookSmart uses the Google Calendar API solely to create, update, and delete
              calendar events that you explicitly initiate within the app. We do not read
              your existing calendar events, share your Google data with third parties, or
              use it for advertising purposes.
            </p>
            <p className="mt-2">
              Our use of Google user data complies with the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 dark:text-teal-400 underline underline-offset-2"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">5. Data Sharing</h2>
            <p>
              We do <strong className="text-slate-800 dark:text-white">not</strong> sell, rent, or share your
              personal data with third parties for marketing purposes. Your data may be
              processed by the following infrastructure providers solely to operate the
              service:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-slate-800 dark:text-white">Supabase</strong> — database storage (meetings,
                user accounts)
              </li>
              <li>
                <strong className="text-slate-800 dark:text-white">Firebase (Google)</strong> — authentication
                tokens
              </li>
              <li>
                <strong className="text-slate-800 dark:text-white">Vercel</strong> — application hosting
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. Meeting records are
              kept for operational and reporting purposes. If you disconnect Google Calendar,
              your OAuth tokens are deleted immediately. You may request full account deletion
              at any time.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">7. Your Rights</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Request access to the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and all associated data.</li>
              <li>Disconnect Google Calendar at any time from the app settings.</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:info@booksmartconsult.com" className="text-teal-600 dark:text-teal-400 underline underline-offset-2">
                info@booksmartconsult.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">8. Security</h2>
            <p>
              We use HTTPS for all data in transit, secure session cookies with HttpOnly and
              SameSite flags, and server-side authentication tokens. OAuth credentials are
              stored encrypted in our database and never exposed to the browser.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">9. Changes to This Policy</h2>
            <p>
              We may update this policy periodically. Continued use of the app after changes
              are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">10. Contact</h2>
            <p>
              For privacy-related questions, contact us at{" "}
              <a href="mailto:info@booksmartconsult.com" className="text-teal-600 dark:text-teal-400 underline underline-offset-2">
                info@booksmartconsult.com
              </a>
              {" "}or call{" "}
              <a href="tel:+254700298298" className="text-teal-600 dark:text-teal-400 underline underline-offset-2">
                +254 700 298 298
              </a>
              . BookSmart Consultancy Limited, Parklands, Nairobi, Kenya.
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-12 flex gap-6 border-t border-slate-200 dark:border-white/10 pt-6 text-sm text-slate-400 dark:text-slate-500">
          <Link href="/" className="hover:text-teal-600 dark:hover:text-teal-400">Home</Link>
          <Link href="/terms" className="hover:text-teal-600 dark:hover:text-teal-400">Terms of Service</Link>
        </div>

      </div>
    </div>
  );
}
