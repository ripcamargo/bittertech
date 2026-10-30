import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { categories, type Category, type Product } from '../data/products'
import { formatPrice } from '../lib/whatsapp'
import ProductForm from './ProductForm'
import RaffleAdmin from './RaffleAdmin'
import { auth, importSeed, patchProduct, removeProduct, saveOrder, saveProduct, watchProducts } from './store'
import './admin.css'
import './admin-raffle.css'

type StatusFilter = 'all' | 'visible' | 'hidden' | 'sold' | 'featured'

const authError = (code: string) =>
  ({
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com a internet.',
    'auth/operation-not-allowed': 'Login por e-mail/senha não está ativado no Firebase (Authentication → Sign-in method).',
  })[code] ?? 'Não foi possível entrar. Tente novamente.'

export default function Admin() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    document.title = 'Painel | Bitter Tech Store'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  if (user === undefined) return <div className="admin-boot">Carregando painel…</div>
  return <div className="admin">{user ? <Dashboard user={user} /> : <Login />}</div>
}

/* ------------------------------- LOGIN ------------------------------- */
function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(authError((err as { code?: string }).code ?? ''))
      setBusy(false)
    }
  }

  const reset = async () => {
    setError('')
    setInfo('')
    if (!email.trim()) return setError('Digite seu e-mail acima para receber o link de redefinição.')
    try {
      await sendPasswordResetEmail(auth, email.trim())
    } catch {
      /* não revelamos se o e-mail existe */
    }
    setInfo('Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha.')
  }

  return (
    <main className="login">
      <form className="login__card" onSubmit={submit}>
        <img src="/images/logo-white.png" alt="Bitter Tech Store" width="469" height="162" />
        <h1>Painel de produtos</h1>
        <p>Acesso restrito. Entre com sua conta de administrador.</p>
        <label className="f">
          <span>E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus />
        </label>
        <label className="f">
          <span>Senha</span>
          <div className="f-inline">
            <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            <button type="button" className="btn-a btn-a--ghost btn-a--sm" onClick={() => setShow(!show)}>
              {show ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </label>
        {error && <p className="f-error" role="alert">{error}</p>}
        {info && <p className="f-info" role="status">{info}</p>}
        <button className="btn-a btn-a--primary btn-a--block" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <button type="button" className="linklike" onClick={reset}>Esqueci minha senha</button>
        <a className="login__back" href="/">← Voltar ao site</a>
      </form>
    </main>
  )
}

/* ------------------------------ DASHBOARD ----------------------------- */
function Dashboard({ user }: { user: User }) {
  const [list, setList] = useState<Product[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'Todas'>('Todas')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'products' | 'raffle'>('products')

  const say = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ msg, kind })
    setTimeout(() => setToast((t) => (t?.msg === msg ? null : t)), 3500)
  }, [])

  useEffect(
    () =>
      watchProducts(setList, (e) =>
        setLoadError(
          e.code === 'permission-denied'
            ? 'Esta conta não tem permissão para gerenciar produtos. Confira as regras do Firestore (veja o README) e se o e-mail do administrador está liberado.'
            : `Erro ao carregar os produtos (${e.code}).`,
        ),
      ),
    [],
  )

  const nextOrder = useMemo(() => (list?.length ? Math.max(...list.map((p) => p.order ?? 0)) + 10 : 0), [list])
  const filtering = query.trim() !== '' || category !== 'Todas' || status !== 'all'

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (list ?? []).filter(
      (p) =>
        (category === 'Todas' || p.category === category) &&
        (status === 'all' ||
          (status === 'visible' && !p.hidden) ||
          (status === 'hidden' && p.hidden) ||
          (status === 'sold' && p.soldOut) ||
          (status === 'featured' && p.featured)) &&
        (!q || `${p.name} ${p.description} ${p.id}`.toLowerCase().includes(q)),
    )
  }, [list, query, category, status])

  const stats = useMemo(() => {
    const l = list ?? []
    return {
      total: l.length,
      visible: l.filter((p) => !p.hidden).length,
      featured: l.filter((p) => p.featured && !p.hidden).length,
      sold: l.filter((p) => p.soldOut).length,
    }
  }, [list])

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true)
    try {
      await fn()
      if (ok) say(ok)
    } catch (e) {
      console.error(e)
      say('Algo deu errado. Verifique a conexão e tente novamente.', 'err')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (p: Product, key: 'featured' | 'soldOut' | 'hidden') =>
    run(() => patchProduct(p.id, { [key]: !p[key] }))

  const remove = (p: Product) => {
    if (!window.confirm(`Excluir "${p.name}"? Essa ação não pode ser desfeita.\n\nDica: use "Ocultar" se quiser apenas tirar do site.`)) return
    void run(() => removeProduct(p.id), 'Produto excluído.')
  }

  const duplicate = (p: Product) => {
    let n = 2
    const ids = new Set((list ?? []).map((x) => x.id))
    while (ids.has(`${p.id}-${n}`)) n++
    void run(
      () => saveProduct({ ...p, id: `${p.id}-${n}`, name: `${p.name} (cópia)`, order: nextOrder, hidden: true, featured: false }),
      'Cópia criada (oculta). Edite e desmarque “Oculto” para publicar.',
    )
  }

  const move = (p: Product, dir: -1 | 1) => {
    const all = [...(list ?? [])]
    const i = all.findIndex((x) => x.id === p.id)
    const j = i + dir
    if (j < 0 || j >= all.length) return
    ;[all[i], all[j]] = [all[j], all[i]]
    void run(() => saveOrder(all))
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(list ?? [], null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bittertech-produtos-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__in">
          <img src="/images/logo-white.png" alt="Bitter Tech Store" width="469" height="162" />
          <span className="topbar__title">Painel</span>
          <nav>
            <a href="/produtos" target="_blank" rel="noopener noreferrer">Ver site ↗</a>
            <span className="topbar__user" title={user.email ?? ''}>{user.email}</span>
            <button className="btn-a btn-a--ghost btn-a--sm" onClick={() => signOut(auth)}>Sair</button>
          </nav>
        </div>
      </header>

      <nav className="tabs" aria-label="Seções do painel">
        <div className="tabs__in">
          <button className={tab === 'products' ? 'is-on' : ''} onClick={() => setTab('products')}>Produtos</button>
          <button className={tab === 'raffle' ? 'is-on' : ''} onClick={() => setTab('raffle')}>🎟️ Rifa</button>
        </div>
      </nav>

      {tab === 'raffle' && <RaffleAdmin say={say} />}

      <main className="wrap" hidden={tab !== 'products'}>
        <section className="stats" aria-label="Resumo">
          <div><b>{stats.total}</b><span>Produtos</span></div>
          <div><b>{stats.visible}</b><span>Visíveis no site</span></div>
          <div><b>{stats.featured}</b><span>Em destaque{stats.featured > 8 ? ' (só 8 aparecem)' : ''}</span></div>
          <div><b>{stats.sold}</b><span>Vendidos</span></div>
        </section>

        <section className="toolbar">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produto…" aria-label="Buscar" />
          <select value={category} onChange={(e) => setCategory(e.target.value as Category | 'Todas')} aria-label="Categoria">
            <option value="Todas">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Situação">
            <option value="all">Todas as situações</option>
            <option value="visible">Visíveis</option>
            <option value="hidden">Ocultos</option>
            <option value="featured">Destaques</option>
            <option value="sold">Vendidos</option>
          </select>
          <button className="btn-a btn-a--primary" onClick={() => setEditing('new')} disabled={!list}>+ Novo produto</button>
        </section>

        {loadError && <p className="f-error">{loadError}</p>}

        {!list && !loadError && <p className="empty-a">Carregando produtos…</p>}

        {list && list.length === 0 && !loadError && (
          <div className="empty-a">
            <h2>Nenhum produto cadastrado ainda</h2>
            <p>Cadastre o primeiro produto ou comece importando o catálogo de exemplo (15 itens fictícios) para editar a partir dele.</p>
            <div className="empty-a__actions">
              <button className="btn-a btn-a--primary" onClick={() => setEditing('new')}>+ Novo produto</button>
              <button className="btn-a btn-a--ghost" disabled={busy} onClick={() => run(() => importSeed(0), 'Catálogo de exemplo importado.')}>
                Importar catálogo de exemplo
              </button>
            </div>
          </div>
        )}

        {list && list.length > 0 && (
          <>
            {filtering && <p className="hint">Mostrando {shown.length} de {list.length}. A ordem só pode ser alterada sem filtros.</p>}
            <ul className="rows">
              {shown.map((p, i) => (
                <li key={p.id} className={`row${p.hidden ? ' is-hidden' : ''}`}>
                  <img src={p.image} alt="" loading="lazy" />
                  <div className="row__main">
                    <button className="row__name" onClick={() => setEditing(p)}>{p.name}</button>
                    <span className="row__meta">
                      {p.category}
                      {p.condition ? ` · ${p.condition}` : ''}
                    </span>
                    <span className="row__price">
                      {p.price > 0 ? formatPrice(p.price) : 'Consulte'}
                      {p.oldPrice ? <s>{formatPrice(p.oldPrice)}</s> : null}
                    </span>
                  </div>
                  <div className="row__flags">
                    <button className={`pill${p.featured ? ' is-on' : ''}`} onClick={() => toggle(p, 'featured')} disabled={busy} title="Destaque na página inicial">★ Destaque</button>
                    <button className={`pill${p.soldOut ? ' is-on is-warn' : ''}`} onClick={() => toggle(p, 'soldOut')} disabled={busy} title="Marcar como vendido">Vendido</button>
                    <button className={`pill${p.hidden ? ' is-on is-off' : ''}`} onClick={() => toggle(p, 'hidden')} disabled={busy} title="Ocultar do site">{p.hidden ? 'Oculto' : 'Visível'}</button>
                  </div>
                  <div className="row__actions">
                    <button className="icon-btn" onClick={() => move(p, -1)} disabled={busy || filtering || i === 0} aria-label="Subir" title="Subir">↑</button>
                    <button className="icon-btn" onClick={() => move(p, 1)} disabled={busy || filtering || i === shown.length - 1} aria-label="Descer" title="Descer">↓</button>
                    <button className="btn-a btn-a--ghost btn-a--sm" onClick={() => setEditing(p)}>Editar</button>
                    <button className="icon-btn" onClick={() => duplicate(p)} disabled={busy} aria-label="Duplicar" title="Duplicar">⧉</button>
                    <button className="icon-btn icon-btn--danger" onClick={() => remove(p)} disabled={busy} aria-label="Excluir" title="Excluir">🗑</button>
                  </div>
                </li>
              ))}
              {shown.length === 0 && <li className="empty-a">Nenhum produto com esses filtros.</li>}
            </ul>

            <footer className="tools">
              <button className="linklike" onClick={exportJson}>Baixar backup (JSON)</button>
              <span>As alterações aparecem no site assim que você recarrega a página.</span>
            </footer>
          </>
        )}
      </main>

      {editing && (
        <ProductForm
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? undefined : editing}
          nextOrder={nextOrder}
          existingIds={(list ?? []).map((p) => p.id)}
          onClose={() => setEditing(null)}
          onSaved={(name) => {
            setEditing(null)
            say(`“${name}” salvo.`)
          }}
        />
      )}

      {toast && <div className={`toast toast--${toast.kind}`} role="status">{toast.msg}</div>}
    </>
  )
}
