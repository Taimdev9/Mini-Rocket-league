import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { carState } from './car.js';

export const physicsState = {
  world: null,
  ballBody: null,
  ballMesh: null
};

export async function initPhysics(ARENA) {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -30, z: 0 });
  physicsState.world = world;

  // ===== أرضية فيزيائية =====
  const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(ARENA.halfWidth, 0.5, ARENA.halfLength), floorBody);

  // ===== جدران جانبية =====
  for (const x of [-ARENA.halfWidth, ARENA.halfWidth]) {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, ARENA.ceiling/2, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(ARENA.wallThickness/2, ARENA.ceiling/2, ARENA.halfLength), body);
  }

  // ===== جدران خلفية =====
  for (const z of [-ARENA.halfLength, ARENA.halfLength]) {
    const sideW = ARENA.halfWidth - ARENA.goalHalfWidth;
    for (const sign of [-1, 1]) {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
        .setTranslation(sign * (ARENA.goalHalfWidth + sideW/2), ARENA.ceiling/2, z));
      world.createCollider(RAPIER.ColliderDesc.cuboid(sideW/2, ARENA.ceiling/2, ARENA.wallThickness/2), body);
    }
    const topBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, ARENA.goalHeight + (ARENA.ceiling-ARENA.goalHeight)/2, z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(ARENA.goalHalfWidth, (ARENA.ceiling-ARENA.goalHeight)/2, ARENA.wallThickness/2), topBody);
  }

  // ===== الكرة =====
  const ballRadius = 3.5;
  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(ballRadius, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 })
  );
  ballMesh.castShadow = true;
  scene.add(ballMesh); // scene غير معروف هنا! يجب تمريره أو إضافته في main.js
  // سنضيفها في main.js بدلاً من هنا، لكن للتبسيط سنستخدم مشهدًا عامًا
  // سنقوم بتصديرها واستخدامها في main.js
  physicsState.ballMesh = ballMesh;

  const ballBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 10, 0)
      .setLinearDamping(0.3).setAngularDamping(0.3)
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(ballRadius).setRestitution(0.7).setFriction(0.4).setDensity(1.0),
    ballBody
  );
  physicsState.ballBody = ballBody;

  // ===== جسم السيارة الفيزيائي =====
  const carBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 2, 40)
      .setLinearDamping(0.1)
      .setAngularDamping(2.0)
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(1.3, 0.55, 1.85).setRestitution(0.1).setFriction(1.5).setDensity(2.0),
    carBody
  );
  carState.body = carBody;

  return physicsState;
}