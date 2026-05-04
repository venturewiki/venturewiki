// ── Subscription tiers ────────────────────────────────────────────────────────
export type SubscriptionTier   = 'free' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'none'

// ── User (backed by GitHub user profile) ──────────────────────────────────────
export interface VWUser {
  id: string            // GitHub user ID (numeric string)
  login: string         // GitHub username (e.g. "octocat")
  email: string
  name: string
  image?: string        // GitHub avatar URL
  role: 'viewer' | 'editor' | 'admin'
  createdAt: string
  lastActiveAt: string
  businessesCreated: number
  editsCount: number
  // ── Stripe subscription ──
  stripeCustomerId?: string
  subscriptionTier: SubscriptionTier
  subscriptionStatus: SubscriptionStatus
  subscriptionId?: string        // Stripe subscription ID
  subscriptionExpiresAt?: string // ISO date
}

// ── Business Plan (mirrors the 5-page template) ───────────────────────────────
export type BusinessStage = 'idea' | 'mvp' | 'beta' | 'live' | 'scaling' | 'exited'
export type ProductType   = 'web-app' | 'website' | 'ai-agent' | 'api' | 'hybrid' | 'other'
export type FundingStage  = 'bootstrapped' | 'pre-seed' | 'seed' | 'series-a' | 'series-b+'

export interface BusinessPlan {
  // ── Meta ──────────────────────────────────────────────────────────────────
  id: string
  slug: string
  owner?: string           // GitHub owner login (org or user) — added in Phase 2
  createdAt: string
  updatedAt: string
  createdBy: string        // user id
  contributors: string[]  // user ids
  viewCount: number
  editCount: number
  isPublic: boolean
  isArchived: boolean
  isFeatured: boolean

  // ── Raw plan.yaml round-trip (only set on the single-business GET) ────────
  // _planRaw is the verbatim file content as it lives in the repo. Used by
  // the in-app YAML editors so users can hand-edit the file when it's
  // malformed, or edit a single section as a YAML subtree.
  // _planError is the js-yaml parse error message (if any). When present,
  // the rest of the plan is a placeholder stub.
  _planRaw?: string
  _planError?: string
  // GitHub team scoped to this venture's repo (stored in plan.yaml).
  // Used to scope email invitations so invitees only get access to this repo.
  _githubTeamId?: number

  // ── Page 1: Cover & Snapshot ─────────────────────────────────────────────
  cover: {
    companyName: string
    tagline: string
    mission: string
    vision: string
    productType: ProductType
    industryVertical: string
    stage: BusinessStage
    fundingStage: FundingStage
    headquarters: string
    legalStructure: string
    websiteUrl?: string
    logoEmoji?: string      // quick visual identifier
    accentColor?: string    // hex, used on card
    version: string
    preparedBy: string
    fundingSought?: string
    tractionHighlights: {
      revenue?: string
      users?: string
      partnerships?: string
      press?: string
    }
  }

  // ── Page 2: Problem · Solution · Market ──────────────────────────────────
  problemSolution: {
    corePainPoint: string
    painDimensions: {
      who: string
      frequency: string
      currentWorkarounds: string
      costOfProblem: string
      urgencyLevel: string
    }
    solutionOneLiner: string
    features: Array<{
      feature: string
      benefit: string
      techLayer: string
    }>
    unfairAdvantage: string
    market: {
      tam: string
      tamSize: string
      tamSource: string
      sam: string
      samSize: string
      samSource: string
      som: string
      somSize: string
      somSource: string
    }
    whyNow: string
  }

  // ── Page 3: Product · GTM · Competition ──────────────────────────────────
  productGtm: {
    techStack: {
      productType: string
      frontend: string
      backend: string
      aiLayer: string
      dataStorage: string
      authPayments: string
      hosting: string
      buildStage: string
      ipLayer: string
    }
    gtmChannels: Array<{
      channel: string
      tactic: string
      goal90Day: string
      owner: string
      budgetPerMonth: string
    }>
    icp: string
    pricingModel: string
    pricePoint: string
    salesMotion: string
    timeToValue: string
    competitors: Array<{
      dimension: string
      yourProduct: string
      competitorA: string
      competitorB: string
      competitorC: string
    }>
  }

  // ── Page 4: Team · Traction · Roadmap ────────────────────────────────────
  teamRoadmap: {
    founders: Array<{
      name: string
      role: string
      background: string
      commitment: string
      equity: string
    }>
    advisors: string
    openRoles: string
    kpis: Array<{
      metric: string
      current: string
      target3mo: string
      target12mo: string
      notes: string
    }>
    milestones: Array<{
      milestone: string
      owner: string
      targetDate: string
      budget: string
      successCriteria: string
      status: 'not-started' | 'in-progress' | 'done' | 'delayed'
    }>
  }

  // ── Page 5: Funding Ask ───────────────────────────────────────────────────
  fundingAsk: {
    totalRaise: string
    instrument: string
    valuationCapTerms: string
    targetCloseDate: string
    askOneLiner: string
    useOfFunds: Array<{
      category: string
      amount: string
      percentage: string
      timeline: string
      milestoneUnlocked: string
    }>
    elevatorPitch: {
      hook: string
      companyIntro: string
      tractionProof: string
      marketSize: string
      askAndUse: string
      cta: string
    }
    risks: Array<{
      risk: string
      likelihood: 'high' | 'medium' | 'low'
      impact: 'high' | 'medium' | 'low'
      mitigation: string
    }>
  }

  // ── Financial Snapshot (summary only — full model is the xlsx) ────────────
  financials: {
    revenueModel: string
    grossMargin: string
    burnRate: string
    runway: string
    breakEvenTarget: string
    cac: string
    ltv: string
    projections: Array<{
      year: string
      revenue: string
      ebitda: string
      users: string
    }>
  }
}

// ── Role Candidates ───────────────────────────────────────────────────────────
export interface RoleCandidate {
  id: string              // unique candidate entry ID
  ventureId: string       // repo slug
  role: string            // role title (e.g. "CTO", "Marketing Lead")
  userId: string          // GitHub user ID
  userLogin: string       // GitHub username
  userName: string
  userImage?: string
  appliedAt: string       // ISO date
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  pitch: string           // why they're a fit
  endorsements: string[]  // user IDs who endorsed
}

// ── Validation (Wikipedia-style) ──────────────────────────────────────────────
export interface Validation {
  id: string
  ventureId: string       // repo slug
  section: string         // which section (e.g. "cover", "problemSolution.corePainPoint")
  field?: string          // specific field within section
  userId: string
  userLogin: string
  userName: string
  userImage?: string
  status: 'validated' | 'disputed'
  evidence: string        // supporting evidence or reason for dispute
  createdAt: string
}

// ── Investment Interest ───────────────────────────────────────────────────────
export interface InvestmentInterest {
  id: string
  ventureId: string
  investorId: string
  investorLogin: string
  investorName: string
  investorImage?: string
  amount: string          // investment amount offered
  terms: string           // proposed terms
  message: string         // note to founders
  status: 'expressed' | 'in-discussion' | 'committed' | 'withdrawn'
  createdAt: string
}

// ── Venture Value / Worthiness ────────────────────────────────────────────────
export interface VentureValue {
  ventureId: string
  collaborationCount: number
  validationScore: number   // validated - disputed
  investmentInterest: number
  candidateCount: number
  commentCount: number
  editCount: number
  overallScore: number      // computed composite
}

// ── Contribution tracking ─────────────────────────────────────────────────────
export interface Contribution {
  userId: string
  userLogin: string
  userName: string
  userImage?: string
  edits: number
  comments: number
  validations: number
  role?: string             // assigned role in this venture
  joinedAt: string
}

// ── Edit history (from git commits) ───────────────────────────────────────────
export interface EditRecord {
  id: string             // git commit SHA
  businessId: string     // repo slug
  userId: string         // GitHub login
  userName: string
  userImage?: string
  timestamp: string      // commit date ISO
  section: string        // commit message (first line)
  summary: string        // commit message (full)
  files?: string[]       // .venturewiki/ files touched in this commit
  diff?: string
}

// ── Comment (from GitHub Discussions or Issues) ───────────────────────────────
export interface Comment {
  id: string             // GitHub comment ID
  businessId: string     // repo slug
  userId: string         // GitHub login
  userName: string
  userImage?: string
  content: string        // markdown body
  createdAt: string
  updatedAt?: string
  parentId?: string      // for threaded replies
  section?: string
}

// ── Admin stats ───────────────────────────────────────────────────────────────
export interface AdminStats {
  totalBusinesses: number
  totalUsers: number
  totalEdits: number
  totalViews: number
  businessesByStage: Record<BusinessStage, number>
  businessesByType: Record<ProductType, number>
  recentActivity: Array<{
    type: 'create' | 'edit' | 'comment' | 'signup'
    userId: string
    userName: string
    userImage?: string
    businessId?: string
    businessName?: string
    timestamp: string
  }>
  topContributors: Array<{
    userId: string
    userName: string
    userImage?: string
    editsCount: number
  }>
  monthlyGrowth: Array<{ month: string; businesses: number; users: number; edits: number }>
}
