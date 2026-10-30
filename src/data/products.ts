/**
 * ============================================================================
 *  CATÁLOGO DE PRODUTOS  —  ARQUIVO ÚNICO PARA EDITAR
 * ============================================================================
 *  Para ADICIONAR um produto: copie um bloco { ... } da lista, cole no final e
 *  altere os campos. Para REMOVER: apague o bloco. Para trocar PREÇO: edite
 *  "price". Nenhum outro arquivo precisa ser tocado — o site monta o catálogo
 *  sozinho a partir desta lista.
 *
 *  ℹ️  Com o painel /admin (Firestore) os produtos passam a ser gerenciados lá.
 *      Esta lista vira apenas o catálogo inicial/reserva (usado enquanto o
 *      Firestore estiver vazio e para importar os exemplos pelo painel).
 *
 *  ⚠️  Os produtos abaixo são EXEMPLOS FICTÍCIOS (nomes, preços e fotos
 *      ilustrativas). Substitua pelos produtos reais da loja.
 *
 *  CAMPOS
 *  ----------------------------------------------------------------------------
 *  id          Texto único, sem espaços (ex.: 'iphone-13-128'). Nunca repita.
 *  name        Nome exibido no card e na mensagem do WhatsApp.
 *  description Frase curta (1–2 linhas).
 *  price       Número em reais, sem R$ (ex.: 3499.9). Use 0 para mostrar
 *              "Consulte" no lugar do preço.
 *  oldPrice    (opcional) Preço antigo — aparece riscado ao lado do preço.
 *  image       Caminho da foto. Coloque o arquivo em  public/images/products/
 *              e escreva aqui '/images/products/nome-do-arquivo.webp'.
 *              Também aceita .jpg e .png. Ideal: vertical (4:5), ~900×1100 px.
 *  category    'Smartphones' | 'Áudio' | 'Acessórios' | 'Outros eletrônicos'
 *  condition   (opcional) 'Novo' | 'Seminovo' | 'Recondicionado'
 *  specs       (opcional) Até 3 detalhes curtos, ex.: ['128 GB', 'Bateria 91%'].
 *  badge       (opcional) Selo de destaque na foto, ex.: 'Destaque', 'Oferta'.
 *  soldOut     (opcional) true = mostra "Vendido" e o botão vira "Avisar quando chegar".
 *  featured    (opcional) true = aparece na vitrine da página inicial (até 8).
 *              Todos os produtos aparecem na página /produtos.
 *
 *  CONTEÚDO DO MODAL (ao clicar no produto) — tudo opcional
 *  ----------------------------------------------------------------------------
 *  gallery         Fotos extras: ['/images/products/x-2.webp', '/images/products/x-3.webp'].
 *                  A foto principal (image) sempre aparece primeiro.
 *  video           Link do YouTube/Vimeo (ex.: 'https://youtu.be/XXXXXXXXXXX') ou
 *                  arquivo em public/videos/ (ex.: '/videos/iphone.mp4').
 *  longDescription Texto completo. Separe parágrafos com uma linha em branco.
 *  details         Ficha técnica, ex.: { 'Armazenamento': '128 GB', 'Bateria': '91%' }
 *
 *  A ordem da lista é a ordem de exibição no site.
 * ============================================================================
 */

export type Category = 'Smartphones' | 'Áudio' | 'Acessórios' | 'Outros eletrônicos'
export type Condition = 'Novo' | 'Seminovo' | 'Recondicionado'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  oldPrice?: number
  image: string
  category: Category
  condition?: Condition
  specs?: string[]
  badge?: string
  soldOut?: boolean
  featured?: boolean
  gallery?: string[]
  video?: string
  longDescription?: string
  details?: Record<string, string>
  /** Painel admin: true = não aparece no site. */
  hidden?: boolean
  /** Uso interno do painel (a listagem não carrega a galeria). */
  hasGallery?: boolean
  /** Painel admin: posição na lista (menor aparece primeiro). */
  order?: number
}

/** Categorias exibidas nos filtros (a ordem aqui é a ordem dos botões). */
export const categories: Category[] = ['Smartphones', 'Áudio', 'Acessórios', 'Outros eletrônicos']
export const conditions: Condition[] = ['Novo', 'Seminovo', 'Recondicionado']

export const products: Product[] = [
  // ───────────────────────────── SMARTPHONES ─────────────────────────────
  {
    id: 'iphone-15-pro',
    featured: true,
    name: 'iPhone 15 Pro 256 GB',
    description: 'Estrutura em titânio, chip A17 Pro e câmera de nível profissional.',
    price: 6490,
    image: '/images/products/iphone-15-pro.webp',
    category: 'Smartphones',
    condition: 'Seminovo',
    specs: ['256 GB', 'Titânio'],
    badge: 'Destaque',
    gallery: ['/images/products/iphone-15-pro-2.webp', '/images/products/iphone-15-pro-3.webp'],
    // video: 'https://youtu.be/XXXXXXXXXXX',   // ← exemplo: descomente e cole o link do vídeo
    longDescription:
      'Um dos aparelhos mais completos da linha, com estrutura em titânio, leve e resistente, e o poderoso chip A17 Pro.\n\nÓtimo para quem quer fotografar, gravar vídeos e jogar sem travamentos. Aparelho seminovo, revisado antes de ser anunciado. Peça mais fotos e detalhes de bateria pelo WhatsApp.',
    details: {
      Armazenamento: '256 GB',
      Tela: '6,1" Super Retina XDR',
      Chip: 'A17 Pro',
      'Câmera principal': '48 MP',
      Conector: 'USB-C',
    },
  },
  {
    id: 'galaxy-s21-ultra',
    featured: true,
    name: 'Galaxy S21 Ultra 5G',
    description: 'Tela AMOLED de 120 Hz e conjunto de câmeras com zoom de longo alcance.',
    price: 2890,
    image: '/images/products/galaxy-s21-ultra.webp',
    category: 'Smartphones',
    condition: 'Seminovo',
    specs: ['256 GB', '5G'],
    gallery: ['/images/products/galaxy-s21-ultra-2.webp', '/images/products/galaxy-s21-ultra-3.webp'],
    longDescription:
      'Tela AMOLED de 120 Hz, desempenho de topo e um conjunto de câmeras com zoom de longo alcance. Um clássico da linha Galaxy.\n\nAparelho seminovo em bom estado. Consulte a loja para saber o que acompanha e as condições atuais.',
    details: { Armazenamento: '256 GB', Tela: '6,8" Dynamic AMOLED 2X, 120 Hz', 'Câmera principal': '108 MP', Rede: '5G' },
  },
  {
    id: 'iphone-13',
    featured: true,
    name: 'iPhone 13 128 GB',
    description: 'Desempenho consistente, ótima câmera e bateria para o dia inteiro.',
    price: 3290,
    oldPrice: 3590,
    image: '/images/products/iphone-13.webp',
    category: 'Smartphones',
    condition: 'Recondicionado',
    specs: ['128 GB', 'Azul'],
    badge: 'Oferta',
  },
  {
    id: 'iphone-12-pro',
    name: 'iPhone 12 Pro 128 GB',
    description: 'Acabamento em aço inoxidável, câmera tripla e tela Super Retina XDR.',
    price: 2990,
    image: '/images/products/iphone-12-pro.webp',
    category: 'Smartphones',
    condition: 'Seminovo',
    specs: ['128 GB', '5G'],
  },
  {
    id: 'iphone-11',
    name: 'iPhone 11 64 GB',
    description: 'O ponto de entrada ideal para quem quer o ecossistema Apple.',
    price: 1790,
    image: '/images/products/iphone-11.webp',
    category: 'Smartphones',
    condition: 'Recondicionado',
    specs: ['64 GB'],
  },

  // ─────────────────────────────── ÁUDIO ────────────────────────────────
  {
    id: 'airpods-pro',
    featured: true,
    name: 'Fone sem fio com estojo de carga',
    description: 'Cancelamento de ruído, modo ambiente e estojo de recarga compacto.',
    price: 1290,
    image: '/images/products/airpods-pro.webp',
    category: 'Áudio',
    condition: 'Novo',
    specs: ['Cancelamento de ruído'],
  },
  {
    id: 'headphone-anc',
    featured: true,
    name: 'Headphone Bluetooth com ANC',
    description: 'Over-ear com cancelamento de ruído ativo e bateria de longa duração.',
    price: 890,
    image: '/images/products/headphone-anc.webp',
    category: 'Áudio',
    condition: 'Novo',
    specs: ['Bluetooth 5.3', 'ANC'],
    gallery: ['/images/products/headphone-anc-2.webp', '/images/products/headphone-anc-3.webp'],
    longDescription:
      'Over-ear com cancelamento de ruído ativo para você se isolar no trabalho, na estrada ou na academia, com almofadas macias e bateria de longa duração.\n\nProduto novo. Confirme a cor e a disponibilidade pelo WhatsApp.',
    details: { Conexão: 'Bluetooth 5.3', Cancelamento: 'Ruído ativo (ANC)', Formato: 'Over-ear dobrável' },
  },
  {
    id: 'headphone-max',
    name: 'Headphone Premium Over-ear',
    description: 'Som espacial, almofadas macias e acabamento em alumínio.',
    price: 2490,
    image: '/images/products/headphone-max.webp',
    category: 'Áudio',
    condition: 'Seminovo',
    specs: ['Som espacial'],
  },
  {
    id: 'caixa-bluetooth',
    featured: true,
    name: 'Caixa de Som Bluetooth à prova d’água',
    description: 'Som potente, resistente à água e pronta para levar para qualquer lugar.',
    price: 520,
    image: '/images/products/caixa-bluetooth.webp',
    category: 'Áudio',
    condition: 'Novo',
    specs: ['IPX7', '12 h de bateria'],
  },

  // ───────────────────────────── ACESSÓRIOS ─────────────────────────────
  {
    id: 'carregador',
    featured: true,
    name: 'Carregador rápido com cabo',
    description: 'Carregamento rápido, compacto e compatível com os principais modelos.',
    price: 149,
    image: '/images/products/carregador.webp',
    category: 'Acessórios',
    condition: 'Novo',
    specs: ['20 W', 'USB-C'],
  },
  {
    id: 'capa',
    name: 'Capa protetora premium',
    description: 'Proteção contra quedas com acabamento fino que valoriza o aparelho.',
    price: 79,
    image: '/images/products/capa.webp',
    category: 'Acessórios',
    condition: 'Novo',
  },
  {
    id: 'case-fone',
    name: 'Case protetor para fones',
    description: 'Silicone resistente com mosquetão para levar seus fones com segurança.',
    price: 49,
    image: '/images/products/case-fone.webp',
    category: 'Acessórios',
    condition: 'Novo',
  },

  // ─────────────────────────── OUTROS ELETRÔNICOS ───────────────────────
  {
    id: 'smartwatch',
    featured: true,
    name: 'Smartwatch com GPS',
    description: 'Monitoramento de saúde e atividades, notificações e GPS integrado.',
    price: 1590,
    image: '/images/products/smartwatch.webp',
    category: 'Outros eletrônicos',
    condition: 'Seminovo',
    specs: ['GPS', 'Resistente à água'],
  },
  {
    id: 'relogio-branco',
    name: 'Relógio inteligente minimalista',
    description: 'Design limpo, tela sempre ativa e pulseira intercambiável.',
    price: 690,
    image: '/images/products/relogio-branco.webp',
    category: 'Outros eletrônicos',
    condition: 'Novo',
  },
  {
    id: 'smart-speaker',
    name: 'Smart Speaker com assistente',
    description: 'Controle por voz para música, casa conectada e rotinas do dia a dia.',
    price: 0,
    image: '/images/products/smart-speaker.webp',
    category: 'Outros eletrônicos',
    condition: 'Novo',
    soldOut: false,
  },
]
