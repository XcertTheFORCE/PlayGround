import * as THREE from './vendor/three/three.module.min.js';

const canvas = document.getElementById('game-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#101d2d');
scene.fog = new THREE.FogExp2('#122126', 0.012);
const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 190);
camera.position.set(0, 7.4, 17.5);
camera.lookAt(0, 1.2, -13);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;

scene.add(new THREE.HemisphereLight('#a9d8d2', '#152020', 2.15));
const moon = new THREE.DirectionalLight('#b9e8e2', 2.1);
moon.position.set(-12, 24, 9); scene.add(moon);
const cityGlow = new THREE.PointLight('#4de4c2', 100, 65, 2);
cityGlow.position.set(0, 8, -20); scene.add(cityGlow);
const sunset = new THREE.PointLight('#ef8969', 90, 50, 2);
sunset.position.set(15, 11, -45); scene.add(sunset);

const mat = (color, roughness = .78, metalness = .08, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const groundMat = mat('#152526');
const roadMat = mat('#202829', .92);
const curbMat = mat('#57645c', .75, .2);
const laneMat = new THREE.MeshStandardMaterial({ color: '#b3d8b8', emissive: '#55d7b6', emissiveIntensity: .28, roughness: .48 });
const neonMint = new THREE.MeshStandardMaterial({ color: '#72f1cf', emissive: '#37edbb', emissiveIntensity: 1.8, roughness: .35 });
const neonCoral = new THREE.MeshStandardMaterial({ color: '#ff986f', emissive: '#ff674f', emissiveIntensity: 1.25, roughness: .4 });
const buildingMats = ['#182a30', '#17232e', '#1d3031', '#1b282d', '#203034'].map(c => mat(c, .9));
const windowMat = new THREE.MeshStandardMaterial({ color: '#9dd7b3', emissive: '#58bb9f', emissiveIntensity: 1.25, roughness: .5 });
const warmWindowMat = new THREE.MeshStandardMaterial({ color: '#efac7b', emissive: '#e7825f', emissiveIntensity: 1.2, roughness: .5 });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(.5, .5, 1, 16);

function box(parent, size, position, material, geometry = boxGeo) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(...size); mesh.position.set(...position); mesh.castShadow = false; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function addRoad() {
  box(scene, [230, .3, 240], [0, -.38, -92], groundMat);
  box(scene, [16, .18, 168], [0, -.2, -69], roadMat);
  for (const x of [-8.15, 8.15]) {
    box(scene, [.45, .26, 168], [x, -.08, -69], curbMat);
    box(scene, [.075, .05, 165], [x + Math.sign(-x) * .28, .01, -69], neonMint);
  }
  // Longitudinal lane lines break into dashes and scroll toward the cab during a run.
  const dashGeo = new THREE.BoxGeometry(.075, .035, 3.2);
  for (const x of [-2.67, 2.67]) for (let i = 0; i < 36; i++) {
    const dash = new THREE.Mesh(dashGeo, laneMat);
    dash.position.set(x, -.085, 12 - i * 4.65); dash.userData.baseZ = dash.position.z;
    scene.add(dash); laneDashes.push(dash);
  }
  for (const side of [-1, 1]) for (let i = 0; i < 18; i++) {
    const z = 9 - i * 8.5;
    const post = box(scene, [.11, .42, .11], [side * 8.9, .18, z], neonMint);
    const lamp = new THREE.PointLight('#56edc4', 9, 8, 2); lamp.position.set(side * 8.9, .45, z); scene.add(lamp);
    post.userData.lamp = lamp;
  }
}
const laneDashes = [];

function addCity() {
  let seed = 24681357;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const windowGeo = new THREE.BoxGeometry(.24, .38, .08);
  const windowRecords = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 18; i++) {
      const z = 4 - i * 8.2 + random() * 3;
      const width = 4.5 + random() * 5.5;
      const height = 8 + random() * 20;
      const depth = 4 + random() * 5;
      const x = side * (13 + random() * 20);
      const building = new THREE.Mesh(boxGeo, buildingMats[Math.floor(random() * buildingMats.length)]);
      building.scale.set(width, height, depth); building.position.set(x, height / 2 - .25, z);
      building.receiveShadow = true; scene.add(building);
      const trimColor = random() > .5 ? neonMint : neonCoral;
      const trim = box(scene, [.09, height * .78, .08], [x - side * (width * .37), height * .52, z + depth * .51], trimColor);
      trim.material = trimColor;
      windowRecords.push({ x, z, width, height, depth, side });
      if (random() > .62) {
        const roof = box(scene, [width * .54, .12, depth * .55], [x, height + .1, z], mat('#52635e', .55, .25));
        box(scene, [.15, 2 + random() * 2, .15], [x, height + 1.1, z], neonMint);
      }
    }
  }
  const windows = new THREE.InstancedMesh(windowGeo, windowMat, 1100);
  const warmWindows = new THREE.InstancedMesh(windowGeo, warmWindowMat, 350);
  let normalIndex = 0, warmIndex = 0;
  const dummy = new THREE.Object3D();
  for (const b of windowRecords) {
    const columns = Math.max(2, Math.floor(b.width / 1.15));
    const rows = Math.max(2, Math.floor(b.height / 1.5));
    for (let row = 1; row < rows; row++) for (let col = 0; col < columns; col++) {
      if (random() < .31) continue;
      const x = b.x - b.width * .42 + col * (b.width * .84 / columns);
      const y = .4 + row * (b.height * .8 / rows);
      const z = b.z + b.depth * .505 * b.side;
      dummy.position.set(x, y, z); dummy.scale.set(.55 + random() * .35, .7, .35); dummy.updateMatrix();
      if (random() < .18 && warmIndex < warmWindows.count) warmWindows.setMatrixAt(warmIndex++, dummy.matrix);
      else if (normalIndex < windows.count) windows.setMatrixAt(normalIndex++, dummy.matrix);
    }
  }
  windows.count = normalIndex; warmWindows.count = warmIndex;
  scene.add(windows, warmWindows);
  // Elevated maglev rails and illuminated support gantries.
  for (const side of [-1, 1]) {
    box(scene, [.28, .35, 155], [side * 11.6, 8.2, -68], mat('#455958', .5, .65));
    box(scene, [.12, .09, 155], [side * 11.6, 8.42, -68], neonMint);
  }
  for (let z = 0; z > -145; z -= 29) {
    box(scene, [23, .24, .28], [0, 8.2, z], mat('#465b5c', .55, .55));
    for (const x of [-11.4, 11.4]) box(scene, [.24, 8.2, .28], [x, 4.1, z], mat('#405651', .65, .4));
  }
  // Distant stepped skyline adds a readable city horizon.
  for (let i = 0; i < 22; i++) {
    const x = -88 + i * 8;
    const h = 12 + random() * 30;
    const b = new THREE.Mesh(boxGeo, buildingMats[i % buildingMats.length]);
    b.scale.set(6 + random() * 3, h, 5); b.position.set(x, h / 2 - 1, -128 - random() * 10); scene.add(b);
  }
}

const wheels = [];
function makeTruck({ color = '#3c91a0', traffic = false } = {}) {
  const group = new THREE.Group();
  const dark = mat('#10191b', .8, .15), rubber = mat('#121819', .86), rim = mat('#718d88', .45, .7);
  const bodyMat = mat(traffic ? color : '#1a3033', .54, .3);
  const accent = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: traffic ? .65 : .9, metalness: .38, roughness: .35 });
  if (!traffic) {
    box(group, [2.8, 2.7, 6.25], [0, 2.02, -1.05], bodyMat);
    box(group, [2.86, .12, 6.3], [0, 3.38, -1.05], mat('#92c7bd', .35, .55));
    for (const z of [-3.6, 1.35]) {
      box(group, [2.88, .055, .07], [0, 2.75, z], accent);
      box(group, [.045, 2.35, .06], [-1.42, 2.1, z], neonMint);
      box(group, [.045, 2.35, .06], [1.42, 2.1, z], neonMint);
    }
    // Rear doors and the luminous Nightline cargo insignia.
    box(group, [2.5, 2.42, .045], [0, 2.02, -4.2], mat('#203b3e', .65, .25));
    box(group, [1.15, .12, .08], [0, 2.28, -4.12], accent);
    box(group, [.07, 1.8, .08], [0, 2, -4.12], mat('#69807c', .65));
    const cab = box(group, [2.35, 1.9, 2.45], [0, 1.72, 3.25], accent);
    box(group, [2.2, .24, 1.42], [0, 2.77, 3.47], accent);
    box(group, [1.92, .86, .08], [0, 2.44, 4.49], mat('#15313b', .23, .58, { emissive: '#286b75', emissiveIntensity: .45 }));
    box(group, [2.42, .25, .48], [0, .92, 4.55], dark);
    box(group, [2.15, .14, .28], [0, 1.2, 4.57], accent);
    for (const x of [-.87, .87]) {
      const headlight = box(group, [.32, .2, .09], [x, 1.28, 4.57], mat('#d6f1c4', .25, .1, { emissive: '#eaffc6', emissiveIntensity: 3 }));
      const beam = new THREE.SpotLight('#d2ffd5', 22, 30, .52, .55, 1.2); beam.position.set(x, 1.45, 4.5); beam.target.position.set(x, .1, 18); group.add(beam, beam.target);
    }
    box(group, [.42, .16, .1], [-1.03, 1.32, 4.57], neonCoral);
    box(group, [.42, .16, .1], [1.03, 1.32, 4.57], neonCoral);
    for (const x of [-1.48, 1.48]) for (const z of [-3.1, -1.6, 1.05, 3.75]) addWheel(group, x, .66, z, wheels);
  } else {
    box(group, [1.75, .8, 3.4], [0, 1.15, 0], accent);
    box(group, [1.5, .52, 1.25], [0, 1.75, -.45], mat('#23414b', .25, .5, { emissive: color, emissiveIntensity: .32 }));
    box(group, [1.8, .17, .15], [0, .8, 1.55], mat('#101819'));
    box(group, [.34, .18, .08], [-.62, 1.1, 1.73], neonMint);
    box(group, [.34, .18, .08], [.62, 1.1, 1.73], neonMint);
    for (const x of [-.82, .82]) for (const z of [-.95, 1]) addWheel(group, x, .48, z, wheels);
  }
  group.userData.wheelMeshes = wheels.slice(- (traffic ? 4 : 8));
  group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  return group;
}
function addWheel(parent, x, y, z, bucket) {
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .36, 20), mat('#111718', .9, .08));
  wheel.rotation.z = Math.PI / 2; wheel.position.set(x, y, z); parent.add(wheel); bucket.push(wheel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .38, 16), mat('#627d79', .4, .75));
  hub.rotation.z = Math.PI / 2; hub.position.set(x, y, z); parent.add(hub); bucket.push(hub);
}

addRoad(); addCity();
const truckWheels = [];
const truck = makeTruck();
truck.userData.wheelMeshes = truckWheels;
scene.add(truck);
const obstacles = new Map();
let worldState = { running: false, lane: 0, speed: 0, time: 0, distance: 0, obstacles: [], contract: null, boost: 0 };
let lastResizeWidth = 0, lastResizeHeight = 0;
function resize() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height || (rect.width === lastResizeWidth && rect.height === lastResizeHeight)) return;
  lastResizeWidth = rect.width; lastResizeHeight = rect.height;
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
window.addEventListener('resize', resize);
resize();

function makeObstacle(type) {
  if (type === 'traffic') return makeTruck({ traffic: true, color: ['#6b8eb0', '#db8b68', '#9187ae'][Math.floor(Math.random() * 3)] });
  const group = new THREE.Group();
  if (type === 'barrier') {
    box(group, [2.5, .72, .62], [0, .5, 0], mat('#e57750', .54, .1));
    for (let i = -2; i <= 2; i++) {
      const stripe = box(group, [.27, .73, .66], [i * .45, .5, 0], mat('#ffd08a', .48, .1)); stripe.rotation.z = -.36;
    }
    for (const x of [-.95, .95]) box(group, [.24, .18, .72], [x, .12, 0], mat('#913e37'));
    const lamp = new THREE.PointLight('#ff704f', 6, 5); lamp.position.set(0, 1.2, 0); group.add(lamp);
  } else {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.05, 32), new THREE.MeshStandardMaterial({ color: '#41bfd0', emissive: '#188994', emissiveIntensity: .5, roughness: .14, metalness: .65, transparent: true, opacity: .8 }));
    puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.6, .65, 1); puddle.position.y = -.08; group.add(puddle);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.72, .78, 32), neonMint); ring.rotation.x = -Math.PI / 2; ring.scale.set(1.3, .7, 1); ring.position.y = -.04; group.add(ring);
  }
  return group;
}
function syncObstacles() {
  const active = new Set();
  for (const obstacle of worldState.obstacles || []) {
    if (obstacle.hit) continue;
    active.add(obstacle);
    let mesh = obstacles.get(obstacle);
    if (!mesh) { mesh = makeObstacle(obstacle.type); obstacles.set(obstacle, mesh); scene.add(mesh); }
    mesh.position.set(obstacle.lane * 2.67, obstacle.type === 'traffic' ? 0 : -.02, 4 - obstacle.z * 62);
    if (obstacle.type === 'traffic') mesh.scale.setScalar(.78);
    const scale = .42 + obstacle.z * 1.02; if (obstacle.type !== 'traffic') mesh.scale.set(scale, scale, scale);
  }
  for (const [obstacle, mesh] of obstacles) if (!active.has(obstacle)) { scene.remove(mesh); obstacles.delete(obstacle); }
}
window.renderNightline3D = state => {
  worldState = { ...state, contract: state.contract || worldState.contract };
  const color = worldState.contract?.color;
  if (color && truck.children.length) {
    const body = truck.children.find(child => child.material?.emissive && child.position.z > 3 && child.material.emissiveIntensity > .5);
    if (body && body.material.color.getStyle() !== new THREE.Color(color).getStyle()) {
      body.material.color.set(color); body.material.emissive.set(color);
    }
  }
  syncObstacles();
};

function animate(now) {
  requestAnimationFrame(animate);
  resize();
  const t = now * .001;
  const travel = worldState.running ? worldState.distance * 10 + worldState.time * (worldState.speed / 18) : t * .7;
  for (const dash of laneDashes) {
    const z = ((dash.userData.baseZ + travel * 1.25 + 12) % 167 + 167) % 167 - 155;
    dash.position.z = z;
  }
  const targetX = (worldState.running ? worldState.lane : 0) * 2.55;
  truck.position.x += (targetX - truck.position.x) * .12;
  truck.position.y = Math.sin(t * (worldState.running ? 8 : 1.7)) * .035;
  truck.rotation.z = THREE.MathUtils.lerp(truck.rotation.z, worldState.running ? -Math.sign(targetX - truck.position.x) * .035 : 0, .1);
  if (worldState.running) for (const wheel of truck.userData.wheelMeshes) wheel.rotation.x -= worldState.speed * .0008;
  cityGlow.intensity = 92 + Math.sin(t * 1.7) * 10;
  scene.fog.density = .011 + Math.sin(t * .4) * .001;
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
