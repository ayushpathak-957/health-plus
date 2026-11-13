import { useEffect, useRef, useState } from 'react'
import type { AvatarId } from '../avatars'
import { createAvatar, loadAvatar } from './avatarRig.js'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { Exercise } from '../types'
import { addLights, clipFor, createChair, loadModel, viewFor } from './library'

export default function ExerciseViewer({ exercise, playing, speed, avatar }: { exercise: Exercise; playing: boolean; speed: number; avatar: AvatarId }) {
  const [status, setStatus] = useState('Loading avatar…')
  const playback = useRef({ playing, speed }); playback.current = { playing, speed }
  const mount = useRef<HTMLDivElement>(null); const actionRef = useRef<THREE.AnimationAction>(); const mixerRef = useRef<THREE.AnimationMixer>()
  useEffect(() => { if (actionRef.current) actionRef.current.paused = !playing }, [playing])
  useEffect(() => { if (mixerRef.current) mixerRef.current.timeScale = speed }, [speed])
  useEffect(() => {
    const node = mount.current; if (!node) return; let disposed = false, raf = 0, hold = 0
    setStatus('Loading avatar…')
    let adapter: ReturnType<typeof createAvatar> | undefined
    let figure: THREE.Object3D | undefined, chair: THREE.Group | undefined
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf2ede4); addLights(scene)
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.3, 48), new THREE.MeshStandardMaterial({ color: 0xe6ded1, roughness: 1 })); floor.rotation.x = -Math.PI / 2; scene.add(floor)
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 30); const view = viewFor(exercise); camera.position.set(...view[0])
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; node.append(renderer.domElement)
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(...view[1]); controls.enableDamping = true; controls.minDistance = .8; controls.maxDistance = 8; controls.update()
    const resize = () => { const { width, height } = node.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix() }; const ro = new ResizeObserver(resize); ro.observe(node); resize()
    const clock = new THREE.Clock(); let mixer: THREE.AnimationMixer | undefined
    Promise.all([loadModel(), avatar === 'wood' ? Promise.resolve(null) : loadAvatar(avatar)]).then(([source, template]) => {
      if (disposed) return
      figure = clone(source); figure.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) o.frustumCulled = false })
      if (template) { adapter = createAvatar(figure, template, exercise.id); scene.add(adapter.figure) } else scene.add(figure)
      if (exercise.seated) { chair = createChair(); scene.add(chair) }
      const clip = clipFor(exercise, source); if (!clip) throw new Error('Exercise animation unavailable')
      mixer = new THREE.AnimationMixer(figure); mixerRef.current = mixer
      const action = mixer.clipAction(clip); actionRef.current = action; mixer.timeScale = playback.current.speed
      if (exercise.once) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; mixer.addEventListener('finished', () => { hold = 2 }) }
      action.play(); action.paused = !playback.current.playing; mixer.update(0); adapter?.update(); setStatus('')
    }).catch(error => { if (!disposed) setStatus(`Could not load avatar: ${error.message}`) })
    const render = () => { raf = requestAnimationFrame(render); const dt = Math.min(clock.getDelta(), .05); if (!document.hidden) {
      if (playback.current.playing) { if (hold > 0) { hold -= dt * playback.current.speed; if (hold <= 0) actionRef.current?.reset().play() } else mixer?.update(dt) }
      adapter?.update(); controls.update(); renderer.render(scene, camera)
    } }; render()
    return () => {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); mixer?.stopAllAction()
      if (figure) { mixer?.uncacheRoot(figure); figure.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) (o as THREE.SkinnedMesh).skeleton.dispose() }) }
      adapter?.dispose()
      chair?.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() } })
      floor.geometry.dispose(); floor.material.dispose(); renderer.dispose(); renderer.domElement.remove(); actionRef.current = undefined; mixerRef.current = undefined
    }
  }, [exercise, avatar])
  return <div className="viewer-canvas" aria-label={`${exercise.en ?? 'Exercise'} 3D animation`}><div ref={mount} style={{ width: '100%', height: '100%' }}/>{status ? <span className="viewer-status" role="status">{status}</span> : null}</div>
}
