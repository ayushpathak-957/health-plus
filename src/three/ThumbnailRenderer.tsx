import { type ReactNode, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { Exercise } from '../types'
import { addLights, clipFor, createChair, loadModel, VIEWS } from './library'

type View = [[number, number, number], [number, number, number]]
type CachedScene = { scene: THREE.Scene; mixer: THREE.AnimationMixer; view: View; lastUsed: number; replay?: number }
type Item = { el: HTMLDivElement; exercise: Exercise; visible: boolean }
const MAX_CACHED_SCENES = 72

export default function ThumbnailRenderer({ exercises, registryKey, enabled, children }: { exercises: Exercise[]; registryKey: string; enabled: boolean; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const sourceRef = useRef<THREE.Group>()
  const itemsRef = useRef<Item[]>([])
  const cacheRef = useRef(new Map<string, CachedScene>())
  const observerRef = useRef<IntersectionObserver>()
  const scrollingRef = useRef(false)
  const [modelReady, setModelReady] = useState(false)

  useEffect(() => {
    if (!enabled) return
    setModelReady(false)
    const host = root.current; if (!host) return
    let frame = 0; let stopped = false; let scrollTimer = 0
    const canvas = document.createElement('canvas'); canvas.className = 'thumbnail-canvas'; host.append(canvas)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25)); renderer.setClearColor(0x000000, 0); renderer.setScissorTest(true)
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 20)
    const resize = () => renderer.setSize(innerWidth, innerHeight, false)
    const pauseForScroll = () => {
      scrollingRef.current = true; canvas.style.opacity = '0'
      clearTimeout(scrollTimer); scrollTimer = window.setTimeout(() => { scrollingRef.current = false; canvas.style.opacity = '1' }, 110)
    }
    resize(); addEventListener('resize', resize, { passive: true }); addEventListener('scroll', pauseForScroll, { passive: true })
    loadModel().then(source => { if (!stopped) { sourceRef.current = source; setModelReady(true) } }).catch(() => { host.dataset.error = 'true' })
    const clock = new THREE.Clock()
    const render = () => {
      frame = requestAnimationFrame(render)
      const delta = Math.min(clock.getDelta(), .05)
      if (stopped || document.hidden || scrollingRef.current) return
      renderer.setScissor(0, 0, innerWidth, innerHeight); renderer.clear()
      for (const item of itemsRef.current) {
        if (!item.visible) continue
        const cached = cacheRef.current.get(item.exercise.id); if (!cached) continue
        const rect = item.el.getBoundingClientRect()
        if (!rect.width || rect.bottom < 0 || rect.top > innerHeight) continue
        cached.lastUsed = performance.now(); cached.mixer.update(delta)
        const y = innerHeight - rect.bottom
        renderer.setViewport(rect.left, y, rect.width, rect.height); renderer.setScissor(rect.left, y, rect.width, rect.height)
        camera.position.set(...cached.view[0]); camera.lookAt(...cached.view[1]); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix()
        renderer.render(cached.scene, camera)
      }
    }
    render()
    return () => {
      stopped = true; cancelAnimationFrame(frame); clearTimeout(scrollTimer); removeEventListener('resize', resize); removeEventListener('scroll', pauseForScroll)
      observerRef.current?.disconnect(); cacheRef.current.forEach(c => { c.mixer.stopAllAction(); if (c.replay) clearTimeout(c.replay) }); cacheRef.current.clear()
      renderer.dispose(); canvas.remove(); sourceRef.current = undefined
    }
  }, [enabled])

  useEffect(() => {
    const host = root.current; const source = sourceRef.current
    if (!enabled || !host || !source || !modelReady) return
    observerRef.current?.disconnect()
    const build = (item: Item) => {
      const cached = cacheRef.current.get(item.exercise.id)
      if (cached) { cached.lastUsed = performance.now(); return }
      const figure = clone(source); figure.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) object.frustumCulled = false })
      const scene = new THREE.Scene(); scene.add(figure); if (item.exercise.seated) scene.add(createChair()); addLights(scene)
      const clip = clipFor(item.exercise, source); if (!clip) { item.el.classList.add('preview-unavailable'); return }
      const mixer = new THREE.AnimationMixer(figure); const action = mixer.clipAction(clip)
      if (item.exercise.once) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true }
      action.play()
      const entry: CachedScene = { scene, mixer, view: VIEWS[item.exercise.view ?? 'full'] ?? VIEWS.full, lastUsed: performance.now() }
      if (item.exercise.once) mixer.addEventListener('finished', () => { entry.replay = window.setTimeout(() => action.reset().play(), 1400) })
      cacheRef.current.set(item.exercise.id, entry)
      const activeIds = new Set(itemsRef.current.filter(current => current.visible).map(current => current.exercise.id))
      while (cacheRef.current.size > MAX_CACHED_SCENES) {
        const candidates = [...cacheRef.current.entries()].filter(([id]) => !activeIds.has(id))
        const victim = (candidates.length ? candidates : [...cacheRef.current.entries()]).sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0]
        if (!victim) break; victim[1].mixer.stopAllAction(); if (victim[1].replay) clearTimeout(victim[1].replay); cacheRef.current.delete(victim[0])
      }
    }
    const next = exercises.flatMap(exercise => {
      const el = host.querySelector<HTMLDivElement>(`[data-preview="${CSS.escape(exercise.id)}"]`)
      return el ? [{ el, exercise, visible: false }] : []
    })
    itemsRef.current = next
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      const item = next.find(candidate => candidate.el === entry.target); if (!item) return
      item.visible = entry.isIntersecting; if (item.visible) build(item)
    }), { rootMargin: '180px 0px' })
    observerRef.current = observer; next.forEach(item => observer.observe(item.el))
    return () => observer.disconnect()
  }, [exercises, registryKey, modelReady, enabled])

  return <div className="exercise-grid" ref={root}>{children}</div>
}
