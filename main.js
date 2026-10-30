import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createArena, ARENA } from './arena.js';
import { createCar, updateCar, carState } from './car.js';
import { initPhysics, physicsState } from './physics.js';

// ============================================================
// 1. إعداد المشهد (Scene)
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1e);
scene.fog = new THREE.Fog(0x0a0f1e, 150, 400);

// ============================================================
// 2. الكاميرا
// ============================================================
const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.5,
  1000
);
camera.position.set(0, 35, 90);
camera.lookAt(0, 0, 0);

// ============================================================
// 3. الرندرر
// ============================================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ============================================================
// 4. الإضاءة
// ============================================================
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

// ============================================================
// 5. بناء الملعب
// ============================================================
createArena(scene);

// ============================================================
// 6. بدء التشغيل
// ============================================================
async function start() {
  // --- الفيزياء والكرة ---
  await initPhysics(ARENA);

  // ✅ إضافة الكرة للمشهد (تم نقلها من physics.js إلى هنا)
  if (physicsState.ballMesh) {
    scene.add(physicsState.ballMesh);
  }

  // --- السيارة ---
  createCar(scene);

  // ============================================================
  // 7. التحكم
  // ============================================================
  const input = {
    steerLeft: false,
    steerRight: false,
    brake: false,
    boost: false,
    boostEnergy: 100,
    maxBoost: 100,
    boostDrain: 45,
    boostRegen: 12
  };

  function bindButton(id, onPress, onRelease) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn('زر غير موجود:', id);
      return;
    }
    const press = (e) => {
      e.preventDefault();
      el.classList.add('pressed');
      onPress();
    };
    const release = () => {
      el.classList.remove('pressed');
      onRelease();
    };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('mousedown', press);
    document.addEventListener('touchend', release, { passive: false });
    document.addEventListener('mouseup', release);
  }

  bindButton('btnLeft',  () => input.steerLeft = true,  () => input.steerLeft = false);
  bindButton('btnRight', () => input.steerRight = true, () => input.steerRight = false);
  bindButton('btnBrake', () => input.brake = true,      () => input.brake = false);
  bindButton('btnBoost', () => input.boost = true,      () => input.boost = false);

  // كيبورد للتجربة على الكمبيوتر
  const keys = {};
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => keys[e.code] = false);

  // ============================================================
  // 8. الحلقة الرئيسية
  // ============================================================
  const speedEl = document.getElementById('speed');
  const boostFill = document.getElementById('boostFill');

  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // --- دمج المدخلات ---
    let steer = 0;
    if (input.steerLeft  || keys['ArrowLeft']  || keys['KeyA']) steer -= 1;
    if (input.steerRight || keys['ArrowRight'] || keys['KeyD']) steer += 1;

    const braking = input.brake || keys['ArrowDown'] || keys['KeyS'];
    let boosting = input.boost || keys['Space'] || keys['ShiftLeft'];

    // --- طاقة البوست ---
    if (boosting && input.boostEnergy > 0) {
      input.boostEnergy = Math.max(0, input.boostEnergy - input.boostDrain * dt);
    } else {
      boosting = false;
      input.boostEnergy = Math.min(input.maxBoost, input.boostEnergy + input.boostRegen * dt);
    }
    if (boostFill) boostFill.style.width = input.boostEnergy + '%';

    // --- تحديث السيارة ---
    let speedKmh = 0;
    try {
      speedKmh = updateCar(dt, steer, braking, boosting, carState, physicsState);
    } catch (err) {
      console.error('خطأ في updateCar:', err);
    }

    // --- خطوة الفيزياء ---
    if (physicsState.world) {
      physicsState.world.step();
    }

    // --- مزامنة السيارة مع الفيزياء ---
    if (carState.syncVisual) carState.syncVisual();

    // --- مزامنة الكرة ---
    if (physicsState.ballMesh && physicsState.ballBody) {
      const bp = physicsState.ballBody.translation();
      const bq = physicsState.ballBody.rotation();
      physicsState.ballMesh.position.set(bp.x, bp.y, bp.z);
      physicsState.ballMesh.quaternion.set(bq.x, bq.y, bq.z, bq.w);
    }

    // --- عرض السرعة ---
    if (speedEl) speedEl.textContent = Math.round(speedKmh) + ' km/h';

    // --- الكاميرا تتبع السيارة ---
    if (carState.body) {
      const cp = carState.body.translation();
      const cq = carState.body.rotation();
      const carPos = new THREE.Vector3(cp.x, cp.y, cp.z);
      const carQuat = new THREE.Quaternion(cq.x, cq.y, cq.z, cq.w);

      const idealOffset = new THREE.Vector3(0, 12, -25);
      idealOffset.applyQuaternion(carQuat);
      idealOffset.add(carPos);

      camera.position.lerp(idealOffset, 0.08);
      camera.lookAt(carPos.x, carPos.y + 2, carPos.z + 5);
    }

    // --- الرندر ---
    renderer.render(scene, camera);
  }

  animate();

  // ============================================================
  // 9. إعادة الكرة إذا خرجت من الملعب
  // ============================================================
  setInterval(() => {
    if (!physicsState.ballBody) return;
    const pos = physicsState.ballBody.translation();
    if (Math.abs(pos.x) > 200 || Math.abs(pos.z) > 250 || pos.y < -20) {
      physicsState.ballBody.setTranslation({ x: 0, y: 10, z: 0 }, true);
      physicsState.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      physicsState.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }, 1000);

  // ============================================================
  // 10. إعادة الحجم عند تغيير الشاشة
  // ============================================================
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ============================================================
// تشغيل اللعبة
// ============================================================
start().catch(err => {
  console.error('فشل بدء اللعبة:', err);
  document.body.innerHTML += `
    <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                color:#ff3b5c;font-family:monospace;font-size:14px;
                background:#000;padding:20px;border-radius:10px;
                max-width:90%;z-index:999;text-align:left;direction:ltr;">
      <strong>خطأ في التحميل:</strong><br>${err.message}
    </div>
  `;
});