import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';

const COLOR_GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.05 },
    uSaturation: { value: 1.02 },
    uShadowTint: { value: new THREE.Color(0xf3f7ff) },
    uHighlightTint: { value: new THREE.Color(0xfff1d4) },
    uShadowLift: { value: 0.015 },
    uTexelSize: { value: new THREE.Vector2(1, 1) },
    uSharpenStrength: { value: 0.18 },
    uVignetteStrength: { value: 0.18 },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uContrast;
    uniform float uSaturation;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    uniform float uShadowLift;
    uniform vec2 uTexelSize;
    uniform float uSharpenStrength;
    uniform float uVignetteStrength;

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 center = color.rgb;
      vec3 blur = (
        texture2D(tDiffuse, vUv + vec2(uTexelSize.x, 0.0)).rgb
        + texture2D(tDiffuse, vUv - vec2(uTexelSize.x, 0.0)).rgb
        + texture2D(tDiffuse, vUv + vec2(0.0, uTexelSize.y)).rgb
        + texture2D(tDiffuse, vUv - vec2(0.0, uTexelSize.y)).rgb
      ) * 0.25;
      vec3 sharpColor = max(center + (center - blur) * uSharpenStrength, vec3(0.0));
      float luma = dot(sharpColor, vec3(0.2126, 0.7152, 0.0722));
      vec3 graded = mix(vec3(luma), sharpColor, uSaturation);

      graded = (graded - 0.5) * uContrast + 0.5;
      graded *= mix(uShadowTint, uHighlightTint, smoothstep(0.18, 0.82, luma));
      graded += uShadowLift * (1.0 - smoothstep(0.02, 0.42, luma));
      vec2 centeredUv = vUv * 2.0 - 1.0;
      float vignette = 1.0 - dot(centeredUv, centeredUv) * uVignetteStrength;
      graded *= clamp(vignette, 0.72, 1.0);

      gl_FragColor = vec4(max(graded, vec3(0.0)), color.a);
    }
  `,
};

export function configureRenderer(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
}

export function createPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const taaPass = new TAARenderPass(scene, camera);
  const gtaoPass = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight, undefined, {
    radius: 2.6,
    distanceExponent: 1.6,
    thickness: 1.1,
    scale: 0.38,
    samples: 12,
  }, {
    radius: 4,
    radiusExponent: 1.8,
    samples: 12,
  });
  const colorGradePass = new ShaderPass(COLOR_GRADE_SHADER);
  const smaaPass = new SMAAPass();
  const outputPass = new OutputPass();

  taaPass.sampleLevel = 2;
  taaPass.unbiased = false;
  taaPass.accumulate = false;
  gtaoPass.output = GTAOPass.OUTPUT.Default;
  gtaoPass.blendIntensity = 0.34;
  colorGradePass.uniforms.uTexelSize.value.set(1 / window.innerWidth, 1 / window.innerHeight);

  composer.addPass(taaPass);
  composer.addPass(gtaoPass);
  composer.addPass(colorGradePass);
  composer.addPass(smaaPass);
  composer.addPass(outputPass);

  return {
    composer,
    resize(width, height) {
      composer.setSize(width, height);
      colorGradePass.uniforms.uTexelSize.value.set(1 / width, 1 / height);
    },
    render(deltaTime) {
      composer.render(deltaTime);
    },
  };
}
