import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

const COLOR_GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.05 },
    uSaturation: { value: 1.02 },
    uShadowTint: { value: new THREE.Color(0xf3f7ff) },
    uHighlightTint: { value: new THREE.Color(0xfff1d4) },
    uShadowLift: { value: 0.015 },
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

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 graded = mix(vec3(luma), color.rgb, uSaturation);

      graded = (graded - 0.5) * uContrast + 0.5;
      graded *= mix(uShadowTint, uHighlightTint, smoothstep(0.18, 0.82, luma));
      graded += uShadowLift * (1.0 - smoothstep(0.02, 0.42, luma));

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
  const renderPass = new RenderPass(scene, camera);
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

  gtaoPass.output = GTAOPass.OUTPUT.Default;
  gtaoPass.blendIntensity = 0.34;

  composer.addPass(renderPass);
  composer.addPass(gtaoPass);
  composer.addPass(colorGradePass);
  composer.addPass(smaaPass);
  composer.addPass(outputPass);

  return {
    composer,
    resize(width, height) {
      composer.setSize(width, height);
    },
    render(deltaTime) {
      composer.render(deltaTime);
    },
  };
}
