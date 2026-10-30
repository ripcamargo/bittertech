import QRCode from 'qrcode'
import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizePixKey, pixKeyTypes, pixPayload, type PixKeyType } from '../lib/pix'
import {
  isExpired,
  MAX_PER_PURCHASE,
  MAX_TOTAL,
  numberState,
  padNumber,
  raffleCounts,
  whatsappDigits,
  type RaffleConfig,
  type TicketMap,
} from '../lib/raffle'
import { formatPrice } from '../lib/whatsapp'
import {
  cancelOrder,
  clearExpired,
  confirmPayment,
  conflictsFor,
  DEFAULT_CONFIG,
  deleteOrder,
  loadPrizeImage,
  manualSale,
  publishWinner,
  removeWinner,
  saveConfig,
  setActive,
  watchConfig,
  watchOrders,
  watchTickets,
  type Order,
} from './raffleStore'
import { processImage } from './store'

type Say = (msg: string, kind?: 'ok' | 'err') => void
type Sub = 'config' | 'sales' | 'draw'

const money = (n: number) => Math.round(n * 100) / 100
const parsePrice = (v: string) => {
  const s = v.replace(/[^\d.,]/g, '')
  if (!s) return 0
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s)
  return Number.isFinite(n) ? money(n) : NaN
}
const priceText = (n: number) => (n ? String(n).replace('.', ',') : '')
const fmtDate = (ms: number) => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const toLocalInput = (ms: number) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000)
  return d.toISOString().slice(0, 16)
}
const maskName = (full: string) => {
  const p = full.trim().split(/\s+/)
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0].toUpperCase()}.` : p[0] ?? ''
}
const fmtPhone = (d: string) => (d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d)

/** "1, 5, 10-15" → [1,5,10,11,...,15] (ou null se inválido) */
function parseNumbers(text: string, total: number): number[] | null {
  const out = new Set<number>()
  for (const part of text.split(/[,\s;]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/)
    if (!m) return null
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    if (a < 1 || b > total || a > b) return null
    for (let n = a; n <= b; n++) out.add(n)
  }
  return out.size ? [...out].sort((x, y) => x - y) : null
}

export default function RaffleAdmin({ say }: { say: Say }) {
  const [sub, setSub] = useState<Sub>('config')
  const [config, setConfig] = useState<RaffleConfig | null | undefined>(undefined)
  const [tickets, setTickets] = useState<TicketMap>(new Map())
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const err = (e: { code: string }) =>
      setError(e.code === 'permission-denied' ? 'Sem permissão. Confira as regras do Firestore da rifa (veja o README) e se o e-mail do administrador está liberado.' : `Erro ao carregar (${e.code}).`)
    const stops = [watchConfig(setConfig, err), watchTickets(setTickets, err), watchOrders(setOrders, err)]
    return () => stops.forEach((s) => s())
  }, [])

  if (error) return <main className="wrap"><p className="f-error">{error}</p></main>
  if (config === undefined) return <main className="wrap"><p className="empty-a">Carregando rifa…</p></main>

  const cfg = config ?? DEFAULT_CONFIG
  return (
    <main className="wrap">
      <header className="raffle-head">
        <div>
          <h1>Rifa</h1>
          <p className="hint">{config ? (cfg.active ? 'No ar: o modal aparece para quem entra no site.' : 'Desativada: nada aparece no site.') : 'Ainda não configurada.'}</p>
        </div>
        <ActiveSwitch cfg={config} say={say} />
      </header>

      <div className="subtabs" role="tablist">
        {([['config', 'Configuração'], ['sales', 'Vendas e reservas'], ['draw', 'Sorteio']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={sub === k} className={sub === k ? 'is-on' : ''} onClick={() => setSub(k)}>
            {l}
          </button>
        ))}
      </div>

      {sub === 'config' && <ConfigForm config={config} tickets={tickets} say={say} />}
      {sub === 'sales' && config && <Sales cfg={cfg} tickets={tickets} orders={orders} say={say} />}
      {sub === 'draw' && config && <Draw cfg={cfg} tickets={tickets} orders={orders} say={say} />}
      {sub !== 'config' && !config && <p className="empty-a">Salve a configuração da rifa primeiro.</p>}
    </main>
  )
}

/** Valida se a rifa pode ir ao ar. */
function readiness(c: RaffleConfig): string | null {
  if (!c.title.trim() && !c.prizeName.trim()) return 'Informe o título e o prêmio.'
  if (!c.prizeName.trim()) return 'Informe o nome do prêmio.'
  if (!(c.price > 0)) return 'Informe o valor da cota.'
  if (!normalizePixKey(c.pixType, c.pixKey)) return 'Informe uma chave PIX válida.'
  if (!c.pixName.trim() || !c.pixCity.trim()) return 'Informe o nome e a cidade do favorecido do PIX.'
  return null
}

function ActiveSwitch({ cfg, say }: { cfg: RaffleConfig | null; say: Say }) {
  const [busy, setBusy] = useState(false)
  const toggle = async () => {
    if (!cfg) return say('Salve a configuração antes de ativar.', 'err')
    if (!cfg.active) {
      const problem = readiness(cfg)
      if (problem) return say(problem, 'err')
    }
    setBusy(true)
    try {
      await setActive(!cfg.active)
      say(cfg.active ? 'Rifa desativada.' : 'Rifa ativada! Já aparece no site.')
    } catch {
      say('Não foi possível alterar. Tente novamente.', 'err')
    }
    setBusy(false)
  }
  return (
    <button className={`switch${cfg?.active ? ' is-on' : ''}`} onClick={toggle} disabled={busy} role="switch" aria-checked={!!cfg?.active}>
      <span className="switch__knob" />
      <b>{cfg?.active ? 'Rifa ativa' : 'Rifa desativada'}</b>
    </button>
  )
}

/* ============================= CONFIGURAÇÃO ============================= */
function ConfigForm({ config, tickets, say }: { config: RaffleConfig | null; tickets: TicketMap; say: Say }) {
  const init = config ?? DEFAULT_CONFIG
  const [title, setTitle] = useState(init.title)
  const [prizeName, setPrizeName] = useState(init.prizeName)
  const [prizeDescription, setPrizeDescription] = useState(init.prizeDescription ?? '')
  const [total, setTotal] = useState(String(init.total))
  const [price, setPrice] = useState(priceText(init.price))
  const [maxPer, setMaxPer] = useState(String(init.maxPerPurchase))
  const [hours, setHours] = useState(String(init.reserveHours))
  const [drawDate, setDrawDate] = useState(init.drawDate ?? '')
  const [endsAt, setEndsAt] = useState(init.endsAt ? toLocalInput(init.endsAt) : '')
  const [rules, setRules] = useState(init.rules ?? '')
  const [pixType, setPixType] = useState<PixKeyType>(init.pixType)
  const [pixKey, setPixKey] = useState(init.pixKey)
  const [pixName, setPixName] = useState(init.pixName)
  const [pixCity, setPixCity] = useState(init.pixCity)
  const [image, setImage] = useState('')
  const [imageDirty, setImageDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadPrizeImage().then(setImage).catch(() => undefined)
  }, [])

  const normKey = normalizePixKey(pixType, pixKey)
  const testPayload = useMemo(
    () => (normKey ? pixPayload({ key: normKey, name: pixName, city: pixCity, amount: 1, txid: 'TESTE' }) : ''),
    [normKey, pixName, pixCity],
  )
  useEffect(() => {
    if (!testPayload) return setQr('')
    let alive = true
    QRCode.toDataURL(testPayload, { margin: 1, width: 220, errorCorrectionLevel: 'M' }).then((u) => alive && setQr(u))
    return () => {
      alive = false
    }
  }, [testPayload])

  const pickImage = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    try {
      setImage(await processImage(f))
      setImageDirty(true)
    } catch {
      setError('Não foi possível processar essa imagem. Tente JPG, PNG ou WebP.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const t = Number(total)
    const p = parsePrice(price)
    const mp = Number(maxPer)
    const h = Number(hours)
    if (!Number.isInteger(t) || t < 2 || t > MAX_TOTAL) return setError(`A quantidade de números deve ficar entre 2 e ${MAX_TOTAL}.`)
    const highest = tickets.size ? Math.max(...tickets.keys()) : 0
    if (t < highest) return setError(`Já existem números vendidos/reservados até o ${highest}. Não dá para reduzir abaixo disso.`)
    if (!(p > 0)) return setError('Informe o valor da cota (ex.: 10 ou 12,50).')
    if (!Number.isInteger(mp) || mp < 1 || mp > MAX_PER_PURCHASE) return setError(`O máximo de números por compra deve ficar entre 1 e ${MAX_PER_PURCHASE}.`)
    if (!Number.isInteger(h) || h < 1 || h > 720) return setError('O prazo da reserva deve ficar entre 1 e 720 horas.')
    if (!prizeName.trim()) return setError('Informe o nome do prêmio.')
    const endMs = endsAt ? new Date(endsAt).getTime() : undefined
    if (endMs !== undefined && (!Number.isFinite(endMs) || endMs <= Date.now())) return setError('A data de encerramento precisa estar no futuro (ou deixe em branco para não usar cronômetro).')
    if (pixKey.trim() && !normKey) return setError(`A chave PIX não é um ${pixKeyTypes.find((x) => x.value === pixType)!.label} válido.`)
    if (config?.active && readiness({ ...config, price: p, pixType, pixKey, pixName, pixCity, prizeName })) return setError('A rifa está ativa: não deixe PIX, prêmio ou valor incompletos. Desative antes de limpar esses campos.')

    const next: RaffleConfig = {
      ...(config ?? DEFAULT_CONFIG),
      title: title.trim(),
      prizeName: prizeName.trim(),
      prizeDescription: prizeDescription.trim(),
      total: t,
      price: p,
      maxPerPurchase: mp,
      reserveHours: h,
      drawDate: drawDate.trim(),
      endsAt: endMs,
      rules: rules.trim(),
      pixType,
      pixKey: normKey ?? pixKey.trim(),
      pixName: pixName.trim(),
      pixCity: pixCity.trim(),
    }
    setBusy(true)
    try {
      await saveConfig(next, imageDirty ? image : null)
      setImageDirty(false)
      say('Configuração da rifa salva.')
    } catch (err) {
      console.error(err)
      setError('Não foi possível salvar. Verifique a conexão e as permissões do Firestore.')
    }
    setBusy(false)
  }

  const copyTest = async () => {
    await navigator.clipboard?.writeText(testPayload).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedType = pixKeyTypes.find((x) => x.value === pixType)!

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <fieldset>
        <legend>Prêmio</legend>
        <div className="prize-row">
          <div className="prize-img">
            {image ? <img src={image} alt="Prêmio" /> : <span>🎁<small>Sem imagem</small></span>}
            <div className="prize-img__btns">
              <button type="button" className="btn-a btn-a--ghost btn-a--sm" onClick={() => fileRef.current?.click()}>{image ? 'Trocar imagem' : 'Enviar imagem'}</button>
              {image && <button type="button" className="btn-a btn-a--ghost btn-a--sm" onClick={() => (setImage(''), setImageDirty(true))}>Remover</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files)} />
          </div>
          <div>
            <label className="f"><span>Título da rifa</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Concorra a um iPhone 13!" maxLength={80} /></label>
            <label className="f"><span>Nome do prêmio *</span><input value={prizeName} onChange={(e) => setPrizeName(e.target.value)} placeholder="Ex.: iPhone 13 128 GB" maxLength={80} /></label>
            <label className="f"><span>Descrição do prêmio <em>opcional</em></span><textarea value={prizeDescription} onChange={(e) => setPrizeDescription(e.target.value)} rows={3} maxLength={400} /></label>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Números e valores</legend>
        <div className="f-row f-row--4">
          <label className="f"><span>Qtd. de números *</span><input value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ''))} inputMode="numeric" /><small>até {MAX_TOTAL}</small></label>
          <label className="f"><span>Valor da cota (R$) *</span><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="10,00" /></label>
          <label className="f"><span>Máx. por compra</span><input value={maxPer} onChange={(e) => setMaxPer(e.target.value.replace(/\D/g, ''))} inputMode="numeric" /><small>até {MAX_PER_PURCHASE}</small></label>
          <label className="f"><span>Reserva vale (horas)</span><input value={hours} onChange={(e) => setHours(e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></label>
        </div>
        <p className="hint">Arrecadação máxima: <b>{formatPrice(money((Number(total) || 0) * (parsePrice(price) || 0)))}</b>. Os números vão de 1 a {Number(total) || 0}.</p>
        <label className="f">
          <span>Encerramento das vendas <em>liga o cronômetro no site e bloqueia novas reservas depois dessa hora</em></span>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          {endsAt && <small><button type="button" className="linklike" onClick={() => setEndsAt('')}>Remover cronômetro</button></small>}
        </label>
        <label className="f"><span>Data do sorteio <em>texto livre, aparece no site</em></span><input value={drawDate} onChange={(e) => setDrawDate(e.target.value)} placeholder="Ex.: 30/11 às 20h, pela Loteria Federal" maxLength={80} /></label>
      </fieldset>

      <fieldset>
        <legend>Recebimento por PIX</legend>
        <div className="f-row">
          <label className="f">
            <span>Tipo da chave</span>
            <select value={pixType} onChange={(e) => setPixType(e.target.value as PixKeyType)}>
              {pixKeyTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="f">
            <span>Chave PIX</span>
            <input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder={selectedType.hint} />
            {pixKey.trim() && <small className={normKey ? 'ok' : 'bad'}>{normKey ? '✓ chave válida' : `não parece um ${selectedType.label} válido`}</small>}
          </label>
        </div>
        <div className="f-row">
          <label className="f"><span>Nome do favorecido <em>até 25 letras</em></span><input value={pixName} onChange={(e) => setPixName(e.target.value)} maxLength={25} /></label>
          <label className="f"><span>Cidade <em>até 15 letras</em></span><input value={pixCity} onChange={(e) => setPixCity(e.target.value)} maxLength={15} /></label>
        </div>

        <div className="pix-test">
          {qr ? <img src={qr} alt="QR Code de teste" width="150" height="150" /> : <div className="pix-test__ph">QR Code de teste</div>}
          <div>
            <p className="hint"><b>Como o comprador vai ver:</b> um QR Code e um código “copia e cola” com o valor exato da reserva. Para conferir, escaneie este exemplo (R$ 1,00) no seu banco e veja se o favorecido está certo — não precisa pagar.</p>
            {testPayload && (
              <>
                <textarea readOnly rows={3} value={testPayload} onFocus={(e) => e.currentTarget.select()} className="pix-test__code" />
                <button type="button" className="btn-a btn-a--ghost btn-a--sm" onClick={copyTest}>{copied ? '✓ Copiado' : 'Copiar código de teste'}</button>
              </>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Regras</legend>
        <p className="hint">O site já mostra automaticamente as regras de reserva (prazo de {hours || 24} h, pagamento por PIX e confirmação manual). Escreva abaixo regras extras, uma por linha.</p>
        <label className="f"><span>Regras adicionais <em>opcional</em></span><textarea value={rules} onChange={(e) => setRules(e.target.value)} rows={4} placeholder={'Ex.:\nO ganhador será avisado pelo WhatsApp.\nPrêmio retirado na loja, em Sorocaba.'} /></label>
      </fieldset>

      {error && <p className="f-error" role="alert">{error}</p>}
      <div className="panel__foot">
        <button className="btn-a btn-a--primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar configuração'}</button>
      </div>
    </form>
  )
}

/* ============================ VENDAS / RESERVAS ============================ */
type OrderState = 'pending' | 'expired' | 'paid' | 'cancelled'
type Filter = 'all' | OrderState

function viewOrder(o: Order, tickets: TicketMap, hours: number, now: number) {
  const deadline = o.createdAt + hours * 3600_000
  const state: OrderState = o.status === 'paid' ? 'paid' : o.status === 'cancelled' ? 'cancelled' : now > deadline ? 'expired' : 'pending'
  const lost = o.status === 'reserved' && state === 'expired' ? o.numbers.filter((n) => tickets.get(n)?.reservationId !== o.code) : []
  return { state, deadline, lost }
}

function Sales({ cfg, tickets, orders, say }: { cfg: RaffleConfig; tickets: TicketMap; orders: Order[]; say: Say }) {
  const [filter, setFilter] = useState<Filter>('pending')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState(false)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const counts = raffleCounts(tickets, cfg, now)
  const staleCount = [...tickets.values()].filter((t) => isExpired(t, cfg.reserveHours, now)).length
  const views = useMemo(() => orders.map((o) => ({ o, v: viewOrder(o, tickets, cfg.reserveHours, now) })), [orders, tickets, cfg.reserveHours, now])
  const tally = (s: OrderState) => views.filter((x) => x.v.state === s).length
  const q = query.trim().toLowerCase()
  const shown = views.filter(
    ({ o, v }) =>
      (filter === 'all' || v.state === filter) &&
      (!q || `${o.name} ${o.phone} ${o.code} ${o.numbers.map((n) => padNumber(n, cfg.total)).join(' ')} ${o.numbers.join(' ')}`.toLowerCase().includes(q)),
  )

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      say(ok)
    } catch (e) {
      console.error(e)
      say('Não foi possível concluir. Tente novamente.', 'err')
    }
    setBusy(false)
  }

  const pay = (o: Order) => {
    const c = conflictsFor(o.numbers, o.code, tickets, cfg.reserveHours)
    if (c.length) return say(`Não dá para confirmar: o(s) número(s) ${c.map((n) => padNumber(n, cfg.total)).join(', ')} já pertence(m) a outra pessoa.`, 'err')
    if (!window.confirm(`Confirmar o pagamento de ${formatPrice(o.total)} de ${o.name}?\nNúmeros: ${o.numbers.map((n) => padNumber(n, cfg.total)).join(', ')}`)) return
    void run(() => confirmPayment(o), 'Pagamento confirmado.')
  }
  const release = (o: Order) => {
    if (!window.confirm(`Liberar os números de ${o.name}? Eles voltam a ficar disponíveis.`)) return
    void run(() => cancelOrder(o, tickets), 'Números liberados.')
  }
  const remind = (o: Order) => {
    const msg = `Olá, ${o.name.split(' ')[0]}! Aqui é da Bitter Tech Store. Sua reserva na rifa (código ${o.code}, números ${o.numbers.map((n) => padNumber(n, cfg.total)).join(', ')}, ${formatPrice(o.total)}) ainda está aguardando o pagamento. Qualquer dúvida é só chamar!`
    window.open(`https://wa.me/${whatsappDigits(o.phone)}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }
  const wa = (o: Order) => window.open(`https://wa.me/${whatsappDigits(o.phone)}`, '_blank', 'noopener')

  return (
    <>
      <section className="stats stats--5" aria-label="Resumo da rifa">
        <div><b>{counts.paid}</b><span>Pagos</span></div>
        <div><b>{counts.reserved}</b><span>Reservados</span></div>
        <div><b>{counts.free}</b><span>Livres</span></div>
        <div><b>{formatPrice(money(counts.paid * cfg.price))}</b><span>Arrecadado</span></div>
        <div><b>{formatPrice(money(counts.reserved * cfg.price))}</b><span>A receber</span></div>
      </section>

      <section className="toolbar toolbar--sales">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, WhatsApp, código ou número…" aria-label="Buscar" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Situação">
          <option value="pending">Aguardando pagamento ({tally('pending')})</option>
          <option value="paid">Pagas ({tally('paid')})</option>
          <option value="expired">Vencidas ({tally('expired')})</option>
          <option value="cancelled">Canceladas ({tally('cancelled')})</option>
          <option value="all">Todas ({views.length})</option>
        </select>
        <button className="btn-a btn-a--primary" onClick={() => setManual(true)}>+ Venda manual</button>
      </section>

      {staleCount > 0 && (
        <p className="hint">
          {staleCount} reserva(s) vencida(s) ocupando números no banco (no site já aparecem como livres).{' '}
          <button className="linklike" disabled={busy} onClick={() => run(() => clearExpired(tickets, cfg.reserveHours), 'Reservas vencidas limpas.')}>Limpar agora</button>
        </p>
      )}

      <ul className="rows">
        {shown.map(({ o, v }) => (
          <li key={o.code} className={`order order--${v.state}`}>
            <div className="order__main">
              <div className="order__top">
                <strong>{o.name}</strong>
                <span className={`tagx tagx--${v.state}`}>
                  {v.state === 'pending' ? 'Aguardando pagamento' : v.state === 'paid' ? (o.manual ? 'Pago (venda manual)' : 'Pago') : v.state === 'expired' ? 'Vencida' : 'Cancelada'}
                </span>
              </div>
              <div className="order__meta">
                <span>{fmtPhone(o.phone)}</span>
                <span>Código <b>{o.code}</b></span>
                <span>{fmtDate(o.createdAt)}</span>
                {v.state === 'pending' && <span className="warn">vence {fmtDate(v.deadline)}</span>}
              </div>
              <div className="order__nums">
                {o.numbers.map((n) => (
                  <span key={n} className={v.lost.includes(n) ? 'is-lost' : ''} title={v.lost.includes(n) ? 'Já foi liberado/reservado por outra pessoa' : ''}>{padNumber(n, cfg.total)}</span>
                ))}
                <b className="order__total">{formatPrice(o.total)}</b>
              </div>
              {v.lost.length > 0 && <p className="warn">Atenção: {v.lost.length} número(s) desta reserva já foram para outra pessoa — não dá mais para confirmar.</p>}
            </div>
            <div className="order__actions">
              {(v.state === 'pending' || (v.state === 'expired' && v.lost.length === 0)) && (
                <button className="btn-a btn-a--primary btn-a--sm" disabled={busy} onClick={() => pay(o)}>✓ Confirmar pagamento</button>
              )}
              {v.state === 'pending' && <button className="btn-a btn-a--ghost btn-a--sm" onClick={() => remind(o)}>Cobrar no WhatsApp</button>}
              {v.state !== 'pending' && <button className="btn-a btn-a--ghost btn-a--sm" onClick={() => wa(o)}>WhatsApp</button>}
              {(v.state === 'pending' || v.state === 'paid') && <button className="btn-a btn-a--ghost btn-a--sm" disabled={busy} onClick={() => release(o)}>{v.state === 'paid' ? 'Estornar' : 'Liberar'}</button>}
              {(v.state === 'cancelled' || v.state === 'expired') && (
                <button className="icon-btn icon-btn--danger" disabled={busy} title="Excluir registro" aria-label="Excluir registro" onClick={() => window.confirm('Excluir este registro?') && run(() => deleteOrder(o.code), 'Registro excluído.')}>🗑</button>
              )}
            </div>
          </li>
        ))}
        {shown.length === 0 && <li className="empty-a">Nada por aqui com esses filtros.</li>}
      </ul>

      <h3 className="subhead">Mapa dos números</h3>
      <ul className="legend-a">
        <li><i className="mn mn--free" />Livre</li>
        <li><i className="mn mn--reserved" />Reservado</li>
        <li><i className="mn mn--paid" />Pago</li>
      </ul>
      <div className="map">
        {Array.from({ length: cfg.total }, (_, i) => i + 1).map((n) => {
          const st = numberState(tickets, n, cfg.reserveHours, now)
          return (
            <button key={n} className={`mn mn--${st}`} onClick={() => st !== 'free' && setQuery(String(n))} title={st === 'free' ? 'Livre' : 'Ver reserva'}>
              {padNumber(n, cfg.total)}
            </button>
          )
        })}
      </div>

      {manual && <ManualSale cfg={cfg} tickets={tickets} onClose={() => setManual(false)} say={say} />}
    </>
  )
}

function ManualSale({ cfg, tickets, onClose, say }: { cfg: RaffleConfig; tickets: TicketMap; onClose: () => void; say: Say }) {
  const [nums, setNums] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const parsed = parseNumbers(nums, cfg.total)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!parsed) return setError(`Informe números de 1 a ${cfg.total}, ex.: 7, 12, 20-25.`)
    if (name.trim().length < 2) return setError('Informe o nome do comprador.')
    const taken = parsed.filter((n) => numberState(tickets, n, cfg.reserveHours) !== 'free')
    if (taken.length) return setError(`Já ocupados: ${taken.map((n) => padNumber(n, cfg.total)).join(', ')}.`)
    setBusy(true)
    try {
      await manualSale(parsed, name.trim(), phone.replace(/\D/g, ''), cfg.price)
      say('Venda registrada como paga.')
      onClose()
    } catch {
      setBusy(false)
      setError('Não foi possível registrar. Tente novamente.')
    }
  }

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Venda manual">
      <div className="drawer__scrim" onClick={() => !busy && onClose()} />
      <form className="drawer__panel drawer__panel--sm" onSubmit={submit} noValidate>
        <header className="drawer__head"><h2>Venda manual</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button></header>
        <div className="drawer__body">
          <p className="hint">Para quem pagou fora do site (dinheiro, PIX direto…). Os números ficam como <b>pagos</b> na hora.</p>
          <label className="f"><span>Números <em>ex.: 7, 12, 20-25</em></span><input value={nums} onChange={(e) => setNums(e.target.value)} autoFocus /></label>
          {parsed && <p className="hint">{parsed.length} número(s) · <b>{formatPrice(money(parsed.length * cfg.price))}</b></p>}
          <label className="f"><span>Nome do comprador</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
          <label className="f"><span>WhatsApp <em>opcional</em></span><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="(15) 99999-9999" /></label>
          {error && <p className="f-error" role="alert">{error}</p>}
        </div>
        <footer className="drawer__foot">
          <button type="button" className="btn-a btn-a--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-a btn-a--primary" disabled={busy}>{busy ? 'Salvando…' : 'Registrar venda'}</button>
        </footer>
      </form>
    </div>
  )
}

/* ================================= SORTEIO ================================ */
function Draw({ cfg, tickets, orders, say }: { cfg: RaffleConfig; tickets: TicketMap; orders: Order[]; say: Say }) {
  const [candidate, setCandidate] = useState<number | null>(null)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const paid = useMemo(() => [...tickets.values()].filter((t) => t.status === 'paid'), [tickets])
  const buyerOf = (n: number) => {
    const code = tickets.get(n)?.reservationId
    return orders.find((o) => o.code === code)
  }

  const draw = () => {
    const r = crypto.getRandomValues(new Uint32Array(1))[0]
    setCandidate(paid[r % paid.length].number)
  }
  const useManual = () => {
    const n = Number(manual)
    if (!Number.isInteger(n) || n < 1 || n > cfg.total) return say(`Digite um número de 1 a ${cfg.total}.`, 'err')
    if (tickets.get(n)?.status !== 'paid') return say('Esse número não está pago (ou ninguém ficou com ele).', 'err')
    setCandidate(n)
  }

  const cand = candidate !== null ? buyerOf(candidate) : undefined
  const publish = async () => {
    if (candidate === null) return
    setBusy(true)
    try {
      await publishWinner(candidate, cand ? maskName(cand.name) : '')
      say('Resultado publicado no site.')
      setCandidate(null)
    } catch {
      say('Não foi possível publicar.', 'err')
    }
    setBusy(false)
  }

  return (
    <div className="panel">
      <p className="hint">Sorteia só entre os números <b>pagos</b> ({paid.length}). Você também pode informar o número vencedor de outro sorteio (ex.: Loteria Federal). O resultado publicado aparece na página da rifa com o nome abreviado do ganhador.</p>

      {cfg.winner && (
        <div className="winner-card">
          <span aria-hidden="true">🏆</span>
          <div>
            <b>Resultado publicado: número {padNumber(cfg.winner.number, cfg.total)}</b>
            <small>{cfg.winner.name || 'sem nome'}{cfg.active ? ' · lembre de desativar a rifa para parar o modal' : ''}</small>
          </div>
          <button className="btn-a btn-a--ghost btn-a--sm" disabled={busy} onClick={async () => { setBusy(true); try { await removeWinner(); say('Resultado removido.') } catch { say('Não foi possível remover.', 'err') } setBusy(false) }}>Remover</button>
        </div>
      )}

      <div className="draw-grid">
        <div className="draw-box">
          <h3>Sortear agora</h3>
          <p className="hint">Usa um gerador aleatório seguro do navegador.</p>
          <button className="btn-a btn-a--primary" disabled={!paid.length} onClick={draw}>🎲 Sortear entre os pagos</button>
        </div>
        <div className="draw-box">
          <h3>Informar o número</h3>
          <div className="f-inline">
            <input value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Número vencedor" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), useManual())} />
            <button className="btn-a btn-a--ghost" onClick={useManual}>Conferir</button>
          </div>
        </div>
      </div>

      {candidate !== null && (
        <div className="candidate">
          <div className="candidate__n">{padNumber(candidate, cfg.total)}</div>
          <div>
            <b>{cand ? cand.name : 'Comprador não encontrado'}</b>
            {cand && <small>{fmtPhone(cand.phone)} · código {cand.code}</small>}
          </div>
          <div className="candidate__btns">
            {cand && <button className="btn-a btn-a--ghost btn-a--sm" onClick={() => window.open(`https://wa.me/${whatsappDigits(cand.phone)}?text=${encodeURIComponent(`Parabéns, ${cand.name.split(' ')[0]}! 🎉 Seu número ${padNumber(candidate, cfg.total)} foi o sorteado na rifa da Bitter Tech Store!`)}`, '_blank', 'noopener')}>Avisar no WhatsApp</button>}
            <button className="btn-a btn-a--primary btn-a--sm" disabled={busy} onClick={publish}>Publicar no site</button>
          </div>
        </div>
      )}
    </div>
  )
}

