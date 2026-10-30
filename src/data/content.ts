/**
 * ============================================================================
 *  TEXTOS DO SITE  —  edite aqui os textos institucionais
 * ============================================================================
 *  Tudo que é texto (hero, sobre nós, diferenciais, perguntas frequentes)
 *  fica neste arquivo. Os componentes apenas exibem o que está aqui.
 * ============================================================================
 */

/** Dados da loja e do WhatsApp. */
export const store = {
  name: 'Bitter Tech Store',
  city: 'Sorocaba/SP',
  /** Somente números, com DDI + DDD (55 + 15). */
  whatsappNumber: '5515998110938',
  whatsappDisplay: '(15) 99811-0938',
}

export const hero = {
  eyebrow: 'Sorocaba/SP · Tecnologia acessível',
  title: 'Tecnologia de verdade, a um preço justo.',
  subtitle:
    'Smartphones seminovos e recondicionados, fones, acessórios e eletrônicos selecionados — com atendimento próximo e compra simples, direto pelo WhatsApp.',
  primaryCta: 'Explorar produtos',
  secondaryCta: 'Fale pelo WhatsApp',
  /** Pequenos destaques abaixo dos botões. */
  points: ['Atendimento personalizado', 'Compra pelo WhatsApp', 'Seminovos e recondicionados'],
}

export const about = {
  eyebrow: 'Sobre nós',
  title: 'Gente de tecnologia atendendo gente como você.',
  paragraphs: [
    'A Bitter Tech Store nasceu para tornar a tecnologia mais acessível, sem abrir mão de qualidade e transparência. Trabalhamos principalmente com smartphones seminovos e recondicionados, além de acessórios e eletrônicos cuidadosamente selecionados.',
    'Aqui, cada aparelho é apresentado com clareza: você sabe a condição do produto, o preço e o que esperar antes de decidir. Sem letras miúdas e sem pressa.',
    'Nosso atendimento é direto e pessoal. Você conversa com quem entende do assunto, tira todas as dúvidas e escolhe com segurança — tudo pelo WhatsApp.',
  ],
  values: [
    { title: 'Confiança', text: 'Conversa honesta sobre o estado real de cada produto.' },
    { title: 'Transparência', text: 'Condição e preço informados de forma clara.' },
    { title: 'Qualidade', text: 'Seleção criteriosa do que chega à vitrine.' },
  ],
}

export type FeatureIcon = 'check' | 'chat' | 'tag' | 'whatsapp'

export const features: { icon: FeatureIcon; title: string; text: string }[] = [
  {
    icon: 'check',
    title: 'Produtos selecionados',
    text: 'Cada item passa por uma escolha cuidadosa antes de entrar na vitrine.',
  },
  {
    icon: 'chat',
    title: 'Atendimento personalizado',
    text: 'Você fala direto com a loja e recebe ajuda para escolher o que combina com você.',
  },
  {
    icon: 'tag',
    title: 'Preços competitivos',
    text: 'Tecnologia acessível, com valores justos e sem surpresas.',
  },
  {
    icon: 'whatsapp',
    title: 'Compra simples pelo WhatsApp',
    text: 'Sem cadastro e sem burocracia: converse, tire dúvidas e combine tudo no mesmo lugar.',
  },
]

export const steps = {
  eyebrow: 'Como funciona',
  title: 'Da vitrine à sua mão em três passos.',
  items: [
    { title: 'Escolha', text: 'Navegue pela vitrine e encontre o produto ideal.' },
    { title: 'Converse', text: 'Toque em “Tenho interesse” e a conversa abre no WhatsApp, já com o produto.' },
    { title: 'Combine', text: 'Confirme disponibilidade, condições e finalize o pedido direto com a loja.' },
  ],
}

export const faq = {
  eyebrow: 'Dúvidas frequentes',
  title: 'Antes de falar com a gente.',
  items: [
    {
      q: 'Como faço para comprar?',
      a: 'É só tocar em “Tenho interesse” no produto desejado. O WhatsApp abre com uma mensagem pronta e a loja continua o atendimento com você.',
    },
    {
      q: 'O site tem carrinho ou pagamento online?',
      a: 'Não. O site é a nossa vitrine. A compra é combinada diretamente pelo WhatsApp, de forma simples e personalizada.',
    },
    {
      q: 'O que significam Novo, Seminovo e Recondicionado?',
      a: 'Novo é um produto sem uso. Seminovo é um aparelho que já teve dono, em bom estado. Recondicionado passou por revisão antes de voltar à venda. Em caso de dúvida, perguntamos e explicamos cada detalhe no atendimento.',
    },
    {
      q: 'Os preços e a disponibilidade são atualizados?',
      a: 'Nosso estoque muda com frequência. Por isso, confirme a disponibilidade e as condições atuais com a loja pelo WhatsApp.',
    },
  ],
}

export const contact = {
  eyebrow: 'Contato',
  title: 'Vamos conversar?',
  text: 'Consulte a disponibilidade, tire dúvidas ou peça informações sobre qualquer produto. Respondemos direto pelo WhatsApp.',
  cta: 'Iniciar conversa no WhatsApp',
  /** Mensagem usada nos botões gerais (sem produto específico). */
  defaultMessage: 'Olá! Vim pelo site da Bitter Tech Store e gostaria de mais informações.',
}
