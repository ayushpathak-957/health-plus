import fs from 'node:fs';
import * as THREE from 'three';

const srcPath = 'public/assets/desk-break/exercises.glb';
const origGlb = fs.readFileSync(srcPath);

const jsonLen = origGlb.readUInt32LE(12);
const gltf = JSON.parse(origGlb.subarray(20, 20 + jsonLen).toString('utf8').trim());
const binOffset = 20 + jsonLen + 8;
const origBin = origGlb.subarray(binOffset, binOffset + gltf.buffers[0].byteLength);

// Check if jumping-jacks already exists in gltf.animations
const existingAnimIdx = gltf.animations.findIndex(a => a.name === 'jumping-jacks');
if (existingAnimIdx !== -1) {
  console.log('jumping-jacks already exists, removing old entry from gltf.animations');
  gltf.animations.splice(existingAnimIdx, 1);
}

// Setup animation parameters
const FPS = 30;
const DURATION = 1.0;
const frameCount = Math.round(DURATION * FPS) + 1; // 31 frames
const times = new Float32Array(frameCount);
for (let i = 0; i < frameCount; i++) {
  times[i] = i / FPS;
}

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

// Quaternions at key states
const qRestLegL = new THREE.Quaternion(-0.034079, 0, 0, 0.999419).normalize();
const qWideLegL = new THREE.Quaternion(-0.032205, -0.006291, 0.205, 0.978).normalize(); // ~24 deg abduction

const qRestLegR = new THREE.Quaternion(-0.034081, 0, 0, 0.999419).normalize();
const qWideLegR = new THREE.Quaternion(-0.032204, 0.006291, -0.205, 0.978).normalize();

const qRestKnee = new THREE.Quaternion(0.06982, 0, 0, 0.99756).normalize();
const qBendKnee = new THREE.Quaternion(0.14, 0, 0, 0.9902).normalize(); // soft knee on landing

// Arms:
// Rest: arms by sides pointing down (angle ~ 6 deg)
const qRestArmL = new THREE.Quaternion(0, 0, 0.052336, 0.998630).normalize();
const qRestArmR = new THREE.Quaternion(0, 0, -0.052336, 0.998630).normalize();

// Peak: arms raised ~160 deg overhead, hands meet
// sin(160/2 * pi/180) = sin(80 deg) = 0.9848, cos(80 deg) = 0.1736
const qPeakArmL = new THREE.Quaternion(0, 0, 0.9848, 0.1736).normalize();
const qPeakArmR = new THREE.Quaternion(0, 0, -0.9848, 0.1736).normalize();

const qRestElbow = new THREE.Quaternion(-0.052336, 0, 0, 0.998630).normalize();
const qPeakElbow = new THREE.Quaternion(-0.09, 0, 0, 0.996).normalize();

// Generate keyframes
const hipsTranslation = new Float32Array(frameCount * 3);
const hipsRotation = new Float32Array(frameCount * 4);
const legLRotation = new Float32Array(frameCount * 4);
const legRRotation = new Float32Array(frameCount * 4);
const kneeLRotation = new Float32Array(frameCount * 4);
const kneeRRotation = new Float32Array(frameCount * 4);
const armLRotation = new Float32Array(frameCount * 4);
const armRRotation = new Float32Array(frameCount * 4);
const elbowLRotation = new Float32Array(frameCount * 4);
const elbowRRotation = new Float32Array(frameCount * 4);

const qTmp = new THREE.Quaternion();

for (let i = 0; i < frameCount; i++) {
  const t = times[i];
  const progress = t / DURATION; // 0 to 1

  // Leg abduction & Arm raise progress: 0 at t=0, 1 at t=0.5, 0 at t=1.0
  // Smooth sine wave
  const s = Math.sin(Math.PI * progress);
  // Ease curve: slightly crisper at the top and bottom
  const spreadFactor = Math.pow(s, 1.15);

  // Hips vertical position:
  // Jumps occur twice in a jack:
  // Jump 1: leaves ground around t=0.1, peak height around t=0.25, lands wide at t=0.5
  // Jump 2: leaves ground around t=0.6, peak height around t=0.75, lands narrow at t=1.0
  let jumpOffset = 0;
  if (progress <= 0.5) {
    // Jump 1: half cycle
    jumpOffset = Math.sin(progress * 2 * Math.PI) * 0.075;
  } else {
    // Jump 2: second half cycle
    jumpOffset = Math.sin((progress - 0.5) * 2 * Math.PI) * 0.075;
  }
  // Soft knee cushion when feet touch at t=0, t=0.5, t=1.0
  const cushion = (1 - Math.abs(jumpOffset / 0.075)) * -0.015;
  const hipsY = 0.948 + jumpOffset + cushion;

  hipsTranslation[i * 3 + 0] = 0;
  hipsTranslation[i * 3 + 1] = hipsY;
  hipsTranslation[i * 3 + 2] = 0;

  hipsRotation[i * 4 + 0] = 0;
  hipsRotation[i * 4 + 1] = 0;
  hipsRotation[i * 4 + 2] = 0;
  hipsRotation[i * 4 + 3] = 1;

  // Legs:
  qTmp.copy(qRestLegL).slerp(qWideLegL, spreadFactor);
  legLRotation[i * 4 + 0] = qTmp.x;
  legLRotation[i * 4 + 1] = qTmp.y;
  legLRotation[i * 4 + 2] = qTmp.z;
  legLRotation[i * 4 + 3] = qTmp.w;

  qTmp.copy(qRestLegR).slerp(qWideLegR, spreadFactor);
  legRRotation[i * 4 + 0] = qTmp.x;
  legRRotation[i * 4 + 1] = qTmp.y;
  legRRotation[i * 4 + 2] = qTmp.z;
  legRRotation[i * 4 + 3] = qTmp.w;

  // Knees cushion:
  const kneeBendFactor = Math.max(0, 1 - Math.abs(jumpOffset / 0.075));
  qTmp.copy(qRestKnee).slerp(qBendKnee, kneeBendFactor);
  kneeLRotation[i * 4 + 0] = qTmp.x;
  kneeLRotation[i * 4 + 1] = qTmp.y;
  kneeLRotation[i * 4 + 2] = qTmp.z;
  kneeLRotation[i * 4 + 3] = qTmp.w;

  kneeRRotation[i * 4 + 0] = qTmp.x;
  kneeRRotation[i * 4 + 1] = qTmp.y;
  kneeRRotation[i * 4 + 2] = qTmp.z;
  kneeRRotation[i * 4 + 3] = qTmp.w;

  // Arms:
  qTmp.copy(qRestArmL).slerp(qPeakArmL, spreadFactor);
  armLRotation[i * 4 + 0] = qTmp.x;
  armLRotation[i * 4 + 1] = qTmp.y;
  armLRotation[i * 4 + 2] = qTmp.z;
  armLRotation[i * 4 + 3] = qTmp.w;

  qTmp.copy(qRestArmR).slerp(qPeakArmR, spreadFactor);
  armRRotation[i * 4 + 0] = qTmp.x;
  armRRotation[i * 4 + 1] = qTmp.y;
  armRRotation[i * 4 + 2] = qTmp.z;
  armRRotation[i * 4 + 3] = qTmp.w;

  // Elbows:
  qTmp.copy(qRestElbow).slerp(qPeakElbow, spreadFactor);
  elbowLRotation[i * 4 + 0] = qTmp.x;
  elbowLRotation[i * 4 + 1] = qTmp.y;
  elbowLRotation[i * 4 + 2] = qTmp.z;
  elbowLRotation[i * 4 + 3] = qTmp.w;

  elbowRRotation[i * 4 + 0] = qTmp.x;
  elbowRRotation[i * 4 + 1] = qTmp.y;
  elbowRRotation[i * 4 + 2] = qTmp.z;
  elbowRRotation[i * 4 + 3] = qTmp.w;
}

// Static 2-keyframe tracks for bones that do not rotate or move
const staticTimes = new Float32Array([0, DURATION]);
const staticScale = new Float32Array([1, 1, 1, 1, 1, 1]);
const propScale = new Float32Array([0, 0, 0, 0, 0, 0]);

function makeStaticVec3(val) {
  return new Float32Array([val[0], val[1], val[2], val[0], val[1], val[2]]);
}
function makeStaticQuat(val) {
  return new Float32Array([val[0], val[1], val[2], val[3], val[0], val[1], val[2], val[3]]);
}

// Rest transforms for static channels
const rest = {
  legL_trans: [0.09, -0.05, 0],
  legR_trans: [-0.09, -0.05, 0],
  kneeL_trans: [0, -0.42, 0],
  kneeR_trans: [0, -0.42, 0],
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
  elbowL_trans: [0, -0.29, 0],
  elbowR_trans: [0, -0.29, 0],
  handL_trans: [0, -0.25, 0],
  handR_trans: [0, -0.25, 0],
  handL_rot: [0, 0, 0, 1],
  handR_rot: [0, 0, 0, 1],
  prop_trans: [0, 0, 0],
  prop_rot: [0, 0, 0, 1],
};

// Builder for bufferViews and accessors
const appendedBuffers = [];
let binByteLength = origBin.byteLength;

function appendData(typedArray, type, isTime = false) {
  // 4-byte alignment
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

  // Calculate min/max
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

const timeAcc31 = appendData(times, 'SCALAR', true);
const timeAcc2 = appendData(staticTimes, 'SCALAR', true);

// Create accessors for active tracks
const hipsTransAcc = appendData(hipsTranslation, 'VEC3');
const hipsRotAcc = appendData(hipsRotation, 'VEC4');
const legLRotAcc = appendData(legLRotation, 'VEC4');
const legRRotAcc = appendData(legRRotation, 'VEC4');
const kneeLRotAcc = appendData(kneeLRotation, 'VEC4');
const kneeRRotAcc = appendData(kneeRRotation, 'VEC4');
const armLRotAcc = appendData(armLRotation, 'VEC4');
const armRRotAcc = appendData(armRRotation, 'VEC4');
const elbowLRotAcc = appendData(elbowLRotation, 'VEC4');
const elbowRRotAcc = appendData(elbowRRotation, 'VEC4');

// Static accessors
const staticScaleAcc = appendData(staticScale, 'VEC3');
const propScaleAcc = appendData(propScale, 'VEC3');

// Track map
const channelDefs = [
  { node: nodes.hips, path: 'translation', input: timeAcc31, output: hipsTransAcc },
  { node: nodes.hips, path: 'rotation', input: timeAcc31, output: hipsRotAcc },
  { node: nodes.hips, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.legL, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.legL_trans), 'VEC3') },
  { node: nodes.legL, path: 'rotation', input: timeAcc31, output: legLRotAcc },
  { node: nodes.legL, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.kneeL, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.kneeL_trans), 'VEC3') },
  { node: nodes.kneeL, path: 'rotation', input: timeAcc31, output: kneeLRotAcc },
  { node: nodes.kneeL, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.footL, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.footL_trans), 'VEC3') },
  { node: nodes.footL, path: 'rotation', input: timeAcc2, output: appendData(makeStaticQuat(rest.footL_rot), 'VEC4') },
  { node: nodes.footL, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.legR, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.legR_trans), 'VEC3') },
  { node: nodes.legR, path: 'rotation', input: timeAcc31, output: legRRotAcc },
  { node: nodes.legR, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.kneeR, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.kneeR_trans), 'VEC3') },
  { node: nodes.kneeR, path: 'rotation', input: timeAcc31, output: kneeRRotAcc },
  { node: nodes.kneeR, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.footR, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.footR_trans), 'VEC3') },
  { node: nodes.footR, path: 'rotation', input: timeAcc2, output: appendData(makeStaticQuat(rest.footR_rot), 'VEC4') },
  { node: nodes.footR, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.spine, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.spine_trans), 'VEC3') },
  { node: nodes.spine, path: 'rotation', input: timeAcc2, output: appendData(makeStaticQuat(rest.spine_rot), 'VEC4') },
  { node: nodes.spine, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.armL, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.armL_trans), 'VEC3') },
  { node: nodes.armL, path: 'rotation', input: timeAcc31, output: armLRotAcc },
  { node: nodes.armL, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.elbowL, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.elbowL_trans), 'VEC3') },
  { node: nodes.elbowL, path: 'rotation', input: timeAcc31, output: elbowLRotAcc },
  { node: nodes.elbowL, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.handL, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.handL_trans), 'VEC3') },
  { node: nodes.handL, path: 'rotation', input: timeAcc2, output: appendData(makeStaticQuat(rest.handL_rot), 'VEC4') },
  { node: nodes.handL, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.armR, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.armR_trans), 'VEC3') },
  { node: nodes.armR, path: 'rotation', input: timeAcc31, output: armRRotAcc },
  { node: nodes.armR, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.elbowR, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.elbowR_trans), 'VEC3') },
  { node: nodes.elbowR, path: 'rotation', input: timeAcc31, output: elbowRRotAcc },
  { node: nodes.elbowR, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.handR, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.handR_trans), 'VEC3') },
  { node: nodes.handR, path: 'rotation', input: timeAcc2, output: appendData(makeStaticQuat(rest.handR_rot), 'VEC4') },
  { node: nodes.handR, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.neck, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.neck_trans), 'VEC3') },
  { node: nodes.neck, path: 'rotation', input: timeAcc2, output: appendData(makeStaticQuat(rest.neck_rot), 'VEC4') },
  { node: nodes.neck, path: 'scale', input: timeAcc2, output: staticScaleAcc },

  { node: nodes.prop, path: 'translation', input: timeAcc2, output: appendData(makeStaticVec3(rest.prop_trans), 'VEC3') },
  { node: nodes.prop, path: 'rotation', input: timeAcc2, output: appendData(makeStaticQuat(rest.prop_rot), 'VEC4') },
  { node: nodes.prop, path: 'scale', input: timeAcc2, output: propScaleAcc },
];

const channels = [];
const samplers = [];

channelDefs.forEach((def, samplerIdx) => {
  samplers.push({
    input: def.input,
    interpolation: 'LINEAR',
    output: def.output
  });
  channels.push({
    sampler: samplerIdx,
    target: {
      node: def.node,
      path: def.path
    }
  });
});

gltf.animations.push({
  name: 'jumping-jacks',
  channels,
  samplers
});

// Update gltf buffer byte length
gltf.buffers[0].byteLength = binByteLength;

// Pack GLB
const jsonString = JSON.stringify(gltf);
const jsonBuffer = Buffer.from(jsonString, 'utf8');
const jsonPadding = (4 - (jsonBuffer.byteLength % 4)) % 4;
const totalJsonLength = jsonBuffer.byteLength + jsonPadding;

const fullBinBuffer = Buffer.concat([origBin, ...appendedBuffers]);
const binPadding = (4 - (fullBinBuffer.byteLength % 4)) % 4;
const totalBinLength = fullBinBuffer.byteLength + binPadding;

const totalGlbLength = 12 + 8 + totalJsonLength + 8 + totalBinLength;
const outGlb = Buffer.alloc(totalGlbLength);

// Header
outGlb.writeUInt32LE(0x46546C67, 0); // magic 'glTF'
outGlb.writeUInt32LE(2, 4);          // version 2
outGlb.writeUInt32LE(totalGlbLength, 8);

// JSON Chunk Header
let offset = 12;
outGlb.writeUInt32LE(totalJsonLength, offset);
outGlb.writeUInt32LE(0x4E4F534A, offset + 4); // 'JSON'
offset += 8;
jsonBuffer.copy(outGlb, offset);
offset += jsonBuffer.byteLength;
for (let p = 0; p < jsonPadding; p++) {
  outGlb.writeUInt8(0x20, offset++); // space padding
}

// BIN Chunk Header
outGlb.writeUInt32LE(totalBinLength, offset);
outGlb.writeUInt32LE(0x004E4942, offset + 4); // 'BIN\0'
offset += 8;
fullBinBuffer.copy(outGlb, offset);
offset += fullBinBuffer.byteLength;
for (let p = 0; p < binPadding; p++) {
  outGlb.writeUInt8(0x00, offset++); // zero padding
}

fs.writeFileSync('public/assets/desk-break/exercises.glb', outGlb);
console.log('Successfully generated public/assets/desk-break/exercises.glb with jumping-jacks animation!');

