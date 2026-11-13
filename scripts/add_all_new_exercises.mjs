import fs from 'node:fs';
import * as THREE from 'three';

const srcPath = 'public/assets/desk-break/exercises.glb';
const origGlb = fs.readFileSync(srcPath);

const jsonLen = origGlb.readUInt32LE(12);
const gltf = JSON.parse(origGlb.subarray(20, 20 + jsonLen).toString('utf8').trim());
const binOffset = 20 + jsonLen + 8;
const origBin = origGlb.subarray(binOffset, binOffset + gltf.buffers[0].byteLength);

// Node indices in gltf
const nodes = {
  hips: 14,
  legL: 2, kneeL: 1, footL: 0,
  legR: 5, kneeR: 4, footR: 3,
  spine: 13,
  armL: 8, elbowL: 7, handL: 6,
  armR: 11, elbowR: 10, handR: 9,
  neck: 12,
  prop: 15
};

const FPS = 30;
const exerciseIds = ['squat', 'wall-sit', 'lunges', 'crunch', 'plank', 'push-up'];
const requestedIds = process.argv.slice(2);
if (requestedIds.some(id => !exerciseIds.includes(id))) {
  throw new Error('Pass exercise IDs from: ' + exerciseIds.join(', '));
}
const selected = id => !requestedIds.length || requestedIds.includes(id);

// Rest transforms for neutral standing
const restStanding = {
  hips_trans: [0, 0.948, 0],
  hips_rot: [0, 0, 0, 1],
  legL_trans: [0.09, -0.05, 0],
  legR_trans: [-0.09, -0.05, 0],
  legL_rot: [-0.034079, 0, 0, 0.999419],
  legR_rot: [-0.034081, 0, 0, 0.999419],
  kneeL_trans: [0, -0.42, 0],
  kneeR_trans: [0, -0.42, 0],
  kneeL_rot: [0.06982, 0, 0, 0.99756],
  kneeR_rot: [0.06982, 0, 0, 0.99756],
  footL_trans: [0, -0.40, 0],
  footR_trans: [0, -0.40, 0],
  footL_rot: [-0.03578, 0, 0, 0.99936],
  footR_rot: [-0.03578, 0, 0, 0.99936],
  spine_trans: [0, 0.11, 0],
  spine_rot: [0, 0, 0, 1],
  neck_trans: [0, 0.41, 0],
  neck_rot: [0, 0, 0, 1],
  armL_trans: [0.205, 0.36, 0],
  armR_trans: [-0.205, 0.36, 0],
  armL_rot: [0, 0, 0.052336, 0.998630],
  armR_rot: [0, 0, -0.052336, 0.998630],
  elbowL_trans: [0, -0.29, 0],
  elbowR_trans: [0, -0.29, 0],
  elbowL_rot: [-0.052336, 0, 0, 0.998630],
  elbowR_rot: [-0.052336, 0, 0, 0.998630],
  handL_trans: [0, -0.25, 0],
  handR_trans: [0, -0.25, 0],
  handL_rot: [0, 0, 0, 1],
  handR_rot: [0, 0, 0, 1],
  prop_trans: [0, 0, 0],
  prop_rot: [0, 0, 0, 1],
  scale: [1, 1, 1],
  prop_scale: [0, 0, 0]
};

// Builder for bufferViews and accessors
const appendedBuffers = [];
let binByteLength = origBin.byteLength;

function appendData(typedArray, type) {
  const pad = (4 - (binByteLength % 4)) % 4;
  if (pad > 0) {
    appendedBuffers.push(Buffer.alloc(pad));
    binByteLength += pad;
  }
  const byteOffset = binByteLength;
  const rawBuf = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
  appendedBuffers.push(rawBuf);
  binByteLength += rawBuf.byteLength;

  const bvIndex = gltf.bufferViews.length;
  gltf.bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: rawBuf.byteLength
  });

  const numComponents = type === 'SCALAR' ? 1 : type === 'VEC3' ? 3 : 4;
  const count = typedArray.length / numComponents;
  const min = new Array(numComponents).fill(Infinity);
  const max = new Array(numComponents).fill(-Infinity);
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < numComponents; c++) {
      const v = typedArray[i * numComponents + c];
      if (v < min[c]) min[c] = v;
      if (v > max[c]) max[c] = v;
    }
  }

  const accIndex = gltf.accessors.length;
  gltf.accessors.push({
    bufferView: bvIndex,
    byteOffset: 0,
    componentType: 5126, // FLOAT
    count,
    type,
    min,
    max
  });
  return accIndex;
}

function eulerToQuat(xDeg, yDeg, zDeg) {
  const q = new THREE.Quaternion();
  const e = new THREE.Euler(xDeg * Math.PI / 180, yDeg * Math.PI / 180, zDeg * Math.PI / 180, 'YXZ');
  q.setFromEuler(e);
  return q;
}

function makeStaticVec3(val) {
  return appendData(new Float32Array([val[0], val[1], val[2], val[0], val[1], val[2]]), 'VEC3');
}

function makeStaticQuat(val) {
  return appendData(new Float32Array([val[0], val[1], val[2], val[3], val[0], val[1], val[2], val[3]]), 'VEC4');
}

function createAnimationFromFrames(animName, duration, trackGenerators) {
  const frameCount = Math.round(duration * FPS) + 1;
  const times = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) times[i] = i / FPS;
  const timeAcc = appendData(times, 'SCALAR');

  const staticTimes = new Float32Array([0, duration]);
  const staticTimeAcc = appendData(staticTimes, 'SCALAR');

  const staticScaleAcc = appendData(new Float32Array([1, 1, 1, 1, 1, 1]), 'VEC3');
  const propScaleAcc = appendData(new Float32Array([0, 0, 0, 0, 0, 0]), 'VEC3');

  const channelDefs = [];
  const boneNames = ['hips', 'legL', 'kneeL', 'footL', 'legR', 'kneeR', 'footR', 'spine', 'armL', 'elbowL', 'handL', 'armR', 'elbowR', 'handR', 'neck', 'prop'];

  for (const bone of boneNames) {
    const nodeIdx = nodes[bone];

    // Scale
    channelDefs.push({
      node: nodeIdx,
      path: 'scale',
      input: staticTimeAcc,
      output: bone === 'prop' ? propScaleAcc : staticScaleAcc
    });

    // Translation
    if (trackGenerators[bone + '_trans']) {
      const arr = new Float32Array(frameCount * 3);
      for (let i = 0; i < frameCount; i++) {
        const v = trackGenerators[bone + '_trans'](times[i] / duration, times[i]);
        arr[i * 3 + 0] = v[0];
        arr[i * 3 + 1] = v[1];
        arr[i * 3 + 2] = v[2];
      }
      channelDefs.push({ node: nodeIdx, path: 'translation', input: timeAcc, output: appendData(arr, 'VEC3') });
    } else {
      const baseTrans = trackGenerators[bone + '_baseTrans'] || restStanding[bone + '_trans'];
      channelDefs.push({ node: nodeIdx, path: 'translation', input: staticTimeAcc, output: makeStaticVec3(baseTrans) });
    }

    // Rotation
    if (trackGenerators[bone + '_rot']) {
      const arr = new Float32Array(frameCount * 4);
      for (let i = 0; i < frameCount; i++) {
        const q = trackGenerators[bone + '_rot'](times[i] / duration, times[i]);
        arr[i * 4 + 0] = q.x;
        arr[i * 4 + 1] = q.y;
        arr[i * 4 + 2] = q.z;
        arr[i * 4 + 3] = q.w;
      }
      channelDefs.push({ node: nodeIdx, path: 'rotation', input: timeAcc, output: appendData(arr, 'VEC4') });
    } else {
      const baseRot = trackGenerators[bone + '_baseRot'] || restStanding[bone + '_rot'];
      channelDefs.push({ node: nodeIdx, path: 'rotation', input: staticTimeAcc, output: makeStaticQuat(baseRot) });
    }
  }

  const channels = [];
  const samplers = [];
  channelDefs.forEach((def, sIdx) => {
    samplers.push({ input: def.input, interpolation: 'LINEAR', output: def.output });
    channels.push({ sampler: sIdx, target: { node: def.node, path: def.path } });
  });

  const existingIdx = gltf.animations.findIndex(a => a.name === animName);
  if (existingIdx !== -1) gltf.animations.splice(existingIdx, 1);

  gltf.animations.push({ name: animName, channels, samplers });
  console.log(`Added/Updated animation '${animName}' (${duration}s, ${frameCount} frames)`);
}

// -------------------------------------------------------------------------------------------------
// 1. SQUAT (Deep Bodyweight Parallel Squat, perfectly above ground circle)
// -------------------------------------------------------------------------------------------------
if (selected('squat')) {
  const qStandLegL = new THREE.Quaternion(...restStanding.legL_rot);
  const qStandLegR = new THREE.Quaternion(...restStanding.legR_rot);
  const qSquatLegL = eulerToQuat(-75, 0, 8);
  const qSquatLegR = eulerToQuat(-75, 0, -8);

  const qStandKnee = new THREE.Quaternion(...restStanding.kneeL_rot);
  const qSquatKnee = eulerToQuat(80, 0, 0);

  const qStandSpine = new THREE.Quaternion(0, 0, 0, 1);
  const qSquatSpine = eulerToQuat(22, 0, 0);

  const qStandArmL = new THREE.Quaternion(...restStanding.armL_rot);
  const qStandArmR = new THREE.Quaternion(...restStanding.armR_rot);
  const qSquatArmL = eulerToQuat(-80, 0, 12);
  const qSquatArmR = eulerToQuat(-80, 0, -12);

  createAnimationFromFrames('squat', 2.2, {
    hips_trans: (p) => {
      const depth = Math.sin(Math.PI * p);
      const ease = Math.pow(depth, 1.4);
      return [0, 0.948 - ease * 0.218, -ease * 0.15];
    },
    spine_rot: (p) => {
      const ease = Math.pow(Math.sin(Math.PI * p), 1.4);
      return new THREE.Quaternion().copy(qStandSpine).slerp(qSquatSpine, ease);
    },
    legL_rot: (p) => {
      const ease = Math.pow(Math.sin(Math.PI * p), 1.4);
      return new THREE.Quaternion().copy(qStandLegL).slerp(qSquatLegL, ease);
    },
    legR_rot: (p) => {
      const ease = Math.pow(Math.sin(Math.PI * p), 1.4);
      return new THREE.Quaternion().copy(qStandLegR).slerp(qSquatLegR, ease);
    },
    kneeL_rot: (p) => {
      const ease = Math.pow(Math.sin(Math.PI * p), 1.4);
      return new THREE.Quaternion().copy(qStandKnee).slerp(qSquatKnee, ease);
    },
    kneeR_rot: (p) => {
      const ease = Math.pow(Math.sin(Math.PI * p), 1.4);
      return new THREE.Quaternion().copy(qStandKnee).slerp(qSquatKnee, ease);
    },
    armL_rot: (p) => {
      const ease = Math.pow(Math.sin(Math.PI * p), 1.4);
      return new THREE.Quaternion().copy(qStandArmL).slerp(qSquatArmL, ease);
    },
    armR_rot: (p) => {
      const ease = Math.pow(Math.sin(Math.PI * p), 1.4);
      return new THREE.Quaternion().copy(qStandArmR).slerp(qSquatArmR, ease);
    }
  });
}

// -------------------------------------------------------------------------------------------------
// 2. WALL SIT (90° Isometric Wall Sit, perfectly grounded, zero floor sinking)
// -------------------------------------------------------------------------------------------------
if (selected('wall-sit')) {
  const qWallLegL = eulerToQuat(-80, 0, 4);
  const qWallLegR = eulerToQuat(-80, 0, -4);
  const qWallKnee = eulerToQuat(80, 0, 0);

  const qWallArmL = eulerToQuat(-40, 10, 10);
  const qWallArmR = eulerToQuat(-40, -10, -10);
  const qWallElbow = eulerToQuat(-45, 0, 0);

  createAnimationFromFrames('wall-sit', 4.0, {
    hips_trans: (p) => {
      const breathe = Math.sin(p * Math.PI * 4) * 0.003;
      // hips at 0.65m leaves the feet cleanly grounded on circle floor
      return [0, 0.65 + breathe, -0.22];
    },
    spine_baseRot: [0, 0, 0, 1], // flat back against wall
    legL_baseRot: [qWallLegL.x, qWallLegL.y, qWallLegL.z, qWallLegL.w],
    legR_baseRot: [qWallLegR.x, qWallLegR.y, qWallLegR.z, qWallLegR.w],
    kneeL_baseRot: [qWallKnee.x, qWallKnee.y, qWallKnee.z, qWallKnee.w],
    kneeR_baseRot: [qWallKnee.x, qWallKnee.y, qWallKnee.z, qWallKnee.w],
    armL_baseRot: [qWallArmL.x, qWallArmL.y, qWallArmL.z, qWallArmL.w],
    armR_baseRot: [qWallArmR.x, qWallArmR.y, qWallArmR.z, qWallArmR.w],
    elbowL_baseRot: [qWallElbow.x, qWallElbow.y, qWallElbow.z, qWallElbow.w],
    elbowR_baseRot: [qWallElbow.x, qWallElbow.y, qWallElbow.z, qWallElbow.w]
  });
}

// -------------------------------------------------------------------------------------------------
// 3. LUNGES (Alternating Forward Lunges, feet stay on top of the circle floor)
// -------------------------------------------------------------------------------------------------
if (selected('lunges')) {
  const qStandLegL = new THREE.Quaternion(...restStanding.legL_rot);
  const qStandLegR = new THREE.Quaternion(...restStanding.legR_rot);
  const qStandKnee = new THREE.Quaternion(...restStanding.kneeL_rot);
  const qStandFoot = new THREE.Quaternion(...restStanding.footL_rot);

  // Front leg steps forward
  const qFrontLeg = eulerToQuat(-60, 0, 4);
  const qFrontKnee = eulerToQuat(75, 0, 0);

  // Back leg extends back with toe tuck
  const qBackLeg = eulerToQuat(20, 0, 4);
  const qBackKnee = eulerToQuat(70, 0, 0);
  const qBackFoot = eulerToQuat(-30, 0, 0); // toes planted, heel elevated

  const qArmSwingForward = eulerToQuat(-45, 0, 10);
  const qArmSwingBack = eulerToQuat(30, 0, 10);

  createAnimationFromFrames('lunges', 2.4, {
    hips_trans: (p) => {
      const subP = (p < 0.5 ? p * 2 : (p - 0.5) * 2);
      const dip = Math.pow(Math.sin(Math.PI * subP), 1.3);
      return [0, 0.948 - dip * 0.155, 0];
    },
    legL_rot: (p) => {
      if (p <= 0.5) {
        const ease = Math.pow(Math.sin(Math.PI * (p * 2)), 1.3);
        return new THREE.Quaternion().copy(qStandLegL).slerp(qFrontLeg, ease);
      } else {
        const ease = Math.pow(Math.sin(Math.PI * ((p - 0.5) * 2)), 1.3);
        return new THREE.Quaternion().copy(qStandLegL).slerp(qBackLeg, ease);
      }
    },
    legR_rot: (p) => {
      if (p <= 0.5) {
        const ease = Math.pow(Math.sin(Math.PI * (p * 2)), 1.3);
        return new THREE.Quaternion().copy(qStandLegR).slerp(qBackLeg, ease);
      } else {
        const ease = Math.pow(Math.sin(Math.PI * ((p - 0.5) * 2)), 1.3);
        return new THREE.Quaternion().copy(qStandLegR).slerp(qFrontLeg, ease);
      }
    },
    kneeL_rot: (p) => {
      if (p <= 0.5) {
        const ease = Math.pow(Math.sin(Math.PI * (p * 2)), 1.3);
        return new THREE.Quaternion().copy(qStandKnee).slerp(qFrontKnee, ease);
      } else {
        const ease = Math.pow(Math.sin(Math.PI * ((p - 0.5) * 2)), 1.3);
        return new THREE.Quaternion().copy(qStandKnee).slerp(qBackKnee, ease);
      }
    },
    kneeR_rot: (p) => {
      if (p <= 0.5) {
        const ease = Math.pow(Math.sin(Math.PI * (p * 2)), 1.3);
        return new THREE.Quaternion().copy(qStandKnee).slerp(qBackKnee, ease);
      } else {
        const ease = Math.pow(Math.sin(Math.PI * ((p - 0.5) * 2)), 1.3);
        return new THREE.Quaternion().copy(qStandKnee).slerp(qFrontKnee, ease);
      }
    },
    footL_rot: (p) => {
      if (p > 0.5) {
        const ease = Math.pow(Math.sin(Math.PI * ((p - 0.5) * 2)), 1.3);
        return new THREE.Quaternion().copy(qStandFoot).slerp(qBackFoot, ease);
      }
      return qStandFoot;
    },
    footR_rot: (p) => {
      if (p <= 0.5) {
        const ease = Math.pow(Math.sin(Math.PI * (p * 2)), 1.3);
        return new THREE.Quaternion().copy(qStandFoot).slerp(qBackFoot, ease);
      }
      return qStandFoot;
    },
    armL_rot: (p) => {
      const qStand = new THREE.Quaternion(...restStanding.armL_rot);
      if (p <= 0.5) {
        const ease = Math.pow(Math.sin(Math.PI * (p * 2)), 1.3);
        return new THREE.Quaternion().copy(qStand).slerp(qArmSwingBack, ease);
      } else {
        const ease = Math.pow(Math.sin(Math.PI * ((p - 0.5) * 2)), 1.3);
        return new THREE.Quaternion().copy(qStand).slerp(qArmSwingForward, ease);
      }
    },
    armR_rot: (p) => {
      const qStand = new THREE.Quaternion(...restStanding.armR_rot);
      if (p <= 0.5) {
        const ease = Math.pow(Math.sin(Math.PI * (p * 2)), 1.3);
        return new THREE.Quaternion().copy(qStand).slerp(qArmSwingForward, ease);
      } else {
        const ease = Math.pow(Math.sin(Math.PI * ((p - 0.5) * 2)), 1.3);
        return new THREE.Quaternion().copy(qStand).slerp(qArmSwingBack, ease);
      }
    }
  });
}

// -------------------------------------------------------------------------------------------------
// Crunch: the pelvis and feet stay in place while the upper back curls.
// -------------------------------------------------------------------------------------------------
const down = new THREE.Vector3(0, -1, 0);
const aim = (direction, rest = new THREE.Quaternion()) => new THREE.Quaternion()
  .setFromUnitVectors(down.clone().applyQuaternion(rest), direction.clone().normalize())
  .multiply(rest);
const rep = phase => (1 - Math.cos(2 * Math.PI * phase)) / 2;

if (selected('crunch')) {
  // In world space the thigh points up toward the knee, the shin slopes down
  // toward the ankle, and the foot stays parallel to the floor.
  const tracks = {
    hips_baseTrans: [0, 0.135, 0],
    hips_baseRot: eulerToQuat(-90, 0, 0).toArray(),
    spine_rot: phase => eulerToQuat(25 * rep(phase), 0, 0),
    neck_rot: phase => eulerToQuat(8 * rep(phase), 0, 0),
  };
  for (const [side, sign] of [['L', 1], ['R', -1]]) {
    tracks['leg' + side + '_baseRot'] = eulerToQuat(-47, 0, 0).toArray();
    tracks['knee' + side + '_baseRot'] = eulerToQuat(113, 0, 0).toArray();
    tracks['foot' + side + '_baseRot'] = eulerToQuat(24, 0, 0).toArray();
    const upper = aim(new THREE.Vector3(0.10 * sign, -0.86, 0.5));
    // Keep a modest inward angle without crossing both wrists at the chest
    // centre. This leaves visible space between the hands on every avatar.
    const lower = aim(new THREE.Vector3(-0.35 * sign, 0.88, 0.12));
    tracks['arm' + side + '_baseRot'] = upper.toArray();
    tracks['elbow' + side + '_baseRot'] = upper.clone().invert().multiply(lower).toArray();
    tracks['hand' + side + '_baseRot'] = eulerToQuat(0, -45 * sign, 0).toArray();
  }
  createAnimationFromFrames('crunch', 2, tracks);
}

if (selected('push-up')) {
  const ankleHeight = 0.148;
  const ankleZ = -0.88;
  const bodyLength = 0.05 + 0.42 + 0.40; // pelvis joint to ankle
  const upperArmLength = 0.29;
  const forearmLength = 0.25;
  const body = phase => {
    const height = 0.396 - 0.187 * rep(phase);
    const pitch = Math.acos((height - ankleHeight) / bodyLength);
    return {
      position: new THREE.Vector3(0, height, ankleZ + bodyLength * Math.sin(pitch)),
      rotation: eulerToQuat(THREE.MathUtils.radToDeg(pitch), 0, 0),
    };
  };

  // Solve both arm segments toward a fixed wrist, with the elbows bending
  // back and slightly outward. This keeps the hands in place as the chest lowers.
  const armPose = (phase, sign) => {
    const { position, rotation } = body(phase);
    const shoulder = new THREE.Vector3(0.205 * sign, 0.47, 0).applyQuaternion(rotation).add(position);
    const wrist = new THREE.Vector3(0.26 * sign, 0.026, 0.445);
    const reach = wrist.clone().sub(shoulder);
    const distance = reach.length();
    reach.normalize();
    const bend = new THREE.Vector3(0.5 * sign, 0, -1);
    bend.addScaledVector(reach, -bend.dot(reach)).normalize();
    const along = (upperArmLength ** 2 - forearmLength ** 2 + distance ** 2) / (2 * distance);
    const offset = Math.sqrt(Math.max(0, upperArmLength ** 2 - along ** 2));
    const elbow = shoulder.clone().addScaledVector(reach, along).addScaledVector(bend, offset);
    const upper = aim(elbow.clone().sub(shoulder));
    const lower = aim(wrist.sub(elbow));
    return { upper, lower, torso: rotation };
  };

  const tracks = {
    hips_trans: phase => body(phase).position.toArray(),
    hips_rot: phase => body(phase).rotation,
  };
  for (const [side, sign] of [['L', 1], ['R', -1]]) {
    tracks['leg' + side + '_baseRot'] = [0, 0, 0, 1];
    tracks['knee' + side + '_baseRot'] = [0, 0, 0, 1];
    tracks['foot' + side + '_rot'] = phase => body(phase).rotation.invert().multiply(eulerToQuat(30, 0, 0));
    tracks['arm' + side + '_rot'] = phase => {
      const { upper, torso } = armPose(phase, sign);
      return torso.invert().multiply(upper);
    };
    tracks['elbow' + side + '_rot'] = phase => {
      const { upper, lower } = armPose(phase, sign);
      return upper.invert().multiply(lower);
    };
    tracks['hand' + side + '_rot'] = phase => armPose(phase, sign).lower.invert().multiply(eulerToQuat(-90, 0, 0));
  }
  createAnimationFromFrames('push-up', 2, tracks);
}

// -------------------------------------------------------------------------------------------------
// 5. PLANK (Forearm / Elbow Plank matching Image 4)
// -------------------------------------------------------------------------------------------------
if (selected('plank')) {
  const qPlankHips = eulerToQuat(86, 0, 0); // horizontal face down
  const qArmDownL = eulerToQuat(-85, 0, 10); // upper arms vertical under shoulders
  const qArmDownR = eulerToQuat(-85, 0, -10);
  const qElbowForearm = eulerToQuat(-90, 0, 0); // forearms forward on floor
  const qNeckPlank = eulerToQuat(-15, 0, 0);

  createAnimationFromFrames('plank', 4.0, {
    hips_trans: (p) => {
      const breathe = Math.sin(p * Math.PI * 4) * 0.003;
      return [0, 0.22 + breathe, 0];
    },
    hips_baseRot: [qPlankHips.x, qPlankHips.y, qPlankHips.z, qPlankHips.w],
    legL_baseRot: [0, 0, 0, 1],
    legR_baseRot: [0, 0, 0, 1],
    kneeL_baseRot: [0, 0, 0, 1],
    kneeR_baseRot: [0, 0, 0, 1],
    footL_baseRot: [0, 0, 0, 1],
    footR_baseRot: [0, 0, 0, 1],
    armL_baseRot: [qArmDownL.x, qArmDownL.y, qArmDownL.z, qArmDownL.w],
    armR_baseRot: [qArmDownR.x, qArmDownR.y, qArmDownR.z, qArmDownR.w],
    elbowL_baseRot: [qElbowForearm.x, qElbowForearm.y, qElbowForearm.z, qElbowForearm.w],
    elbowR_baseRot: [qElbowForearm.x, qElbowForearm.y, qElbowForearm.z, qElbowForearm.w],
    handL_baseRot: [0, 0, 0, 1],
    handR_baseRot: [0, 0, 0, 1],
    neck_baseRot: [qNeckPlank.x, qNeckPlank.y, qNeckPlank.z, qNeckPlank.w]
  });
}

// -------------------------------------------------------------------------------------------------
// Pack GLB
// -------------------------------------------------------------------------------------------------
gltf.buffers[0].byteLength = binByteLength;

const jsonString = JSON.stringify(gltf);
const jsonBuffer = Buffer.from(jsonString, 'utf8');
const jsonPadding = (4 - (jsonBuffer.byteLength % 4)) % 4;
const totalJsonLength = jsonBuffer.byteLength + jsonPadding;

const fullBinBuffer = Buffer.concat([origBin, ...appendedBuffers]);
const binPadding = (4 - (fullBinBuffer.byteLength % 4)) % 4;
const totalBinLength = fullBinBuffer.byteLength + binPadding;

const totalGlbLength = 12 + 8 + totalJsonLength + 8 + totalBinLength;
const outGlb = Buffer.alloc(totalGlbLength);

outGlb.writeUInt32LE(0x46546C67, 0);
outGlb.writeUInt32LE(2, 4);
outGlb.writeUInt32LE(totalGlbLength, 8);

let offset = 12;
outGlb.writeUInt32LE(totalJsonLength, offset);
outGlb.writeUInt32LE(0x4E4F534A, offset + 4);
offset += 8;
jsonBuffer.copy(outGlb, offset);
offset += jsonBuffer.byteLength;
for (let p = 0; p < jsonPadding; p++) outGlb.writeUInt8(0x20, offset++);

outGlb.writeUInt32LE(totalBinLength, offset);
outGlb.writeUInt32LE(0x004E4942, offset + 4);
offset += 8;
fullBinBuffer.copy(outGlb, offset);
offset += fullBinBuffer.byteLength;
for (let p = 0; p < binPadding; p++) outGlb.writeUInt8(0x00, offset++);

fs.writeFileSync('public/assets/desk-break/exercises.glb', outGlb);
console.log('Successfully updated exercises.glb with corrected animations!');
