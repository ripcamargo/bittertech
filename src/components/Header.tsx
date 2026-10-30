import { useEffect, useState } from 'react'
import { Link, useLocation } from '../lib/router'
import { whatsappLink } from '../lib/whatsapp'
import { CloseIcon, MenuIcon } from './Icons'

const links = [
  { id: 'inicio', label: 'Início', to: '/' },
  { id: 'produtos', label: 'Produtos', to: '/produtos' },
  { id: 'sobre', label: 'Sobre nós', to: '/#sobre' },
  { id: 'contato', label: 'Contato', to: '/#contato' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [spy, setSpy] = useState('inicio')
  const { pathname } = useLocation()
  const onCatalog = pathname.replace(/\/$/, '') === '/produtos'
  const active = onCatalog ? (spy === 'contato' ? 'contato' : 'produtos') : spy

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Destaca no menu a seção visível (na página de produtos, só “Contato” é uma seção)
  useEffect(() => {
    setSpy(onCatalog ? 'produtos' : 'inicio')
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSpy(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    // aguarda a página montar antes de observar
    const t = setTimeout(() => {
      links.forEach((l) => {
        const el = document.getElementById(l.id)
        if (el) io.observe(el)
      })
    }, 50)
    return () => {
      clearTimeout(t)
      io.disconnect()
    }
  }, [onCatalog])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className={`header${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <div className="container header__inner">
        <Link to="/" className="header__logo" aria-label="Bitter Tech Store — início" onClick={() => setOpen(false)}>
          <img src="/images/logo-white.png" alt="Bitter Tech Store" width="469" height="162" />
        </Link>

        <nav className="header__nav" aria-label="Principal">
          {links.map((l) => (
            <Link key={l.id} to={l.to} className={active === l.id ? 'is-active' : ''} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <a
            className="btn btn--light btn--sm header__cta"
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Fale conosco
          </a>
        </nav>

        <button
          className="header__toggle"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
    </header>
  )
}
