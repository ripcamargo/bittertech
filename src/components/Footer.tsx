import { store } from '../data/content'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <img src="/images/logo-white.png" alt="Bitter Tech Store" width="469" height="162" loading="lazy" />
        <p>
          © {new Date().getFullYear()} {store.name} · {store.city}. Preços e disponibilidade sujeitos a alteração — confirme pelo WhatsApp.
        </p>
        <a href="#inicio">Voltar ao topo ↑</a>
      </div>
    </footer>
  )
}
