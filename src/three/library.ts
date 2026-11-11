import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Exercise, Library } from '../types'

const ASSET = '/assets/desk-break/'
let libraryPromise: Promise<Library> | undefined
let modelPromise: Promise<THREE.Group & { animations?: THREE.AnimationClip[] }> | undefined
export const VIEWS: Record<string, [[number, number, number], [number, number, number]]> = {
  full: [[1.6, 1.25, 4.6], [0, .92, 0]], head: [[.5, 1.72, 1.45], [0, 1.58, 0]],
  upper: [[.9, 1.45, 2.6], [0, 1.25, .1]], floor: [[2.3, 1.9, 2.7], [0, .25, 0]],
}
export const loadLibrary = () => libraryPromise ??= fetch(`${ASSET}exercises.json`).then(r => { if (!r.ok) throw new Error('Exercise data could not be loaded'); return r.json() })
export const loadModel = () => modelPromise ??= new GLTFLoader().loadAsync(`${ASSET}exercises.glb`).then(g => { g.scene.userData.animations = g.animations; return g.scene })
export function addLights(scene: THREE.Scene) { scene.add(new THREE.HemisphereLight(0xfff7e9, 0x756553, 2.1)); const key = new THREE.DirectionalLight(0xfff2df, 2.5); key.position.set(2, 4, 4); scene.add(key) }
let wood: THREE.Texture | undefined
export function createChair() {
  wood ??= new THREE.TextureLoader().load(`${ASSET}wood.png`); wood.colorSpace = THREE.SRGBColorSpace; wood.wrapS = wood.wrapT = THREE.RepeatWrapping
  const material = new THREE.MeshStandardMaterial({ map: wood, color: 0xd9c7ad, roughness: .6 }); const group = new THREE.Group()
  const box = (w: number, h: number, d: number, x: number, y: number, z: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x,y,z); group.add(m) }
  box(.46,.04,.44,0,.43,-.12); box(.46,.5,.04,0,.7,-.34); for (const x of [-.2,.2]) for (const z of [-.31,.07]) box(.035,.41,.035,x,.205,z)
  return group
}
export function clipFor(exercise: Exercise, model: THREE.Object3D) { const clips = (model.userData.animations ?? []) as THREE.AnimationClip[]; return THREE.AnimationClip.findByName(clips, exercise.id) }
