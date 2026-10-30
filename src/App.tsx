import { useEffect } from 'react'
import Footer from './components/Footer'
import Header from './components/Header'
import ProductModal from './components/ProductModal'
import WhatsAppFloat from './components/WhatsAppFloat'
import { products } from './data/products'
import { useLocation, useSelectedProductId } from './lib/router'
import Landing from './pages/Landing'
import ProductsPage from './pages/ProductsPage'

const HOME_TITLE = 'Bitter Tech Store | Eletrônicos em Sorocaba'

export default function App() {
  const { pathname } = useLocation()
  const productId = useSelectedProductId()
  const isCatalog = pathname.replace(/\/$/, '') === '/produtos'

  // Título da aba conforme a página (e o produto aberto)
  useEffect(() => {
    const product = products.find((p) => p.id === productId)
    document.title = product
      ? `${product.name} | Bitter Tech Store`
      : isCatalog
        ? 'Produtos | Bitter Tech Store'
        : HOME_TITLE
  }, [isCatalog, productId])

  return (
    <>
      <Header />
      <main>{isCatalog ? <ProductsPage /> : <Landing />}</main>
      <Footer />
      <WhatsAppFloat />
      <ProductModal />
    </>
  )
}
