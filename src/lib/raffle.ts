import { useEffect, useSyncExternalStore } from 'react'
import { decodeFields, type Fields } from './catalog'
import { firebaseConfig } from './firebaseConfig'
import type { PixKeyType } from './pix'

/** Coleções da rifa (prefixo "bt_" para não misturar com outros apps do projeto). */
export const RAFFLE = 'bt_raffle' // documentos: "config" e "prize"
export const TICKETS = 'bt_raffle_tickets' // um documento por número (id = número); público, sem dados pessoais
export const ORDERS = 'bt_raffle_orders' // um documento por reserva (id = código); só o admin lê

export interface RaffleConfig {
  active: boolean
  title: string
  prizeName: string
  prizeDescription?: string
  /** Quantidade de números (1 a total). */
  total: number
  /** Valor de cada cota, em reais. */
  price: number
  /** Máximo de números por reserva. */
  maxPerPurchase: number
  /** Horas até uma reserva não paga expirar. */
  reserveHours: number
  drawDate?: string
  /** Encerramento das vendas (ms). Alimenta o cronômetro e bloqueia novas reservas. */
  endsAt?: number
  /** Regras extras, uma por linha. */
  rules?: string
  pixType: PixKeyType
  pixKey: string
  pixName: string
  pixCity: string
  /** Resultado publicado no site. */
  winner?: { number: number; name: string }
}

export type TicketStatus = 'reserved' | 'paid'
export interface Ticket {
  number: number
  status: TicketStatus
  reservationId: string
  /** Momento (ms) em que foi reservado, segundo o servidor. */
  createdAt: number
}
export type TicketMap = Map<number, Ticket>

export const MAX_TOTAL = 1000
export const MAX_PER_PURCHASE = 15

/* ------------------------------ helpers ------------------------------ */
/** A rifa está à venda agora? (ativa, sem resultado publicado, completa e dentro do prazo) */
export const isRaffleLive = (c: RaffleConfig, now = Date.now()) =>
  c.active && !c.winner && c.prizeName !== '' && c.price > 0 && (!c.endsAt || now < c.endsAt)
export const padNumber = (n: number, total: number) => String(n).padStart(String(total).length, '0')
export const expiresAt = (t: Ticket, hours: number) => t.createdAt + hours * 3600_000
export const isExpired = (t: Ticket, hours: number, now = Date.now()) => t.status === 'reserved' && now > expiresAt(t, hours)

export type NumberState = 'free' | 'reserved' | 'paid'
/** Situação de um número para quem está olhando (reservas vencidas contam como livres). */
export function numberState(map: TicketMap, n: number, hours: number, now = Date.now()): NumberState {
  const t = map.get(n)
  if (!t) return 'free'
  if (t.status === 'paid') return 'paid'
  return isExpired(t, hours, now) ? 'free' : 'reserved'
}

export function raffleCounts(map: TicketMap, cfg: Pick<RaffleConfig, 'total' | 'reserveHours'>, now = Date.now()) {
  let paid = 0
  let reserved = 0
  map.forEach((t) => {
    if (t.status === 'paid') paid++
    else if (!isExpired(t, cfg.reserveHours, now)) reserved++
  })
  return { paid, reserved, free: Math.max(0, cfg.total - paid - reserved) }
}

/** Valida/normaliza a configuração vinda do Firestore (campos ausentes viram padrões seguros). */
function toConfig(raw: Record<string, unknown>): RaffleConfig {
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const w = raw.winner as { number?: number; name?: string } | undefined
  return {
    active: raw.active === true,
    title: str(raw.title),
    prizeName: str(raw.prizeName),
    prizeDescription: str(raw.prizeDescription) || undefined,
    total: Math.min(MAX_TOTAL, Math.max(1, Math.floor(num(raw.total, 100)))),
    price: Math.max(0, num(raw.price, 0)),
    maxPerPurchase: Math.min(MAX_PER_PURCHASE, Math.max(1, Math.floor(num(raw.maxPerPurchase, 10)))),
    reserveHours: Math.max(1, Math.floor(num(raw.reserveHours, 24))),
    drawDate: str(raw.drawDate) || undefined,
    endsAt: typeof raw.endsAt === 'string' && Number.isFinite(Date.parse(raw.endsAt)) ? Date.parse(raw.endsAt) : undefined,
    rules: str(raw.rules) || undefined,
    pixType: (str(raw.pixType) || 'phone') as PixKeyType,
    pixKey: str(raw.pixKey),
    pixName: str(raw.pixName),
    pixCity: str(raw.pixCity),
    winner: w && typeof w.number === 'number' ? { number: w.number, name: str(w.name) } : undefined,
  }
}

/* -------------------------------- REST -------------------------------- */
const base = () => `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`
const key = () => `key=${firebaseConfig.apiKey}`

async function getDocument(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${base()}/${path}?${key()}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`firestore ${res.status}`)
  const d = (await res.json()) as { fields?: Fields }
  return decodeFields(d.fields ?? {})
}

export async function fetchRaffleConfig(): Promise<RaffleConfig | null> {
  const raw = await getDocument(`${RAFFLE}/config`)
  return raw ? toConfig(raw) : null
}

const prizeCache: { value?: Promise<string | null> } = {}
export function fetchPrizeImage(): Promise<string | null> {
  prizeCache.value ??= getDocument(`${RAFFLE}/prize`)
    .then((d) => (typeof d?.image === 'string' ? d.image : null))
    .catch(() => null)
  return prizeCache.value
}
export const resetPrizeImageCache = () => {
  prizeCache.value = undefined
}

/** Lista os números já reservados/pagos (sem dados pessoais). Faz paginação. */
export async function fetchTickets(): Promise<TicketMap> {
  const map: TicketMap = new Map()
  let token = ''
  do {
    const mask = ['status', 'reservationId', 'createdAt'].map((f) => `mask.fieldPaths=${f}`).join('&')
    const res = await fetch(`${base()}/${TICKETS}?pageSize=300&${mask}${token ? `&pageToken=${encodeURIComponent(token)}` : ''}&${key()}`)
    if (!res.ok) throw new Error(`firestore ${res.status}`)
    const json = (await res.json()) as { documents?: { name: string; fields?: Fields }[]; nextPageToken?: string }
    for (const d of json.documents ?? []) {
      const f = decodeFields(d.fields ?? {}) as { status?: string; reservationId?: string; createdAt?: string }
      const number = Number(d.name.split('/').pop())
      if (!Number.isInteger(number)) continue
      map.set(number, {
        number,
        status: f.status === 'paid' ? 'paid' : 'reserved',
        reservationId: f.reservationId ?? '',
        createdAt: f.createdAt ? Date.parse(f.createdAt) : Date.now(),
      })
    }
    token = json.nextPageToken ?? ''
  } while (token)
  return map
}

/* ------------------------- estado compartilhado ------------------------ */
interface State {
  config: RaffleConfig | null
  loading: boolean
}
let state: State = { config: null, loading: true }
const listeners = new Set<() => void>()
const emit = (next: State) => {
  state = next
  listeners.forEach((l) => l())
}
let started = false
export function reloadRaffleConfig() {
  return fetchRaffleConfig()
    .then((config) => emit({ config, loading: false }))
    .catch(() => emit({ config: state.config, loading: false }))
}

/** Configuração pública da rifa (carregada uma vez por visita). `null` = não há rifa configurada. */
export function useRaffleConfig(): State {
  useEffect(() => {
    if (started) return
    started = true
    void reloadRaffleConfig()
  }, [])
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

/* -------------------- minha reserva (neste navegador) ------------------- */
export interface MyReservation {
  code: string
  numbers: number[]
  total: number
  name: string
  phone: string
  createdAt: number
}
const MINE_KEY = 'bt:raffle:mine'
export function loadMyReservation(): MyReservation | null {
  try {
    const v = JSON.parse(localStorage.getItem(MINE_KEY) ?? 'null')
    return v && typeof v.code === 'string' && Array.isArray(v.numbers) ? v : null
  } catch {
    return null
  }
}
export function saveMyReservation(r: MyReservation | null) {
  try {
    if (r) localStorage.setItem(MINE_KEY, JSON.stringify(r))
    else localStorage.removeItem(MINE_KEY)
  } catch {
    /* opcional */
  }
}

/** Código curto e legível (sem 0/O/1/I). */
export function newReservationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

/** Reserva os números de forma atômica (tudo ou nada). Falha se algum já foi reservado por outra pessoa. */
export async function reserveNumbers(input: { numbers: number[]; name: string; phone: string; code: string; total: number }) {
  const [{ doc, serverTimestamp, writeBatch }, { db }] = await Promise.all([import('firebase/firestore'), import('./firebase')])
  const batch = writeBatch(db)
  for (const n of input.numbers) {
    batch.set(doc(db, TICKETS, String(n)), { number: n, status: 'reserved', reservationId: input.code, createdAt: serverTimestamp() })
  }
  batch.set(doc(db, ORDERS, input.code), {
    code: input.code,
    name: input.name,
    phone: input.phone,
    numbers: input.numbers,
    total: input.total,
    status: 'reserved',
    createdAt: serverTimestamp(),
  })
  await batch.commit()
}

export const whatsappDigits = (phone: string) => {
  const d = phone.replace(/\D/g, '')
  return d.length <= 11 ? `55${d}` : d
}
