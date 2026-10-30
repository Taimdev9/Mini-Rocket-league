import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createArena } from './arena.js';
import { createCar, updateCar, carState } from './car.js';
import { initPhysics, physicsState } from './physics.js';

// ===== 1. إعداد المشهد =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1e);
scene.fog = new THREE.Fog(0x0a0f1e, 150, 400);

const camera = new THREE.PerspectiveCamera(65, innerWidth/innerHeight, 0.5, 1000);
camera.position.set(0, 35, 90);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(60, 100, 40);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.left = -150;
dirLight.shadow.camera.right = 150;
dirLight.shadow.camera.top = 150;
dirLight.shadow.camera.bottom = -150;
scene.add(dirLight);

// ===== 2. بناء الملعب =====
const ARENA = createArena(scene);

// ===== 3. تشغيل الفيزياء وبناء السيارة =====
async function start() {
  await initPhysics(ARENA);
  const car = createCar(scene);

  // ===== 4. التحكم =====
  const input = {
    steerLeft: false, steerRight: false, brake: false, boost: false,
    boostEnergy: 100, maxBoost: 100, boostDrain: 45, boostRegen: 12
  };

  function bindButton(id, onPress, onRelease) {
    const el = document.getElementById(id);
    const press = (e) => { e.preventDefault(); el.classList.add('pressed'); onPress(); };
    const release = () => { el.classList.remove('pressed'); onRelease(); };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('mousedown', press);
    document.addEventListener('touchend', release, { passive: false });
    document.addEventListener('mouseup', release);
  }

  bindButton('btnLeft',  () => input.steerLeft = true,  () => input.steerLeft = false);
  bindButton('btnRight', () => input.steerRight = true, () => input.steerRight = false);
  bindButton('btnBrake', () => input.brake = true,      () => input.brake = false);
  bindButton('btnBoost', () => input.boost = true,      () => input.boost = false);

  const keys = {};
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => keys[e.code] = false);

  // ===== 5. الحلقة الرئيسية =====
  const speedEl = document.getElementById('speed');
  const boostFill = document.getElementById('boostFill');

  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // دمج المدخلات
    let steer = 0;
    if (input.steerLeft  || keys['ArrowLeft']  || keys['KeyA']) steer -= 1;
    if (input.steerRight || keys['ArrowRight'] || keys['KeyD']) steer += 1;

    const braking = input.brake || keys['ArrowDown'] || keys['KeyS'];
    let boosting = input.boost || keys['Space'] || keys['ShiftLeft'];

    // طاقة البوست
    if (boosting && input.boostEnergy > 0) {
      input.boostEnergy = Math.max(0, input.boostEnergy - input.boostDrain * dt);
    } else {
      boosting = false;
      input.boostEnergy = Math.min(input.maxBoost, input.boostEnergy + input.boostRegen * dt);
    }
    boostFill.style.width = input.boostEnergy + '%';

    // تحديث السيارة والفيزياء
    const speedKmh = updateCar(dt, steer, braking, boosting, carState, physicsState);
    physicsState.world.step();
    carState.syncVisual();

    // تحديث الكرة
    if (physicsState.ballMesh) {
      const bp = physicsState.ballBody.translation();
      const bq = physicsState.ballBody.rotation();
      physicsState.ballMesh.position.set(bp.x, bp.y, bp.z);
      physicsState.ballMesh.quaternion.set(bq.x, bq.y, bq.z, bq.w);
    }

    speedEl.textContent = Math.round(speedKmh) + ' km/h';

    // الكاميرا تتبع السيارة
    const cp = carState.body.translation();
    const cq = carState.body.rotation();
    const carPos = new THREE.Vector3(cp.x, cp.y, cp.z);
    const carQuat = new THREE.Quaternion(cq.x, cq.y, cq.z, cq.w);

    const idealOffset = new THREE.Vector3(0, 12, -25);
    idealOffset.applyQuaternion(carQuat);
    idealOffset.add(carPos);
    camera.position.lerp(idealOffset, 0.08);
    camera.lookAt(carPos.x, carPos.y + 2, carPos.z + 5);

    renderer.render(scene, camera);
  }

  animate();

  // إعادة الكرة إذا خرجت
  setInterval(() => {
    if (!physicsState.ballBody) return;
    const pos = physicsState.ballBody.translation();
    if (Math.abs(pos.x) > 200 || Math.abs(pos.z) > 250 || pos.y < -20) {
      physicsState.ballBody.setTranslation({ x: 0, y: 10, z: 0 }, true);
      physicsState.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      physicsState.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }, 1000);

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

start();