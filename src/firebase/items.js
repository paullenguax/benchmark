import { collection, getDocs, query, where, writeBatch, doc, setDoc } from 'firebase/firestore'
import { db } from './config'
import rawItems from '../data/benchmark_items_v01.json'

export async function fetchItems() {
  const q = query(collection(db, 'benchmark_items'), where('active', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function fetchAllItems() {
  const snap = await getDocs(collection(db, 'benchmark_items'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function saveItem(item) {
  const { id, ...fields } = item
  await setDoc(doc(db, 'benchmark_items', id), fields)
}

export async function updateItem(id, fields) {
  await setDoc(doc(db, 'benchmark_items', id), fields, { merge: true })
}

export async function seedItemsFromJson() {
  const items = rawItems.items
  const batch = writeBatch(db)
  for (const item of items) {
    const { id, ...fields } = item
    batch.set(doc(db, 'benchmark_items', id), fields)
  }
  await batch.commit()
}
