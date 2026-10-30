import { contact, store } from '../data/content'
import { whatsappLink } from '../lib/whatsapp'
import { PinIcon, WhatsAppIcon } from './Icons'

export default function Contact() {
  return (
    <section id="contato" className="contact section section--dark">
      <div className="container contact__inner reveal">
        <p className="eyebrow">{contact.eyebrow}</p>
        <h2>{contact.title}</h2>
        <p className="contact__text">{contact.text}</p>

        <a className="btn btn--wa btn--xl" href={whatsappLink()} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon width={26} height={26} /> {contact.cta}
        </a>

        <ul className="contact__info">
          <li>
            <PinIcon width={18} height={18} /> {store.name} · {store.city}
          </li>
          <li>
            <WhatsAppIcon width={18} height={18} /> WhatsApp {store.whatsappDisplay}
          </li>
        </ul>
      </div>
    </section>
  )
}
