import yaml from 'js-yaml'

/**
 * Generates a default plan.yaml scaffold for a repo that has the
 * `venturewiki` topic but no `.venturewiki/plan.yaml` yet.
 * Shared by the onboard route and the self-heal logic in getBusinessBySlug.
 */
export function defaultPlanYaml(opts: {
  owner: string
  name: string
  description: string
  userId: string
}): string {
  const plan = {
    id: `${opts.owner}/${opts.name}`,
    slug: opts.name,
    cover: {
      companyName: opts.name,
      tagline: opts.description,
      logoEmoji: '🚀',
      stage: 'idea',
      productType: 'web-app',
      industryVertical: '',
      headquarters: '',
      legalStructure: '',
      fundingStage: 'bootstrapped',
      websiteUrl: '',
      version: 'v0.1',
      mission: '',
      vision: '',
      tractionHighlights: { revenue: '', users: '', partnerships: '', press: '' },
    },
    problemSolution: {
      corePainPoint: '',
      painDimensions: { who: '', frequency: '', currentWorkarounds: '', costOfProblem: '', urgencyLevel: '' },
      solutionOneLiner: '',
      features: [],
      unfairAdvantage: '',
      market: { tamSize: '', tamSource: '', samSize: '', samSource: '', somSize: '', somSource: '' },
      whyNow: '',
    },
    productGtm: {},
    teamRoadmap: {},
    fundingAsk: { elevatorPitch: { hook: '' } },
    financials: { revenueModel: '', grossMargin: '', burnRate: '', runway: '', projections: [] },
    createdBy: opts.userId,
    contributors: [opts.userId],
    viewCount: 0,
    editCount: 0,
    isPublic: true,
    isArchived: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  return yaml.dump(plan, { lineWidth: -1 })
}
