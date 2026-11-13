import type { Group, Object3D } from 'three'
export function loadAvatar(id: string, base?: string): Promise<Group>
export function createAvatar(source: Object3D, template: Group, exerciseId?: string): { figure: Group; update(): void; dispose(): void }
