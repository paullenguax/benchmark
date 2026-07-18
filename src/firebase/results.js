import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

export async function saveResult(result) {
  const ref = await addDoc(collection(db, 'benchmark_results'), {
    ...result,
    timestamp: serverTimestamp(),
  })
  return { id: ref.id }
}

export async function saveTrialResult(result) {
  const ref = await addDoc(collection(db, 'benchmark_results'), {
    ...result,
    timestamp: serverTimestamp(),
  })
  return { id: ref.id }
}

export async function saveFlag({ itemId, comment, candidateEmail }) {
  await addDoc(collection(db, 'benchmark_flags'), {
    itemId,
    comment,
    candidateEmail: candidateEmail ?? null,
    timestamp: serverTimestamp(),
  })
}
