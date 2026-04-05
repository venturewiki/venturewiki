export const dynamic = 'force-dynamic'

import Link from 'next/link'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms and conditions governing your use of VentureWiki.',
}

const LAST_UPDATED = 'March 28, 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-16 md:py-20">
        {/* Header */}
        <div className="mb-12 border-b border-rule pb-8">
          <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">Legal</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-paper mb-4">
            Terms of Service
          </h1>
          <p className="text-muted text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-10 text-paper/80 leading-relaxed">

          {/* Intro */}
          <section>
            <p className="text-paper/90 text-base">
              Welcome to VentureWiki.io. These Terms of Service (&quot;Terms&quot;) constitute a legally
              binding agreement between you and VentureWiki (&quot;VentureWiki,&quot; &quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;) governing your access to and use of our platform. By creating an account or
              using VentureWiki in any way, you agree to be bound by these Terms.
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">01</span> Acceptance of Terms
            </h2>
            <div className="space-y-3 text-sm">
              <p>
                By accessing or using VentureWiki, you represent that you are at least 13 years
                of age, have the legal capacity to enter into a binding contract, and agree to
                these Terms and our{' '}
                <Link href="/privacy" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
              <p>
                If you are using VentureWiki on behalf of a company or organization, you
                represent that you have the authority to bind that entity to these Terms, and
                &quot;you&quot; refers to that entity.
              </p>
            </div>
          </section>

          {/* 2 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">02</span> Description of Service
            </h2>
            <p className="text-sm">
              VentureWiki is a collaborative wiki-style platform for creating, sharing, and
              iterating on digital business plans — including Web Apps, Websites, AI Agents, APIs,
              and related ventures. We provide tools for writing structured business plans,
              collaborating with others, and discovering startup ideas. We reserve the right to
              modify, suspend, or discontinue any part of the service at any time with or without
              notice.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">03</span> User Accounts
            </h2>
            <div className="space-y-3 text-sm">
              <p>
                You must sign in via GitHub OAuth to create content on VentureWiki. You are
                responsible for all activity that occurs under your account. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-paper/75">
                <li>Provide accurate and current information when creating your account.</li>
                <li>Keep your credentials secure and notify us immediately of any unauthorized use.</li>
                <li>Not share your account with others or allow third-party access.</li>
                <li>Not create multiple accounts to circumvent suspensions or restrictions.</li>
              </ul>
              <p>
                We reserve the right to suspend or terminate accounts that violate these Terms.
              </p>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">04</span> Acceptable Use
            </h2>
            <div className="space-y-3 text-sm">
              <p>You agree not to use VentureWiki to:</p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-paper/75">
                <li>Post content that is false, misleading, defamatory, or fraudulent.</li>
                <li>Infringe upon the intellectual property rights of any third party.</li>
                <li>Upload or distribute viruses, malware, or other harmful code.</li>
                <li>Scrape, crawl, or harvest data from the platform without our express consent.</li>
                <li>Attempt to gain unauthorized access to any part of the service or its infrastructure.</li>
                <li>Use the service to spam, harass, or harm other users.</li>
                <li>Violate any applicable local, national, or international law or regulation.</li>
              </ul>
              <p>
                We reserve the right to remove any content and suspend any account that we
                determine, in our sole discretion, to be in violation of these rules.
              </p>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">05</span> Intellectual Property
            </h2>
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-paper font-semibold">Your content.</span>{' '}
                You retain ownership of all original content you submit to VentureWiki. By
                posting content, you grant VentureWiki a worldwide, non-exclusive, royalty-free
                license to display, reproduce, and distribute that content on the platform and
                in promotional materials related to VentureWiki.
              </p>
              <p>
                <span className="text-paper font-semibold">Our platform.</span>{' '}
                The VentureWiki name, logo, design, software, and all other platform materials
                are the exclusive property of VentureWiki and are protected by intellectual
                property laws. You may not copy, modify, or distribute our platform assets
                without prior written permission.
              </p>
              <p>
                <span className="text-paper font-semibold">User-generated content.</span>{' '}
                Content on VentureWiki is created by users and is not endorsed or verified by
                us. We are not responsible for the accuracy or legality of user-submitted content.
              </p>
            </div>
          </section>

          {/* 6 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">06</span> Privacy
            </h2>
            <p className="text-sm">
              Your use of VentureWiki is also governed by our{' '}
              <Link href="/privacy" className="text-accent hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference. Please review our Privacy
              Policy to understand our data collection and use practices.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">07</span> Disclaimers
            </h2>
            <div className="space-y-3 text-sm">
              <p>
                VentureWiki is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without
                warranties of any kind, either express or implied, including but not limited to
                warranties of merchantability, fitness for a particular purpose, or
                non-infringement.
              </p>
              <p>
                We do not warrant that the service will be uninterrupted, error-free, or free of
                viruses. Business plans and content on VentureWiki are user-generated and for
                informational purposes only — nothing on this platform constitutes financial,
                legal, or investment advice.
              </p>
            </div>
          </section>

          {/* 8 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">08</span> Limitation of Liability
            </h2>
            <p className="text-sm">
              To the fullest extent permitted by applicable law, VentureWiki and its officers,
              directors, employees, and agents shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages — including loss of profits, data, or
              goodwill — arising from your use of (or inability to use) the service, even if we
              have been advised of the possibility of such damages. Our total liability to you
              for any claim arising from these Terms shall not exceed the greater of $100 USD or
              the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">09</span> Termination
            </h2>
            <p className="text-sm">
              You may stop using VentureWiki at any time. We may suspend or terminate your access
              to the service immediately, without prior notice, if we believe you have violated
              these Terms or if we discontinue the service. Upon termination, all licenses
              granted to you under these Terms will immediately cease.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">10</span> Governing Law
            </h2>
            <p className="text-sm">
              These Terms are governed by and construed in accordance with the laws of the
              United States, without regard to conflict-of-law principles. Any disputes arising
              under these Terms shall be resolved exclusively in the competent courts of the
              United States.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">11</span> Changes to These Terms
            </h2>
            <p className="text-sm">
              We reserve the right to modify these Terms at any time. When we make material
              changes, we will update the &quot;Last updated&quot; date at the top of this page. Your
              continued use of VentureWiki after any changes constitutes your acceptance of the
              revised Terms.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="font-display text-xl font-bold text-paper mb-3 flex items-center gap-3">
              <span className="text-accent font-mono text-sm">12</span> Contact Us
            </h2>
            <div className="bg-lead border border-rule rounded-xl p-6 text-sm space-y-1">
              <p className="text-paper font-semibold">VentureWiki</p>
              <p className="text-muted">VentureWiki.io</p>
              <p>
                Email:{' '}
                <a href="mailto:legal@venturewiki.io" className="text-accent hover:underline">
                  legal@venturewiki.io
                </a>
              </p>
              <p className="text-muted pt-2 text-xs">
                For legal inquiries, please include &quot;Terms of Service&quot; in the subject line.
              </p>
            </div>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-rule flex flex-wrap gap-4 text-sm text-muted">
          <Link href="/" className="hover:text-paper transition-colors">← Home</Link>
          <Link href="/privacy" className="hover:text-paper transition-colors">Privacy Policy</Link>
        </div>
      </main>
    </div>
  )
}
