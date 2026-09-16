import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

export async function saveResult(result) {
  const ref = await addDoc(collection(db, 'benchmark_results'), {
    ...result,
    timestamp: serverTimestamp(),
  })
  return { id: ref.id }
}

// Trial submissions can silently disappear if the write to Firestore is
// blocked (ad blockers/privacy extensions commonly block
// firestore.googleapis.com, or the connection drops) — the candidate still
// sees their locally-computed results either way, so a lost write was
// previously invisible. This retries a few times, then falls back to
// queuing in localStorage so a later visit (flushPendingTrialResults) can
// still deliver it, instead of losing the result outright.
const PENDING_QUEUE_KEY = 'benchmark_pending_trial_results'

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY)) ?? []
  } catch {
    return []
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // localStorage unavailable (private browsing, quota) — nothing more we can do
  }
}

async function addTrialResultDoc(result) {
  const ref = await addDoc(collection(db, 'benchmark_results'), {
    ...result,
    timestamp: serverTimestamp(),
  })
  return ref.id
}

async function withRetries(result, attempts) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await addTrialResultDoc(result)
    } catch (err) {
      if (i === attempts - 1) throw err
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
    }
  }
}

export async function saveTrialResult(result) {
  try {
    const id = await withRetries(result, 3)
    return { id }
  } catch (err) {
    console.error('Benchmark: failed to save trial result after retries — queuing locally for later delivery', err)
    writeQueue([...readQueue(), result])
    return { id: null, queued: true }
  }
}

// Call on app load: retries any results that failed to save on a previous
// visit (same browser/device only — this is a best-effort recovery, not a
// guarantee).
export async function flushPendingTrialResults() {
  const queue = readQueue()
  if (queue.length === 0) return

  const stillPending = []
  for (const result of queue) {
    try {
      await withRetries(result, 1)
    } catch {
      stillPending.push(result)
    }
  }
  writeQueue(stillPending)
}

export async function saveFlag({ itemId, comment, candidateEmail }) {
  await addDoc(collection(db, 'benchmark_flags'), {
    itemId,
    comment,
    candidateEmail: candidateEmail ?? null,
    timestamp: serverTimestamp(),
  })
}
