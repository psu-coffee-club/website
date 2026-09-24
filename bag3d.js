import * as THREE from "./vendor/three.module.js";

const WIDTH = 2.52;
const BOTTOM = -1.88;
const HINGE = 1.42;
const TOP = 1.88;
const FRONT = 0.36;
const BACK = -0.36;
const PANEL_HEIGHT = TOP - BOTTOM;
const FRONT_ART = "/images/bag-front-artwork.webp";
const CLUB_SEAL = "/images/psucoffee-logo.jpg";
const BEAN_ART = "/images/coffee-beans-interior.webp";

const clamp = (value) => Math.min(1, Math.max(0, value));
const widthScale = (y) => {
  const t = clamp((y - BOTTOM) / PANEL_HEIGHT);
  return 0.92 + 0.17 * Math.sin(t * Math.PI) - 0.11 * t;
};
const topHalfWidth = WIDTH / 2 * widthScale(TOP);

function paperDepth(face, x, y) {
  const edge = Math.abs(x) / (WIDTH / 2);
  const bulge = 0.16 * Math.max(0, 1 - edge * edge) * Math.sin(clamp((y - BOTTOM) / PANEL_HEIGHT) * Math.PI);
  const folds = (0.015 * Math.sin(y * 12.5 + x * 4.2) + 0.009 * Math.sin(y * 28 - x * 9)) * (0.55 + edge * 0.45);
  return face === "front" ? FRONT + bulge + folds : BACK - bulge - folds;
}

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
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1536;
  const context = canvas.getContext("2d");
  context.drawImage(art, 0, 0, canvas.width, canvas.height);
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
  texture.anisotropy = 8;
  return texture;
}

function makePanel(start, end, face, material) {
  const geometry = new THREE.PlaneGeometry(WIDTH, end - start, 32, 24);
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const coordinates = [];
  for (let index = 0; index < position.count; index += 1) {
    const u = uv.getX(index);
    const t = uv.getY(index);
    const originalY = start + t * (end - start);
    const x = (u - 0.5) * WIDTH * widthScale(originalY);
    coordinates.push({ x, t, originalY });
    uv.setY(index, (originalY - BOTTOM) / PANEL_HEIGHT);
    position.setXYZ(index, x, originalY, paperDepth(face, x, originalY));
  }
  position.needsUpdate = true;
  uv.needsUpdate = true;
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return { mesh, geometry, coordinates };
}

function topEdge(face, x, openness) {
  const delay = 0.34 * (0.5 - x / WIDTH);
  const reveal = clamp((openness - delay) / (1 - delay));
  const mouthShape = Math.sqrt(Math.max(0, 1 - (x / topHalfWidth) ** 2));
  const peel = reveal * mouthShape;
  const paperCut = 0.016 * Math.sin(13 * x + 0.5) + 0.008 * Math.sin(29 * x);
  if (face === "front") {
    return {
      y: TOP + paperCut - 0.31 * peel,
      z: 0.015 + 0.82 * peel,
    };
  }
  return {
    y: TOP + paperCut + 0.035 * peel,
    z: -0.015 - 0.66 * peel,
  };
}

function moveFlap(panel, face, openness) {
  const position = panel.geometry.getAttribute("position");
  const front = face === "front";
  for (let index = 0; index < position.count; index += 1) {
    const { x, t } = panel.coordinates[index];
    const edge = topEdge(face, x, openness);
    const y = HINGE + (edge.y - HINGE) * t;
    const hingeZ = paperDepth(face, x, HINGE);
    const z = hingeZ + (edge.z - hingeZ) * t + Math.sin(t * Math.PI) * (front ? 0.035 : -0.035);
    position.setXYZ(index, x, y, z);
  }
  position.needsUpdate = true;
  panel.geometry.computeVertexNormals();
}

function quad(material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return { mesh, geometry };
}

function setQuad(surface, points) {
  const position = surface.geometry.getAttribute("position");
  points.forEach((point, index) => position.setXYZ(index, ...point));
  position.needsUpdate = true;
  surface.geometry.computeVertexNormals();
}

function makeStrip(material, columns = 20) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array((columns + 1) * 6), 3));
  const uv = new Float32Array((columns + 1) * 4);
  for (let column = 0; column <= columns; column += 1) {
    uv[column * 4] = column / columns;
    uv[column * 4 + 1] = 0;
    uv[column * 4 + 2] = column / columns;
    uv[column * 4 + 3] = 1;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const indices = [];
  for (let column = 0; column < columns; column += 1) {
    const start = column * 2;
    indices.push(start, start + 1, start + 3, start, start + 3, start + 2);
  }
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return { mesh, geometry, columns };
}

function setStrip(surface, pointAt) {
  const position = surface.geometry.getAttribute("position");
  for (let column = 0; column <= surface.columns; column += 1) {
    const x = topHalfWidth * (column / surface.columns * 2 - 1);
    const [near, far] = pointAt(x);
    position.setXYZ(column * 2, ...near);
    position.setXYZ(column * 2 + 1, ...far);
  }
  position.needsUpdate = true;
  surface.geometry.computeVertexNormals();
}

function makeSideBody(sign, material) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const colors = [];
  const indices = [];
  const rows = 32;
  const profile = [
    { z: FRONT, offset: 0, color: 0xb69977 },
    { z: 0.2, offset: 0.09, color: 0x987555 },
    { z: 0.025, offset: 0.02, color: 0x6e5039 },
    { z: -0.2, offset: 0.09, color: 0x947250 },
    { z: BACK, offset: 0, color: 0x75543b },
  ];
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows;
    const y = BOTTOM + (HINGE - BOTTOM) * t;
    const edge = WIDTH / 2 * widthScale(y);
    for (const point of profile) {
      const fold = point.offset + 0.025 * Math.sin(y * 8 + point.z * 9);
      vertices.push(sign * (edge + fold), y, point.z);
      const shade = new THREE.Color(point.color);
      colors.push(shade.r, shade.g, shade.b);
    }
    if (row < rows) {
      const base = row * profile.length;
      for (let column = 0; column < profile.length - 1; column += 1) {
        const a = base + column;
        const b = base + column + 1;
        const c = base + profile.length + column + 1;
        const d = base + profile.length + column;
        indices.push(a, b, c, a, c, d);
      }
    }
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function makeShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, "rgba(45, 27, 15, .32)");
  gradient.addColorStop(1, "rgba(45, 27, 15, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.7, 2.2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = BOTTOM - 0.055;
  return shadow;
}

function mountBag(container, frontTexture, beanTexture, opening = 0) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2.6, -2.6, 0.1, 50);
  camera.position.set(0, 2.05, 8.3);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfff7e9, 0x6a4731, 2.05));
  const key = new THREE.DirectionalLight(0xfff5e4, 2.25);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const edgeLight = new THREE.DirectionalLight(0xe7c5a0, 1.15);
  edgeLight.position.set(3, 2, -4);
  scene.add(edgeLight);

  const bag = new THREE.Group();
  scene.add(bag);
  scene.add(makeShadow());
  const paper = new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.93, side: THREE.DoubleSide });
  const backPaper = new THREE.MeshStandardMaterial({ color: 0x644733, roughness: 0.96, side: THREE.DoubleSide });
  const gussetPaper = new THREE.MeshStandardMaterial({ color: 0x9b7857, roughness: 0.94, side: THREE.DoubleSide });
  const sidePaper = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.97, side: THREE.DoubleSide });
  const innerBeans = new THREE.MeshStandardMaterial({ map: beanTexture, roughness: 0.7, side: THREE.DoubleSide });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xc8bbaa, metalness: 0.24, roughness: 0.46, side: THREE.DoubleSide });

  const frontBody = makePanel(BOTTOM, HINGE, "front", paper);
  const frontFlap = makePanel(HINGE, TOP, "front", paper);
  const backBody = makePanel(BOTTOM, HINGE, "back", backPaper);
  const backFlap = makePanel(HINGE, TOP, "back", backPaper);
  bag.add(backBody.mesh, backFlap.mesh, frontBody.mesh, frontFlap.mesh);

  for (const sign of [-1, 1]) bag.add(makeSideBody(sign, sidePaper));
  const upperSides = [quad(gussetPaper), quad(gussetPaper)];
  bag.add(...upperSides.map((side) => side.mesh));
  const mouth = makeStrip(innerBeans, 32);
  bag.add(mouth.mesh);
  const frontLip = makeStrip(rimMaterial);
  const backLip = makeStrip(rimMaterial);
  bag.add(frontLip.mesh, backLip.mesh);

  let currentOpening = opening;
  const render = () => renderer.render(scene, camera);
  const setProgress = (value) => {
    currentOpening = clamp(value);
    moveFlap(frontFlap, "front", currentOpening);
    moveFlap(backFlap, "back", currentOpening);
    const half = topHalfWidth;
    const frontTop = topEdge("front", half, currentOpening);
    const backTop = topEdge("back", half, currentOpening);
    setQuad(upperSides[0], [
      [-WIDTH / 2 * widthScale(HINGE), HINGE, FRONT],
      [-half, frontTop.y, frontTop.z],
      [-half, backTop.y, backTop.z],
      [-WIDTH / 2 * widthScale(HINGE), HINGE, BACK],
    ]);
    setQuad(upperSides[1], [
      [WIDTH / 2 * widthScale(HINGE), HINGE, BACK],
      [half, backTop.y, backTop.z],
      [half, frontTop.y, frontTop.z],
      [WIDTH / 2 * widthScale(HINGE), HINGE, FRONT],
    ]);
    setStrip(mouth, (x) => {
      const front = topEdge("front", x, currentOpening);
      const back = topEdge("back", x, currentOpening);
      return [
        [x, front.y - 0.045, front.z - 0.025],
        [x, back.y - 0.045, back.z + 0.025],
      ];
    });
    setStrip(frontLip, (x) => {
      const edge = topEdge("front", x, currentOpening);
      return [[x, edge.y + 0.008, edge.z + 0.006], [x, edge.y - 0.028, edge.z - 0.03]];
    });
    setStrip(backLip, (x) => {
      const edge = topEdge("back", x, currentOpening);
      return [[x, edge.y + 0.008, edge.z - 0.006], [x, edge.y - 0.028, edge.z + 0.03]];
    });
    mouth.mesh.visible = currentOpening > 0.015;
    bag.rotation.y = -0.39 + currentOpening * 0.055;
    bag.rotation.x = currentOpening * -0.025;
    camera.position.y = 2.05 + 0.62 * currentOpening;
    camera.lookAt(0, 0.08 * currentOpening, 0);
    render();
  };

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const span = 4.7;
    camera.left = -span * aspect / 2;
    camera.right = span * aspect / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  setProgress(opening);
  container.classList.add("is-rendered");
  return { setProgress, resize, observer };
}

try {
  const [frontTexture, beanImage] = await Promise.all([makeFrontTexture(), loadImage(BEAN_ART)]);
  const beanTexture = new THREE.Texture(beanImage);
  beanTexture.colorSpace = THREE.SRGBColorSpace;
  beanTexture.anisotropy = 8;
  beanTexture.needsUpdate = true;
  const hero = document.querySelector('[data-bag-scene="hero"]');
  const story = document.querySelector('[data-bag-scene="story"]');
  if (hero) mountBag(hero, frontTexture, beanTexture, 0);
  if (story) {
    const model = mountBag(story, frontTexture, beanTexture, 0);
    window.coffeeBag3D = model;
    const track = document.querySelector(".unseal-track");
    if (track) {
      const travel = Math.max(1, track.offsetHeight - window.innerHeight);
      const progress = clamp(-track.getBoundingClientRect().top / travel);
      const t = clamp((progress - 0.08) / 0.75);
      model.setProgress(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : t * t * (3 - 2 * t));
    }
  }
} catch (error) {
  document.querySelectorAll('[data-bag-scene]').forEach((container) => container.classList.add('is-unavailable'));
  console.error('Coffee bag 3D scene could not load:', error);
}
