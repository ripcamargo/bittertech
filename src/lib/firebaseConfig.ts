/**
 * Configuração do Firebase (as chaves web são públicas por design: quem protege
 * os dados são as regras do Firestore — veja firebase/firestore.rules).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyC0uOzAHy7-pTfegO9jE8nyPA7JeFkl6Os',
  authDomain: 'rifa-emoaranha.firebaseapp.com',
  projectId: 'rifa-emoaranha',
  storageBucket: 'rifa-emoaranha.firebasestorage.app',
  messagingSenderId: '532264897742',
  appId: '1:532264897742:web:cb0cd534416fb483b2549f',
}

/** Coleções usadas pela loja (prefixo "bt_" para não misturar com outros apps do projeto). */
export const PRODUCTS = 'bt_products'
export const META = 'bt_meta'
