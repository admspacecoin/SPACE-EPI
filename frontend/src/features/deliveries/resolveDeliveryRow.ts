import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

type Cache = Map<string, any>

export function createResolverCaches() {
  return {
    users: new Map<string, string>() as Cache,
    sectors: new Map<string, string>() as Cache,
    ppeItems: new Map<string, any>() as Cache,
    inventory: new Map<string, string | null>() as Cache, // variantId -> ppeItemId
  }
}

export async function resolveUserName(caches: ReturnType<typeof createResolverCaches>, uid: string | null) {
  if (!uid) return '—'
  if (!caches.users.has(uid)) {
    const snap = await getDoc(doc(db, 'users', uid))
    caches.users.set(uid, snap.exists() ? snap.data().nome : '—')
  }
  return caches.users.get(uid)!
}

export async function resolveSectorName(caches: ReturnType<typeof createResolverCaches>, sectorId: string | null) {
  if (!sectorId) return '—'
  if (!caches.sectors.has(sectorId)) {
    const snap = await getDoc(doc(db, 'sectors', sectorId))
    caches.sectors.set(sectorId, snap.exists() ? snap.data().nome : '—')
  }
  return caches.sectors.get(sectorId)!
}

export async function resolveVariantInfo(caches: ReturnType<typeof createResolverCaches>, variantId: string) {
  if (!caches.inventory.has(variantId)) {
    const invSnap = await getDoc(doc(db, 'inventory', variantId))
    caches.inventory.set(variantId, invSnap.exists() ? (invSnap.data().ppeItemId as string) : null)
  }
  const ppeItemId = caches.inventory.get(variantId)
  if (!ppeItemId) return { ppeItemId: '', ppeNome: '—', sku: '—' }

  if (!caches.ppeItems.has(ppeItemId)) {
    const itemSnap = await getDoc(doc(db, 'ppeItems', ppeItemId))
    caches.ppeItems.set(ppeItemId, itemSnap.exists() ? itemSnap.data() : null)
  }
  const item = caches.ppeItems.get(ppeItemId)

  const variantSnap = await getDoc(doc(db, 'ppeItems', ppeItemId, 'variants', variantId))
  const sku = variantSnap.exists() ? variantSnap.data().skuGerado ?? '—' : '—'

  return { ppeItemId, ppeNome: item?.nome ?? '—', sku }
}

export function toDateString(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in (value as any)) {
    return (value as any).toDate().toISOString()
  }
  return String(value ?? '')
}
