export default function AudioPlayer({ audioRef }) {
  if (!audioRef) return null

  // TODO: replace src with Firebase Storage download URL once configured
  // import { getStorage, ref, getDownloadURL } from 'firebase/storage'
  // const url = await getDownloadURL(ref(storage, audioRef))

  return (
    <div className="audio-player">
      <p className="audio-placeholder">
        Audio file: <code>{audioRef}</code>
        <br />
        <small>(Firebase Storage not yet configured — connect Firebase to enable audio playback)</small>
      </p>
    </div>
  )
}
