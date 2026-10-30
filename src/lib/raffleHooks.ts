import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPrizeImage, fetchTickets, type TicketMap } from './raffle'

/** Foto do prêmio (só é baixada quando `enabled`). */
export function usePrizeImage(enabled: boolean): string | null {
  const [image, setImage] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    void fetchPrizeImage().then((v) => alive && setImage(v))
    return () => {
      alive = false
    }
  }, [enabled])
  return image
}

/** Números reservados/pagos; atualiza sozinho a cada `refreshMs` enquanto a aba está visível. */
export function useTickets(enabled: boolean, refreshMs = 0) {
  const [tickets, setTickets] = useState<TicketMap | null>(null)
  const [error, setError] = useState(false)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    try {
      const map = await fetchTickets()
      if (alive.current) {
        setTickets(map)
        setError(false)
      }
      return map
    } catch {
      if (alive.current) setError(true)
      return null
    }
  }, [])

  useEffect(() => {
    alive.current = true
    if (!enabled) return
    void reload()
    if (!refreshMs) return () => void (alive.current = false)
    const t = setInterval(() => document.visibilityState === 'visible' && void reload(), refreshMs)
    return () => {
      alive.current = false
      clearInterval(t)
    }
  }, [enabled, refreshMs, reload])

  return { tickets, error, reload }
}

/** Relógio que atualiza a cada segundo (para contagem regressiva). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'expirada'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min ${String(sec).padStart(2, '0')}s`
}
