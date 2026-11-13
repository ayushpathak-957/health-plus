import * as THREE from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const cache = new Map()
export function loadAvatar(id, base = '/assets/avatars/') {
  const url = `${base}${id}.glb`
  if (!cache.has(url)) cache.set(url, new GLTFLoader().loadAsync(url).then(g => g.scene).catch(error => { cache.delete(url); throw error }))
  return cache.get(url)
}

// Retarget world-space rotation deltas. Rest axes are calibrated per rig;
// intermediate spine/clavicle joints retain their own rest transforms.
export function createAvatar(source, template) {
  const figure = clone(template)
  const bones = new Map()
  figure.traverse(o => { if (o.isSkinnedMesh) { o.frustumCulled = false; o.skeleton.pose() } if (o.isBone) bones.set(o.name, o) })
  figure.updateMatrixWorld(true)
  const hip = bones.get('Hips')
  if (!hip) throw new Error('Avatar is missing its Hips joint')
  const p = new THREE.Vector3(), end = new THREE.Vector3(), q = new THREE.Quaternion()
  const align = (name, child, direction) => {
    const bone = bones.get(name), tip = bones.get(child)
    if (!bone || !tip) throw new Error(`Missing avatar joint ${name}/${child}`)
    bone.getWorldPosition(p); tip.getWorldPosition(end)
    const rotation = new THREE.Quaternion().setFromUnitVectors(end.sub(p).normalize(), direction)
    bone.getWorldQuaternion(q); q.premultiply(rotation)
    const parentQ = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()
    bone.quaternion.copy(parentQ.multiply(q)); figure.updateMatrixWorld(true)
  }
  for (const side of ['Left', 'Right']) {
    align(`${side}UpLeg`, `${side}Leg`, new THREE.Vector3(0,-1,0))
    align(`${side}Leg`, `${side}Foot`, new THREE.Vector3(0,-1,0))
    align(`${side}Arm`, `${side}ForeArm`, new THREE.Vector3(0,-1,0))
    align(`${side}ForeArm`, `${side}Hand`, new THREE.Vector3(0,-1,0))
  }
  hip.getWorldPosition(p)
  figure.scale.multiplyScalar(.95 / p.y)
  figure.updateMatrixWorld(true)
  const mapping = { Hips:'hips', Spine02:'spine', neck:'neck', LeftUpLeg:'legL', LeftLeg:'kneeL', LeftFoot:'footL', RightUpLeg:'legR', RightLeg:'kneeR', RightFoot:'footR', LeftArm:'armL', LeftForeArm:'elbowL', LeftHand:'handL', RightArm:'armR', RightForeArm:'elbowR', RightHand:'handR' }
  const bindings = []
  // Traversal order ensures parents are updated before their children.
  figure.traverse(bone => {
    const name = mapping[bone.name]
    if (!bone.isBone || !name) return
    const driver = source.getObjectByName(name)
    if (!driver) throw new Error(`Exercise rig missing ${name}`)
    bindings.push({ bone, driver, offset: bone.getWorldQuaternion(new THREE.Quaternion()) })
  })
  const worldQ = new THREE.Quaternion(), parentQ = new THREE.Quaternion(), position = new THREE.Vector3()
  function update() {
    source.updateMatrixWorld(true)
    for (const { bone, driver, offset } of bindings) {
      driver.getWorldQuaternion(worldQ).multiply(offset)
      bone.parent.getWorldQuaternion(parentQ).invert()
      bone.quaternion.copy(parentQ.multiply(worldQ))
      if (bone === hip) { driver.getWorldPosition(position); bone.position.copy(bone.parent.worldToLocal(position)) }
      bone.updateMatrixWorld(true)
    }
  }
  update()
  return { figure, update, dispose() { figure.traverse(o => { if (o.isSkinnedMesh) o.skeleton.dispose() }) } }
}
