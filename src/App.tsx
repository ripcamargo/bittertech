import { lazy, Suspense, useEffect } from 'react'
import Footer from './components/Footer'
import RaffleGate from './components/RaffleModal'
import Header from './components/Header'
import ProductModal from './components/ProductModal'
import WhatsAppFloat from './components/WhatsAppFloat'
import { useCatalog } from './lib/catalog'
import { useLocation, useSelectedProductId } from './lib/router'
import Landing from './pages/Landing'
import ProductsPage from './pages/ProductsPage'

const Admin = lazy(() => import('./admin/Admin'))
const RafflePage = lazy(() => import('./pages/RafflePage'))

const HOME_TITLE = 'Bitter Tech Store | Eletrônicos em Sorocaba'

export default function App() {
  const { pathname } = useLocation()
  const productId = useSelectedProductId()
  const { products } = useCatalog()
  const isRaffle = pathname.replace(/\/$/, '') === '/rifa'
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  const isCatalog = pathname.replace(/\/$/, '') === '/produtos'

  // Título da aba conforme a página (e o produto aberto)
  useEffect(() => {
    if (isAdmin) return
    const product = products.find((p) => p.id === productId)
    document.title = product
      ? `${product.name} | Bitter Tech Store`
      : isRaffle
        ? 'Rifa | Bitter Tech Store'
        : isCatalog
          ? 'Produtos | Bitter Tech Store'
          : HOME_TITLE
  }, [isAdmin, isRaffle, isCatalog, productId, products])

  if (isAdmin) {
    return (
      <Suspense fallback={<div className="admin-boot">Carregando painel…</div>}>
        <Admin />
      </Suspense>
    )
  }

  return (
    <>
      <Header />
      <main>
        {isRaffle ? (
          <Suspense fallback={<div className="admin-boot">Carregando…</div>}>
            <RafflePage />
          </Suspense>
        ) : isCatalog ? (
          <ProductsPage />
        ) : (
          <Landing />
        )}
      </main>
      <Footer />
      <WhatsAppFloat />
      <ProductModal />
      <RaffleGate />
    </>
  )
}
