const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const admin = require('firebase-admin')

admin.initializeApp()

// Field-test items (`benchmark_items.pilot === true`) are sampled into live
// sittings by TrialPlayer.jsx but excluded from scoring, purely to gather
// performance data before they're promoted into (or discarded from) the
// scored bank. This keeps a running per-item response count so the sampler
// can favour under-tested items (see samplePilotItems in TrialPlayer.jsx) —
// trusts the item doc, not the response payload, since responses are
// client-authored and unauthenticated.
exports.incrementPilotItemAttempts = onDocumentCreated('benchmark_results/{resultId}', async (event) => {
  const responses = event.data?.data()?.responses
  if (!Array.isArray(responses) || responses.length === 0) return

  const db = admin.firestore()
  const itemIds = [...new Set(responses.map(r => r.itemId).filter(Boolean))]
  if (itemIds.length === 0) return

  // Firestore 'in' queries cap at 30 IDs — chunk defensively even though a
  // single sitting's response count is expected to stay well under that.
  const pilotIds = new Set()
  for (let i = 0; i < itemIds.length; i += 30) {
    const chunk = itemIds.slice(i, i + 30)
    const snap = await db.collection('benchmark_items')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get()
    snap.forEach(doc => { if (doc.data().pilot) pilotIds.add(doc.id) })
  }
  if (pilotIds.size === 0) return

  const batch = db.batch()
  for (const id of pilotIds) {
    batch.update(db.collection('benchmark_items').doc(id), {
      pilotAttempts: admin.firestore.FieldValue.increment(1),
    })
  }
  await batch.commit()
})
