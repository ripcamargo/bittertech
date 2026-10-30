import { faq, steps } from '../data/content'
import { PlusIcon } from './Icons'

export default function HowItWorks() {
  return (
    <section className="how section section--light" id="como-funciona">
      <div className="container">
        <header className="section__head reveal">
          <p className="eyebrow">{steps.eyebrow}</p>
          <h2>{steps.title}</h2>
        </header>

        <ol className="steps">
          {steps.items.map((s, i) => (
            <li key={s.title} className="step reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="step__n">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>

        <div className="faq reveal">
          <div className="faq__head">
            <p className="eyebrow">{faq.eyebrow}</p>
            <h2>{faq.title}</h2>
          </div>
          <div className="faq__list">
            {faq.items.map((item) => (
              <details key={item.q}>
                <summary>
                  {item.q}
                  <PlusIcon width={20} height={20} />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
