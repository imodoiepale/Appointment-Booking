import { FileText } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service — BookSmart",
  description: "Terms of Service for BookSmart meeting scheduling application.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 px-4 py-12 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">BookSmart — meetings.booksmartportals.com</p>
          </div>
        </div>

        <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
          Last updated: May 2026
        </p>

        <div className="space-y-8 text-sm leading-7 text-slate-600 dark:text-slate-300">

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using BookSmart ("the app") at{" "}
              <span className="text-teal-600 dark:text-teal-400">meetings.booksmartportals.com</span>, you
              agree to be bound by these Terms of Service. If you do not agree, do not use
              the app.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">2. Who Can Use the App</h2>
            <p>
              BookSmart is a meeting scheduling tool operated by BookSmart Consultancy Limited.
              Access is granted only to authorised staff and approved external users. Accounts
              are created and managed by system administrators.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">3. User Responsibilities</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>You are responsible for keeping your login credentials confidential.</li>
              <li>
                You must not share your account with others or allow unauthorised access.
              </li>
              <li>
                You must not use the app to schedule or record fraudulent, misleading, or
                inappropriate meetings.
              </li>
              <li>
                You must not attempt to reverse-engineer, scrape, or abuse the app or its
                APIs.
              </li>
              <li>
                When connecting your Google account, you authorise BookSmart to access your
                Google Calendar only for meeting sync purposes as described in our Privacy
                Policy.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">4. Google Calendar Integration</h2>
            <p>
              The Google Calendar sync feature is optional. By connecting your Google account,
              you grant BookSmart permission to create, update, and delete calendar events on
              your behalf. You can disconnect at any time from the app. Disconnecting will
              revoke our access and delete your stored OAuth credentials.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">5. Data Ownership</h2>
            <p>
              Meeting data you enter into BookSmart belongs to BookSmart Consultancy Limited
              for operational and reporting purposes. Personal data (your name, email,
              credentials) belongs to you. See our{" "}
              <Link href="/privacy" className="text-teal-600 dark:text-teal-400 underline underline-offset-2">
                Privacy Policy
              </Link>{" "}
              for details on how it is handled.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">6. Availability</h2>
            <p>
              We aim to keep BookSmart available at all times but do not guarantee uninterrupted
              access. We may perform maintenance, updates, or changes to the service at any
              time. We are not liable for losses caused by downtime.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">7. Account Termination</h2>
            <p>
              Administrators may suspend or terminate any account that violates these terms,
              misuses the system, or is no longer required. You may also request deletion of
              your own account by contacting us.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">8. Limitation of Liability</h2>
            <p>
              BookSmart is provided "as is". BookSmart Consultancy Limited is not liable for
              any indirect, incidental, or consequential damages arising from use of the app,
              including missed meetings due to system errors or calendar sync failures.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">9. Changes to These Terms</h2>
            <p>
              We may update these terms at any time. Continued use of the app after changes
              are posted means you accept the revised terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">10. Contact</h2>
            <p>
              Questions about these terms? Contact us at{" "}
              <a
                href="mailto:info@booksmartconsult.com"
                className="text-teal-600 dark:text-teal-400 underline underline-offset-2"
              >
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
          <Link href="/privacy" className="hover:text-teal-600 dark:hover:text-teal-400">Privacy Policy</Link>
        </div>

      </div>
    </div>
  );
}
