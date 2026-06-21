import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyDtWlmww9iNBcLnfzoJE19j0tq_MsmTOkk',
  authDomain: 'raterscores.firebaseapp.com',
  projectId: 'raterscores',
  storageBucket: 'raterscores.firebasestorage.app',
  messagingSenderId: '72763874219',
  appId: '1:72763874219:web:d51c927999497ab76450ee',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)
