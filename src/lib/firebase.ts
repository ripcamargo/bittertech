import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

import { firebaseConfig, META, PRODUCTS } from './firebaseConfig'

export { META, PRODUCTS }
export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
