import { useState } from 'react'

const MAX_PLAYS = 2

export default function AudioPlayer({ audioRef }) {
  const [playCount, setPlayCount] = useState(0)

  if (!audioRef) return null

  const playsLeft = Math.max(0, MAX_PLAYS - playCount)
  const exhausted = playsLeft === 0

  function handlePlay(e) {
    // Only count a play that starts from the beginning — resuming after a
    // pause shouldn't cost the candidate one of their listens.
    if (e.target.currentTime < 0.5) {
      if (exhausted) {
        e.target.pause()
        e.target.currentTime = 0
        return
      }
      setPlayCount(c => c + 1)
    }
  }

  // Items store the full Storage download URL in audioRef (set by the admin
  // upload control in RaterSystemNew), so it can be played directly.
  return (
    <div className={`audio-player${exhausted ? ' audio-player--exhausted' : ''}`}>
      <audio
        controls
        src={audioRef}
        aria-label="Question audio"
        onPlay={handlePlay}
        tabIndex={exhausted ? -1 : 0}
      >
        Your browser does not support audio playback.
      </audio>
      <p className="audio-plays-remaining" aria-live="polite">
        {exhausted ? 'No plays remaining' : `${playsLeft} ${playsLeft === 1 ? 'play' : 'plays'} remaining`}
      </p>
    </div>
  )
}
