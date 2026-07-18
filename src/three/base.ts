import * as THREE from 'three';

export interface BaseGameContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
  container: HTMLElement;
  cleanup: () => void;
}

export function createBaseScene(container: HTMLElement): BaseGameContext {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x06070d, 10, 60);

  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    500
  );
  camera.position.set(0, 1.6, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const clock = new THREE.Clock();

  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  const cleanup = () => {
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return { scene, camera, renderer, clock, container, cleanup };
}

export function makePointerLock(camera: THREE.PerspectiveCamera, dom: HTMLElement) {
  let yaw = 0;
  let pitch = 0;
  let isLocked = false;

  const onMouseMove = (e: MouseEvent) => {
    if (!isLocked) return;
    yaw -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, pitch));
    const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  };

  const lock = () => {
    dom.requestPointerLock();
  };
  const unlock = () => {
    document.exitPointerLock();
  };

  const onLockChange = () => {
    isLocked = document.pointerLockElement === dom;
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onLockChange);

  const setRotation = (y: number, p: number) => {
    yaw = y;
    pitch = p;
    const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  };

  const getDirection = () => {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    return dir;
  };

  const cleanup = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('pointerlockchange', onLockChange);
  };

  return { lock, unlock, isLocked: () => isLocked, setRotation, getDirection, cleanup };
}

export function wasdKeys(): {
  keys: Record<string, boolean>;
  isDown: (code: string) => boolean;
  cleanup: () => void;
} {
  const keys: Record<string, boolean> = {};
  const down = (e: KeyboardEvent) => {
    keys[e.code] = true;
  };
  const up = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return {
    keys,
    isDown: (code: string) => !!keys[code],
    cleanup: () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    },
  };
}

export function createGround(width: number, depth: number, color: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, depth, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function ambientLighting(scene: THREE.Scene, opts?: { ambient?: number; hemi?: boolean }) {
  const ambient = new THREE.AmbientLight(0xffffff, opts?.ambient ?? 0.35);
  scene.add(ambient);
  if (opts?.hemi ?? true) {
    const hemi = new THREE.HemisphereLight(0x88aaff, 0x222244, 0.5);
    scene.add(hemi);
  }
  return ambient;
}

export function disposeScene(scene: THREE.Scene) {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material?.dispose();
      }
    }
  });
}
