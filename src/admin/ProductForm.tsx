import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { categories, conditions, type Category, type Condition, type Product } from '../data/products'
import { parseVideo } from '../lib/media'
import { processImage, saveProduct } from './store'

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

/** "3.499,90" | "3499.9" | "R$ 3499" → número. Vazio → 0. */
export function parsePrice(v: string): number {
  const s = v.replace(/[^\d.,]/g, '')
  if (!s) return 0
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}
const priceText = (n?: number) => (n ? String(n).replace('.', ',') : '')

interface Props {
  /** Produto sendo editado; undefined = novo. */
  product?: Product
  /** Valor de `order` para um produto novo. */
  nextOrder: number
  existingIds: string[]
  onClose: () => void
  onSaved: (name: string) => void
}

export default function ProductForm({ product, nextOrder, existingIds, onClose, onSaved }: Props) {
  const editing = !!product
  const [name, setName] = useState(product?.name ?? '')
  const [id, setId] = useState(product?.id ?? '')
  const [idTouched, setIdTouched] = useState(false)
  const [description, setDescription] = useState(product?.description ?? '')
  const [longDescription, setLongDescription] = useState(product?.longDescription ?? '')
  const [category, setCategory] = useState<Category>(product?.category ?? 'Smartphones')
  const [condition, setCondition] = useState<Condition | ''>(product?.condition ?? '')
  const [price, setPrice] = useState(priceText(product?.price))
  const [oldPrice, setOldPrice] = useState(priceText(product?.oldPrice))
  const [badge, setBadge] = useState(product?.badge ?? '')
  const [specs, setSpecs] = useState<string[]>(product?.specs ?? [])
  const [specDraft, setSpecDraft] = useState('')
  const [details, setDetails] = useState<{ k: string; v: string }[]>(
    Object.entries(product?.details ?? {}).map(([k, v]) => ({ k, v })),
  )
  const [images, setImages] = useState<string[]>(product ? [product.image, ...(product.gallery ?? [])].filter(Boolean) : [])
  const [urlDraft, setUrlDraft] = useState('')
  const [video, setVideo] = useState(product?.video ?? '')
  const [featured, setFeatured] = useState(!!product?.featured)
  const [soldOut, setSoldOut] = useState(!!product?.soldOut)
  const [hidden, setHidden] = useState(!!product?.hidden)

  const [uploading, setUploading] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLFormElement>(null)

  // Esc fecha; trava a rolagem do fundo
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose, saving])

  const onName = (v: string) => {
    setName(v)
    if (!editing && !idTouched) setId(slugify(v))
  }

  const addSpec = () => {
    const v = specDraft.trim()
    if (v && specs.length < 3 && !specs.includes(v)) setSpecs([...specs, v])
    setSpecDraft('')
  }
  const specKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSpec()
    }
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setUploading((n) => n + list.length)
    for (const f of list) {
      try {
        const url = await processImage(f)
        setImages((cur) => [...cur, url])
      } catch (e) {
        console.error(e)
        setError('Não foi possível processar essa foto. Tente outro arquivo (JPG, PNG ou WebP) ou cole o endereço (URL) da imagem.')
      } finally {
        setUploading((n) => n - 1)
      }
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  const addUrl = () => {
    const u = urlDraft.trim()
    if (!u) return
    setImages([...images, u])
    setUrlDraft('')
  }
  const moveImage = (i: number, to: number) => {
    if (to < 0 || to >= images.length) return
    const next = [...images]
    ;[next[i], next[to]] = [next[to], next[i]]
    setImages(next)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const finalId = (editing ? product!.id : id.trim()) || slugify(name)
    const p = parsePrice(price)
    const op = parsePrice(oldPrice)
    if (!name.trim()) return fail('Informe o nome do produto.')
    if (!finalId) return fail('Informe um ID válido (letras, números e hífen).')
    if (!editing && existingIds.includes(finalId)) return fail('Já existe um produto com esse ID. Altere o ID.')
    if (!description.trim()) return fail('Escreva a descrição curta (aparece no card).')
    if (!images.length) return fail('Adicione ao menos uma foto (a primeira é a principal).')
    if (Number.isNaN(p) || Number.isNaN(op)) return fail('Preço inválido. Use algo como 3499,90.')
    if (op && p && op <= p) return fail('O preço antigo deve ser maior que o preço atual (ou deixe em branco).')
    if (uploading) return fail('Aguarde o processamento das fotos terminar.')
    if (images.filter((u) => u.startsWith('data:')).reduce((n, u) => n + u.length, 0) > 850_000)
      return fail('As fotos somam mais do que o limite de ~900 KB por produto. Remova algumas fotos.')

    const details_: Record<string, string> = {}
    details.forEach(({ k, v }) => k.trim() && v.trim() && (details_[k.trim()] = v.trim()))

    const data: Product = {
      id: finalId,
      name: name.trim(),
      description: description.trim(),
      price: p,
      image: images[0],
      category,
      order: product?.order ?? nextOrder,
      ...(op ? { oldPrice: op } : {}),
      ...(condition ? { condition } : {}),
      ...(specs.length ? { specs } : {}),
      ...(badge.trim() ? { badge: badge.trim() } : {}),
      ...(images.length > 1 ? { gallery: images.slice(1), hasGallery: true } : {}),
      ...(video.trim() ? { video: video.trim() } : {}),
      ...(longDescription.trim() ? { longDescription: longDescription.trim() } : {}),
      ...(Object.keys(details_).length ? { details: details_ } : {}),
      ...(featured ? { featured: true } : {}),
      ...(soldOut ? { soldOut: true } : {}),
      ...(hidden ? { hidden: true } : {}),
    }
    setSaving(true)
    try {
      await saveProduct(data)
      onSaved(data.name)
    } catch (err) {
      console.error(err)
      setSaving(false)
      fail('Não foi possível salvar. Verifique sua conexão e as permissões do Firestore.')
    }
  }
  function fail(msg: string) {
    setError(msg)
    panel.current?.querySelector('.f-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const videoPreview = video.trim() ? parseVideo(video.trim()) : null

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label={editing ? 'Editar produto' : 'Novo produto'}>
      <div className="drawer__scrim" onClick={() => !saving && onClose()} />
      <form className="drawer__panel" onSubmit={submit} ref={panel} noValidate>
        <header className="drawer__head">
          <h2>{editing ? 'Editar produto' : 'Novo produto'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} disabled={saving} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div className="drawer__body">
          <fieldset>
            <legend>Informações básicas</legend>
            <label className="f">
              <span>Nome *</span>
              <input value={name} onChange={(e) => onName(e.target.value)} placeholder="Ex.: iPhone 13 128 GB" maxLength={90} autoFocus />
            </label>
            <div className="f-row">
              <label className="f">
                <span>Categoria *</span>
                <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="f">
                <span>Condição</span>
                <select value={condition} onChange={(e) => setCondition(e.target.value as Condition | '')}>
                  <option value="">—</option>
                  {conditions.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="f">
              <span>Descrição curta * <em>aparece no card</em></span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={160} placeholder="1–2 linhas." />
              <small>{description.length}/160</small>
            </label>
          </fieldset>

          <fieldset>
            <legend>Preço</legend>
            <div className="f-row">
              <label className="f">
                <span>Preço (R$) <em>vazio = “Consulte”</em></span>
                <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="3499,90" />
              </label>
              <label className="f">
                <span>Preço antigo (R$) <em>riscado</em></span>
                <input value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} inputMode="decimal" placeholder="opcional" />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Fotos e vídeo</legend>
            <p className="hint">A primeira foto é a principal (capa do card). Use ← → para reordenar. As fotos são reduzidas e otimizadas automaticamente (use poucas por produto: o limite total é ~900 KB).</p>
            <ul className="imgs">
              {images.map((src, i) => (
                <li key={src + i} className={i === 0 ? 'is-main' : ''}>
                  <img src={src} alt="" />
                  {i === 0 && <span className="imgs__tag">Principal</span>}
                  <div className="imgs__ctl">
                    <button type="button" onClick={() => moveImage(i, i - 1)} disabled={i === 0} aria-label="Mover para a esquerda">←</button>
                    <button type="button" onClick={() => moveImage(i, i + 1)} disabled={i === images.length - 1} aria-label="Mover para a direita">→</button>
                    <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="Remover foto">✕</button>
                  </div>
                </li>
              ))}
              {Array.from({ length: uploading }, (_, i) => (
                <li key={`u${i}`} className="imgs__loading">
                  <span className="spinner" />
                </li>
              ))}
              <li className="imgs__add">
                <button type="button" onClick={() => fileInput.current?.click()}>
                  <b>+</b>
                  Adicionar fotos
                </button>
              </li>
            </ul>
            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
            <div className="f-inline">
              <input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="ou cole o endereço (URL) de uma imagem" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())} />
              <button type="button" className="btn-a btn-a--ghost" onClick={addUrl}>Adicionar</button>
            </div>

            <label className="f">
              <span>Vídeo <em>link do YouTube/Vimeo ou arquivo de vídeo</em></span>
              <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://youtu.be/XXXXXXXXXXX" />
              {videoPreview && <small>Reconhecido como: {videoPreview.kind === 'file' ? 'arquivo de vídeo' : videoPreview.src.includes('vimeo') ? 'Vimeo' : 'YouTube'}</small>}
            </label>
          </fieldset>

          <fieldset>
            <legend>Detalhes (aparecem no modal do produto)</legend>
            <label className="f">
              <span>Descrição completa <em>linha em branco = novo parágrafo</em></span>
              <textarea value={longDescription} onChange={(e) => setLongDescription(e.target.value)} rows={5} />
            </label>

            <div className="f">
              <span>Destaques no card <em>até 3 (Enter para adicionar)</em></span>
              <div className="tags">
                {specs.map((s) => (
                  <button type="button" key={s} className="tag" onClick={() => setSpecs(specs.filter((x) => x !== s))} title="Remover">
                    {s} ✕
                  </button>
                ))}
                {specs.length < 3 && (
                  <input value={specDraft} onChange={(e) => setSpecDraft(e.target.value)} onKeyDown={specKey} onBlur={addSpec} placeholder="Ex.: 128 GB" maxLength={28} />
                )}
              </div>
            </div>

            <div className="f">
              <span>Ficha técnica</span>
              {details.map((d, i) => (
                <div className="f-inline" key={i}>
                  <input value={d.k} onChange={(e) => setDetails(details.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} placeholder="Item (ex.: Bateria)" />
                  <input value={d.v} onChange={(e) => setDetails(details.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} placeholder="Valor (ex.: 91%)" />
                  <button type="button" className="icon-btn" onClick={() => setDetails(details.filter((_, j) => j !== i))} aria-label="Remover linha">✕</button>
                </div>
              ))}
              <button type="button" className="btn-a btn-a--ghost btn-a--sm" onClick={() => setDetails([...details, { k: '', v: '' }])}>+ Adicionar linha</button>
            </div>
          </fieldset>

          <fieldset>
            <legend>Exibição</legend>
            <label className="f">
              <span>Selo na foto <em>opcional</em></span>
              <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Ex.: Oferta, Destaque, Último" maxLength={20} />
            </label>
            <div className="checks">
              <label><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> <b>Destaque</b> na vitrine da página inicial (até 8)</label>
              <label><input type="checkbox" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} /> <b>Vendido</b> (o botão vira “Avisar-me”)</label>
              <label><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> <b>Oculto</b> (não aparece no site)</label>
            </div>
            <label className="f">
              <span>ID (endereço do produto) {editing && <em>não pode ser alterado</em>}</span>
              <input value={id} onChange={(e) => (setIdTouched(true), setId(slugify(e.target.value)))} disabled={editing} placeholder="gerado a partir do nome" />
            </label>
          </fieldset>

          {error && <p className="f-error" role="alert">{error}</p>}
        </div>

        <footer className="drawer__foot">
          <button type="button" className="btn-a btn-a--ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn-a btn-a--primary" disabled={saving || uploading > 0}>
            {saving ? 'Salvando…' : uploading ? 'Processando fotos…' : editing ? 'Salvar alterações' : 'Cadastrar produto'}
          </button>
        </footer>
      </form>
    </div>
  )
}
