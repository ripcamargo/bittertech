import { getAuth } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type FirestoreError,
} from 'firebase/firestore'
import { products as seedProducts, type Product } from '../data/products'
import { sortProducts } from '../lib/catalog'
import { app, db, META, PRODUCTS } from '../lib/firebase'

export const auth = getAuth(app)

/** Remove campos vazios/undefined (o Firestore não aceita undefined). */
export function clean(p: Product): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === '' || v === false) continue
    if (Array.isArray(v) && !v.length) continue
    if (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v as object).length) continue
    out[k] = v
  }
  return out
}

const markSeeded = () => setDoc(doc(db, META, 'catalog'), { seeded: true, updatedAt: serverTimestamp() }, { merge: true })

/** Escuta a coleção em tempo real (ordenada). */
export function watchProducts(onData: (list: Product[]) => void, onError: (e: FirestoreError) => void) {
  return onSnapshot(
    collection(db, PRODUCTS),
    (snap) => onData(sortProducts(snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id })))),
    onError,
  )
}

export async function saveProduct(p: Product) {
  // `merge` não serve aqui: precisamos que campos apagados no formulário sumam do documento.
  await setDoc(doc(db, PRODUCTS, p.id), { ...clean(p), updatedAt: serverTimestamp() })
  await markSeeded()
}

export async function removeProduct(id: string) {
  await deleteDoc(doc(db, PRODUCTS, id))
  await markSeeded() // garante que, mesmo vazio, o site não volte aos exemplos
}

/** Salva a nova ordem (0, 10, 20…) só nos produtos cuja posição mudou. */
export async function saveOrder(list: Product[]) {
  const batch = writeBatch(db)
  list.forEach((p, i) => {
    if (p.order !== i * 10) batch.update(doc(db, PRODUCTS, p.id), { order: i * 10 })
  })
  await batch.commit()
}

export async function patchProduct(id: string, patch: Partial<Product>) {
  const batch = writeBatch(db)
  batch.update(doc(db, PRODUCTS, id), patch)
  await batch.commit()
}

/** Importa o catálogo de exemplo (src/data/products.ts) para o Firestore. */
export async function importSeed(startOrder: number) {
  const batch = writeBatch(db)
  seedProducts.forEach((p, i) => batch.set(doc(db, PRODUCTS, p.id), { ...clean({ ...p, order: startOrder + i * 10 }), updatedAt: serverTimestamp() }))
  batch.set(doc(db, META, 'catalog'), { seeded: true, updatedAt: serverTimestamp() }, { merge: true })
  await batch.commit()
}

/**
 * Sem Firebase Storage: a foto é reduzida e convertida para WebP e guardada como
 * "data URL" dentro do próprio documento do produto (limite do Firestore: 1 MB por documento).
 */
async function toDataUrl(file: File, maxSide: number, quality: number): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  const url = canvas.toDataURL('image/webp', quality)
  return url.startsWith('data:image/webp') ? url : canvas.toDataURL('image/jpeg', quality)
}

export async function processImage(file: File): Promise<string> {
  let url = await toDataUrl(file, 900, 0.78)
  if (url.length > 180_000) url = await toDataUrl(file, 720, 0.62) // foto muito pesada: reduz mais
  return url
}
