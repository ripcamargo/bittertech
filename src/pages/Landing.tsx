import About from '../components/About'
import Contact from '../components/Contact'
import Features from '../components/Features'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Products from '../components/Products'
import { useReveal } from '../lib/useReveal'

export default function Landing() {
  useReveal()
  return (
    <>
      <Hero />
      <Features />
      <Products />
      <About />
      <HowItWorks />
      <Contact />
    </>
  )
}
