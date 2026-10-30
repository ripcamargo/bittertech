import About from './components/About'
import Contact from './components/Contact'
import Features from './components/Features'
import Footer from './components/Footer'
import Header from './components/Header'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Products from './components/Products'
import WhatsAppFloat from './components/WhatsAppFloat'
import { useReveal } from './lib/useReveal'

export default function App() {
  useReveal()
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <Products />
        <About />
        <HowItWorks />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  )
}
