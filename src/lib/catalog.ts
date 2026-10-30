import { useEffect, useSyncExternalStore } from 'react'
import { products as seed, type Product } from '../data/products'

/**
 * Catálogo do site público.
 * Lê do Firestore (coleção bt_products, gerenciada em /admin). Enquanto carrega usa o
 * cache do navegador; se nunca houve cadastro no painel (ou o Firestore falhar), cai
 * no catálogo inicial de src/data/products.ts para o site nunca ficar vazio por erro.
 */
interface State {
  products: Product[]
  loading: boolean
}

const CACHE_KEY = 'bt:catalog:v1'

function readCache(): Product[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const list = raw ? JSON.parse(raw) : null
    return Array.isArray(list) ? list : null
  } catch {
    return null
  }
}

const cached = readCache()
let state: State = { products: cached ?? [], loading: !cached }
const listeners = new Set<() => void>()

function setState(next: State) {
  state = next
  listeners.forEach((l) => l())
}

export const sortProducts = (list: Product[]) =>
  [...list].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.name.localeCompare(b.name, 'pt-BR'))

/** Converte o formato da REST API do Firestore ({ stringValue: ... }) em valores JS comuns. */
function decode(v: Record<string, unknown>): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return ((v.arrayValue as { values?: Record<string, unknown>[] }).values ?? []).map(decode)
  if ('mapValue' in v) return decodeFields((v.mapValue as { fields?: Fields }).fields ?? {})
  return null
}
export type Fields = Record<string, Record<string, unknown>>
export const decodeFields = (f: Fields) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, decode(v)]))

const LIST_FIELDS = ['name', 'description', 'price', 'oldPrice', 'image', 'category', 'condition', 'specs', 'badge', 'soldOut', 'featured', 'hidden', 'order', 'hasGallery']

const full = new Map<string, Promise<Product | null>>()
/** Documento completo (com galeria, vídeo, descrição longa e ficha técnica) — buscado ao abrir o modal. */
export function fetchFullProduct(id: string): Promise<Product | null> {
  if (!full.has(id)) {
    full.set(
      id,
      (async () => {
        const { firebaseConfig, PRODUCTS } = await import('./firebaseConfig')
        const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${PRODUCTS}/${encodeURIComponent(id)}?key=${firebaseConfig.apiKey}`
        const res = await fetch(url)
        if (!res.ok) return null
        const d = (await res.json()) as { fields?: Fields }
        return { ...decodeFields(d.fields ?? {}), id } as unknown as Product
      })().catch(() => null),
    )
  }
  return full.get(id)!
}

/**
 * Leitura pública via REST (sem carregar o SDK do Firebase: o site fica leve).
 * O painel /admin usa o SDK completo.
 */
async function fetchFromFirestore(): Promise<Product[]> {
  const { firebaseConfig, PRODUCTS, META } = await import('./firebaseConfig')
  const base = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`
  const key = `key=${firebaseConfig.apiKey}`
  // A listagem não traz a galeria (fotos extras são pesadas): ela vem ao abrir o produto.
  const mask = LIST_FIELDS.map((f) => `mask.fieldPaths=${f}`).join('&')
  const res = await fetch(`${base}/${PRODUCTS}?pageSize=300&${mask}&${key}`)
  if (!res.ok) throw new Error(`firestore ${res.status}`)
  const json = (await res.json()) as { documents?: { name: string; fields?: Fields }[] }
  const list = (json.documents ?? []).map((d) => ({ ...decodeFields(d.fields ?? {}), id: d.name.split('/').pop()! }) as unknown as Product)
  if (!list.length) {
    // Coleção vazia: se o painel nunca foi usado, mostra o catálogo inicial; senão, vitrine vazia.
    const meta = await fetch(`${base}/${META}/catalog?${key}`)
    if (meta.status === 404) return seed
    if (!meta.ok) throw new Error(`firestore meta ${meta.status}`)
  }
  return list
}

let started = false
async function load() {
  try {
    const visible = sortProducts(await fetchFromFirestore()).filter((p) => !p.hidden)
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(visible))
    } catch {
      /* cache é opcional */
    }
    setState({ products: visible, loading: false })
  } catch {
    setState({ products: state.products.length ? state.products : seed, loading: false })
  }
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useCatalog(): State {
  useEffect(() => {
    if (started) return
    started = true
    void load()
  }, [])
  return useSyncExternalStore(subscribe, () => state)
}
