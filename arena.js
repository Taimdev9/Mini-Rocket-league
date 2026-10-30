import * as THREE from 'three';

// ============================================================
// أبعاد الملعب الرسمية (Rocket League) مقسومة على 32
// ============================================================
const UU = 1 / 32;
export const ARENA = {
  halfWidth: 4096 * UU,        // 128
  halfLength: 5120 * UU,       // 160
  ceiling: 2044 * UU,          // ~64
  goalHeight: 642.775 * UU,    // ~20
  goalHalfWidth: 892.755 * UU, // ~27.9
  goalDepth: 880 * UU,         // 27.5
  wallThickness: 2
};

// ============================================================
// بناء الملعب
// ============================================================
export function createArena(scene) {
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a6a, transparent: true, opacity: 0.85
  });

  // ============================================================
  // 1. الأرضية
  // ============================================================
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ARENA.halfWidth * 2, 1, ARENA.halfLength * 2),
    new THREE.MeshStandardMaterial({
      color: 0x1e3a5f, roughness: 0.6, metalness: 0.1
    })
  );
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  scene.add(floor);

  // ============================================================
  // 2. خط المنتصف
  // ============================================================
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0x4cc9f0, emissive: 0x1a4a66, emissiveIntensity: 1.5
  });
  const midLine = new THREE.Mesh(
    new THREE.BoxGeometry(ARENA.halfWidth * 2, 0.1, 0.6),
    lineMat
  );
  midLine.position.y = 0.05;
  scene.add(midLine);

  // ============================================================
  // 3. دائرة المركز
  // ============================================================
  const centerCircle = new THREE.Mesh(
    new THREE.RingGeometry(12, 13, 64),
    new THREE.MeshStandardMaterial({
      color: 0x4cc9f0, emissive: 0x1a4a66,
      emissiveIntensity: 1.2, side: THREE.DoubleSide
    })
  );
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.y = 0.06;
  scene.add(centerCircle);

  // ============================================================
  // 4. الجدران الجانبية
  // ============================================================
  for (const x of [-ARENA.halfWidth, ARENA.halfWidth]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(ARENA.wallThickness, ARENA.ceiling, ARENA.halfLength * 2),
      wallMat
    );
    wall.position.set(x, ARENA.ceiling / 2, 0);
    scene.add(wall);
  }

  // ============================================================
  // 5. الجدران الخلفية مع فتحة المرمى
  // ============================================================
  function createBackWall(zPos) {
    const goalW = ARENA.goalHalfWidth * 2;
    const sideW = (ARENA.halfWidth * 2 - goalW) / 2;

    // الأجزاء الجانبية
    for (const sign of [-1, 1]) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sideW, ARENA.ceiling, ARENA.wallThickness),
        wallMat
      );
      mesh.position.set(sign * (goalW / 2 + sideW / 2), ARENA.ceiling / 2, zPos);
      scene.add(mesh);
    }

    // الجزء العلوي فوق المرمى
    const topMesh = new THREE.Mesh(
      new THREE.BoxGeometry(goalW, ARENA.ceiling - ARENA.goalHeight, ARENA.wallThickness),
      wallMat
    );
    topMesh.position.set(
      0,
      ARENA.goalHeight + (ARENA.ceiling - ARENA.goalHeight) / 2,
      zPos
    );
    scene.add(topMesh);
  }
  createBackWall(-ARENA.halfLength);
  createBackWall(ARENA.halfLength);

  // ============================================================
  // 6. أرضية المرمى + إضاءة المرمى
  // ============================================================
  const goalFloorMat = new THREE.MeshStandardMaterial({
    color: 0x0d1a3a, emissive: 0x0a2a5a, emissiveIntensity: 0.4
  });
  const goalLightColorA = new THREE.PointLight(0x4cc9f0, 2, 60);
  const goalLightColorB = new THREE.PointLight(0xff3b5c, 2, 60);

  for (const z of [-ARENA.halfLength, ARENA.halfLength]) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(ARENA.goalHalfWidth * 2, 0.5, ARENA.goalDepth),
      goalFloorMat
    );
    mesh.position.set(
      0, 0.1,
      z + (z > 0 ? ARENA.goalDepth / 2 : -ARENA.goalDepth / 2)
    );
    mesh.receiveShadow = true;
    scene.add(mesh);

    // إضاءة داخل المرمى
    const isBlue = z < 0;
    const light = isBlue ? goalLightColorA : goalLightColorB;
    light.position.set(0, ARENA.goalHeight / 2, z);
    scene.add(light);
  }

  // ============================================================
  // 7. مدرجات جانبية
  // ============================================================
  const standMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a6a, roughness: 0.8
  });

  for (const side of [-1, 1]) {
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(15, 8, ARENA.halfLength * 2),
      standMat
    );
    stand.position.set(side * (ARENA.halfWidth + 8), 4, 0);
    stand.receiveShadow = true;
    stand.castShadow = true;
    scene.add(stand);

    // حاجز أعلى المدرج
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1, ARENA.halfLength * 2),
      new THREE.MeshStandardMaterial({
        color: 0x4cc9f0, emissive: 0x1a4a66, emissiveIntensity: 1
      })
    );
    rail.position.set(side * (ARENA.halfWidth + 15.5), 8.5, 0);
    scene.add(rail);
  }

  // ============================================================
  // 8. نقاط البوست
  // ============================================================
  const boostPadGeo = new THREE.CylinderGeometry(2, 2, 0.25, 20);
  const boostPadMat = new THREE.MeshStandardMaterial({
    color: 0xffd166, emissive: 0xffaa00, emissiveIntensity: 2
  });

  const boostPositions = [
    [-60, 0.15, -80], [60, 0.15, -80],
    [-60, 0.15, 0],   [60, 0.15, 0],
    [-60, 0.15, 80],  [60, 0.15, 80]
  ];
  for (const [x, y, z] of boostPositions) {
    const pad = new THREE.Mesh(boostPadGeo, boostPadMat);
    pad.position.set(x, y, z);
    scene.add(pad);

    // هالة إضاءة صغيرة
    const halo = new THREE.PointLight(0xffd166, 0.4, 12);
    halo.position.set(x, y + 1, z);
    scene.add(halo);
  }

  return ARENA;
}