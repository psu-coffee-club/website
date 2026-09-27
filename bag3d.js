import * as THREE from "./vendor/three.module.js";

const compactBag = window.matchMedia('(max-width: 760px)').matches || navigator.connection?.saveData;
const FRONT_ART = compactBag ? '/images/bag-front-artwork-medium.webp' : '/images/bag-front-artwork.webp';
const CLUB_SEAL = "/images/psucoffee-logo.jpg";
const BOTTOM = -1.9;
const HEIGHT = 3.8;
const clamp = (n) => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

async function makeFrontTexture() {
  const [art, seal] = await Promise.all([loadImage(FRONT_ART), loadImage(CLUB_SEAL)]);
  // The poster is already visible; don't hold the model behind every web font.
  const scale = compactBag ? 0.75 : 1;
  const canvas = document.createElement("canvas");
  canvas.width = 1024 * scale;
  canvas.height = 1536 * scale;
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.drawImage(art, 0, 0, 1024, 1536);
  context.save();
  context.beginPath();
  context.arc(512, 491, 99, 0, Math.PI * 2);
  context.clip();
  context.drawImage(seal, 413, 392, 198, 198);
  context.restore();
  context.fillStyle = "#4c3528";
  context.textAlign = "center";
  context.font = '600 76px "Newsreader", Georgia, serif';
  context.fillText("PENN STATE", 512, 665);
  context.font = '500 80px "Newsreader", Georgia, serif';
  context.fillText("COFFEE CLUB", 512, 754);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = compactBag ? 4 : 8;
  return texture;
}


// All four walls share this coordinate system, including their exact seam positions.
// Opening pressure travels down the pouch; the bottom gusset stays on the table.
function facePoint(face, u, v, progress) {
  const delay = 0.10 * (1 - u) / 2;
  const open = smooth(0.12 + delay, 0.83 + delay, progress);
  const settle = smooth(0.72, 1, progress);
  const tension = Math.sin(Math.PI * smooth(0, 0.55, progress));
  const shoulder = smooth(0.32, 1, v);
  const neck = smooth(0.66, 1, v);
  const halfWidth = 1.035 + 0.095 * Math.sin(Math.PI * v)
    - 0.10 * open * shoulder + 0.016 * tension * shoulder;
  const centre = Math.max(0, 1 - u * u);
  const bodyDepth = 0.31 + 0.13 * Math.sin(Math.PI * v);
  const closedDepth = mix(bodyDepth, 0.008, neck);
  const openDepth = 0.34 + 0.25 * shoulder;
  const depth = mix(closedDepth, openDepth, open * (0.16 + 0.84 * shoulder));
  const cornerDepth = mix(0.79, 0.55, shoulder * open);
  const crossSection = cornerDepth + (1 - cornerDepth) * Math.pow(centre, 0.72);
  const front = face === 'front';
  const sign = front ? 1 : -1;
  // Broad diagonal paper folds, strongest near the corners, soften under tension.
  const edgeWeight = Math.pow(Math.abs(u), 3);
  const bottomFold = Math.exp(-Math.pow((v - 0.09 - 0.075 * Math.abs(u)) / 0.055, 2));
  const shoulderFold = Math.exp(-Math.pow((v - 0.75 + 0.13 * Math.abs(u)) / 0.065, 2));
  const fineCrease = 0.014 * Math.sin(54 * v + 12 * u) * Math.exp(-Math.pow((Math.abs(u) - 0.9) / 0.12, 2)) * Math.sin(Math.PI * v);
  const fold = fineCrease + (0.068 * bottomFold - 0.045 * shoulderFold * (1 - 0.55 * open)) * edgeWeight;
  const bow = 0.032 * Math.sin(2.5 * Math.PI * v + u * 1.4) * Math.sin(Math.PI * v) * edgeWeight;
  const lipBend = smooth(0.86, 1, v) * open * centre;
  const x = u * halfWidth + 0.025 * tension * Math.sin(Math.PI * v);
  const y = BOTTOM + HEIGHT * v
    - open * shoulder * (front ? 0.12 : 0.028) * centre
    - (front ? 0.065 : -0.025) * lipBend
    + 0.007 * Math.sin(5.5 * u + 1.2) * smooth(0.9, 1, v);
  const z = sign * (depth * crossSection + fold + bow)
    + sign * (front ? 0.045 : 0.025) * lipBend
    - sign * 0.018 * settle * shoulder * centre;
  return [x, y, z];
}

function wallPoint(wall, u, v, progress) {
  if (wall === 'front' || wall === 'back') return facePoint(wall, u, v, progress);
  const sign = wall === 'right' ? 1 : -1;
  const front = facePoint('front', sign, v, progress);
  const back = facePoint('back', sign, v, progress);
  const t = (u + 1) / 2;
  const open = smooth(0.15, 0.9, progress);
  const wave = Math.sin(Math.PI * t);
  const gusset = (0.17 - 0.13 * open * smooth(0.2, 1, v)) * wave * wave;
  return [
    mix(front[0], back[0], t) - sign * gusset,
    mix(front[1], back[1], t) - 0.025 * wave * smooth(0.7, 1, v) * open,
    mix(front[2], back[2], t),
  ];
}

function paperGrain() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const data = context.createImageData(256, 256);
  let seed = 71;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const value = 118 + (seed / 4294967296) * 26;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = value;
    data.data[i + 3] = 255;
  }
  // Tangent-space fibre normals work in both the physical and path-traced renderers.
  const heights = new Uint8ClampedArray(data.data);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      const dx = (heights[(y * 256 + (x + 1) % 256) * 4] - heights[i]) / 255;
      const dy = (heights[(((y + 1) % 256) * 256 + x) * 4] - heights[i]) / 255;
      const length = Math.sqrt(dx * dx + dy * dy + 1);
      data.data[i] = 128 - dx / length * 127;
      data.data[i + 1] = 128 - dy / length * 127;
      data.data[i + 2] = 128 + 127 / length;
    }
  }
  context.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 6);
  return texture;
}

function makeWall(wall, material, inside = false) {
  const cols = wall === 'front' || wall === 'back' ? 64 : 24;
  const rows = 80;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((cols + 1) * (rows + 1) * 3);
  const uv = new Float32Array((cols + 1) * (rows + 1) * 2);
  const colors = new Float32Array(positions.length);
  const indices = [];
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const index = row * (cols + 1) + col;
      const v = row / rows;
      uv[index * 2] = col / cols;
      uv[index * 2 + 1] = v;
      // The lining loses light progressively towards the bottom of the bag.
      const light = inside ? 0.08 + 0.72 * Math.pow(v, 3) : 1;
      colors[index * 3] = colors[index * 3 + 1] = colors[index * 3 + 2] = light;
      if (row < rows && col < cols) {
        const a = index, b = a + 1, c = a + cols + 1, d = c + 1;
        const reverse = (wall === 'back' || wall === 'left') !== inside;
        if (reverse) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = !inside;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return {
    mesh,
    update(progress) {
      const attr = geometry.attributes.position;
      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= cols; col++) {
          const point = wallPoint(wall, col / cols * 2 - 1, row / rows, progress);
          if (inside) {
            // A separate inset lining, open at the top, with real depth behind the rim.
            point[0] *= 0.996;
            point[2] *= 0.985;
            point[1] -= 0.004;
          }
          attr.setXYZ(row * (cols + 1) + col, ...point);
        }
      }
      attr.needsUpdate = true;
      geometry.computeVertexNormals();
    },
  };
}

function makeRim(wall, material, v = 1) {
  const columns = wall === 'front' || wall === 'back' ? 64 : 24;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((columns + 1) * 6);
  const indices = [];
  for (let col = 0; col < columns; col++) {
    const a = col * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    update(progress) {
      for (let col = 0; col <= columns; col++) {
        const a = wallPoint(wall, col / columns * 2 - 1, v, progress);
        const b = wallPoint(wall, col / columns * 2 - 1, v - 0.006, progress);
        if (v < 1) { a[0] *= 0.992; a[2] *= 0.96; b[0] *= 0.992; b[2] *= 0.96; }
        geometry.attributes.position.setXYZ(col * 2, ...a);
        geometry.attributes.position.setXYZ(col * 2 + 1, ...b);
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
    },
  };
}

function makeFloor(material) {
  const geometry = new THREE.PlaneGeometry(1.95, 0.44);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = BOTTOM + 0.01;
  return mesh;
}

function makeContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(45,30,20,.30)');
  gradient.addColorStop(0.6, 'rgba(45,30,20,.10)');
  gradient.addColorStop(1, 'rgba(45,30,20,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.7), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false,
  }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = BOTTOM - 0.025;
  return mesh;
}

// Linear HDR studio environment: broad softboxes give paper and foil a shared light field.
function makeStudioEnvironment() {
  const width = compactBag ? 256 : 512, height = compactBag ? 128 : 256;
  const pixels = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width, v = y / height;
      const softbox = (cx, cy, sx, sy, power) => power * Math.exp(-Math.pow((u - cx) / sx, 8) - Math.pow((v - cy) / sy, 8));
      const light = 0.16 + 0.2 * (1 - v) + softbox(0.22, 0.33, 0.055, 0.18, 4.5)
        + softbox(0.71, 0.38, 0.08, 0.2, 2.1) + softbox(0.48, 0.13, 0.16, 0.055, 2.8);
      const i = (y * width + x) * 4;
      pixels[i] = light; pixels[i + 1] = light * 0.96; pixels[i + 2] = light * 0.89; pixels[i + 3] = 1;
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}

// Geometry changes invalidate accumulated rays. Rasterize during motion and accumulate
// only after the pose settles; never rebuild a BVH in the scroll animation loop.
function makeRefinement(renderer, scene, camera, container) {
  const eligible = container.dataset.bagScene === 'story'
    && window.matchMedia('(min-width: 900px) and (pointer: fine)').matches
    && renderer.extensions.has('EXT_color_buffer_float');
  let tracer, loading, timer = 0, frame = 0, generation = 0, visible = false, failed = false;
  const cancel = () => {
    container.dataset.renderMode = 'physical';
    generation++;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    timer = frame = 0;
  };
  const schedule = () => {
    if (!eligible || !visible || document.hidden || failed) return;
    clearTimeout(timer);
    const token = generation;
    timer = setTimeout(async () => {
      try {
        if (!tracer) {
          loading ||= import('./vendor/pathtracer.js');
          const { WebGLPathTracer } = await loading;
          if (generation !== token || !visible || document.hidden) return;
          tracer = new WebGLPathTracer(renderer);
          tracer.bounces = 4;
          tracer.filterGlossyFactor = 0.5;
          tracer.tiles.set(3, 3);
          tracer.renderScale = Math.min(1, 1.5 / renderer.getPixelRatio());
          tracer.minSamples = 24;
          tracer.fadeDuration = 1000;
          tracer.renderDelay = 0;
          tracer.textureSize.set(1024, 1536);
        }
        if (generation !== token || !visible || document.hidden) return;
        scene.updateMatrixWorld(true);
        tracer.setScene(scene, camera);
        tracer.reset();
        const sample = () => {
          if (generation !== token || !visible || document.hidden) return;
          try {
            tracer.renderSample();
            if (tracer.samples >= tracer.minSamples) container.dataset.renderMode = 'path-traced';
            if (tracer.samples < 96) frame = requestAnimationFrame(sample);
          } catch (error) {
            failed = true;
            renderer.render(scene, camera);
            console.warn('Bag refinement unavailable; using physical renderer.', error);
          }
        };
        frame = requestAnimationFrame(sample);
      } catch (error) {
        failed = true;
        renderer.render(scene, camera);
        console.warn('Bag refinement unavailable; using physical renderer.', error);
      }
    }, 450);
  };
  if (eligible) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule(); else cancel();
    }, { threshold: 0.15 }).observe(container);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancel(); else schedule();
    });
  }
  return { cancel, schedule };
}

function mountBag(container, frontTexture) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'default' });
  const lowPower = navigator.connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2.4, -2.4, 0.1, 30);
  camera.position.set(0, 2.45, 8.5);
  camera.lookAt(0, 0, 0);
  scene.environment = makeStudioEnvironment();
  scene.environmentIntensity = 0.8;
  const key = new THREE.DirectionalLight(0xfff9f1, 2.0);
  key.position.set(-3.5, 5.5, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(compactBag ? 1024 : 2048, compactBag ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -3, near: 0.1, far: 20 });
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.015;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffecd2, 0.35);
  fill.position.set(4, 1, 4);
  scene.add(fill);
  const edge = new THREE.DirectionalLight(0xffffff, 0.7);
  edge.position.set(1, 3, -4);
  scene.add(edge);

  const grain = paperGrain();
  const frontMaterial = new THREE.MeshPhysicalMaterial({ map: frontTexture, roughness: 0.63,  normalMap: grain, normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 0.12, clearcoatRoughness: 0.6 });
  const kraft = new THREE.MeshPhysicalMaterial({ color: 0xb5a18b, roughness: 0.7,  normalMap: grain, normalScale: new THREE.Vector2(0.4, 0.4), clearcoat: 0.08, clearcoatRoughness: 0.65 });
  const lining = new THREE.MeshStandardMaterial({ color: 0xb8b2a8, vertexColors: true, roughness: 0.34, metalness: 0.82,  normalMap: grain, normalScale: new THREE.Vector2(0.18, 0.18) });
  const lip = new THREE.MeshStandardMaterial({ color: 0xb9a78d, roughness: 0.66, side: THREE.DoubleSide });
  const zipper = new THREE.MeshStandardMaterial({ color: 0x72624f, roughness: 0.7, side: THREE.DoubleSide });
  const bag = new THREE.Group();
  scene.add(bag);
  const deformers = [];
  for (const wall of ['front', 'right', 'back', 'left']) {
    deformers.push(makeWall(wall, wall === 'front' ? frontMaterial : kraft));
    deformers.push(makeWall(wall, lining, true));
    deformers.push(makeRim(wall, lip));
    if (wall === 'front' || wall === 'back') deformers.push(makeRim(wall, zipper, 0.968));
  }
  bag.add(...deformers.map(part => part.mesh));
  bag.add(makeFloor(new THREE.MeshBasicMaterial({ color: 0x17120e, side: THREE.DoubleSide })));
  scene.add(makeContactShadow());


  let current = 0;
  let target = 0;
  let frame = 0;
  let previousTime = 0;
  const refinement = makeRefinement(renderer, scene, camera, container);
  const draw = (value) => {
    refinement.cancel();
    deformers.forEach(part => part.update(value));
    const turn = smooth(0, 0.75, value);
    bag.rotation.y = mix(-0.33, -0.54, turn);
    // Rotation reveals the unfolding side. The camera and grounded base remain stable.
    renderer.render(scene, camera);
  };
  const tick = (now) => {
    frame = 0;
    const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 1 / 60;
    previousTime = now;
    current += (target - current) * (1 - Math.exp(-dt / 0.085));
    if (Math.abs(target - current) < 0.00025) current = target;
    draw(current);
    if (current !== target && !document.hidden) frame = requestAnimationFrame(tick);
    else { previousTime = 0; refinement.schedule(); }
  };
  const setProgress = (value, immediate = false) => {
    const next = clamp(value);
    if (immediate || motionPreference.matches) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      current = target = next;
      draw(current);
      refinement.schedule();
      return;
    }
    if (target === next) return;
    target = next;
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    const span = 4.65;
    camera.left = -span * width / height / 2;
    camera.right = span * width / height / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
    draw(current);
    refinement.schedule();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  container.classList.add('is-rendered');
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
    else if (!document.hidden && current !== target && !frame) frame = requestAnimationFrame(tick);
  });
  return { setProgress };
}

try {
  const frontTexture = await makeFrontTexture();
  const mountWhenNear = (container, mount) => {
    if (!('IntersectionObserver' in window)) { mount(); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      mount();
    }, { rootMargin: '250px 0px' });
    observer.observe(container);
  };
  const hero = document.querySelector('[data-bag-scene="hero"]');
  if (hero) {
    mountWhenNear(hero, () => {
      try {
        mountBag(hero, frontTexture);
      } catch (error) {
        hero.classList.add('is-unavailable');
        console.error('Coffee bag scene could not load:', error);
      }
    });
  }
  const story = document.querySelector('[data-bag-scene="story"]');
  if (story) {
    mountWhenNear(story, () => {
      try {
        const model = mountBag(story, frontTexture);
        window.coffeeBag3D = model;
        const track = document.querySelector('.unseal-track');
        const travel = Math.max(1, track.offsetHeight - window.innerHeight);
        const progress = clamp(-track.getBoundingClientRect().top / travel);
        model.setProgress(motionPreference.matches ? 1 : progress, true);
      } catch (error) {
        story.classList.add('is-unavailable');
        console.error('Coffee bag scene could not load:', error);
      }
    });
  }
} catch (error) {
  document.querySelectorAll('[data-bag-scene]').forEach(container => container.classList.add('is-unavailable'));
  console.error('Coffee bag artwork could not load:', error);
}
