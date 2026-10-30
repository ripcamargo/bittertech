import { useMemo, useState } from 'react'
import { categories, products, type Category } from '../data/products'
import { contact } from '../data/content'
import { useReveal } from '../lib/useReveal'
import { whatsappLink } from '../lib/whatsapp'
import ProductCard from './ProductCard'
import { SearchIcon, WhatsAppIcon } from './Icons'

type Filter = 'Todos' | Category

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Products() {
  const [filter, setFilter] = useState<Filter>('Todos')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = norm(query.trim())
    return products.filter(
      (p) =>
        (filter === 'Todos' || p.category === filter) &&
        (!q || norm(`${p.name} ${p.description} ${p.condition ?? ''} ${(p.specs ?? []).join(' ')}`).includes(q)),
    )
  }, [filter, query])

  useReveal([filter, query])

  const count = (c: Filter) => (c === 'Todos' ? products.length : products.filter((p) => p.category === c).length)

  return (
    <section id="produtos" className="products section section--light">
      <div className="container">
        <header className="section__head reveal">
          <p className="eyebrow">Vitrine</p>
          <h2>
            Escolha o seu. <span className="muted">Confirmamos tudo pelo WhatsApp.</span>
          </h2>
        </header>

        <div className="toolbar reveal">
          <div className="chips" role="tablist" aria-label="Categorias">
            {(['Todos', ...categories] as Filter[]).map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={filter === c}
                className={`chip${filter === c ? ' is-active' : ''}`}
                onClick={() => setFilter(c)}
              >
                {c} <span>{count(c)}</span>
              </button>
            ))}
          </div>

          <label className="search">
            <SearchIcon width={18} height={18} />
            <input
              type="search"
              placeholder="Buscar produto"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar produto"
            />
          </label>
        </div>

        {visible.length > 0 ? (
          <div className="grid" aria-live="polite">
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
              href={whatsappLink(`Olá! Procuro por "${query || filter}" e não encontrei no site. Vocês têm disponível?`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon width={18} height={18} /> Perguntar à loja
            </a>
          </div>
        )}

        <p className="products__note reveal">
          Não achou o que procura? <a href={whatsappLink(contact.defaultMessage)} target="_blank" rel="noopener noreferrer">Fale com a gente</a> — o estoque muda com frequência.
        </p>
      </div>
    </section>
  )
}
