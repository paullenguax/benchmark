import { doc, getDoc } from 'firebase/firestore'
import { db } from './config'

// Mirrors RaterSystemNew's DEFAULT_SECTIONS_CONFIG (src/features/benchmark/BenchmarkPage.tsx)
// — keep the two in sync if either changes. Used only if the config doc
// hasn't been created yet, so a fresh Firebase project (or one where the
// admin hasn't visited the Sections tab) still behaves like today's fixed
// listening → reading player.
const DEFAULT_SECTIONS_CONFIG = {
  pilotSampleCount: 5,
  sections: [
    {
      id: 'listening', order: 0, title: 'Listening section', showIntro: true,
      introBody: 'The next few questions include an audio clip. Each clip can only be played a '
        + 'limited number of times — check the counter under the player — so listen carefully. '
        + "There's no time limit to think it over.",
      filter: { modality: 'listening', construct: 'any', band: 'any' },
    },
    {
      id: 'reading', order: 1, title: 'Reading section', showIntro: true,
      introBody: "That's the listening section done. The rest of the questions are read on "
        + "screen, at your own pace — there's no time limit.",
      filter: { modality: 'reading', construct: 'any', band: 'any' },
    },
  ],
}

export async function fetchSectionsConfig() {
  const snap = await getDoc(doc(db, 'benchmark_config', 'sections'))
  return snap.exists() ? snap.data() : DEFAULT_SECTIONS_CONFIG
}
