import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from './config'

export async function fetchItems() {
  const q = query(collection(db, 'benchmark_items'), where('active', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ ...d.data(), id: d.id }))
}
