import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createArena, ARENA } from './arena.js';
import { createCar, updateCar, carState } from './car.js';
import { initPhysics, physicsState } from './physics.js';
import { setupEffects } from './effects.js';
import { initGamepad, pollGamepad, gamepadState } from './gamepad.js';
import { initUI, inputState, updateBoostBar } from './ui.js';

// ============================================================
// 1. المشهد
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1e);

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
// 4. الإضاءة والسماء والمؤثرات
// ============================================================
setupEffects(scene);

// ============================================================
// 5. بناء الملعب
// ============================================================
createArena(scene);

// ============================================================
// 6. بدء التشغيل
// ============================================================
async function start() {
  // --- الفيزياء ---
  await initPhysics(ARENA);

  // --- إضافة الكرة للمشهد ---
  if (physicsState.ballMesh) {
    scene.add(physicsState.ballMesh);
  }

  // --- السيارة ---
  createCar(scene);

  // --- واجهة المستخدم ويد التحكم ---
  initUI();
  initGamepad();

  // ============================================================
  // 7. الحلقة الرئيسية
  // ============================================================
  const speedEl = document.getElementById('speed');
  const gpStatus = document.getElementById('gamepadStatus');

  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // --- استطلاع يد التحكم ---
    pollGamepad();

    // ============================================================
    // دمج المدخلات: أزرار + كونسول
    // ============================================================
    let steer = 0;
    if (inputState.steerLeft) steer -= 1;
    if (inputState.steerRight) steer += 1;

    // إذا الكونسول يعطي إشارة أقوى، نأخذ بها
    if (gamepadState.connected && Math.abs(gamepadState.steer) > Math.abs(steer)) {
      steer = gamepadState.steer;
    }

    const braking = inputState.brake || gamepadState.brake;
    let boosting = inputState.boost || gamepadState.boost;

    // ============================================================
    // طاقة البوست
    // ============================================================
    if (boosting && inputState.boostEnergy > 0) {
      inputState.boostEnergy = Math.max(
        0,
        inputState.boostEnergy - inputState.boostDrain * dt
      );
    } else {
      boosting = false;
      inputState.boostEnergy = Math.min(
        inputState.maxBoost,
        inputState.boostEnergy + inputState.boostRegen * dt
      );
    }
    updateBoostBar();

    // ============================================================
    // تحديث السيارة
    // ============================================================
    let speedKmh = 0;
    try {
      speedKmh = updateCar(dt, steer, braking, boosting, carState, physicsState);
    } catch (err) {
      console.error('خطأ في updateCar:', err);
    }

    // ============================================================
    // خطوة الفيزياء
    // ============================================================
    if (physicsState.world) {
      physicsState.world.step();
    }

    // ============================================================
    // مزامنة السيارة
    // ============================================================
    if (carState.syncVisual) carState.syncVisual();

    // ============================================================
    // مزامنة الكرة
    // ============================================================
    if (physicsState.ballMesh && physicsState.ballBody) {
      const bp = physicsState.ballBody.translation();
      const bq = physicsState.ballBody.rotation();
      physicsState.ballMesh.position.set(bp.x, bp.y, bp.z);
      physicsState.ballMesh.quaternion.set(bq.x, bq.y, bq.z, bq.w);
    }

    // ============================================================
    // HUD
    // ============================================================
    if (speedEl) {
      speedEl.textContent = Math.round(speedKmh) + ' km/h';
    }
    if (gpStatus) {
      gpStatus.textContent = gamepadState.connected ? '🎮 متصل' : '🎮 غير متصل';
      gpStatus.style.color = gamepadState.connected ? '#4cc9f0' : '#8899bb';
    }

    // ============================================================
    // الكاميرا تتبع السيارة
    // ============================================================
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

    // ============================================================
    // الرندر
    // ============================================================
    renderer.render(scene, camera);
  }

  animate();

  // ============================================================
  // 8. إعادة الكرة إذا خرجت
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
  // 9. تغيير الحجم
  // ============================================================
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ============================================================
// تشغيل
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