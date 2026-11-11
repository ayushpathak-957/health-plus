import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { Exercise } from '../types'
import { addLights, clipFor, createChair, loadModel, VIEWS } from './library'

export default function ExerciseViewer({ exercise, playing, speed }: { exercise: Exercise; playing: boolean; speed: number }) {
  const mount = useRef<HTMLDivElement>(null); const actionRef = useRef<THREE.AnimationAction>(); const mixerRef = useRef<THREE.AnimationMixer>()
  useEffect(() => { if (actionRef.current) actionRef.current.paused = !playing }, [playing])
  useEffect(() => { if (mixerRef.current) mixerRef.current.timeScale = speed }, [speed])
  useEffect(() => {
    const node = mount.current; if (!node) return; let disposed = false, raf = 0
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf2ede4); addLights(scene)
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.3, 48), new THREE.MeshStandardMaterial({ color: 0xe6ded1, roughness: 1 })); floor.rotation.x = -Math.PI / 2; scene.add(floor)
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 30); const view = VIEWS[exercise.view ?? 'full'] ?? VIEWS.full; camera.position.set(...view[0])
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; node.append(renderer.domElement)
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(...view[1]); controls.enableDamping = true; controls.minDistance = .8; controls.maxDistance = 8; controls.update()
    const resize = () => { const { width, height } = node.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix() }; const ro = new ResizeObserver(resize); ro.observe(node); resize()
    const clock = new THREE.Clock(); let mixer: THREE.AnimationMixer | undefined
    loadModel().then(source => { if (disposed) return; const figure = clone(source); figure.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) o.frustumCulled = false }); scene.add(figure); if (exercise.seated) scene.add(createChair()); const clip = clipFor(exercise, source)
      if (clip) { mixer = new THREE.AnimationMixer(figure); mixerRef.current = mixer; const action = mixer.clipAction(clip); actionRef.current = action; mixer.timeScale = speed; action.paused = !playing; if (exercise.once) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; mixer.addEventListener('finished', () => setTimeout(() => { if (!disposed) action.reset().play() }, 1400)) }; action.play() }
    })
    const render = () => { raf = requestAnimationFrame(render); if (!document.hidden) { mixer?.update(Math.min(clock.getDelta(), .05)); controls.update(); renderer.render(scene, camera) } else clock.getDelta() }; render()
    return () => { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); mixer?.stopAllAction(); renderer.dispose(); renderer.domElement.remove(); actionRef.current = undefined; mixerRef.current = undefined }
  }, [exercise])
  return <div className="viewer-canvas" ref={mount} aria-label={`${exercise.en ?? 'Exercise'} 3D animation`} />
}
