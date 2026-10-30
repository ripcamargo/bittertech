import { products } from '../data/products'
import { Link } from '../lib/router'
import ProductCard from './ProductCard'
import { ArrowRight } from './Icons'

/** Vitrine da página inicial: produtos com featured: true (até 8). O catálogo completo fica em /produtos. */
export default function Products() {
  const featured = products.filter((p) => p.featured)
  const list = (featured.length ? featured : products).slice(0, 8)

  return (
    <section id="produtos" className="products section section--light">
      <div className="container">
        <header className="section__head section__head--row reveal">
          <div>
            <p className="eyebrow">Vitrine</p>
            <h2>
              Escolha o seu. <span className="muted">Confirmamos tudo pelo WhatsApp.</span>
            </h2>
          </div>
          <Link to="/produtos" className="btn btn--dark">
            Ver todos os produtos ({products.length}) <ArrowRight width={18} height={18} />
          </Link>
        </header>

        <div className="grid">
          {list.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>

        <div className="products__more reveal">
          <Link to="/produtos" className="btn btn--outline btn--lg">
            Explorar catálogo completo <ArrowRight width={18} height={18} />
          </Link>
        </div>
      </div>
    </section>
  )
}
