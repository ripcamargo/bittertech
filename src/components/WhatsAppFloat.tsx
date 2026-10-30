import { whatsappLink } from '../lib/whatsapp'
import { WhatsAppIcon } from './Icons'

export default function WhatsAppFloat() {
  return (
    <a
      className="wa-float"
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar com a Bitter Tech Store no WhatsApp"
    >
      <WhatsAppIcon width={30} height={30} />
      <span className="wa-float__label">Fale conosco</span>
    </a>
  )
}
