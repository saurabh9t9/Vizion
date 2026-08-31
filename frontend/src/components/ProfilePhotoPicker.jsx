import { Camera, Trash2, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'

function ProfilePhotoPicker({ photo, name, onChange }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')

  const selectPhoto = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Choose an image smaller than 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => { setError(''); onChange(reader.result) }
    reader.readAsDataURL(file)
  }

  return <div className="profile-photo-picker">
    <div className="profile-photo-preview">
      {photo ? <img src={photo} alt={`${name || 'Profile'} profile`} /> : <UserRound size={30} />}
    </div>
    <div className="profile-photo-actions">
      <button type="button" onClick={() => inputRef.current?.click()}><Camera size={15} /> {photo ? 'Change photo' : 'Add photo'}</button>
      {photo && <button type="button" className="photo-remove" onClick={() => { setError(''); onChange(null) }}><Trash2 size={14} /> Remove</button>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} hidden />
      {error && <small className="photo-error">{error}</small>}
    </div>
  </div>
}

export default ProfilePhotoPicker
