import fs from 'node:fs/promises'

const base = new URL('../public/assets/desk-break/', import.meta.url)
const data = JSON.parse(await fs.readFile(new URL('exercises.json', base), 'utf8'))
const buffer = await fs.readFile(new URL('exercises.glb', base))
// Read the JSON chunk directly: validation must run in Node without trying to decode GLB textures.
if (buffer.readUInt32LE(0) !== 0x46546c67 || buffer.readUInt32LE(16) !== 0x4e4f534a) throw new Error('Invalid GLB header')
const jsonLength = buffer.readUInt32LE(12)
const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim())
const clips = new Set((gltf.animations ?? []).map(clip => clip.name))
const invalid = data.exercises.filter(ex => !ex.id || !ex.en || !clips.has(ex.id))
console.log(`Validated ${data.exercises.length} exercise records, ${data.categories.length} categories, and ${clips.size} animation clips.`)
if (invalid.length) { console.error('Invalid or missing animation records:', invalid.map(ex => ex.id).join(', ')); process.exitCode = 1 }
