# Shaders

En este proyecto se basa en desarrollar shaders para una prática anterior hecha donde,en mi caso,escogi la de visualización de datos donde hize un shader para resaltar el relieve y la luz y 
en la segunda parte nos pedian realizar un fragment shader con patrón generativo lo cual escogi hacer una pascua navideña.

La idea de hacer el primero fue la gran necesidad de hacer que el planeta en mi visualización de los datos de la migración de las aves se viera más atractivo;en cuanto a la pascua navideña
me motivo la cercanía de la navidad.

Una vez explicado esto se comenzará a explicar los fragmentos relacionados con los shaders añadidos en la visualización de los datos de migración de aves.
Primero se ha descargado un pack de texturas primero la del planeta,luego la textura del relieve y la textura especular.En segundo lugar se carga estas texturas
en las siguientes variables ayudada de un cargadador de texturas también inicializado.

<br>

```javascript
const textureLoader = new THREE.TextureLoader();

// 2. Carga las texturas del planeta
const colorMap = textureLoader.load("mapadia.jpg");
const normalMap = textureLoader.load("normal.png");
const specularMap = textureLoader.load("specular.png");
```
En tercer lugar se activa la repetición de la textura especular en ambas direcciones y luego se marca la textura como modificada para que Three.js aplique los cambios.
<br>

```javascript
specularMap.wrapS = specularMap.wrapT = THREE.RepeatWrapping;
specularMap.needsUpdate = true;
```
En cuarto lugar se ajusta la luz para el shader. La dirección de la luz debe ser un vector normalizado.
```javascript
const lightPosition = new THREE.Vector3(100, 50, 150); // Posición de luz alejada
const lightDirection = lightPosition.clone().normalize();
const lightIntensity = 1.5; // Intensidad alta
```
En quinto lugar se declara la variable uniforms donde está definiendo y agrupando todas las variables que se van a pasar desde tu código JavaScript (CPU) al programa de sombreado (Shader) que se ejecutará en la tarjeta gráfica (GPU).
```javascript
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

````
En sexto lugar declaramos el vertex shader pasandole la UV,la normal y la posicion para el fragment shader
```javascript
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
```
En séptimo lugar  declaramos el fragment shader donde se calcula la iluminación usando Normal Mapping y Roughness
```javascript
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
```
Por último se declara el shaderMaterial y se le añade a la tierra 
```javascript
// Crear el ShaderMaterial
const shaderMaterial = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: vertexShaderCode,
  fragmentShader: fragmentShaderCode,
  lights: false,
});
```


