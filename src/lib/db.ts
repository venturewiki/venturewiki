import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, increment, serverTimestamp,
  onSnapshot, Unsubscribe, startAfter, QueryDocumentSnapshot,
  writeBatch, DocumentData, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { BusinessPlan, VWUser, EditRecord, Comment, AdminStats } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────
const toDate = (v: any) =>
  v instanceof Timestamp ? v.toDate().toISOString() : v ?? new Date().toISOString()

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Business Plans ────────────────────────────────────────────────────────────
export async function createBusiness(
  data: Omit<BusinessPlan, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'viewCount' | 'editCount'>,
  userId: string
): Promise<string> {
  const slug = slugify(data.cover.companyName) + '-' + Date.now().toString(36)
  const ref  = await addDoc(collection(db, 'businesses'), {
    ...data,
    slug,
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
    viewCount:  0,
    editCount:  0,
    isArchived: false,
    isFeatured: false,
    contributors: [userId],
  })
  // increment user counter
  await updateDoc(doc(db, 'users', userId), { businessesCreated: increment(1) })
  return ref.id
}

export async function getBusiness(id: string): Promise<BusinessPlan | null> {
  const snap = await getDoc(doc(db, 'businesses', id))
  if (!snap.exists()) return null
  const d = snap.data()
  return { ...d, id: snap.id, createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt) } as BusinessPlan
}

export async function getBusinessBySlug(slug: string): Promise<BusinessPlan | null> {
  const q    = query(collection(db, 'businesses'), where('slug', '==', slug), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0].data()
  return { ...d, id: snap.docs[0].id, createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt) } as BusinessPlan
}

export async function updateBusiness(
  id: string, data: Partial<BusinessPlan>, userId: string, editSummary: string
): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'businesses', id), {
    ...data,
    updatedAt: serverTimestamp(),
    editCount: increment(1),
    contributors: (data.contributors ?? []).includes(userId)
      ? data.contributors
      : [...(data.contributors ?? []), userId],
  })
  // Log edit
  const editRef = doc(collection(db, 'edits'))
  batch.set(editRef, {
    businessId: id,
    userId,
    timestamp:  serverTimestamp(),
    section:    editSummary,
    summary:    editSummary,
  })
  batch.update(doc(db, 'users', userId), { editsCount: increment(1) })
  await batch.commit()
}

export async function getBusinesses(opts: {
  pageSize?: number
  stage?:    string
  type?:     string
  search?:   string
  cursor?:   QueryDocumentSnapshot<DocumentData>
  featuredOnly?: boolean
} = {}): Promise<{ businesses: BusinessPlan[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  let q = query(
    collection(db, 'businesses'),
    where('isArchived', '==', false),
    orderBy('updatedAt', 'desc'),
    limit(opts.pageSize ?? 20)
  )
  if (opts.stage)        q = query(q, where('cover.stage', '==', opts.stage))
  if (opts.featuredOnly) q = query(q, where('isFeatured', '==', true))
  if (opts.cursor)       q = query(q, startAfter(opts.cursor))

  const snap = await getDocs(q)
  const businesses = snap.docs.map(d => {
    const data = d.data()
    return { ...data, id: d.id, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) } as BusinessPlan
  })
  return { businesses, lastDoc: snap.docs[snap.docs.length - 1] ?? null }
}

export function subscribeBusinesses(
  callback: (businesses: BusinessPlan[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'businesses'),
    where('isArchived', '==', false),
    orderBy('updatedAt', 'desc'),
    limit(50)
  )
  return onSnapshot(q, snap => {
    const businesses = snap.docs.map(d => {
      const data = d.data()
      return { ...data, id: d.id, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) } as BusinessPlan
    })
    callback(businesses)
  })
}

export async function incrementViewCount(id: string) {
  await updateDoc(doc(db, 'businesses', id), { viewCount: increment(1) })
}

export async function toggleFeatured(id: string, featured: boolean) {
  await updateDoc(doc(db, 'businesses', id), { isFeatured: featured })
}

export async function archiveBusiness(id: string) {
  await updateDoc(doc(db, 'businesses', id), { isArchived: true })
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function getUser(id: string): Promise<VWUser | null> {
  const snap = await getDoc(doc(db, 'users', id))
  if (!snap.exists()) return null
  return { ...snap.data(), id: snap.id } as VWUser
}

export async function getAllUsers(): Promise<VWUser[]> {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ ...d.data(), id: d.id }) as VWUser)
}

export async function updateUserRole(id: string, role: VWUser['role']) {
  await updateDoc(doc(db, 'users', id), { role })
}

// ── Edit History ─────────────────────────────────────────────────────────────
export async function getEditHistory(businessId: string): Promise<EditRecord[]> {
  const q    = query(collection(db, 'edits'), where('businessId', '==', businessId), orderBy('timestamp', 'desc'), limit(50))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ ...d.data(), id: d.id, timestamp: toDate(d.data().timestamp) }) as EditRecord)
}

// ── Comments ──────────────────────────────────────────────────────────────────
export async function addComment(data: Omit<Comment, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'comments'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getComments(businessId: string): Promise<Comment[]> {
  const q    = query(collection(db, 'comments'), where('businessId', '==', businessId), orderBy('createdAt', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ ...d.data(), id: d.id, createdAt: toDate(d.data().createdAt) }) as Comment)
}

export async function deleteComment(id: string) {
  await deleteDoc(doc(db, 'comments', id))
}

// ── Admin Stats ───────────────────────────────────────────────────────────────
export async function getAdminStats(): Promise<AdminStats> {
  const [bizSnap, usersSnap, editsSnap] = await Promise.all([
    getDocs(query(collection(db, 'businesses'), where('isArchived', '==', false))),
    getDocs(collection(db, 'users')),
    getDocs(query(collection(db, 'edits'), orderBy('timestamp', 'desc'), limit(20))),
  ])

  const businesses = bizSnap.docs.map(d => d.data())
  const users      = usersSnap.docs.map(d => d.data())

  const byStage: Record<string, number> = {}
  const byType:  Record<string, number> = {}
  let totalViews = 0, totalEdits = 0

  businesses.forEach(b => {
    byStage[b.cover?.stage ?? 'idea'] = (byStage[b.cover?.stage ?? 'idea'] ?? 0) + 1
    byType[b.cover?.productType ?? 'other'] = (byType[b.cover?.productType ?? 'other'] ?? 0) + 1
    totalViews += b.viewCount ?? 0
    totalEdits += b.editCount ?? 0
  })

  const recentActivity = editsSnap.docs.slice(0, 10).map(d => {
    const data = d.data()
    return {
      type:       'edit' as const,
      userId:     data.userId,
      userName:   data.userName ?? '',
      businessId: data.businessId,
      timestamp:  toDate(data.timestamp),
    }
  })

  const contributorMap: Record<string, number> = {}
  users.forEach(u => { contributorMap[u.id] = u.editsCount ?? 0 })
  const topContributors = users
    .sort((a, b) => (b.editsCount ?? 0) - (a.editsCount ?? 0))
    .slice(0, 5)
    .map(u => ({ userId: u.id, userName: u.name, userImage: u.image, editsCount: u.editsCount ?? 0 }))

  return {
    totalBusinesses: businesses.length,
    totalUsers:      users.length,
    totalEdits,
    totalViews,
    businessesByStage: byStage as any,
    businessesByType:  byType as any,
    recentActivity,
    topContributors,
    monthlyGrowth: [],
  }
}
