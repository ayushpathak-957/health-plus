import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronRight, CircleAlert, Gauge, LoaderCircle, Pause, Play, Rotate3D } from 'lucide-react'
import type { Exercise, Library } from './types'
import { calorieLabel } from './data/calorieEstimates'
import { loadLibrary } from './three/library'
import { AvatarSelect, avatars, previewBase, type AvatarId } from './avatars'
import ExerciseViewer from './three/ExerciseViewer'

const SPEEDS = [1, 1.5, 2, .5]
const readableCategory = (library: Library, id: string) => library.categories.find(c => c.id === id)?.en ?? 'Movement'
function amount(ex: Exercise) { return ex.amount_en || 'See instructions' }

export default function App() {
  const [library, setLibrary] = useState<Library>(); const [error, setError] = useState(''); const [category, setCategory] = useState('all')
  const [gifIds, setGifIds] = useState<Set<string>>(() => new Set())
  const [avatar, setAvatar] = useState<AvatarId>(() => { try { const saved = localStorage.getItem('health-plus-avatar'); return avatars.find(a => a.id === saved)?.id ?? 'man-athletic' } catch { return 'man-athletic' } })
  const chooseAvatar = (id: AvatarId) => { setAvatar(id); try { localStorage.setItem('health-plus-avatar', id) } catch { /* Private browser storage may be unavailable. */ } }
  const [selected, setSelected] = useState<string | null>(() => new URLSearchParams(location.search).get('exercise'))
  useEffect(() => { loadLibrary().then(setLibrary).catch(e => setError(e.message)) }, [])
  useEffect(() => { let active = true; setGifIds(new Set()); fetch(`${previewBase(avatar)}/manifest.json`).then(response => response.ok ? response.json() : []).then((ids: unknown) => { if (active && Array.isArray(ids)) setGifIds(new Set(ids.filter((id): id is string => typeof id === 'string'))) }).catch(() => undefined); return () => { active = false } }, [avatar])
  const exercise = useMemo(() => library?.exercises.find(e => e.id === selected), [library, selected])
  const open = (id: string) => { history.pushState({}, '', `?exercise=${encodeURIComponent(id)}`); setSelected(id); window.scrollTo(0,0) }
  const close = () => { history.pushState({}, '', location.pathname); setSelected(null); window.scrollTo(0,0) }
  useEffect(() => { const pop = () => setSelected(new URLSearchParams(location.search).get('exercise')); addEventListener('popstate', pop); return () => removeEventListener('popstate', pop) }, [])
  if (error) return <main className="status"><CircleAlert size={34}/><h1>We couldn’t load the exercise library</h1><p>{error}</p></main>
  if (!library) return <main className="status"><LoaderCircle className="spin" size={34}/><h1>Loading Exercise Library</h1><p>Preparing the movement collection…</p></main>
  if (exercise) return <DetailPage exercise={exercise} library={library} onBack={close} avatar={avatar} onAvatar={chooseAvatar}/>
  const FEATURED_ORDER = ['push-up', 'squat', 'lunges', 'crunch', 'high-knees', 'jumping-jacks', 'plank', 'wall-sit']
  const priority = (id: string) => { const idx = FEATURED_ORDER.indexOf(id); return idx === -1 ? 9999 : idx }
  const shown = (category === 'all' ? library.exercises : library.exercises.filter(e => e.category === category)).slice().sort((a, b) => priority(a.id) - priority(b.id))
  return <main>
    <header className="site-header"><div><p className="eyebrow">Desk Break collection</p><h1>Exercise Library</h1><p className="subtitle">Explore {library.exercises.length} guided movements</p></div><div className="count-pill"><Rotate3D size={18}/><span>{library.exercises.length} exercises</span></div></header>
    <div className="library-layout"><aside className="sidebar"><p className="filter-title">Exercise categories</p><nav><button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>All exercises <span>{library.exercises.length}</span></button>{library.categories.map(c => <button key={c.id} className={category === c.id ? 'active' : ''} onClick={() => setCategory(c.id)}>{c.en}<span>{library.exercises.filter(e => e.category === c.id).length}</span></button>)}</nav></aside>
      <section className="collection"><div className="collection-head"><div><p className="eyebrow">Movement library</p><h2>{category === 'all' ? 'All exercises' : readableCategory(library, category)}</h2></div><AvatarSelect value={avatar} onChange={chooseAvatar}/></div>
        <div className="exercise-grid">{shown.map(ex => <article className="exercise-card" key={ex.id} onClick={() => open(ex.id)} tabIndex={0} role="button" onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(ex.id) } }}><div className="card-preview">{gifIds.has(ex.id) ? <img key={avatar} loading="lazy" decoding="async" src={`${previewBase(avatar)}/${ex.id}.gif`} alt="" /> : <span className="preview-status">Preview loading</span>}</div><div className="card-copy"><h3>{ex.en || 'Unnamed exercise'}</h3><p>{amount(ex)} · {readableCategory(library, ex.category)}</p></div><ChevronRight className="card-arrow" size={18}/></article>)}</div>
      </section></div>
  </main>
}

function DetailPage({ exercise, library, onBack, avatar, onAvatar }: { exercise: Exercise; library: Library; onBack: () => void; avatar: AvatarId; onAvatar: (id: AvatarId) => void }) {
  const [playing, setPlaying] = useState(true); const [speedIndex, setSpeedIndex] = useState(0); const speed = SPEEDS[speedIndex]
  return <main className="detail-page"><div className="detail-toolbar"><button className="back-button" onClick={onBack}><ArrowLeft size={18}/> Back to library</button><AvatarSelect value={avatar} onChange={onAvatar}/></div>
    <div className="detail-heading"><div><p className="eyebrow">{readableCategory(library, exercise.category)}</p><h1>{exercise.en || 'Exercise'}</h1></div><p className="suggested">Suggested amount <strong>{amount(exercise)}</strong></p></div>
    <div className="viewer-layout"><section className="viewer-shell"><ExerciseViewer exercise={exercise} playing={playing} speed={speed} avatar={avatar}/><div className="playback"><button className="primary-control" onClick={() => setPlaying(p => !p)}>{playing ? <Pause size={17}/> : <Play size={17}/>} {playing ? 'Pause' : 'Play'}</button><button className="speed-control" onClick={() => setSpeedIndex(i => (i + 1) % SPEEDS.length)}><Gauge size={17}/>{speed}x</button><span>Drag to rotate · Scroll to zoom · Right-drag to pan</span></div></section>
      <aside className="instructions"><p className="eyebrow">Guidance</p><h2>How to perform</h2><ol>{(exercise.steps_en?.length ? exercise.steps_en : ['Follow the animation and move comfortably within your range of motion.']).map((step, i) => step.startsWith('!') ? <li className="caution" key={i}><CircleAlert size={17}/><span>{step.slice(1)}</span></li> : <li key={i}>{step}</li>)}</ol></aside></div>
    <section className="stats"><article><p>Estimated calories per suggested set</p><strong>{calorieLabel(exercise)}</strong><small>Approximate estimate. Actual calorie expenditure varies with body weight, fitness level and exercise intensity.</small></article><article><p>Suggested amount</p><strong>{amount(exercise)}</strong><small>Recommended amount provided by the Desk Break exercise library.</small></article></section>
    <p className="attribution">3D movement assets and exercise guidance: Desk Break, used under the MIT License.</p>
  </main>
}
