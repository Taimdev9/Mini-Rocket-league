import * as THREE from 'three';

// ============================================================
// حالة السيارة (مشتركة)
// ============================================================
export const carState = {
  mesh: null,
  body: null,
  wheels: [],
  speed: 0,
  syncVisual: function () {
    if (!this.body || !this.mesh) return;

    const p = this.body.translation();
    const q = this.body.rotation();

    this.mesh.position.set(p.x, p.y - 0.5, p.z);
    this.mesh.quaternion.set(q.x, q.y, q.z, q.w);

    // تدوير العجلات حسب السرعة
    const vel = this.body.linvel();
    const wheelSpin = Math.sqrt(vel.x * vel.x + vel.z * vel.z) * 0.1;
    this.wheels.forEach(w => { w.rotation.x += wheelSpin; });
  }
};

// ============================================================
// بناء السيارة (Fennec مبسطة)
// ============================================================
export function createCar(scene) {
  const car = new THREE.Group();

  // ============================================================
  // 1. الجسم الرئيسي (أبعاد Fennec: 118×84×36 uu → 3.7×2.6×1.1)
  // ============================================================
  const bodyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.1, 3.7),
    new THREE.MeshStandardMaterial({
      color: 0x4cc9f0, metalness: 0.4, roughness: 0.3
    })
  );
  bodyMesh.position.y = 0.55;
  bodyMesh.castShadow = true;
  car.add(bodyMesh);

  // ============================================================
  // 2. السقف
  // ============================================================
  const roofMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.35, 1.8),
    new THREE.MeshStandardMaterial({
      color: 0x3a9ac0, metalness: 0.5, roughness: 0.2
    })
  );
  roofMesh.position.set(0, 1.2, -0.2);
  roofMesh.castShadow = true;
  car.add(roofMesh);

  // ============================================================
  // 3. الزجاج الأمامي
  // ============================================================
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x88ccff, metalness: 0.8, roughness: 0.1,
    transparent: true, opacity: 0.6
  });
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.5, 0.1),
    glassMat
  );
  windshield.position.set(0, 1.0, 1.0);
  windshield.rotation.x = -0.3;
  car.add(windshield);

  // زجاج خلفي
  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.4, 0.1),
    glassMat
  );
  rearGlass.position.set(0, 1.0, -1.1);
  rearGlass.rotation.x = 0.3;
  car.add(rearGlass);

  // ============================================================
  // 4. الشبك الأمامي
  // ============================================================
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.4, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
  );
  grille.position.set(0, 0.4, 1.85);
  car.add(grille);

  // ============================================================
  // 5. المصابيح الأمامية
  // ============================================================
  for (const x of [-0.9, 0.9]) {
    const headlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 3
      })
    );
    headlight.position.set(x, 0.55, 1.86);
    car.add(headlight);

    const headLight = new THREE.PointLight(0xffcc44, 0.5, 15);
    headLight.position.set(x, 0.55, 2.2);
    car.add(headLight);
  }

  // ============================================================
  // 6. المصابيح الخلفية
  // ============================================================
  for (const x of [-0.9, 0.9]) {
    const tailLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3
      })
    );
    tailLight.position.set(x, 0.6, -1.9);
    car.add(tailLight);
  }

  // ============================================================
  // 7. العجلات (إطار + جنط)
  // ============================================================
  const wheels = [];

  for (const [x, y, z] of [
    [-1.3, 0.45, 1.2], [1.3, 0.45, 1.2],
    [-1.3, 0.45, -1.2], [1.3, 0.45, -1.2]
  ]) {
    const wheelGroup = new THREE.Group();

    // الإطار المطاطي
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.35, 20),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // الجنط المعدني
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.36, 12),
      new THREE.MeshStandardMaterial({
        color: 0xcccccc, metalness: 0.8, roughness: 0.2
      })
    );
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    wheelGroup.position.set(x, y, z);
    car.add(wheelGroup);
    wheels.push(wheelGroup);
  }
  carState.wheels = wheels;

  // ============================================================
  // 8. الجناح الخلفي
  // ============================================================
  const spoilerMat = new THREE.MeshStandardMaterial({
    color: 0x2a7a9a, metalness: 0.5, roughness: 0.3
  });

  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.1, 0.4),
    spoilerMat
  );
  spoiler.position.set(0, 1.4, -1.8);
  spoiler.castShadow = true;
  car.add(spoiler);

  for (const x of [-0.8, 0.8]) {
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.5, 0.1),
      spoilerMat
    );
    strut.position.set(x, 1.15, -1.7);
    car.add(strut);
  }

  // ============================================================
  // 9. شعار بسيط على الجانبين
  // ============================================================
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xffd166, emissive: 0xffaa00, emissiveIntensity: 0.5
  });
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.15, 2.5),
      stripeMat
    );
    stripe.position.set(side * 1.31, 0.7, 0);
    car.add(stripe);
  }

  // ============================================================
  // إضافة للمشهد
  // ============================================================
  scene.add(car);
  car.position.set(0, 1.5, 40);
  carState.mesh = car;

  return car;
}

// ============================================================
// تحديث السيارة (الحركة والتوجيه)
// ============================================================
export function updateCar(dt, steer, braking, boosting, state, physics) {
  const body = state.body;
  if (!body) return 0;

  const BASE_SPEED = 25;
  const BOOST_SPEED = 48;
  const STEER_SPEED = 1.8;

  // السرعة المستهدفة
  let targetSpeed = BASE_SPEED;
  if (braking) targetSpeed = 0;
  else if (boosting) targetSpeed = BOOST_SPEED;

  // الاتجاه الأمامي
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(state.mesh.quaternion);
  const vel = body.linvel();
  const currentFwdSpeed = vel.x * forward.x + vel.z * forward.z;
  const newSpeed = currentFwdSpeed + (targetSpeed - currentFwdSpeed) * Math.min(1, 5 * dt);

  // تطبيق السرعة مباشرة
  body.wakeUp();
  body.setLinvel({
    x: forward.x * newSpeed,
    y: vel.y,
    z: forward.z * newSpeed
  }, true);

  // التوجيه
  const curAng = body.angvel();
  if (Math.abs(newSpeed) > 1) {
    const turnPower = steer * STEER_SPEED * Math.min(1, Math.abs(newSpeed) / 12);
    body.setAngvel({
      x: 0,
      y: curAng.y + (turnPower - curAng.y) * Math.min(1, 10 * dt),
      z: 0
    }, true);
  } else {
    body.setAngvel({ x: 0, y: curAng.y * 0.9, z: 0 }, true);
  }

  // منع الانقلاب
  const cr = body.rotation();
  const carQuat = new THREE.Quaternion(cr.x, cr.y, cr.z, cr.w);
  const euler = new THREE.Euler().setFromQuaternion(carQuat, 'YXZ');
  if (Math.abs(euler.x) > 0.05 || Math.abs(euler.z) > 0.05) {
    const upright = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, euler.y, 0));
    body.setRotation({ x: upright.x, y: upright.y, z: upright.z, w: upright.w }, true);
  }

  return Math.abs(newSpeed) * 3.6;
}