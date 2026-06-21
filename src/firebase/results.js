import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

export async function saveResult(result) {
  const ref = await addDoc(collection(db, 'results'), {
    ...result,
    timestamp: serverTimestamp(),
  })
  return { id: ref.id }
}
