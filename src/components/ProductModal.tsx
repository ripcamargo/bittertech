import { useEffect, useRef, useState } from 'react'
import { products, type Product } from '../data/products'
import { parseVideo, type VideoSource } from '../lib/media'
import { closeProduct, useSelectedProductId } from '../lib/router'
import { formatPrice, productLink } from '../lib/whatsapp'
import { ArrowRight, CloseIcon, PlayIcon, WhatsAppIcon } from './Icons'

type Slide = { type: 'image'; src: string } | { type: 'video'; video: VideoSource }

export default function ProductModal() {
  const id = useSelectedProductId()
  const product = id ? products.find((p) => p.id === id) : undefined
  if (!product) return null
  return <ModalBody key={product.id} product={product} />
}

function ModalBody({ product }: { product: Product }) {
  const { name, description, longDescription, price, oldPrice, condition, specs, details, category, soldOut } = product
  const slides: Slide[] = [
    ...[product.image, ...(product.gallery ?? [])].map((src) => ({ type: 'image' as const, src })),
    ...(product.video ? [{ type: 'video' as const, video: parseVideo(product.video) }] : []),
  ]
  const [index, setIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  const last = slides.length - 1
  const slide = slides[index]

  // Bloqueia a rolagem do fundo e devolve o foco ao fechar
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.querySelector<HTMLElement>('.modal__close')?.focus()
    return () => {
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])

  // Teclado: Esc fecha, setas trocam a mídia, Tab fica preso no modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeProduct()
      else if (e.key === 'ArrowRight') setIndex((v) => Math.min(v + 1, last))
      else if (e.key === 'ArrowLeft') setIndex((v) => Math.max(v - 1, 0))
      else if (e.key === 'Tab' && dialog.current) {
        const f = dialog.current.querySelectorAll<HTMLElement>('a[href], button, iframe, video[controls]')
        if (!f.length) return
        const first = f[0]
        const end = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          end.focus()
        } else if (!e.shiftKey && document.activeElement === end) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?p=${encodeURIComponent(product.id)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      window.prompt('Copie o link do produto:', url)
    }
  }

  const paragraphs = (longDescription ?? description).split(/\n\s*\n/)
  const detailRows = Object.entries(details ?? {})

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && closeProduct()}>
      <div ref={dialog} className="modal__dialog" role="dialog" aria-modal="true" aria-label={name}>
        <button className="modal__close" onClick={closeProduct} aria-label="Fechar">
          <CloseIcon width={22} height={22} />
        </button>

        <div className="gallery">
          <div className="gallery__stage">
            {slide.type === 'image' ? (
              <img key={slide.src} src={slide.src} alt={`${name} — foto ${index + 1}`} decoding="async" />
            ) : slide.video.kind === 'embed' ? (
              <iframe
                src={slide.video.src}
                title={`Vídeo — ${name}`}
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <video src={slide.video.src} poster={product.image} controls playsInline preload="metadata" />
            )}

            {slides.length > 1 && (
              <>
                <button
                  className="gallery__nav gallery__nav--prev"
                  onClick={() => setIndex((v) => Math.max(v - 1, 0))}
                  disabled={index === 0}
                  aria-label="Mídia anterior"
                >
                  <ArrowRight width={20} height={20} />
                </button>
                <button
                  className="gallery__nav gallery__nav--next"
                  onClick={() => setIndex((v) => Math.min(v + 1, last))}
                  disabled={index === last}
                  aria-label="Próxima mídia"
                >
                  <ArrowRight width={20} height={20} />
                </button>
                <span className="gallery__count">
                  {index + 1} / {slides.length}
                </span>
              </>
            )}
          </div>

          {slides.length > 1 && (
            <div className="gallery__thumbs">
              {slides.map((s, i) => (
                <button
                  key={i}
                  className={i === index ? 'is-active' : ''}
                  onClick={() => setIndex(i)}
                  aria-label={s.type === 'video' ? 'Ver vídeo' : `Ver foto ${i + 1}`}
                >
                  <img src={s.type === 'image' ? s.src : product.image} alt="" loading="lazy" />
                  {s.type === 'video' && (
                    <span className="gallery__play">
                      <PlayIcon width={18} height={18} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="info">
          <p className="card__category">{category}</p>
          <h2 className="info__name">{name}</h2>

          <div className="info__tags">
            {condition && <span className={`tag tag--${condition.toLowerCase()}`}>{condition}</span>}
            {soldOut && <span className="tag tag--sold">Vendido</span>}
            {specs?.map((s) => (
              <span key={s} className="tag">
                {s}
              </span>
            ))}
          </div>

          <div className="info__price">
            {price > 0 ? (
              <>
                <strong>{formatPrice(price)}</strong>
                {oldPrice ? <s>{formatPrice(oldPrice)}</s> : null}
              </>
            ) : (
              <strong>Consulte o valor</strong>
            )}
          </div>

          <div className="info__text">
            {paragraphs.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>

          {detailRows.length > 0 && (
            <>
              <h3 className="info__sub">Ficha técnica</h3>
              <dl className="specs">
                {detailRows.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          <div className="info__cta">
            <a className="btn btn--wa btn--lg" href={productLink(product)} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon width={22} height={22} />
              {soldOut ? 'Avisar quando chegar' : 'Tenho interesse'}
            </a>
            <button className="btn btn--outline btn--lg" onClick={copyLink}>
              {copied ? 'Link copiado ✓' : 'Copiar link'}
            </button>
          </div>
          <p className="info__note">Preço e disponibilidade sujeitos a alteração — confirme com a loja pelo WhatsApp.</p>
        </div>
      </div>
    </div>
  )
}
