import QRCode from 'qrcode'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { RichText } from '../lib/richText'
import { WhatsAppIcon } from '../components/Icons'
import { Countdown } from '../components/RaffleBanner'
import { pixPayload, normalizePixKey } from '../lib/pix'
import {
  expiresAt,
  isExpired,
  loadMyReservation,
  newReservationCode,
  numberState,
  padNumber,
  raffleCounts,
  reserveNumbers,
  saveMyReservation,
  useRaffleConfig,
  type MyReservation,
  type RaffleConfig,
  type TicketMap,
} from '../lib/raffle'
import { formatCountdown, useNow, usePrizeImage, useTickets } from '../lib/raffleHooks'
import { Link } from '../lib/router'
import { formatPrice, whatsappLink } from '../lib/whatsapp'

const money = (n: number) => Math.round(n * 100) / 100

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function RafflePage() {
  const { config, loading } = useRaffleConfig()
  const enabled = !!config && (config.active || !!config.winner)
  const image = usePrizeImage(enabled)
  const { tickets, error, reload } = useTickets(enabled, 30_000)
  const [selected, setSelected] = useState<number[]>([])
  const [mine, setMine] = useState<MyReservation | null>(loadMyReservation)
  const [sheet, setSheet] = useState(false)
  const [onlyFree, setOnlyFree] = useState(false)
  const [notice, setNotice] = useState('')
  const now = useNow()

  const cfg = config
  const map: TicketMap = useMemo(() => tickets ?? new Map(), [tickets])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  // Tira da seleção números que alguém reservou enquanto a página estava aberta
  useEffect(() => {
    if (!cfg || !tickets) return
    setSelected((cur) => {
      const next = cur.filter((n) => numberState(tickets, n, cfg.reserveHours) === 'free')
      return next.length === cur.length ? cur : next
    })
  }, [tickets, cfg])

  if (loading) return <section className="rf-wrap"><div className="container rf-center">Carregando…</div></section>

  if (!cfg || (!cfg.active && !cfg.winner)) {
    return (
      <section className="rf-wrap">
        <div className="container rf-center">
          <h1>Nenhuma rifa no ar agora</h1>
          <p>Fique de olho: quando abrirmos uma nova rifa, ela aparece aqui e na página inicial.</p>
          <Link to="/produtos" className="btn btn--dark">Ver produtos</Link>
        </div>
      </section>
    )
  }

  const counts = tickets ? raffleCounts(tickets, cfg, now) : null
  const taken = counts ? counts.paid + counts.reserved : 0
  const pct = counts ? Math.round((taken / cfg.total) * 100) : 0
  const ended = !!cfg.endsAt && now > cfg.endsAt
  const closed = !cfg.active || ended

  /* ---- minha reserva (derivada do que o servidor diz) ---- */
  let my: { kind: 'pending' | 'paid' | 'gone'; owned: number[]; deadline: number } | null = null
  if (mine) {
    if (!tickets) {
      my = { kind: 'pending', owned: mine.numbers, deadline: mine.createdAt + cfg.reserveHours * 3600_000 }
    } else {
      const owned = mine.numbers.filter((n) => tickets.get(n)?.reservationId === mine.code)
      const open = owned.filter((n) => tickets.get(n)!.status === 'reserved' && !isExpired(tickets.get(n)!, cfg.reserveHours, now))
      const paid = owned.filter((n) => tickets.get(n)!.status === 'paid')
      if (open.length) my = { kind: 'pending', owned: open, deadline: Math.min(...open.map((n) => expiresAt(tickets.get(n)!, cfg.reserveHours))) }
      else if (paid.length) my = { kind: 'paid', owned: paid, deadline: 0 }
      else my = { kind: 'gone', owned: [], deadline: 0 }
    }
  }
  const mineSet = new Set(mine && my && my.kind !== 'gone' ? my.owned : [])

  const toggle = (n: number) => {
    setSelected((cur) => {
      if (cur.includes(n)) return cur.filter((x) => x !== n)
      if (cur.length >= cfg.maxPerPurchase) {
        setNotice(`Você pode reservar até ${cfg.maxPerPurchase} números por vez.`)
        return cur
      }
      return [...cur, n].sort((a, b) => a - b)
    })
  }

  const pickRandom = (k: number) => {
    const free: number[] = []
    for (let n = 1; n <= cfg.total; n++) if (numberState(map, n, cfg.reserveHours) === 'free' && !selected.includes(n)) free.push(n)
    const room = Math.min(k, cfg.maxPerPurchase - selected.length, free.length)
    if (room <= 0) return setNotice(free.length ? `Limite de ${cfg.maxPerPurchase} números por vez.` : 'Não há números livres.')
    const picked: number[] = []
    const rnd = crypto.getRandomValues(new Uint32Array(room * 4))
    let i = 0
    while (picked.length < room && free.length) {
      picked.push(free.splice(rnd[i++ % rnd.length] % free.length, 1)[0])
    }
    setSelected((cur) => [...cur, ...picked].sort((a, b) => a - b))
  }

  const numbers = Array.from({ length: cfg.total }, (_, i) => i + 1)
  const total = money(selected.length * cfg.price)
  const steps: ReactNode[] = [
    <><b>Escolha</b> seus números e faça a reserva informando seu <b>nome</b> e <b>WhatsApp</b>.</>,
    <><b>Pague</b> o valor total da reserva por <b>PIX</b> (QR Code ou copia e cola).</>,
    <>A reserva fica garantida por <b>{cfg.reserveHours} {cfg.reserveHours === 1 ? 'hora' : 'horas'}</b>. Sem pagamento nesse prazo, os números <u>voltam a ficar livres</u> para outras pessoas.</>,
    <>Depois de pagar, <b>envie o comprovante pelo WhatsApp</b>. A confirmação do pagamento é feita <em>manualmente</em> pela loja.</>,
  ]

  return (
    <>
      <section className="rf-hero">
        <div className="container rf-hero__inner">
          <div className="rf-hero__media">
            {image ? <img src={image} alt={cfg.prizeName} /> : <div className="rf-hero__ph" aria-hidden="true">🎁</div>}
          </div>
          <div className="rf-hero__text">
            <nav className="crumbs" aria-label="Você está em">
              <Link to="/">Início</Link> <span>/</span> <span aria-current="page">Rifa</span>
            </nav>
            <p className="rf-badge">{closed ? 'Rifa encerrada' : '🎟️ Rifa no ar'}</p>
            <h1>{cfg.title || cfg.prizeName}</h1>
            <p className="rf-prize">
              Prêmio: <strong>{cfg.prizeName}</strong>
            </p>
            {cfg.prizeDescription && <p className="rf-desc">{cfg.prizeDescription}</p>}
            <div className="rf-facts">
              <div><span>Cota</span><strong>{formatPrice(cfg.price)}</strong></div>
              <div><span>Números</span><strong>{cfg.total}</strong></div>
              {cfg.drawDate && <div><span>Sorteio</span><strong>{cfg.drawDate}</strong></div>}
            </div>
            {cfg.endsAt && !closed && (
              <div className="rf-timer">
                <small>Vendas encerram em</small>
                <Countdown to={cfg.endsAt} className={cfg.endsAt - now < 24 * 3600_000 ? 'is-urgent' : ''} />
              </div>
            )}
            {counts && (
              <div className="rf-progress">
                <div className="rf-progress__bar"><span style={{ width: `${Math.max(pct, taken ? 3 : 0)}%` }} /></div>
                <small>{counts.paid} pagos · {counts.reserved} reservados · {counts.free} livres</small>
              </div>
            )}
          </div>
        </div>
      </section>

      {cfg.winner && (
        <section className="rf-wrap">
          <div className="container">
            <div className="rf-winner">
              <span aria-hidden="true">🏆</span>
              <div>
                <h2>Resultado do sorteio</h2>
                <p>
                  Número sorteado: <strong>{padNumber(cfg.winner.number, cfg.total)}</strong>
                  {cfg.winner.name ? <> — ganhador(a): <strong>{cfg.winner.name}</strong></> : null}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {mine && my && (
        <section className="rf-wrap">
          <div className="container">
            <MyReservationCard cfg={cfg} mine={mine} my={my} now={now} onClear={() => (saveMyReservation(null), setMine(null))} />
          </div>
        </section>
      )}

      {!closed && (
        <section className="rf-wrap">
          <div className="container">
            <div className="rf-head">
              <div>
                <h2>Escolha seus números</h2>
                <p>Toque nos números livres. Você pode escolher até {cfg.maxPerPurchase} por vez.</p>
              </div>
              <div className="rf-tools">
                <button className="rf-tool" onClick={() => pickRandom(1)}>+ 1 aleatório</button>
                <button className="rf-tool" onClick={() => pickRandom(5)}>+ 5 aleatórios</button>
                <label className="rf-check"><input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} /> Só livres</label>
              </div>
            </div>

            <ul className="rf-legend" aria-hidden="true">
              <li><i className="n n--free" /> Livre</li>
              <li><i className="n n--sel" /> Selecionado</li>
              <li><i className="n n--reserved" /> Reservado</li>
              <li><i className="n n--paid" /> Pago</li>
              {mineSet.size > 0 && <li><i className="n n--mine" /> Seu</li>}
            </ul>

            {error && !tickets && <p className="rf-alert">Não foi possível carregar os números agora. <button className="linklike" onClick={() => void reload()}>Tentar de novo</button></p>}

            <div className="rf-grid" role="group" aria-label="Números da rifa">
              {numbers.map((n) => {
                const st = numberState(map, n, cfg.reserveHours, now)
                const sel = selected.includes(n)
                const own = mineSet.has(n)
                if (onlyFree && st !== 'free') return null
                const cls = own ? 'mine' : sel ? 'sel' : st
                const label = `Número ${padNumber(n, cfg.total)}, ${own ? 'seu' : sel ? 'selecionado' : st === 'free' ? 'livre' : st === 'paid' ? 'pago' : 'reservado'}`
                return (
                  <button key={n} type="button" className={`n n--${cls}`} disabled={!own && st !== 'free'} aria-pressed={sel} aria-label={label} onClick={() => toggle(n)}>
                    {padNumber(n, cfg.total)}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="rf-wrap rf-rules">
        <div className="container">
          <h2>Como funciona e regras</h2>
          <h3>Passo a passo</h3>
          <ol className="rf-steps">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {cfg.rules?.trim() && (
            <div className="rf-rules__extra">
              <RichText text={cfg.rules} />
            </div>
          )}
        </div>
      </section>

      {selected.length > 0 && !closed && (
        <div className="rf-tray" role="region" aria-label="Sua seleção">
          <div className="rf-tray__in">
            <div className="rf-tray__nums">
              {selected.map((n) => (
                <button key={n} onClick={() => toggle(n)} title="Remover" aria-label={`Remover número ${padNumber(n, cfg.total)}`}>
                  {padNumber(n, cfg.total)} ✕
                </button>
              ))}
            </div>
            <div className="rf-tray__go">
              <div><small>{selected.length} {selected.length === 1 ? 'número' : 'números'}</small><strong>{formatPrice(total)}</strong></div>
              <button className="btn btn--wa" onClick={() => setSheet(true)}>Reservar</button>
            </div>
          </div>
        </div>
      )}

      {notice && <div className="rf-toast" role="status">{notice}</div>}

      {sheet && (
        <ReserveSheet
          cfg={cfg}
          numbers={selected}
          total={total}
          onClose={() => setSheet(false)}
          onDone={(r) => {
            saveMyReservation(r)
            setMine(r)
            setSelected([])
            setSheet(false)
            void reload()
            setTimeout(() => document.getElementById('minha-reserva')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
          }}
          onConflict={async () => {
            setSheet(false)
            await reload()
            setNotice('Alguém reservou um dos números ao mesmo tempo. Atualizamos a lista: escolha outros.')
          }}
        />
      )}
    </>
  )
}

/* --------------------------- reservar (formulário) --------------------------- */
function ReserveSheet(props: {
  cfg: RaffleConfig
  numbers: number[]
  total: number
  onClose: () => void
  onDone: (r: MyReservation) => void
  onConflict: () => void
}) {
  const { cfg, numbers, total } = props
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && props.onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (name.trim().length < 3) return setError('Informe seu nome completo.')
    if (digits.length < 10) return setError('Informe um WhatsApp válido, com DDD.')
    if (!ok) return setError('Confirme que leu as regras para continuar.')
    setBusy(true)
    const code = newReservationCode()
    try {
      await reserveNumbers({ numbers, name: name.trim(), phone: digits, code, total })
      props.onDone({ code, numbers, total, name: name.trim(), phone: digits, createdAt: Date.now() })
    } catch (err) {
      const c = (err as { code?: string }).code
      if (c === 'permission-denied' || c === 'aborted' || c === 'already-exists') props.onConflict()
      else {
        setBusy(false)
        setError('Não foi possível reservar agora. Verifique sua conexão e tente novamente.')
      }
    }
  }

  return (
    <div className="rmodal" role="dialog" aria-modal="true" aria-labelledby="rs-title">
      <div className="rmodal__scrim" onClick={() => !busy && props.onClose()} />
      <form className="rf-sheet" onSubmit={submit} noValidate>
        <h2 id="rs-title">Reservar números</h2>
        <p className="rf-sheet__sum">
          {numbers.map((n) => padNumber(n, cfg.total)).join(', ')} — <strong>{formatPrice(total)}</strong>
        </p>
        <label className="rf-f">
          <span>Seu nome completo</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} autoFocus />
        </label>
        <label className="rf-f">
          <span>Seu WhatsApp (com DDD)</span>
          <input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(15) 99999-9999" />
        </label>
        <label className="rf-check rf-check--block">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
          <span>
            Li as regras: preciso pagar por PIX em até {cfg.reserveHours} {cfg.reserveHours === 1 ? 'hora' : 'horas'}, senão a reserva expira.
          </span>
        </label>
        {error && <p className="rf-alert" role="alert">{error}</p>}
        <div className="rf-sheet__actions">
          <button type="button" className="btn btn--outline" onClick={props.onClose} disabled={busy}>Voltar</button>
          <button className="btn btn--wa" disabled={busy}>{busy ? 'Reservando…' : 'Confirmar reserva'}</button>
        </div>
      </form>
    </div>
  )
}

/* ------------------------------ minha reserva ------------------------------ */
function MyReservationCard({
  cfg,
  mine,
  my,
  now,
  onClear,
}: {
  cfg: RaffleConfig
  mine: MyReservation
  my: { kind: 'pending' | 'paid' | 'gone'; owned: number[]; deadline: number }
  now: number
  onClear: () => void
}) {
  const nums = (my.kind === 'gone' ? mine.numbers : my.owned).map((n) => padNumber(n, cfg.total)).join(', ')
  return (
    <div className={`rf-mine rf-mine--${my.kind}`} id="minha-reserva">
      <header>
        <div>
          <p className="rf-badge">
            {my.kind === 'paid' ? '✅ Pagamento confirmado' : my.kind === 'pending' ? '⏳ Reserva aguardando pagamento' : 'Reserva expirada'}
          </p>
          <h2>Sua reserva · código {mine.code}</h2>
          <p>
            Números: <strong>{nums}</strong>
          </p>
        </div>
        {my.kind !== 'pending' && <button className="linklike" onClick={onClear}>Dispensar</button>}
      </header>

      {my.kind === 'paid' && <p>Obrigado, {mine.name.split(' ')[0]}! Seus números estão confirmados. Boa sorte! 🍀</p>}
      {my.kind === 'gone' && <p>O prazo de pagamento terminou e os números foram liberados. Você pode escolher novamente acima.</p>}
      {my.kind === 'pending' && <PaymentPanel cfg={cfg} mine={mine} owned={my.owned} deadline={my.deadline} now={now} />}
    </div>
  )
}

function PaymentPanel({ cfg, mine, owned, deadline, now }: { cfg: RaffleConfig; mine: MyReservation; owned: number[]; deadline: number; now: number }) {
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const amount = money(owned.length * cfg.price)
  const key = normalizePixKey(cfg.pixType, cfg.pixKey)
  const payload = useMemo(
    () => (key ? pixPayload({ key, name: cfg.pixName, city: cfg.pixCity, amount, txid: `RIFA${mine.code}` }) : ''),
    [key, cfg.pixName, cfg.pixCity, amount, mine.code],
  )

  useEffect(() => {
    if (!payload) return
    let alive = true
    QRCode.toDataURL(payload, { margin: 1, width: 360, errorCorrectionLevel: 'M' }).then((u) => alive && setQr(u))
    return () => {
      alive = false
    }
  }, [payload])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload)
    } catch {
      const ta = document.getElementById('pix-code') as HTMLTextAreaElement | null
      ta?.select()
      document.execCommand('copy')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (!payload) return <p className="rf-alert">O PIX desta rifa ainda não foi configurado. Fale com a loja pelo WhatsApp para pagar.</p>

  const msg = `Olá! Fiz a reserva da rifa (código ${mine.code}) — números ${owned.map((n) => padNumber(n, cfg.total)).join(', ')} — total ${formatPrice(amount)}. Segue o comprovante do PIX.`

  return (
    <div className="rf-pay">
      <div className="rf-pay__qr">
        {qr ? <img src={qr} alt="QR Code do PIX" width="220" height="220" /> : <div className="rf-pay__ph" />}
        <small>Abra o app do seu banco e escaneie</small>
      </div>
      <div className="rf-pay__info">
        <p className="rf-pay__amount">Valor a pagar <strong>{formatPrice(amount)}</strong></p>
        <p className="rf-pay__timer">Reserva válida por <strong>{formatCountdown(deadline - now)}</strong></p>
        <label className="rf-f">
          <span>PIX copia e cola</span>
          <textarea id="pix-code" readOnly rows={3} value={payload} onFocus={(e) => e.currentTarget.select()} />
        </label>
        <button className="btn btn--dark btn--lg rf-pay__copy" onClick={copy}>{copied ? '✓ Código copiado!' : 'Copiar código PIX'}</button>
        <p className="rf-pay__to">Favorecido: <strong>{cfg.pixName}</strong></p>
        <a className="btn btn--wa" href={whatsappLink(msg)} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon width={18} height={18} /> Já paguei — enviar comprovante
        </a>
        <small className="rf-pay__note">Guarde seu código <strong>{mine.code}</strong>. Seus números só são confirmados depois que a loja conferir o pagamento.</small>
      </div>
    </div>
  )
}
