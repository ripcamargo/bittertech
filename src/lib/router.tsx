import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/** Roteador mínimo (History API): sem dependências extras. */
const EVENT = 'app:navigate'

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb)
  window.addEventListener(EVENT, cb)
  return () => {
    window.removeEventListener('popstate', cb)
    window.removeEventListener(EVENT, cb)
  }
}
const getSnapshot = () => window.location.pathname + window.location.search

export function useLocation() {
  const key = useSyncExternalStore(subscribe, getSnapshot)
  const i = key.indexOf('?')
  return { pathname: i < 0 ? key : key.slice(0, i), search: i < 0 ? '' : key.slice(i) }
}

interface NavigateOptions {
  replace?: boolean
  state?: unknown
  /** false = não rola a página (usado ao abrir/fechar o modal). */
  scroll?: boolean
}

export function navigate(to: string, { replace, state, scroll = true }: NavigateOptions = {}) {
  const url = new URL(to, window.location.href)
  const samePage = url.pathname === window.location.pathname
  window.history[replace ? 'replaceState' : 'pushState'](state ?? null, '', url.pathname + url.search + url.hash)
  window.dispatchEvent(new Event(EVENT))
  if (!scroll) return
  setTimeout(() => {
    const target = url.hash ? document.getElementById(url.hash.slice(1)) : null
    if (target) target.scrollIntoView({ behavior: samePage ? 'smooth' : 'auto' })
    else if (!samePage || !url.hash) window.scrollTo({ top: 0, behavior: samePage ? 'smooth' : 'instant' })
  }, 0)
}

export function Link({ to, onClick, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}

/* ---- Produto aberto no modal: fica na URL como ?p=id (link compartilhável) ---- */
export function useSelectedProductId(): string | null {
  const { search } = useLocation()
  return new URLSearchParams(search).get('p')
}

export function openProduct(id: string) {
  const { pathname, hash } = window.location
  navigate(`${pathname}?p=${encodeURIComponent(id)}${hash}`, { state: { modal: true }, scroll: false })
}

export function closeProduct() {
  if (window.history.state?.modal) window.history.back()
  else navigate(window.location.pathname, { replace: true, scroll: false })
}
