# VentureWiki

**The collaborative encyclopedia for digital business plans.**

> Build, share, and iterate on structured business plans for Web Apps, Websites, and AI-Agent-as-a-Service ventures — together, Wikipedia-style.

**Domain:** `venturewiki.io`  
**Stack:** Next.js 14 · GitHub API · NextAuth · TypeScript · Tailwind CSS · Stripe

---

## What It Does

VentureWiki is a multi-user wiki platform where each entry is a fully structured business plan following the **5-page Digital Business Plan template**:

| Page | Content |
|------|---------|
| 01 · Cover & Snapshot | Company name, stage, mission, vision, traction highlights |
| 02 · Problem & Market | Pain dimensions, solution features, TAM/SAM/SOM |
| 03 · Product & GTM | Tech stack, GTM channels, ICP, competitive matrix |
| 04 · Team & Roadmap | Founders, KPIs, 12-month milestones |
| 05 · Funding Ask | Raise details, use of funds, elevator pitch, risk register |
| 📊 Financials | Revenue model, burn, runway, 4-year projections |

**Multi-user:** GitHub OAuth login. All edits are tracked (wiki-style revision history via Git).  
**Admin panel:** Full dashboard with stats, user management, featured curation, and activity feed.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 App Router | SSR, file-based routing, API routes |
| Auth | NextAuth v4 + GitHub OAuth | One-click GitHub sign-in, JWT sessions |
| Database | GitHub API (Repos + YAML) | Git-backed storage, version history built-in |
| Payments | Stripe | Pro subscriptions, billing portal |
| Styling | Tailwind CSS | Utility-first, consistent design tokens |
| Fonts | Playfair Display + DM Sans | Editorial, newspaper-inspired aesthetic |
| Animations | Framer Motion | Card reveals, page transitions |
| Forms | React Hook Form + Zod | Performant forms with validation |
| Toast | Sonner | Clean notification system |
| Charts | Recharts | Admin dashboard charts |

---

## Data Storage (GitHub API)

Business plans are stored as YAML files in GitHub repos under the `venturewiki` organization. Each venture is a repo with structured plan data, giving you Git-backed version history for free.

---

## Quick Start

### Prerequisites
- Node.js 18+
- A GitHub OAuth App
- A GitHub organization (for storing venture repos)
- A Stripe account (for Pro subscriptions)

### 1. Clone and install

```bash
git clone https://github.com/ABFS-Inc/venturewiki.git
cd venturewiki
npm install
```

### 2. Set up GitHub OAuth

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Create a new **OAuth App**
3. Add authorized callback URLs:
   - `http://localhost:3000/api/auth/callback/github` (dev)
   - `https://yourdomain.com/api/auth/callback/github` (prod)
4. Copy Client ID and Client Secret

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_ADMIN_TOKEN=your_github_pat
NEXT_PUBLIC_GITHUB_ORG=venturewiki

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

GEMINI_API_KEY=your_gemini_key
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**First user to sign in automatically becomes admin.**

---

## Project Structure

```
venturewiki/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Home — business card grid
│   │   ├── layout.tsx                # Root layout + fonts + providers
│   │   ├── globals.css               # Design system CSS
│   │   ├── admin/
│   │   │   ├── page.tsx              # Admin dashboard
│   │   │   ├── users/page.tsx        # User management
│   │   │   ├── businesses/page.tsx   # All businesses table
│   │   │   ├── activity/page.tsx     # Edit activity feed
│   │   │   ├── featured/page.tsx     # Featured curation
│   │   │   ├── layout.tsx            # Admin auth guard
│   │   │   └── AdminSidebar.tsx      # Sidebar nav
│   │   ├── api/auth/[...nextauth]/   # NextAuth API
│   │   ├── auth/signin/              # Sign-in page
│   │   └── business/
│   │       ├── new/page.tsx          # Create business plan
│   │       └── [slug]/
│   │           ├── page.tsx          # Business detail (wiki view)
│   │           └── edit/page.tsx     # Edit business plan
│   ├── components/
│   │   ├── business/BusinessCard.tsx # Card for the grid
│   │   └── layout/
│   │       ├── Navbar.tsx            # Top navigation
│   │       └── Providers.tsx         # SessionProvider wrapper
│   ├── lib/
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── db.ts                     # GitHub API data layer
│   │   ├── stripe.ts                 # Stripe SDK + dynamic pricing
│   │   └── utils.ts                  # Helpers + constants
│   └── types/
│       ├── index.ts                  # All TypeScript types
│       └── next-auth.d.ts            # Session type extension
├── .env.example                      # Environment variable template
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Deployment

### Vercel (recommended — free tier)

```bash
npm install -g vercel
vercel
```

Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

Set `NEXTAUTH_URL` to your Vercel production URL.

### Manual / other platforms

```bash
npm run build
npm start
```

---

## User Roles

| Role | Can Do |
|------|--------|
| `viewer` | Read public business plans |
| `editor` | Create businesses, edit any business they're a contributor on, comment |
| `admin` | Everything — manage users, feature/archive any business, full admin panel |

The **first user to sign in** is automatically assigned `admin` role.  
Subsequent users get `editor` by default. Admins can change roles from the Users panel.

---

## Design System

**Brand colors:**
```
ink     #0A0A0F   — near-black background
paper   #F7F5F0   — warm off-white text
lead    #1C1C28   — card/sidebar background
accent  #E8622A   — electric orange-red (CTAs, highlights)
teal    #00B4A0   — secondary accent
gold    #D4A843   — premium/featured indicator
muted   #7A7A96   — secondary text
rule    #2E2E40   — borders/dividers
```

**Fonts:**
- Display: Playfair Display (serif) — headings, company names
- Body: DM Sans — UI text, descriptions
- Mono: JetBrains Mono — code, slugs, metrics

**Aesthetic:** Editorial dark — inspired by Bloomberg Terminal meets Wikipedia meets Linear.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT — free to use, modify, and distribute.

---

*Built with Next.js 14, GitHub API, Stripe, and a lot of ☕*


Notes and next steps: 
Consider integration with `similarweb.com`, and `liveplan.com`