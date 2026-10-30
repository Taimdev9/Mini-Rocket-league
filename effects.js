import * as THREE from 'three';

// ============================================================
// تحسين الإضاءة والسماء والمؤثرات البصرية
// ============================================================
export function setupEffects(scene) {
  // 1. سماء متدرجة (Gradient Sky)
  const skyGeo = new THREE.SphereGeometry(500, 32, 32);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x0a0f2e) },
      bottomColor: { value: new THREE.Color(0x1a2456) },
      offset: { value: 50 },
      exponent: { value: 0.6 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // 2. إضاءة محسّنة
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.0));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(60, 100, 40);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -150;
  keyLight.shadow.camera.right = 150;
  keyLight.shadow.camera.top = 150;
  keyLight.shadow.camera.bottom = -150;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  // إضاءة ملونة خلفية (Atmosphere)
  const fillLight1 = new THREE.PointLight(0x4cc9f0, 0.8, 200);
  fillLight1.position.set(-80, 40, -80);
  scene.add(fillLight1);

  const fillLight2 = new THREE.PointLight(0xff3b5c, 0.6, 200);
  fillLight2.position.set(80, 40, 80);
  scene.add(fillLight2);

  // 3. ضباب خفيف
  scene.fog = new THREE.Fog(0x0a0f1e, 180, 450);
}