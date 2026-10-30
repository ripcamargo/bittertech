import { isRaffleLive, raffleCounts, useRaffleConfig, type RaffleConfig } from '../lib/raffle'
import { useNow, usePrizeImage, useTickets } from '../lib/raffleHooks'
import { Link } from '../lib/router'
import { formatPrice } from '../lib/whatsapp'
import { ArrowRight } from './Icons'

const pad = (n: number) => String(n).padStart(2, '0')

export function splitTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

/** Cronômetro regressivo (dias · horas · min · seg). */
export function Countdown({ to, className = '' }: { to: number; className?: string }) {
  const now = useNow(1000)
  const t = splitTime(to - now)
  const cells: [string, number][] = [['dias', t.d], ['horas', t.h], ['min', t.m], ['seg', t.s]]
  return (
    <div className={`cd ${className}`} role="timer" aria-label="Tempo restante">
      {cells.map(([label, v]) => (
        <div key={label}>
          <b>{pad(v)}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

/** Urgência: pouco tempo (menos de 24 h) ou poucas cotas livres. */
function urgency(cfg: RaffleConfig, free: number | null, now: number): string | null {
  if (cfg.endsAt && cfg.endsAt - now < 24 * 3600_000) return '🔥 Últimas horas!'
  if (free !== null && free <= Math.max(5, Math.ceil(cfg.total * 0.2))) return free === 0 ? 'Esgotando!' : `🔥 Restam só ${free} números!`
  return null
}

/** Pílula pulsante dentro do hero. */
export function RaffleHeroPill() {
  const { config } = useRaffleConfig()
  const now = useNow(1000)
  if (!config || !isRaffleLive(config, now)) return null
  return (
    <Link to="/rifa" className="hero-pill">
      <span className="hero-pill__dot" aria-hidden="true" />
      <b>Rifa em andamento</b>
      <span>{config.prizeName}</span>
      {config.endsAt && <em>termina em {formatShort(config.endsAt - now)}</em>}
      <ArrowRight width={16} height={16} />
    </Link>
  )
}

function formatShort(ms: number) {
  const t = splitTime(ms)
  if (t.d > 0) return `${t.d}d ${pad(t.h)}h`
  if (t.h > 0) return `${t.h}h ${pad(t.m)}min`
  return `${pad(t.m)}:${pad(t.s)}`
}

/** Faixa de destaque da página inicial (só aparece com a rifa ativa). */
export default function RaffleBanner() {
  const { config } = useRaffleConfig()
  const now = useNow(1000)
  if (!config || !isRaffleLive(config, now)) return null
  return <Banner cfg={config} now={now} />
}

function Banner({ cfg, now }: { cfg: RaffleConfig; now: number }) {
  const image = usePrizeImage(true)
  const { tickets } = useTickets(true, 60_000)
  const counts = tickets ? raffleCounts(tickets, cfg, now) : null
  const taken = counts ? cfg.total - counts.free : 0
  const pct = counts ? Math.round((taken / cfg.total) * 100) : 0
  const hot = urgency(cfg, counts ? counts.free : null, now)

  return (
    <section className="rbanner" aria-label="Rifa em andamento">
      <div className="container rbanner__in">
        <div className="rbanner__media">
          {image ? <img src={image} alt={cfg.prizeName} loading="lazy" /> : <div className="rbanner__ph" aria-hidden="true">🎁</div>}
        </div>

        <div className="rbanner__body">
          <div className="rbanner__tags">
            <span className="rbanner__live"><i aria-hidden="true" /> Rifa em andamento</span>
            {hot && <span className="rbanner__hot">{hot}</span>}
          </div>
          <h2>{cfg.title || cfg.prizeName}</h2>
          <p className="rbanner__prize">
            Prêmio: <strong>{cfg.prizeName}</strong>
            {cfg.drawDate ? <> · Sorteio: {cfg.drawDate}</> : null}
          </p>

          {cfg.endsAt ? (
            <div className="rbanner__timer">
              <small>{cfg.endsAt - now < 24 * 3600_000 ? 'Corre! As vendas encerram em' : 'As vendas encerram em'}</small>
              <Countdown to={cfg.endsAt} className={cfg.endsAt - now < 24 * 3600_000 ? 'is-urgent' : ''} />
            </div>
          ) : null}

          <div className="rbanner__row">
            <div className="rbanner__price"><span>Cota</span><strong>{formatPrice(cfg.price)}</strong></div>
            <div className="rbanner__progress">
              <div className="rbanner__bar"><span style={{ width: `${Math.max(pct, taken ? 4 : 0)}%` }} /></div>
              <small>{counts ? `${counts.free} de ${cfg.total} números ainda livres` : `${cfg.total} números`}</small>
            </div>
          </div>

          <Link to="/rifa" className="btn btn--wa btn--lg rbanner__cta">
            Garantir meus números <ArrowRight width={18} height={18} />
          </Link>
        </div>
      </div>
    </section>
  )
}
