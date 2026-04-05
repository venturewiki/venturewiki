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
}

// ── Business Plan (mirrors the 5-page template) ───────────────────────────────
export type BusinessStage = 'idea' | 'mvp' | 'beta' | 'live' | 'scaling' | 'exited'
export type ProductType   = 'web-app' | 'website' | 'ai-agent' | 'api' | 'hybrid' | 'other'
export type FundingStage  = 'bootstrapped' | 'pre-seed' | 'seed' | 'series-a' | 'series-b+'

export interface BusinessPlan {
  // ── Meta ──────────────────────────────────────────────────────────────────
  id: string
  slug: string
  createdAt: string
  updatedAt: string
  createdBy: string        // user id
  contributors: string[]  // user ids
  viewCount: number
  editCount: number
  isPublic: boolean
  isArchived: boolean
  isFeatured: boolean

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
