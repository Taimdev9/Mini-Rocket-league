import * as THREE from 'three';

// الأبعاد الرسمية مقسومة على 32 (لتناسب العرض على الهاتف)
const UU = 1/32;
export const ARENA = {
  halfWidth: 4096 * UU,        // 128
  halfLength: 5120 * UU,       // 160
  ceiling: 2044 * UU,          // ~64
  goalHeight: 642.775 * UU,    // ~20
  goalHalfWidth: 892.755 * UU, // ~27.9
  goalDepth: 880 * UU,         // 27.5
  wallThickness: 2
};

export function createArena(scene) {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a3a6a, transparent:true, opacity:0.85 });

  // الأرضية
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ARENA.halfWidth*2, 1, ARENA.halfLength*2),
    new THREE.MeshStandardMaterial({ color: 0x1a2456, roughness: 0.7 })
  );
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  scene.add(floor);

  // خط المنتصف
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x4cc9f0, emissive: 0x1a4a66 });
  const midLine = new THREE.Mesh(new THREE.BoxGeometry(ARENA.halfWidth*2, 0.1, 0.5), lineMat);
  midLine.position.y = 0.05;
  scene.add(midLine);

  // دائرة المركز
  const centerCircle = new THREE.Mesh(
    new THREE.RingGeometry(12, 13, 64),
    new THREE.MeshStandardMaterial({ color: 0x4cc9f0, emissive: 0x1a4a66, side: THREE.DoubleSide })
  );
  centerCircle.rotation.x = -Math.PI/2;
  centerCircle.position.y = 0.06;
  scene.add(centerCircle);

  // الجدران الجانبية
  for (const x of [-ARENA.halfWidth, ARENA.halfWidth]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(ARENA.wallThickness, ARENA.ceiling, ARENA.halfLength*2), wallMat);
    wall.position.set(x, ARENA.ceiling/2, 0);
    scene.add(wall);
  }

  // الجدران الخلفية مع فتحة المرمى
  function createBackWall(zPos) {
    const goalW = ARENA.goalHalfWidth * 2;
    const sideW = (ARENA.halfWidth*2 - goalW) / 2;
    for (const sign of [-1, 1]) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sideW, ARENA.ceiling, ARENA.wallThickness), wallMat);
      mesh.position.set(sign * (goalW/2 + sideW/2), ARENA.ceiling/2, zPos);
      scene.add(mesh);
    }
    const topMesh = new THREE.Mesh(
      new THREE.BoxGeometry(goalW, ARENA.ceiling - ARENA.goalHeight, ARENA.wallThickness), wallMat);
    topMesh.position.set(0, ARENA.goalHeight + (ARENA.ceiling - ARENA.goalHeight)/2, zPos);
    scene.add(topMesh);
  }
  createBackWall(-ARENA.halfLength);
  createBackWall(ARENA.halfLength);

  // أرضية المرمى
  const goalFloorMat = new THREE.MeshStandardMaterial({ color: 0x0d1a3a });
  for (const z of [-ARENA.halfLength, ARENA.halfLength]) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(ARENA.goalHalfWidth*2, 0.5, ARENA.goalDepth), goalFloorMat);
    mesh.position.set(0, 0.1, z + (z > 0 ? ARENA.goalDepth/2 : -ARENA.goalDepth/2));
    scene.add(mesh);
  }

  return ARENA;
}