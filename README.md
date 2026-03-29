# VentureWiki

**The collaborative encyclopedia for digital business plans.**

> Build, share, and iterate on structured business plans for Web Apps, Websites, and AI-Agent-as-a-Service ventures — together, Wikipedia-style.

**Domain:** `venturewiki.io`  
**Stack:** Next.js 14 · Firebase · NextAuth · TypeScript · Tailwind CSS

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

**Multi-user:** Google OAuth login. All edits are tracked (wiki-style revision history).  
**Admin panel:** Full dashboard with stats, user management, featured curation, and activity feed.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 App Router | SSR, file-based routing, API routes |
| Auth | NextAuth v4 + Google OAuth | One-click Google sign-in, JWT sessions |
| Database | Firebase Firestore | Real-time, free tier (50K reads/day), scales to millions |
| Storage | Firebase Storage | File uploads (logos, attachments) |
| Styling | Tailwind CSS | Utility-first, consistent design tokens |
| Fonts | Playfair Display + DM Sans | Editorial, newspaper-inspired aesthetic |
| Animations | Framer Motion | Card reveals, page transitions |
| Forms | React Hook Form + Zod | Performant forms with validation |
| Toast | Sonner | Clean notification system |
| Charts | Recharts | Admin dashboard charts |

---

## Database Design (Firestore)

```
/users/{uid}
  id, email, name, image, role (viewer|editor|admin)
  businessesCreated, editsCount, createdAt, lastActiveAt

/businesses/{id}
  id, slug, createdBy, contributors[], isPublic, isArchived, isFeatured
  viewCount, editCount, createdAt, updatedAt
  cover { companyName, tagline, mission, vision, stage, productType, … }
  problemSolution { corePainPoint, features[], market{tam,sam,som}, … }
  productGtm { techStack{}, gtmChannels[], competitors[], … }
  teamRoadmap { founders[], kpis[], milestones[], … }
  fundingAsk { totalRaise, useOfFunds[], elevatorPitch{}, risks[], … }
  financials { revenueModel, cac, ltv, projections[], … }

/edits/{id}
  businessId, userId, timestamp, section, summary

/comments/{id}
  businessId, userId, content, createdAt, parentId?
```

**Free tier limits (Firebase Spark):**
- 50,000 reads/day · 20,000 writes/day · 20,000 deletes/day
- 1 GiB storage · 10 GiB/month transfer

Upgrade to Blaze (pay-as-you-go) when you exceed free limits — cost is typically < $1/month for early-stage.

---

## Quick Start

### Prerequisites
- Node.js 18+
- A Google Cloud project (for OAuth)
- A Firebase project (for Firestore)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/venturewiki.git
cd venturewiki
npm install
```

### 2. Set up Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable **Firestore Database** (start in test mode, then apply rules)
4. Enable **Authentication → Google provider**
5. Go to **Project Settings → Your apps → Add web app**
6. Copy the config values

Deploy Firestore rules and indexes:
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only firestore:rules,firestore:indexes
```

### 3. Set up Google OAuth

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Create **OAuth 2.0 Client ID** → Web application
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://yourdomain.com/api/auth/callback/google` (prod)
4. Copy Client ID and Client Secret

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **Getting the Admin private key:** Firebase Console → Project Settings → Service Accounts → Generate new private key → download JSON → copy `private_key` and `client_email` values.

### 5. Run development server

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
│   │   ├── firebase.ts               # Firebase client init
│   │   ├── firebase-admin.ts         # Firebase Admin SDK
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── db.ts                     # Firestore data layer
│   │   └── utils.ts                  # Helpers + constants
│   └── types/
│       ├── index.ts                  # All TypeScript types
│       └── next-auth.d.ts            # Session type extension
├── firestore.rules                   # Security rules
├── firestore.indexes.json            # Composite indexes
├── firebase.json                     # Firebase project config
├── .env.local.example                # Environment variable template
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

*Built with Next.js 14, Firebase, and a lot of ☕*


Notes and next steps: 
Consider integration with `similarweb.com`, and `liveplan.com`