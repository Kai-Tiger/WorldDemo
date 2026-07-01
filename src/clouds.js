import * as THREE from 'three';

const DOME_RADIUS = 240;
const HORIZON_COLOR = new THREE.Color('#9bbdd0');

export class Clouds {
  constructor(dome) {
    this.dome = dome;
  }

  static create() {
    const geometry = new THREE.SphereGeometry(DOME_RADIUS, 48, 24);
    const material = createSkyCloudMaterial();

    const dome = new THREE.Mesh(geometry, material);

    dome.name = 'SkyCloudDome';
    dome.renderOrder = -900;
    dome.frustumCulled = false;
    dome.material.depthWrite = false;
    dome.material.depthTest = false;
    dome.material.fog = false;

    dome.onBeforeRender = () => {
      dome.material.uniforms.uCameraPos.value.copy(dome._camPos);
    };

    dome._camPos = new THREE.Vector3();

    return new Clouds(dome);
  }

  update(elapsedTime, camera) {
    this.dome.position.copy(camera.position);
    this.dome._camPos.copy(camera.position);
    this.dome.material.uniforms.uTime.value = elapsedTime;
  }
}

function createSkyCloudMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uCameraPos: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3(0.48, 0.48, 0.73).normalize() },
      uZenithColor: { value: new THREE.Color('#3f77b8') },
      uHorizonColor: { value: HORIZON_COLOR },
      uCloudColor: { value: new THREE.Color('#f3f5f2') },
      uCloudShadow: { value: new THREE.Color('#b0bdc3') },
      uSunGlowColor: { value: new THREE.Color('#f5e4c0') },
      uCloudCover: { value: 0.54 },
    },
    vertexShader: `
      varying vec3 vDir;
      varying vec3 vWorldPos;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vDir = position.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCameraPos;
      uniform vec3 uSunDir;
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uCloudColor;
      uniform vec3 uCloudShadow;
      uniform vec3 uSunGlowColor;
      uniform float uCloudCover;

      varying vec3 vDir;
      varying vec3 vWorldPos;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 m = mat2(1.58, 1.12, -1.12, 1.58);

        for (int i = 0; i < 6; i++) {
          v += a * noise(p);
          p = m * p + 8.37;
          a *= 0.5;
        }

        return v;
      }

      void main() {
        vec3 dir = normalize(vDir);
        vec3 sd = normalize(uSunDir);
        float h = clamp(dir.y, 0.0, 1.0);

        vec3 sky = mix(uHorizonColor, uZenithColor, pow(h, 0.50));
        float sunDot = max(dot(dir, sd), 0.0);
        sky = mix(sky, uHorizonColor * 1.05, pow(1.0 - h, 3.0) * 0.45);
        float mie = pow(sunDot, 7.0) * 0.45 + pow(sunDot, 260.0) * 0.9;
        sky += uSunGlowColor * mie;

        float horizonFade = smoothstep(0.02, 0.20, dir.y);
        vec2 cp = (dir.xz / (dir.y + 0.32)) * 0.55;
        vec2 wind = vec2(uTime * 0.005, uTime * 0.0018);
        cp += wind;

        float dens = fbm(cp) * 0.60 + fbm(cp * 2.3 + 3.1) * 0.28 + fbm(cp * 5.0) * 0.12;
        float cover = uCloudCover;
        float cl = smoothstep(cover, cover + 0.16, dens);

        float below = fbm(cp + vec2(0.0, 0.14)) * 0.60
                    + fbm((cp + vec2(0.0, 0.14)) * 2.3 + 3.1) * 0.28;
        float vshade = clamp((dens - below) * 1.8 + 0.80, 0.55, 1.05);
        float topLight = smoothstep(cover - 0.04, cover + 0.18, dens);
        vec3 cloudCol = mix(uCloudShadow, uCloudColor, topLight) * vshade;
        cloudCol += vec3(0.10, 0.085, 0.05) * pow(sunDot, 4.0);

        cl *= horizonFade;
        sky = mix(sky, cloudCol, clamp(cl, 0.0, 1.0) * 0.95);

        float disc = smoothstep(0.9993, 0.99975, sunDot) * (1.0 - clamp(cl, 0.0, 1.0));
        sky += vec3(1.0, 0.95, 0.82) * disc * 1.2;

        sky += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;

        gl_FragColor = vec4(max(sky, vec3(0.0)), 1.0);
      }
    `,
  });
}
