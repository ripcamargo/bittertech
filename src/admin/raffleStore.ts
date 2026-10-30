import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type FirestoreError,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  isExpired,
  newReservationCode,
  ORDERS,
  RAFFLE,
  resetPrizeImageCache,
  TICKETS,
  type RaffleConfig,
  type Ticket,
  type TicketMap,
} from '../lib/raffle'

export interface Order {
  code: string
  name: string
  phone: string
  numbers: number[]
  total: number
  status: 'reserved' | 'paid' | 'cancelled'
  createdAt: number
  paidAt?: number
  manual?: boolean
}

const ms = (v: unknown): number => (v && typeof (v as Timestamp).toMillis === 'function' ? (v as Timestamp).toMillis() : Date.now())

export const DEFAULT_CONFIG: RaffleConfig = {
  active: false,
  title: '',
  prizeName: '',
  prizeDescription: '',
  total: 100,
  price: 10,
  maxPerPurchase: 10,
  reserveHours: 24,
  drawDate: '',
  rules: '',
  pixType: 'phone',
  pixKey: '',
  pixName: 'Bitter Tech Store',
  pixCity: 'Sorocaba',
}

/* ------------------------------ leitura ------------------------------ */
export function watchConfig(cb: (c: RaffleConfig | null) => void, err: (e: FirestoreError) => void) {
  return onSnapshot(
    doc(db, RAFFLE, 'config'),
    (s) => {
      if (!s.exists()) return cb(null)
      const d = s.data()
      cb({ ...DEFAULT_CONFIG, ...(d as Partial<RaffleConfig>), endsAt: d.endsAt ? ms(d.endsAt) : undefined })
    },
    err,
  )
}

export function watchTickets(cb: (m: TicketMap) => void, err: (e: FirestoreError) => void) {
  return onSnapshot(
    collection(db, TICKETS),
    (snap) => {
      const map: TicketMap = new Map()
      snap.docs.forEach((d) => {
        const x = d.data()
        const t: Ticket = { number: Number(d.id), status: x.status === 'paid' ? 'paid' : 'reserved', reservationId: String(x.reservationId ?? ''), createdAt: ms(x.createdAt) }
        map.set(t.number, t)
      })
      cb(map)
    },
    err,
  )
}

export function watchOrders(cb: (o: Order[]) => void, err: (e: FirestoreError) => void) {
  return onSnapshot(
    collection(db, ORDERS),
    (snap) =>
      cb(
        snap.docs
          .map((d) => {
            const x = d.data() as DocumentData
            return {
              code: d.id,
              name: String(x.name ?? ''),
              phone: String(x.phone ?? ''),
              numbers: Array.isArray(x.numbers) ? (x.numbers as number[]) : [],
              total: Number(x.total ?? 0),
              status: x.status === 'paid' || x.status === 'cancelled' ? x.status : 'reserved',
              createdAt: ms(x.createdAt),
              paidAt: x.paidAt ? ms(x.paidAt) : undefined,
              manual: x.manual === true,
            } as Order
          })
          .sort((a, b) => b.createdAt - a.createdAt),
      ),
    err,
  )
}

export async function loadPrizeImage(): Promise<string> {
  const s = await getDoc(doc(db, RAFFLE, 'prize'))
  return s.exists() && typeof s.data().image === 'string' ? s.data().image : ''
}

/* ----------------------------- configuração ---------------------------- */
const strip = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''))

export async function saveConfig(cfg: RaffleConfig, prizeImage: string | null) {
  // setDoc sem merge: campos limpos no formulário também somem do documento (o `winner` é preservado em cfg)
  await setDoc(doc(db, RAFFLE, 'config'), { ...strip({ ...cfg, endsAt: cfg.endsAt ? new Date(cfg.endsAt) : undefined }), updatedAt: serverTimestamp() })
  if (prizeImage !== null) {
    if (prizeImage) await setDoc(doc(db, RAFFLE, 'prize'), { image: prizeImage, updatedAt: serverTimestamp() })
    else await deleteDoc(doc(db, RAFFLE, 'prize'))
    resetPrizeImageCache()
  }
}

export const setActive = (active: boolean) => updateDoc(doc(db, RAFFLE, 'config'), { active, updatedAt: serverTimestamp() })

/* -------------------------------- vendas ------------------------------- */
const paidTicket = (n: number, code: string) => ({ number: n, status: 'paid', reservationId: code, createdAt: serverTimestamp() })

/** Números da reserva que já pertencem a outra pessoa (reserva válida ou paga). */
export function conflictsFor(numbers: number[], code: string, tickets: TicketMap, hours: number): number[] {
  return numbers.filter((n) => {
    const t = tickets.get(n)
    return !!t && t.reservationId !== code && !isExpired(t, hours)
  })
}

export async function confirmPayment(order: Order) {
  const batch = writeBatch(db)
  order.numbers.forEach((n) => batch.set(doc(db, TICKETS, String(n)), paidTicket(n, order.code)))
  batch.update(doc(db, ORDERS, order.code), { status: 'paid', paidAt: serverTimestamp() })
  await batch.commit()
}

/** Libera os números da reserva (só os que ainda são dela) e marca a reserva como cancelada. */
export async function cancelOrder(order: Order, tickets: TicketMap) {
  const batch = writeBatch(db)
  order.numbers.forEach((n) => tickets.get(n)?.reservationId === order.code && batch.delete(doc(db, TICKETS, String(n))))
  batch.update(doc(db, ORDERS, order.code), { status: 'cancelled' })
  await batch.commit()
}

export const deleteOrder = (code: string) => deleteDoc(doc(db, ORDERS, code))

export async function manualSale(numbers: number[], name: string, phone: string, price: number) {
  const code = newReservationCode()
  const batch = writeBatch(db)
  numbers.forEach((n) => batch.set(doc(db, TICKETS, String(n)), paidTicket(n, code)))
  batch.set(doc(db, ORDERS, code), {
    code,
    name,
    phone,
    numbers,
    total: Math.round(numbers.length * price * 100) / 100,
    status: 'paid',
    manual: true,
    createdAt: serverTimestamp(),
    paidAt: serverTimestamp(),
  })
  await batch.commit()
}

/** Apaga as reservas vencidas (não pagas) para os números voltarem a ficar livres de fato. */
export async function clearExpired(tickets: TicketMap, hours: number): Promise<number> {
  const stale = [...tickets.values()].filter((t) => isExpired(t, hours))
  for (let i = 0; i < stale.length; i += 400) {
    const batch = writeBatch(db)
    stale.slice(i, i + 400).forEach((t) => batch.delete(doc(db, TICKETS, String(t.number))))
    await batch.commit()
  }
  return stale.length
}

/* -------------------------------- sorteio ------------------------------ */
export const publishWinner = (number: number, name: string) =>
  updateDoc(doc(db, RAFFLE, 'config'), { winner: { number, name }, updatedAt: serverTimestamp() })
export const removeWinner = () => updateDoc(doc(db, RAFFLE, 'config'), { winner: deleteField(), updatedAt: serverTimestamp() })
