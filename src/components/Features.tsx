import type { ReactElement } from 'react'
import { features, type FeatureIcon } from '../data/content'
import { ChatIcon, CheckBadge, TagIcon, WhatsAppIcon } from './Icons'

const icons: Record<FeatureIcon, ReactElement> = {
  check: <CheckBadge />,
  chat: <ChatIcon />,
  tag: <TagIcon />,
  whatsapp: <WhatsAppIcon width={26} height={26} />,
}

export default function Features() {
  return (
    <section className="features" aria-label="Diferenciais">
      <div className="container features__grid">
        {features.map((f, i) => (
          <article key={f.title} className="feature reveal" style={{ transitionDelay: `${i * 70}ms` }}>
            <span className="feature__icon">{icons[f.icon]}</span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

