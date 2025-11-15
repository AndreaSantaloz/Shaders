import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// Shaders
const textureLoader = new THREE.TextureLoader();

// 2. Carga las texturas del planeta
const colorMap = textureLoader.load("mapadia.jpg");
const normalMap = textureLoader.load("normal.png");
const specularMap = textureLoader.load("specular.png");
specularMap.wrapS = specularMap.wrapT = THREE.RepeatWrapping;
specularMap.needsUpdate = true;

// ------------------------------------------------------------
// --- 1. CONFIGURACIÓN DE SHADERMATERIAL Y UNIFORMS ---
// ------------------------------------------------------------

// Ajustamos la luz para el shader. La dirección de la luz debe ser un vector normalizado.
const lightPosition = new THREE.Vector3(100, 50, 150); // Posición de luz alejada
const lightDirection = lightPosition.clone().normalize();
const lightIntensity = 1.5; // Intensidad alta

const uniforms = {
  // Texturas
  u_map: { value: colorMap },
  u_normalMap: { value: normalMap },
  u_roughnessMap: { value: specularMap }, // Usado como Roughness/Specular

  // Parámetros de la Tierra/Shader
  u_normalScale: { value: new THREE.Vector2(20.0, 20.0) }, // Intensidad del relieve
  u_lightDirection: { value: lightDirection },
  u_lightColor: { value: new THREE.Color(0xffffff) },
  u_lightIntensity: { value: lightIntensity },
};

// Vertex Shader: Pasa la UV, la normal y la posición para el Fragment Shader
const vertexShaderCode = `
    varying vec2 vUv;
    varying vec3 vNormal; 
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal); // Transforma la normal al espacio de la vista
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Fragment Shader: Calcula la iluminación usando Normal Mapping y Roughness
const fragmentShaderCode = `
    uniform sampler2D u_map;
    uniform sampler2D u_normalMap;
    uniform sampler2D u_roughnessMap;

    uniform vec2 u_normalScale;
    uniform vec3 u_lightDirection;
    uniform vec3 u_lightColor;
    uniform float u_lightIntensity;

    varying vec2 vUv;
    varying vec3 vNormal;

    // Función que perturba la normal (Normal Mapping simplificado)
    vec3 perturbNormal(vec3 N) {
        vec3 mapN = texture2D(u_normalMap, vUv).xyz * 2.0 - 1.0;
        mapN.xy *= u_normalScale;
        return normalize(N + mapN); 
    }

    void main() {
        // 1. Obtener color base de la textura
        vec4 color = texture2D(u_map, vUv);
        
        // 2. Obtener la rugosidad (usada aquí para diferenciar tierra/agua)
        float roughness = texture2D(u_roughnessMap, vUv).g;

        // 3. Calcular la normal perturbada por el Normal Map
        vec3 perturbedNormal = perturbNormal(vNormal);

        // 4. Modelo de Iluminación: Lambertiano (Difuso)
        float NdotL = max(dot(perturbedNormal, u_lightDirection), 0.0);
        
        // 5. Calcular el color difuso (luz * factor de incidencia * color de la textura)
        vec3 diffuse = NdotL * u_lightColor * u_lightIntensity;
        
        // 6. Oscurecer ligeramente el océano (simulación de reflexión/no difusa)
        if (roughness < 0.2) { 
            diffuse *= 0.7; 
        }
        
        // 7. Color Final
        gl_FragColor = vec4(color.rgb * diffuse, 1.0);
    }
`;

// Crear el ShaderMaterial
const shaderMaterial = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: vertexShaderCode,
  fragmentShader: fragmentShaderCode,
  lights: false,
});

// ------------------------------------------------------------
// --- 2. CONFIGURACIÓN DE LA ESCENA Y OBJETOS ---
// ------------------------------------------------------------

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 100;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000010);
document.body.appendChild(renderer.domElement);

const radius = 50;
const sphereGeometry = new THREE.SphereGeometry(radius, 64, 64);
sphereGeometry.computeTangents();

// ASIGNAMOS EL SHADERMATERIAL
const earth = new THREE.Mesh(sphereGeometry, shaderMaterial);
scene.add(earth);

const lineMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  opacity: 0.5,
  transparent: true,
});

// --- Creación de líneas de latitud y longitud (Sin cambios) ---
const latStep = 10;
for (let lat = -80; lat <= 80; lat += latStep) {
  const theta = THREE.MathUtils.degToRad(lat);
  const y = radius * Math.sin(theta);
  const r = radius * Math.cos(theta);
  const points = [];
  for (let lon = 0; lon <= 360; lon += 5) {
    const phi = THREE.MathUtils.degToRad(lon);
    points.push(new THREE.Vector3(r * Math.cos(phi), y, r * Math.sin(phi)));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  scene.add(new THREE.Line(geometry, lineMaterial));
}

const lonStep = 10;
for (let lon = 0; lon < 360; lon += lonStep) {
  const phi = THREE.MathUtils.degToRad(lon);
  const points = [];
  for (let lat = -90; lat <= 90; lat += 5) {
    const theta = THREE.MathUtils.degToRad(lat);
    const x = radius * Math.cos(theta) * Math.cos(phi);
    const y = radius * Math.sin(theta);
    const z = radius * Math.cos(theta) * Math.sin(phi);
    points.push(new THREE.Vector3(x, y, z));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  scene.add(new THREE.Line(geometry, lineMaterial));
}

// ------------------------------------------------------------
// --- 3. FUNCIONES DE MIGRACIÓN Y AVES (REINTEGRADAS) ---
// ------------------------------------------------------------

// --- Función de conversión de Lat/Lon a Vector3 ---
function latLonToVector3(lat, lon, r = radius + 1.5) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

// --- MAPA DE COLORES POR ESPECIE ---
const SPECIES_COLOR_MAP = new Map([
  ["Warbler", 0x00ff00],
  ["Hawk", 0xff0000],
  ["Crane", 0x0000ff],
  ["Eagle", 0xffff00],
  ["Owl", 0x800080],
  ["Pigeon", 0x00ffff],
]);

function getSpeciesColor(species) {
  return SPECIES_COLOR_MAP.get(species) || 0xffffff;
}

const birds = [];

// Función auxiliar: Crea un arco de migración
function createArc(
  startLat,
  startLon,
  endLat,
  endLon,
  color,
  width,
  opacity,
  count
) {
  const start = latLonToVector3(startLat, startLon, radius + 0.5);
  const end = latLonToVector3(endLat, endLon, radius + 0.5);
  const controlPoint = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5)
    .normalize()
    .multiplyScalar(radius * 1.8);

  const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
  const points = curve.getPoints(30);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: color,
    linewidth: width,
    transparent: true,
    opacity: opacity,
  });

  const arc = new THREE.Line(geometry, material);
  arc.userData = {
    isMigrationArc: true,
    count: count,
    startRegion: `${startLat},${startLon}`,
    endRegion: `${endLat},${endLon}`,
    curve: curve,
    color: color,
  };

  scene.add(arc);
  return arc;
}

// Función auxiliar: Crea las aves para el arco
function createBirdsForArc(arc, numBirds, color) {
  for (let i = 0; i < numBirds; i++) {
    const birdGeometry = new THREE.SphereGeometry(0.3, 8, 8);

    // MeshBasicMaterial para las aves, ya que no necesitan iluminación compleja
    const birdMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    });

    const bird = new THREE.Mesh(birdGeometry, birdMaterial);
    bird.userData = {
      isBird: true,
      arc: arc,
      progress: Math.random(),
      speed: 0.002 + Math.random() * 0.003,
      curve: arc.userData.curve,
    };

    updateBirdPosition(bird);

    scene.add(bird);
    birds.push(bird);
  }
}

// Función auxiliar: Actualiza la posición del ave
function updateBirdPosition(bird) {
  const progress = bird.userData.progress;
  const curve = bird.userData.curve;
  const position = curve.getPoint(progress);
  bird.position.copy(position);
  if (progress < 0.99) {
    const tangent = curve.getTangent(progress);
    bird.lookAt(bird.position.clone().add(tangent));
  }
}

// La función que buscabas: Anima la migración de las aves
function animateBirds() {
  birds.forEach((bird) => {
    if (bird.userData.isBird) {
      bird.userData.progress += bird.userData.speed;
      if (bird.userData.progress >= 1) {
        bird.userData.progress = 0;
      }
      updateBirdPosition(bird);
      // Efecto de parpadeo simple
      bird.material.opacity = 0.7 + Math.sin(Date.now() * 0.005) * 0.2;
    }
  });
}

// Función principal: Crea todos los arcos de migración
function createMigrationArcs(migrationData) {
  console.log("Creando arcos de migración con", migrationData.length, "rutas");

  if (migrationData.length === 0) {
    console.warn("No hay datos de migración");
    return;
  }

  const routeGroups = {};

  migrationData.forEach((migration) => {
    const startRegion = `${Math.round(migration.startLat / 15) * 15},${
      Math.round(migration.startLon / 15) * 15
    }`;
    const endRegion = `${Math.round(migration.endLat / 15) * 15},${
      Math.round(migration.endLon / 15) * 15
    }`;
    const routeKey = `${migration.species}|${startRegion}|${endRegion}`;

    if (!routeGroups[routeKey]) {
      routeGroups[routeKey] = {
        species: migration.species,
        startLat: parseFloat(startRegion.split(",")[0]),
        startLon: parseFloat(startRegion.split(",")[1]),
        endLat: parseFloat(endRegion.split(",")[0]),
        endLon: parseFloat(endRegion.split(",")[1]),
        count: 0,
      };
    }
    routeGroups[routeKey].count++;
  });

  const sortedRoutes = Object.values(routeGroups)
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  sortedRoutes.forEach((route) => {
    const intensity = Math.min(route.count / 20, 1);
    const lineWidth = 0.5 + intensity * 2;
    const opacity = 0.3 + intensity * 0.5;

    const arcColor = getSpeciesColor(route.species);

    const arc = createArc(
      route.startLat,
      route.startLon,
      route.endLat,
      route.endLon,
      arcColor,
      lineWidth,
      opacity,
      route.count
    );
    const numBirds = Math.max(1, Math.floor(intensity * 8));

    createBirdsForArc(arc, numBirds, arcColor);
  });

  console.log("Arcos de migración creados exitosamente");
}

// Función de carga de datos (Sin cambios)
async function loadMigrationData() {
  try {
    console.log("Cargando datos de migración para arcos...");
    const response = await fetch("bird_migration_data.csv");

    if (!response.ok) {
      throw new Error(`Error HTTP! status: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.split("\n").filter((line) => line.trim() !== "");

    if (lines.length <= 1) {
      throw new Error("CSV vacío o solo tiene headers");
    }

    const migrationData = [];
    const headers = lines[0].split(",").map((h) => h.trim());

    const speciesIdx = headers.findIndex((h) => h === "Species");
    const startLatIdx = headers.findIndex((h) => h === "Start_Latitude");
    const startLonIdx = headers.findIndex((h) => h === "Start_Longitude");
    const endLatIdx = headers.findIndex((h) => h === "End_Latitude");
    const endLonIdx = headers.findIndex((h) => h === "End_Longitude");

    if (
      speciesIdx === -1 ||
      startLatIdx === -1 ||
      startLonIdx === -1 ||
      endLatIdx === -1 ||
      endLonIdx === -1
    ) {
      throw new Error(
        "No se encontraron las columnas necesarias (Species, Start o End)"
      );
    }

    let processed = 0;

    for (let i = 1; i < lines.length; i++) {
      if (Math.random() > 0.1) continue;

      const line = lines[i];
      const columns = line.split(",").map((col) => col.trim());

      if (
        columns.length >
        Math.max(speciesIdx, startLatIdx, startLonIdx, endLatIdx, endLonIdx)
      ) {
        const species = columns[speciesIdx];
        const startLat = parseFloat(columns[startLatIdx]);
        const startLon = parseFloat(columns[startLonIdx]);
        const endLat = parseFloat(columns[endLatIdx]);
        const endLon = parseFloat(columns[endLonIdx]);

        if (
          species &&
          !isNaN(startLat) &&
          !isNaN(startLon) &&
          !isNaN(endLat) &&
          !isNaN(endLon)
        ) {
          migrationData.push({ species, startLat, startLon, endLat, endLon });
          processed++;
        }
      }
    }

    if (migrationData.length === 0) {
      console.log("Creando datos de ejemplo para arcos...");
    } else {
      createMigrationArcs(migrationData);
    }
  } catch (error) {
    console.error("Error cargando datos reales:", error);
    console.log("Creando datos de ejemplo para arcos...");
  }
}

// ------------------------------------------------------------
// --- 4. BUCLE PRINCIPAL DE ANIMACIÓN ---
// ------------------------------------------------------------

function init() {
  let controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
}

function animate() {
  requestAnimationFrame(animate);
  earth.rotation.y += 0.003;
  scene.traverse((obj) => {
    if (obj.type === "Line" || (obj.userData && obj.userData.isMigrationArc)) {
      obj.rotation.y += 0.003;
    }
  });

  // LLAMADA A LA FUNCIÓN DE ANIMACIÓN DE AVES
  animateBirds();

  renderer.render(scene, camera);
}

console.log(
  "Iniciando visualización de arcos de migración con pájaros con ShaderMaterial..."
);
init();
animate();
loadMigrationData();
