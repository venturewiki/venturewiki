// Barrel re-export. The data layer is split into focused modules under
// `src/lib/db/*` — this file keeps the existing `@/lib/db` import surface so
// route handlers and other callers don't have to change.
export { resolveBusinessOwner } from './db/owner'
export {
  createBusiness,
  getBusinessBySlug,
  updateBusiness,
  writeRawPlanYaml,
  getBusinesses,
  toggleFeatured,
  archiveBusiness,
  getEditHistory,
  type CreateBusinessTarget,
} from './db/businesses'
export {
  getUser,
  getAllUsers,
  upsertUser,
  updateUserRole,
  updateUserSubscription,
  getUserByStripeCustomerId,
} from './db/users'
export { addComment, getComments } from './db/comments'
export {
  getCandidates, applyForRole, endorseCandidate, updateCandidateStatus,
  getValidations, addValidation,
  getInvestments, expressInvestmentInterest, updateInvestmentStatus,
  getVentureValue,
} from './db/contributions'
export {
  listVentureFiles, createVentureFile, readVentureFile, readVentureFileBuffer,
  moveVentureFile, createVentureFolder, renameVentureFolder, deleteVentureFolder,
  type VentureFile,
} from './db/files'
export { getAdminStats } from './db/stats'
