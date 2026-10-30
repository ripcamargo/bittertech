import { useEffect, useRef, useState } from 'react'
import { isRaffleLive, raffleCounts, useRaffleConfig } from '../lib/raffle'
import { usePrizeImage, useTickets } from '../lib/raffleHooks'
import { Link, navigate, useLocation } from '../lib/router'
import { formatPrice } from '../lib/whatsapp'
import { CloseIcon } from './Icons'
import { Countdown } from './RaffleBanner'

const SEEN = 'bt:raffle:seen' // sessionStorage: já abriu nesta visita
const DAY = 'bt:raffle:day' // localStorage: último dia em que abriu

const today = () => new Date().toLocaleDateString('sv-SE') // AAAA-MM-DD no fuso do visitante

const safe = {
  get: (s: Storage, k: string) => {
    try {
      return s.getItem(k)
    } catch {
      return null
    }
  },
  set: (s: Storage, k: string, v: string) => {
    try {
      s.setItem(k, v)
    } catch {
      /* opcional */
    }
  },
}

/**
 * Chamada da rifa: abre um modal a cada nova visita ao site (1x por sessão) e, na primeira
 * visita do dia, usa a versão "novidade" com mais destaque. Fora isso, fica um botão flutuante.
 */
export default function RaffleGate() {
  const { config } = useRaffleConfig()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [firstOfDay, setFirstOfDay] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const live = !!config && isRaffleLive(config)
  const onRaffle = pathname.replace(/\/$/, '') === '/rifa'

  useEffect(() => {
    if (!live) return
    if (onRaffle) {
      safe.set(sessionStorage, SEEN, '1') // já está na rifa: não precisa do modal
      return
    }
    if (safe.get(sessionStorage, SEEN)) return
    timer.current = setTimeout(() => {
      const t = today()
      setFirstOfDay(safe.get(localStorage, DAY) !== t)
      safe.set(localStorage, DAY, t)
      safe.set(sessionStorage, SEEN, '1')
      setOpen(true)
    }, 1200)
    return () => clearTimeout(timer.current)
  }, [live, onRaffle])

  if (!live || !config) return null
  return (
    <>
      {open && <Modal firstOfDay={firstOfDay} onClose={() => setOpen(false)} />}
      {!open && !onRaffle && (
        <button className="raffle-chip" onClick={() => setOpen(true)} aria-label="Ver a rifa">
          <span aria-hidden="true">🎟️</span> Rifa no ar
        </button>
      )}
    </>
  )
}

function Modal({ firstOfDay, onClose }: { firstOfDay: boolean; onClose: () => void }) {
  const { config } = useRaffleConfig()
  const image = usePrizeImage(true)
  const { tickets } = useTickets(true)
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [onClose])

  const [leaving, setLeaving] = useState(false)
  if (!config) return null
  const counts = tickets ? raffleCounts(tickets, config) : null
  const taken = counts ? counts.paid + counts.reserved : 0
  const pct = counts ? Math.round((taken / config.total) * 100) : 0

  const go = () => {
    setLeaving(true)
    onClose()
    navigate('/rifa')
  }

  return (
    <div className="rmodal" role="dialog" aria-modal="true" aria-labelledby="rmodal-title">
      <div className="rmodal__scrim" onClick={onClose} />
      <div className={`rmodal__card${firstOfDay ? ' is-first' : ''}`} ref={dialog}>
        <button className="rmodal__close" onClick={onClose} aria-label="Fechar">
          <CloseIcon width={20} height={20} />
        </button>

        <div className="rmodal__media">
          {image ? <img src={image} alt={config.prizeName} /> : <div className="rmodal__ph" aria-hidden="true">🎁</div>}
          <span className="rmodal__badge">{firstOfDay ? '✨ Novidade de hoje' : '🎟️ Rifa no ar'}</span>
        </div>

        <div className="rmodal__body">
          <p className="rmodal__eyebrow">{firstOfDay ? 'Tem rifa rolando na Bitter Tech!' : 'Ainda dá tempo de participar'}</p>
          <h2 id="rmodal-title">{config.title || config.prizeName}</h2>
          <p className="rmodal__prize">
            Prêmio: <strong>{config.prizeName}</strong>
          </p>

          <div className="rmodal__price">
            <span>Cota por apenas</span>
            <strong>{formatPrice(config.price)}</strong>
          </div>

          {counts && (
            <div className="rmodal__progress" aria-label={`${pct}% dos números já escolhidos`}>
              <div className="rmodal__bar">
                <span style={{ width: `${Math.max(pct, taken ? 4 : 0)}%` }} />
              </div>
              <small>
                {taken === 0 ? `${config.total} números disponíveis` : `${counts.free} de ${config.total} números ainda livres`}
              </small>
            </div>
          )}
          {config.endsAt && (
            <div className="rmodal__timer">
              <small>As vendas encerram em</small>
              <Countdown to={config.endsAt} className={config.endsAt - Date.now() < 24 * 3600_000 ? 'is-urgent' : ''} />
            </div>
          )}
          {config.drawDate && <p className="rmodal__draw">Sorteio: {config.drawDate}</p>}

          <div className="rmodal__actions">
            <button className="btn btn--wa btn--lg" onClick={go} data-autofocus disabled={leaving}>
              Escolher meus números
            </button>
            <button className="rmodal__later" onClick={onClose}>
              Agora não
            </button>
          </div>
          <p className="rmodal__fine">
            Pagamento por PIX. <Link to="/rifa" onClick={onClose}>Ver regras e detalhes</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
