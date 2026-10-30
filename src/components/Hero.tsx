import { hero } from '../data/content'
import { whatsappLink } from '../lib/whatsapp'
import { ArrowRight, WhatsAppIcon } from './Icons'
import { RaffleHeroPill } from './RaffleBanner'

export default function Hero() {
  return (
    <section id="inicio" className="hero">
      <div className="hero__media" aria-hidden="true">
        <picture>
          <source media="(max-width: 760px)" srcSet="/images/hero-mobile.webp" />
          <img src="/images/hero.webp" alt="" fetchPriority="high" decoding="async" />
        </picture>
        <div className="hero__shade" />
      </div>

      <div className="container hero__content">
        <RaffleHeroPill />
        <p className="eyebrow hero__eyebrow">{hero.eyebrow}</p>
        <h1 className="hero__title">{hero.title}</h1>
        <p className="hero__subtitle">{hero.subtitle}</p>

        <div className="hero__actions">
          <a href="#produtos" className="btn btn--light btn--lg">
            {hero.primaryCta} <ArrowRight width={18} height={18} />
          </a>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--lg">
            <WhatsAppIcon width={20} height={20} /> {hero.secondaryCta}
          </a>
        </div>

        <ul className="hero__points">
          {hero.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <a href="#produtos" className="hero__scroll" aria-label="Rolar para os produtos">
        <span />
      </a>
    </section>
  )
}
