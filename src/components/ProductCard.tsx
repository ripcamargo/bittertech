import type { Product } from '../data/products'
import { openProduct } from '../lib/router'
import { formatPrice, productLink } from '../lib/whatsapp'
import { WhatsAppIcon } from './Icons'

/** Placeholders exibidos enquanto o catálogo carrega. */
export function ProductSkeletons({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card card--skeleton is-visible" aria-hidden="true">
          <div className="card__media" />
          <div className="card__body">
            <span className="sk sk--sm" />
            <span className="sk" />
            <span className="sk sk--lg" />
          </div>
        </div>
      ))}
    </>
  )
}

export default function ProductCard({ product, index }: { product: Product; index: number }) {
  const { id, name, description, price, oldPrice, image, condition, specs, badge, soldOut, category } = product

  return (
    <article className={`card reveal${soldOut ? ' is-soldout' : ''}`} style={{ transitionDelay: `${(index % 4) * 60}ms` }}>
      <div className="card__media">
        <img src={image} alt={`${name} — ${category}`} loading="lazy" decoding="async" width="900" height="1100" />
        {(badge || soldOut) && <span className="card__badge">{soldOut ? 'Vendido' : badge}</span>}
        {condition && <span className={`card__condition card__condition--${condition.toLowerCase()}`}>{condition}</span>}
        <span className="card__peek">Ver detalhes</span>
      </div>

      <div className="card__body">
        <p className="card__category">{category}</p>
        <h3 className="card__name">
          <button type="button" className="card__open" onClick={() => openProduct(id)}>
            {name}
          </button>
        </h3>
        <p className="card__desc">{description}</p>

        {specs && specs.length > 0 && (
          <ul className="card__specs">
            {specs.slice(0, 3).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}

        <div className="card__footer">
          <div className="card__price">
            {price > 0 ? (
              <>
                <strong>{formatPrice(price)}</strong>
                {oldPrice ? <s>{formatPrice(oldPrice)}</s> : null}
              </>
            ) : (
              <strong className="card__price--ask">Consulte</strong>
            )}
          </div>
          <a
            className="btn btn--dark btn--sm"
            href={productLink(product)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${soldOut ? 'Avisar quando chegar' : 'Tenho interesse'} — ${name}`}
          >
            <WhatsAppIcon width={16} height={16} />
            {soldOut ? 'Avisar-me' : 'Tenho interesse'}
          </a>
        </div>
      </div>
    </article>
  )
}
