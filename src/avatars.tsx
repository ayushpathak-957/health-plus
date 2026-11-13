export type AvatarId = 'man-athletic' | 'woman-casual' | 'wood'
export const avatars = [{ id: 'man-athletic', name: 'Man · Athletic' }, { id: 'woman-casual', name: 'Woman · Casual' }, { id: 'wood', name: 'Wooden mannequin' }] as const
export function previewBase(id: AvatarId) { return id === 'wood' ? '/previews' : `/previews/${id}` }
export function AvatarSelect({ value, onChange }: { value: AvatarId; onChange: (id: AvatarId) => void }) {
  return <label className="avatar-select">Avatar <select value={value} onChange={event => onChange(event.target.value as AvatarId)}>{avatars.map(avatar => <option value={avatar.id} key={avatar.id}>{avatar.name}</option>)}</select></label>
}
