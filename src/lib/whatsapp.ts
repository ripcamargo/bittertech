import { contact, store } from '../data/content'
import type { Product } from '../data/products'

/** Monta o link wa.me com a mensagem já preenchida. */
export function whatsappLink(message: string = contact.defaultMessage): string {
  return `https://wa.me/${store.whatsappNumber}?text=${encodeURIComponent(message)}`
}

/** Mensagem automática de um produto específico. */
export function productLink(product: Product): string {
  const message = product.soldOut
    ? `Olá! Vi o ${product.name} no site da Bitter Tech Store e gostaria de ser avisado quando chegar outra unidade.`
    : `Olá! Tenho interesse no ${product.name} anunciado no site da Bitter Tech Store. Gostaria de saber mais informações.`
  return whatsappLink(message)
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatPrice = (value: number): string => brl.format(value)
