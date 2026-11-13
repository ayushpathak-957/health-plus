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
export function createAvatar(source, template, exerciseId) {
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
  const floorPose = exerciseId === 'push-up' || exerciseId === 'crunch'
    ? createFloorPose(exerciseId, bones)
    : null
  function update() {
    source.updateMatrixWorld(true)
    for (const { bone, driver, offset } of bindings) {
      driver.getWorldQuaternion(worldQ).multiply(offset)
      bone.parent.getWorldQuaternion(parentQ).invert()
      bone.quaternion.copy(parentQ.multiply(worldQ))
      if (bone === hip) { driver.getWorldPosition(position); bone.position.copy(bone.parent.worldToLocal(position)) }
      bone.updateMatrixWorld(true)
    }
    floorPose?.()
  }
  update()
  return { figure, update, dispose() { figure.traverse(o => { if (o.isSkinnedMesh) o.skeleton.dispose() }) } }
}

// The source clips are authored for the mannequin. Fit floor contacts to the
// clothed rigs' limb lengths without changing retargeting for other exercises.
function createFloorPose(exerciseId, bones) {
  // The casual rig has finger joints, shorter arms, and shoes.
  const casualRig = bones.has('LeftHandIndex1')
  const xAxis = new THREE.Vector3(1, 0, 0)
  const rotation = new THREE.Quaternion()
  const inverseParent = new THREE.Quaternion()
  const worldPosition = bone => bone.getWorldPosition(new THREE.Vector3())
  const worldRotation = bone => bone.getWorldQuaternion(new THREE.Quaternion())
  const setWorldRotation = (bone, quaternion) => {
    bone.parent.getWorldQuaternion(inverseParent).invert()
    bone.quaternion.copy(inverseParent.multiply(quaternion))
    bone.updateMatrixWorld(true)
  }
  const pitch = (bone, degrees) => {
    rotation.setFromAxisAngle(xAxis, THREE.MathUtils.degToRad(degrees))
    setWorldRotation(bone, worldRotation(bone).premultiply(rotation))
  }
  const hip = bones.get('Hips')
  const shiftHip = height => {
    const position = worldPosition(hip)
    position.y += height
    hip.position.copy(hip.parent.worldToLocal(position))
    hip.updateMatrixWorld(true)
  }
  const legs = ['Left', 'Right'].map(side => ({
    knee: bones.get(side + 'Leg'),
    foot: bones.get(side + 'Foot'),
  }))
  if (exerciseId === 'crunch') return () => {
    shiftHip(casualRig ? .026 : .06)
    for (const { knee, foot } of legs) {
      const footRotation = worldRotation(foot)
      pitch(knee, casualRig ? -21 : -4)
      rotation.setFromAxisAngle(xAxis, THREE.MathUtils.degToRad(-18))
      setWorldRotation(foot, footRotation.premultiply(rotation))
    }
  }

  const arms = ['Left', 'Right'].map((side, index) => {
    const upper = bones.get(side + 'Arm')
    const forearm = bones.get(side + 'ForeArm')
    const hand = bones.get(side + 'Hand')
    const shoulder = worldPosition(upper), elbow = worldPosition(forearm), wrist = worldPosition(hand)
    const sign = index === 0 ? 1 : -1
    return {
      upper, forearm, hand, sign,
      upperLength: shoulder.distanceTo(elbow), lowerLength: elbow.distanceTo(wrist),
      contact: new THREE.Vector3(shoulder.x + .045 * sign, casualRig ? .03 : .065, .35),
    }
  })
  const start = new THREE.Vector3(), elbow = new THREE.Vector3(), wrist = new THREE.Vector3()
  const reach = new THREE.Vector3(), bend = new THREE.Vector3(), current = new THREE.Vector3(), desired = new THREE.Vector3()
  const segment = new THREE.Vector3()
  const swing = new THREE.Quaternion()
  const palmAxis = new THREE.Vector3()
  const palmRoll = new THREE.Quaternion()
  // The clothed rigs' calibrated palms face inward or upward by default.
  // Roll them toward the floor while keeping the fingers pointed forward.
  const palmDown = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(THREE.MathUtils.degToRad(casualRig ? -10 : 8), 0, Math.PI)
  )
  return () => {
    if (casualRig) shiftHip(-.018)
    for (const { foot } of legs) pitch(foot, casualRig ? -23 : -10)
    for (const { upper, forearm, hand, sign, upperLength, lowerLength, contact } of arms) {
      upper.getWorldPosition(start)
      forearm.getWorldPosition(elbow)
      hand.getWorldPosition(wrist)
      const upperRotation = worldRotation(upper)
      const lowerRotation = worldRotation(forearm)
      const handRotation = worldRotation(hand)
      current.subVectors(elbow, start).normalize()
      desired.subVectors(wrist, elbow).normalize()
      reach.subVectors(contact, start)
      const distance = Math.min(reach.length(), upperLength + lowerLength - .0001)
      reach.normalize()
      bend.set(.46 * sign, 0, -1)
      bend.addScaledVector(reach, -bend.dot(reach)).normalize()
      const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance)
      const offset = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2))
      elbow.copy(start).addScaledVector(reach, along).addScaledVector(bend, offset)
      wrist.copy(start).addScaledVector(reach, distance)
      swing.setFromUnitVectors(current, segment.subVectors(elbow, start).normalize())
      setWorldRotation(upper, upperRotation.premultiply(swing))
      swing.setFromUnitVectors(desired, segment.subVectors(wrist, elbow).normalize())
      setWorldRotation(forearm, lowerRotation.premultiply(swing))
      handRotation.premultiply(palmDown)
      if (!casualRig) {
        // This avatar has no finger joints and its hand mesh is rolled about
        // 72 degrees relative to the casual rig. Roll around the measured
        // finger direction so the palm plane, not the knuckles, meets the floor.
        palmAxis.set(.5 * sign, 0, .86).normalize()
        // Use the equivalent flat orientation with the palm surface downward;
        // the other solution leaves the palm facing upward.
        palmRoll.setFromAxisAngle(palmAxis, THREE.MathUtils.degToRad(-108 * sign))
        handRotation.premultiply(palmRoll)
      }
      setWorldRotation(hand, handRotation)
    }
  }
}
