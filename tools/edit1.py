import re

def edit(path, pairs):
    s = open(path, encoding='utf8').read()
    for a, b in pairs:
        assert a in s, (path, a[:50])
        s = s.replace(a, b, 1)
    open(path, 'w', encoding='utf8', newline='').write(s)

edit('src/components/ProductCard.tsx', [
    ("import { formatPrice, productLink } from '../lib/whatsapp'",
     "import { openProduct } from '../lib/router'\nimport { formatPrice, productLink } from '../lib/whatsapp'"),
    ("const { name,", "const { id, name,"),
    ("""{condition}</span>}\n""", """{condition}</span>}\n        <span className="card__peek">Ver detalhes</span>\n"""),
    ("""<h3 className="card__name">{name}</h3>""",
     """<h3 className="card__name">
          <button type="button" className="card__open" onClick={() => openProduct(id)}>
            {name}
          </button>
        </h3>"""),
])

edit('src/components/Header.tsx', [
    ("import { whatsappLink } from '../lib/whatsapp'",
     "import { Link, useLocation } from '../lib/router'\nimport { whatsappLink } from '../lib/whatsapp'"),
    ("""const links = [
  { id: 'inicio', label: 'Início' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'sobre', label: 'Sobre nós' },
  { id: 'contato', label: 'Contato' },
]""", """const links = [
  { id: 'inicio', label: 'Início', to: '/' },
  { id: 'produtos', label: 'Produtos', to: '/produtos' },
  { id: 'sobre', label: 'Sobre nós', to: '/#sobre' },
  { id: 'contato', label: 'Contato', to: '/#contato' },
]"""),
    ("  const [active, setActive] = useState('inicio')\n",
     "  const [spy, setSpy] = useState('inicio')\n  const { pathname } = useLocation()\n  const onCatalog = pathname.replace(/\\/$/, '') === '/produtos'\n  const active = onCatalog ? (spy === 'contato' ? 'contato' : 'produtos') : spy\n"),
    ("""  // Destaca no menu a seção visível
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),""",
     """  // Destaca no menu a seção visível (na página de produtos, só “Contato” é uma seção)
  useEffect(() => {
    setSpy(onCatalog ? 'produtos' : 'inicio')
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSpy(e.target.id)),"""),
    ("""    links.forEach((l) => {
      const el = document.getElementById(l.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])""", """    // aguarda a página montar antes de observar
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
  }, [onCatalog])"""),
    ("""<a href="#inicio" className="header__logo" aria-label="Bitter Tech Store — início" onClick={() => setOpen(false)}>
          <img src="/images/logo-white.png" alt="Bitter Tech Store" width="469" height="162" />
        </a>""", """<Link to="/" className="header__logo" aria-label="Bitter Tech Store — início" onClick={() => setOpen(false)}>
          <img src="/images/logo-white.png" alt="Bitter Tech Store" width="469" height="162" />
        </Link>"""),
    ("""            <a key={l.id} href={`#${l.id}`} className={active === l.id ? 'is-active' : ''} onClick={() => setOpen(false)}>
              {l.label}
            </a>""", """            <Link key={l.id} to={l.to} className={active === l.id ? 'is-active' : ''} onClick={() => setOpen(false)}>
              {l.label}
            </Link>"""),
])

edit('src/components/Footer.tsx', [
    ("""<a href="#inicio">Voltar ao topo ↑</a>""", """<a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          Voltar ao topo ↑
        </a>"""),
])

edit('src/main.tsx', [("import './styles/global.css'", "import './styles/global.css'\nimport './styles/pages.css'")])
print('ok')
