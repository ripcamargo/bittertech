import { about } from '../data/content'

export default function About() {
  return (
    <section id="sobre" className="about section section--dark">
      <div className="container about__grid">
        <div className="reveal">
          <p className="eyebrow">{about.eyebrow}</p>
          <h2>{about.title}</h2>
        </div>

        <div className="about__text reveal">
          {about.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>

      <div className="container">
        <ul className="values">
          {about.values.map((v, i) => (
            <li key={v.title} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="values__n">0{i + 1}</span>
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
