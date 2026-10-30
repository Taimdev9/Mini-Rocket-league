import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { carState } from './car.js';

// ============================================================
// حالة الفيزياء (تُشارك مع main.js)
// ============================================================
export const physicsState = {
  world: null,
  ballBody: null,
  ballMesh: null
};

// ============================================================
// تهيئة الفيزياء
// ============================================================
export async function initPhysics(ARENA) {
  // --- تحميل Rapier ---
  await RAPIER.init();

  // --- إنشاء العالم ---
  // الجاذبية: -30 (مقياس مصغّر بدل -650 في اللعبة الأصلية)
  const world = new RAPIER.World({ x: 0, y: -30, z: 0 });
  physicsState.world = world;

  // ============================================================
  // 1. الأرضية
  // ============================================================
  const floorBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0)
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(ARENA.halfWidth, 0.5, ARENA.halfLength)
      .setFriction(1.0)
      .setRestitution(0.1),
    floorBody
  );

  // ============================================================
  // 2. الجدران الجانبية (يسار ويمين)
  // ============================================================
  for (const x of [-ARENA.halfWidth, ARENA.halfWidth]) {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, ARENA.ceiling / 2, 0)
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ARENA.wallThickness / 2,
        ARENA.ceiling / 2,
        ARENA.halfLength
      ).setRestitution(0.5),
      body
    );
  }

  // ============================================================
  // 3. الجدران الخلفية (مع فتحة المرمى)
  // ============================================================
  for (const z of [-ARENA.halfLength, ARENA.halfLength]) {
    const sideW = ARENA.halfWidth - ARENA.goalHalfWidth;

    // الجزءان الجانبيان من الجدار (يمين ويسار المرمى)
    for (const sign of [-1, 1]) {
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(
          sign * (ARENA.goalHalfWidth + sideW / 2),
          ARENA.ceiling / 2,
          z
        )
      );
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(
          sideW / 2,
          ARENA.ceiling / 2,
          ARENA.wallThickness / 2
        ).setRestitution(0.5),
        body
      );
    }

    // الجزء العلوي فوق المرمى
    const topBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(
        0,
        ARENA.goalHeight + (ARENA.ceiling - ARENA.goalHeight) / 2,
        z
      )
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ARENA.goalHalfWidth,
        (ARENA.ceiling - ARENA.goalHeight) / 2,
        ARENA.wallThickness / 2
      ).setRestitution(0.5),
      topBody
    );
  }

  // ============================================================
  // 4. الكرة
  // ============================================================
  const ballRadius = 3.5;

  // --- شكل الكرة (Three.js) ---
  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(ballRadius, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1
    })
  );
  ballMesh.castShadow = true;
  ballMesh.receiveShadow = true;

  // شبكة سلكية خفيفة تعطي شكل كرة القدم
  const wireframe = new THREE.Mesh(
    new THREE.SphereGeometry(ballRadius + 0.02, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    })
  );
  ballMesh.add(wireframe);

  // ⚠️ ملاحظة: لا نضيفها للمشهد هنا — main.js هو المسؤول
  physicsState.ballMesh = ballMesh;

  // --- جسم الكرة الفيزيائي ---
  const ballBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 10, 0)
      .setLinearDamping(0.3)
      .setAngularDamping(0.3)
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(ballRadius)
      .setRestitution(0.7)
      .setFriction(0.4)
      .setDensity(1.0),
    ballBody
  );
  physicsState.ballBody = ballBody;

  // ============================================================
  // 5. جسم السيارة الفيزيائي
  // ============================================================
  const carBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 2, 40)
      .setLinearDamping(0.1)
      .setAngularDamping(2.0)
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(1.3, 0.55, 1.85)
      .setRestitution(0.1)
      .setFriction(1.5)
      .setDensity(2.0),
    carBody
  );
  carState.body = carBody;

  // ============================================================
  // 6. إعادة تعيين الكرة عند الخروج
  // ============================================================
  // (هذه موجودة أيضًا في main.js لكن نضعها هنا للأمان)
  return physicsState;
}

// ============================================================
// دالة مساعدة: إعادة تعيين الكرة
// ============================================================
export function resetBall() {
  if (!physicsState.ballBody) return;
  physicsState.ballBody.setTranslation({ x: 0, y: 10, z: 0 }, true);
  physicsState.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  physicsState.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

// ============================================================
// دالة مساعدة: إعادة تعيين السيارة
// ============================================================
export function resetCar() {
  if (!carState.body) return;
  carState.body.setTranslation({ x: 0, y: 2, z: 40 }, true);
  carState.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  carState.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  carState.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
}