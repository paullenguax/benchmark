export default function AudioPlayer({ audioRef }) {
  if (!audioRef) return null

  // Items store the full Storage download URL in audioRef (set by the admin
  // upload control in RaterSystemNew), so it can be played directly.
  return (
    <div className="audio-player">
      <audio controls src={audioRef} aria-label="Question audio">
        Your browser does not support audio playback.
      </audio>
    </div>
  )
}
