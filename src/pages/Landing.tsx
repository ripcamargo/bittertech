import About from '../components/About'
import Contact from '../components/Contact'
import Features from '../components/Features'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Products from '../components/Products'
import RaffleBanner from '../components/RaffleBanner'
import { useCatalog } from '../lib/catalog'
import { useReveal } from '../lib/useReveal'

export default function Landing() {
  const { products } = useCatalog()
  useReveal([products])
  return (
    <>
      <Hero />
      <RaffleBanner />
      <Features />
      <Products />
      <About />
      <HowItWorks />
      <Contact />
    </>
  )
}
