import {
  Globe, AlertTriangle, Cpu, Target, Users, Map, HandCoins,
  DollarSign, ShieldCheck, TrendingUp, Activity, Building2,
  Heart, Lock, Rocket, UserPlus, Truck, Briefcase, Layers,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Section key → icon. Anything not listed falls back to a neutral Layers icon.
const MAP: Record<string, LucideIcon> = {
  cover: Globe,
  problemSolution: AlertTriangle,
  productGtm: Cpu,
  product: Cpu,
  gtm: Target,
  teamRoadmap: Users,
  team: Users,
  roadmap: Map,
  fundingAsk: HandCoins,
  funding: HandCoins,
  financials: DollarSign,
  governance: ShieldCheck,
  kpis: TrendingUp,
  slas: Activity,
  businessContinuity: Building2,
  insurance: Heart,
  dataOwnership: Lock,
  exitStrategy: Rocket,
  firstFiveTenants: UserPlus,
  vendors: Truck,
  partners: Briefcase,
}

export function iconFor(key: string): LucideIcon {
  return MAP[key] || Layers
}
