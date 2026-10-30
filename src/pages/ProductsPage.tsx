import { useMemo, useState } from 'react'
import Contact from '../components/Contact'
import { SearchIcon, WhatsAppIcon } from '../components/Icons'
import ProductCard from '../components/ProductCard'
import { categories, products, type Category, type Condition } from '../data/products'
import { Link } from '../lib/router'
import { useReveal } from '../lib/useReveal'
import { whatsappLink } from '../lib/whatsapp'

type Sort = 'default' | 'price-asc' | 'price-desc' | 'name'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const conditions: Condition[] = ['Novo', 'Seminovo', 'Recondicionado']

export default function ProductsPage() {
  const [category, setCategory] = useState<Category | 'Todos'>('Todos')
  const [condition, setCondition] = useState<Condition | 'Todas'>('Todas')
  const [sort, setSort] = useState<Sort>('default')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = norm(query.trim())
    const list = products.filter(
      (p) =>
        (category === 'Todos' || p.category === category) &&
        (condition === 'Todas' || p.condition === condition) &&
        (!q || norm(`${p.name} ${p.description} ${p.condition ?? ''} ${p.category} ${(p.specs ?? []).join(' ')}`).includes(q)),
    )
    if (sort === 'default') return list
    // "Consulte" (preço 0) vai sempre para o final nas ordenações por preço
    const asc = (p: { price: number }) => (p.price > 0 ? p.price : Infinity)
    const desc = (p: { price: number }) => (p.price > 0 ? p.price : -Infinity)
    return [...list].sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'pt-BR')
        : sort === 'price-asc'
          ? (asc(a) === asc(b) ? 0 : asc(a) < asc(b) ? -1 : 1)
          : (desc(a) === desc(b) ? 0 : desc(a) > desc(b) ? -1 : 1),
    )
  }, [category, condition, sort, query])

  useReveal([category, condition, sort, query])

  const countIn = (c: Category | 'Todos') => (c === 'Todos' ? products.length : products.filter((p) => p.category === c).length)
  const filtered = category !== 'Todos' || condition !== 'Todas' || query !== ''
  const clear = () => {
    setCategory('Todos')
    setCondition('Todas')
    setQuery('')
  }

  return (
    <>
      <section className="page-head">
        <div className="container">
          <nav className="crumbs" aria-label="Você está em">
            <Link to="/">Início</Link> <span>/</span> <span aria-current="page">Produtos</span>
          </nav>
          <h1>Todos os produtos</h1>
          <p>Smartphones, áudio, acessórios e mais. Toque em um produto para ver fotos, vídeo, descrição e ficha técnica.</p>
        </div>
      </section>

      <section className="catalog">
        <div className="filterbar">
          <div className="container filterbar__inner">
            <div className="chips" role="tablist" aria-label="Categorias">
              {(['Todos', ...categories] as const).map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={category === c}
                  className={`chip${category === c ? ' is-active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c} <span>{countIn(c)}</span>
                </button>
              ))}
            </div>

            <div className="filterbar__row">
              <label className="search">
                <SearchIcon width={18} height={18} />
                <input
                  type="search"
                  placeholder="Buscar por nome, modelo..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Buscar produto"
                />
              </label>
              <label className="select">
                <span>Condição</span>
                <select value={condition} onChange={(e) => setCondition(e.target.value as Condition | 'Todas')}>
                  <option value="Todas">Todas</option>
                  {conditions.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="select">
                <span>Ordenar</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="default">Em destaque</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                  <option value="name">Nome (A–Z)</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="container catalog__body">
          <p className="catalog__count" aria-live="polite">
            {visible.length} {visible.length === 1 ? 'produto' : 'produtos'}
            {filtered && (
              <button className="linklike" onClick={clear}>
                Limpar filtros
              </button>
            )}
          </p>

          {visible.length > 0 ? (
            <div className="grid">
              {visible.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h3>Não encontramos esse produto na vitrine.</h3>
              <p>Mas ele pode estar disponível. Consulte a loja pelo WhatsApp.</p>
              <a
                className="btn btn--dark"
                href={whatsappLink(`Olá! Procuro por "${query || category}" e não encontrei no site. Vocês têm disponível?`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon width={18} height={18} /> Perguntar à loja
              </a>
            </div>
          )}
        </div>
      </section>

      <Contact />
    </>
  )
}
