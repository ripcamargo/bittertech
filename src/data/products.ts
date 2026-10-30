/**
 * ============================================================================
 *  CATÁLOGO DE PRODUTOS  —  ARQUIVO ÚNICO PARA EDITAR
 * ============================================================================
 *  Para ADICIONAR um produto: copie um bloco { ... } da lista, cole no final e
 *  altere os campos. Para REMOVER: apague o bloco. Para trocar PREÇO: edite
 *  "price". Nenhum outro arquivo precisa ser tocado — o site monta o catálogo
 *  sozinho a partir desta lista.
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
}

/** Categorias exibidas nos filtros (a ordem aqui é a ordem dos botões). */
export const categories: Category[] = ['Smartphones', 'Áudio', 'Acessórios', 'Outros eletrônicos']

export const products: Product[] = [
  // ───────────────────────────── SMARTPHONES ─────────────────────────────
  {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro 256 GB',
    description: 'Estrutura em titânio, chip A17 Pro e câmera de nível profissional.',
    price: 6490,
    image: '/images/products/iphone-15-pro.webp',
    category: 'Smartphones',
    condition: 'Seminovo',
    specs: ['256 GB', 'Titânio'],
    badge: 'Destaque',
  },
  {
    id: 'galaxy-s21-ultra',
    name: 'Galaxy S21 Ultra 5G',
    description: 'Tela AMOLED de 120 Hz e conjunto de câmeras com zoom de longo alcance.',
    price: 2890,
    image: '/images/products/galaxy-s21-ultra.webp',
    category: 'Smartphones',
    condition: 'Seminovo',
    specs: ['256 GB', '5G'],
  },
  {
    id: 'iphone-13',
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
    name: 'Headphone Bluetooth com ANC',
    description: 'Over-ear com cancelamento de ruído ativo e bateria de longa duração.',
    price: 890,
    image: '/images/products/headphone-anc.webp',
    category: 'Áudio',
    condition: 'Novo',
    specs: ['Bluetooth 5.3', 'ANC'],
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
