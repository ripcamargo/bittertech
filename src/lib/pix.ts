/** PIX "copia e cola" (BR Code estático): gera o payload EMV com CRC16, sem depender de serviços externos. */

export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'random'

export const pixKeyTypes: { value: PixKeyType; label: string; hint: string }[] = [
  { value: 'cpf', label: 'CPF', hint: '000.000.000-00' },
  { value: 'cnpj', label: 'CNPJ', hint: '00.000.000/0000-00' },
  { value: 'phone', label: 'Celular', hint: '(15) 99999-9999' },
  { value: 'email', label: 'E-mail', hint: 'voce@email.com' },
  { value: 'random', label: 'Chave aleatória', hint: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
]

const digits = (s: string) => s.replace(/\D/g, '')

/** Devolve a chave no formato que o PIX exige, ou null se for inválida para o tipo escolhido. */
export function normalizePixKey(type: PixKeyType, raw: string): string | null {
  const v = raw.trim()
  switch (type) {
    case 'cpf':
      return digits(v).length === 11 ? digits(v) : null
    case 'cnpj':
      return digits(v).length === 14 ? digits(v) : null
    case 'phone': {
      let d = digits(v)
      if (d.startsWith('55') && d.length > 11) d = d.slice(2)
      return d.length === 10 || d.length === 11 ? `+55${d}` : null
    }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 77 ? v.toLowerCase() : null
    case 'random':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v.toLowerCase() : null
  }
}

const field = (id: string, value: string) => id + String(value.length).padStart(2, '0') + value
const ascii = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '').trim()

/** CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF), exigido pelo BR Code. */
export function crc16(s: string): string {
  let crc = 0xffff
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export interface PixInput {
  /** Chave já normalizada (veja normalizePixKey). */
  key: string
  /** Nome do favorecido (até 25 caracteres, sem acentos). */
  name: string
  /** Cidade do favorecido (até 15 caracteres, sem acentos). */
  city: string
  /** Valor em reais; 0 = o pagador digita o valor. */
  amount: number
  /** Identificador da cobrança (letras/números, até 25). */
  txid?: string
}

export function pixPayload({ key, name, city, amount, txid }: PixInput): string {
  const id = (txid ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'
  const body =
    field('00', '01') +
    field('26', field('00', 'br.gov.bcb.pix') + field('01', key)) +
    field('52', '0000') +
    field('53', '986') +
    (amount > 0 ? field('54', amount.toFixed(2)) : '') +
    field('58', 'BR') +
    field('59', ascii(name).toUpperCase().slice(0, 25) || 'LOJA') +
    field('60', ascii(city).toUpperCase().slice(0, 15) || 'BRASIL') +
    field('62', field('05', id)) +
    '6304'
  return body + crc16(body)
}
