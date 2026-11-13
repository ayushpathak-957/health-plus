import type { Exercise } from '../types'

const MET_BY_CATEGORY: Record<string, number> = {
  aerobic: 6.0, holds: 3.8,
  'cardio-low-impact': 4.0, dance: 4.5, yoga: 2.8, balance: 2.5,
  'hips-legs': 3.5, 'back-spine': 2.5, 'neck-shoulders-arms': 2.3,
  chair: 2.0, 'floor-lying': 2.5, 'floor-seated': 2.2, funny: 2.8,
}
const EXERCISE_MET: Record<string, number> = {
  'jumping-jacks': 8.0,
  'push-up': 8.0,
  squat: 5.5,
  lunges: 5.0,
  crunch: 3.8,
  'high-knees': 8.0,
  plank: 3.8,
  'wall-sit': 3.5,
}
const REFERENCE_WEIGHT_KG = 70

export function suggestedSetMinutes(exercise: Exercise): number {
  const amount = exercise.amount_en?.toLowerCase() ?? ''
  const seconds = amount.match(/(\d+(?:\.\d+)?)\s*(?:sec|second)/)?.[1]
  if (seconds) return Math.max(0.1, Number(seconds) * (amount.includes('each side') ? 2 : 1) / 60)
  const reps = amount.match(/(\d+(?:\.\d+)?)\s*(?:rep|time|each)/)?.[1]
  if (reps) return Math.max(0.15, Number(reps) * (amount.includes('each side') ? 2 : 1) * (exercise.duration ?? 3) / 60)
  return Math.max(0.15, (exercise.duration ?? 6) / 60 * 3)
}

export function caloriesForSuggestedSet(exercise: Exercise): number {
  const met = EXERCISE_MET[exercise.id] ?? MET_BY_CATEGORY[exercise.category] ?? 2.5
  return met * 3.5 * REFERENCE_WEIGHT_KG * suggestedSetMinutes(exercise) / 200
}

export function calorieLabel(exercise: Exercise) { return `≈ ${Math.max(1, Math.round(caloriesForSuggestedSet(exercise)))} kcal` }
