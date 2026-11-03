import type { ReactNode } from 'react'

/**
 * Formatação simples para o texto do regulamento (sem HTML — tudo vira elementos React).
 *   **negrito**   *itálico*   __sublinhado__
 *   ## Título     - tópico     1. item numerado     (linha em branco separa parágrafos)
 */

const INLINE = /\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*/g

export function inline(text: string, key = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let n = 0
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    const k = `${key}-${n++}`
    if (m[1] !== undefined) out.push(<strong key={k}>{inline(m[1], k)}</strong>)
    else if (m[2] !== undefined) out.push(<u key={k}>{inline(m[2], k)}</u>)
    else out.push(<em key={k}>{inline(m[3], k)}</em>)
    last = at + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

type Block =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'ul' | 'ol'; items: string[] }

function parse(src: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) blocks.push({ t: 'p', text: para.join(' ') })
    para = []
  }
  for (const raw of src.split('\n')) {
    const line = raw.trim()
    const h = /^#{1,3}\s+(.+)$/.exec(line)
    const ul = /^[-•*]\s+(.+)$/.exec(line)
    const ol = /^\d+[.)]\s+(.+)$/.exec(line)
    if (!line) flush()
    else if (h) { flush(); blocks.push({ t: 'h', text: h[1] }) }
    else if (ul || ol) {
      flush()
      const t = ul ? 'ul' : 'ol'
      const prev = blocks[blocks.length - 1]
      const item = (ul ?? ol)![1]
      if (prev && prev.t === t) prev.items.push(item)
      else blocks.push({ t, items: [item] })
    } else para.push(line)
  }
  flush()
  return blocks
}

export function RichText({ text }: { text: string }) {
  return (
    <>
      {parse(text).map((b, i) => {
        if (b.t === 'h') return <h3 key={i}>{inline(b.text, `h${i}`)}</h3>
        if (b.t === 'p') return <p key={i}>{inline(b.text, `p${i}`)}</p>
        const List = b.t
        return (
          <List key={i}>
            {b.items.map((it, j) => <li key={j}>{inline(it, `l${i}-${j}`)}</li>)}
          </List>
        )
      })}
    </>
  )
}
