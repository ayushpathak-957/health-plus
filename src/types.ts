export type Exercise = { id: string; en?: string; amount_en?: string; steps_en?: string[]; category: string; duration?: number; keyTimes?: number[]; once?: boolean; seated?: boolean; view?: string; tempo?: number }
export type Category = { id: string; en: string }
export type Library = { categories: Category[]; exercises: Exercise[] }
