export const dynamic = 'force-dynamic'

import Link from 'next/link'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How VentureWiki collects, uses, and protects your personal information.',
}

const LAST_UPDATED = 'March 28, 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-16 md:py-20">
        {/* Header */}
        <div className="mb-12 border-b border-rule pb-8">
          <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">Legal</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-paper mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose-venturewiki space-y-10 text-paper/80 leading-relaxed">

          {/* Intro */}
          <section>
            <p className="text-paper/90 text-base">
              VentureWiki.io (&quot;VentureWiki,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your
              privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard
              your information when you use our platform. Please read it carefully. By using
              VentureWiki, you agree to the practices described below.
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">01</span> Information We Collect
            </h2>
            <div className="space-y-4 text-sm">
              <p>
                <span className="text-paper font-semibold">Account information.</span>{' '}
                When you sign in via GitHub OAuth, we receive your username, email address, and
                avatar from GitHub. We store only what is needed to identify your
                account on VentureWiki.
              </p>
              <p>
                <span className="text-paper font-semibold">Content you provide.</span>{' '}
                Business plans, wiki sections, comments, and any other content you create or
                edit on the platform are stored in our database and are generally public by
                default unless you explicitly mark them otherwise.
              </p>
              <p>
                <span className="text-paper font-semibold">Usage data.</span>{' '}
                We automatically collect information about how you interact with VentureWiki —
                pages visited, features used, time spent, and referral sources — to help us
                improve the service.
              </p>
              <p>
                <span className="text-paper font-semibold">Device &amp; log data.</span>{' '}
                Our servers log IP addresses, browser type, operating system, and timestamps
                for security, debugging, and abuse-prevention purposes.
              </p>
            </div>
          </section>

          {/* 2 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">02</span> How We Use Your Information
            </h2>
            <div className="space-y-3 text-sm">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-paper/75">
                <li>Operate, maintain, and improve the VentureWiki platform.</li>
                <li>Authenticate your identity and keep your account secure.</li>
                <li>Display your public profile and attribute your contributions.</li>
                <li>Send transactional emails (e.g., password resets, notifications you opt into).</li>
                <li>Detect and prevent fraud, spam, and other harmful activity.</li>
                <li>Comply with legal obligations and enforce our Terms of Service.</li>
                <li>Analyze aggregate usage trends to guide product decisions.</li>
              </ul>
              <p className="pt-1">
                We do <span className="text-paper font-semibold">not</span> sell your personal
                information to third parties, nor do we use it to serve targeted advertisements.
              </p>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">03</span> Cookies &amp; Tracking
            </h2>
            <div className="space-y-3 text-sm">
              <p>
                VentureWiki uses cookies and similar technologies to maintain your authenticated
                session and remember your preferences. Specifically:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-paper/75">
                <li>
                  <span className="text-paper">Session cookies</span> — required for authentication;
                  deleted when you close your browser.
                </li>
                <li>
                  <span className="text-paper">Persistent cookies</span> — used to remember that
                  you are logged in between visits (expires per your session settings).
                </li>
                <li>
                  <span className="text-paper">Analytics cookies</span> — anonymous usage data to
                  understand how our platform is used (e.g., page-view counts).
                </li>
              </ul>
              <p>
                You can disable cookies in your browser settings, but doing so may prevent you
                from signing in or using certain features.
              </p>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">04</span> Data Sharing &amp; Third Parties
            </h2>
            <div className="space-y-3 text-sm">
              <p>
                We share your data only with trusted service providers that help us operate
                VentureWiki, under strict data-processing agreements:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-paper/75">
                <li>
                  <span className="text-paper">GitHub OAuth</span> — for authentication. GitHub's
                  Privacy Policy governs data shared with GitHub.
                </li>
                <li>
                  <span className="text-paper">GitHub</span> — our primary data store
                  and version control infrastructure.
                </li>
                <li>
                  <span className="text-paper">Railway</span> — our application hosting provider.
                </li>
              </ul>
              <p>
                We may also disclose data when required by law, court order, or to protect the
                rights and safety of VentureWiki and its users.
              </p>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">05</span> Data Retention
            </h2>
            <p className="text-sm">
              We retain your account information and content for as long as your account is
              active or as needed to provide our services. If you delete your account, we will
              remove or anonymize your personal information within 30 days, except where
              retention is required by law or for legitimate business purposes such as fraud
              prevention.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">06</span> Your Rights
            </h2>
            <div className="space-y-3 text-sm">
              <p>
                Depending on your jurisdiction, you may have rights to access, correct, delete,
                or restrict the processing of your personal data. To exercise any of these rights,
                contact us at the address below. We will respond within 30 days.
              </p>
              <p>
                You may also revoke VentureWiki&apos;s access to your Google account at any time via
                your{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Google Account permissions
                </a>
                .
              </p>
            </div>
          </section>

          {/* 7 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">07</span> Children&apos;s Privacy
            </h2>
            <p className="text-sm">
              VentureWiki is not directed at children under the age of 13. We do not knowingly
              collect personal information from children. If you believe we have inadvertently
              collected such information, please contact us and we will delete it promptly.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">08</span> Security
            </h2>
            <p className="text-sm">
              We implement industry-standard security measures — including HTTPS encryption,
              access controls, and regular security reviews — to protect your information.
              However, no method of transmission over the internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">09</span> Changes to This Policy
            </h2>
            <p className="text-sm">
              We may update this Privacy Policy from time to time. When we do, we will revise
              the &quot;Last updated&quot; date at the top of this page. Continued use of VentureWiki after
              any changes constitutes your acceptance of the revised policy.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">10</span> Contact Us
            </h2>
            <div className="bg-lead border border-rule rounded-xl p-6 text-sm space-y-1">
              <p className="text-paper font-semibold">VentureWiki</p>
              <p className="text-muted">VentureWiki.io</p>
              <p>
                Email:{' '}
                <a href="mailto:privacy@venturewiki.io" className="text-accent hover:underline">
                  privacy@venturewiki.io
                </a>
              </p>
              <p className="text-muted pt-2 text-xs">
                For privacy-related inquiries, please include &quot;Privacy Request&quot; in the subject line.
              </p>
            </div>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-rule flex flex-wrap gap-4 text-sm text-muted">
          <Link href="/" className="hover:text-paper transition-colors">← Home</Link>
          <Link href="/terms" className="hover:text-paper transition-colors">Terms of Service</Link>
        </div>
      </main>
    </div>
  )
}
