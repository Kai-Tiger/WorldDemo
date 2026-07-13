import * as THREE from 'three';
import {
  WATER_FOG_FRAGMENT_GLSL,
  WATER_FOG_FRAGMENT_PARS_GLSL,
  WATER_FOG_VERTEX_GLSL,
  WATER_FOG_VERTEX_PARS_GLSL,
  WATER_NOISE_GLSL,
  WATER_REFLECTION_GLSL,
  createWaterUniforms,
} from './waterContext.js';
import {
  FLOWING_RIVER_DEEP_COLOR,
  FLOWING_RIVER_FOAM_COLOR,
  FLOWING_RIVER_SEDIMENT_COLOR,
  FLOWING_RIVER_SHALLOW_COLOR,
} from './waterPalette.js';

export function createFlowingRiverMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    forceSinglePass: true,
    depthWrite: false,
    depthTest: true,
    uniforms: createWaterUniforms({
      uShallowColor: { value: new THREE.Color(FLOWING_RIVER_SHALLOW_COLOR) },
      uDeepColor: { value: new THREE.Color(FLOWING_RIVER_DEEP_COLOR) },
      uFoamColor: { value: new THREE.Color(FLOWING_RIVER_FOAM_COLOR) },
      uSedimentColor: { value: new THREE.Color(FLOWING_RIVER_SEDIMENT_COLOR) },
    }),
    vertexShader: `
      attribute float waterDepth;
      attribute float shoreDistance;
      attribute float flowSpeed;
      attribute float rapidMask;
      attribute vec2 flowDirection;
      attribute float disturbanceMask;
      attribute float waterFade;
      attribute float junctionMask;
      attribute float viewDistance;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWaterDepth;
      varying float vShoreDistance;
      varying float vFlowSpeed;
      varying float vRapidMask;
      varying vec2 vFlowDirection;
      varying float vDisturbanceMask;
      varying float vWaterFade;
      varying float vJunctionMask;
      varying float vViewDistance;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        vUv = uv;
        vWaterDepth = waterDepth;
        vShoreDistance = shoreDistance;
        vFlowSpeed = flowSpeed;
        vRapidMask = rapidMask;
        vFlowDirection = flowDirection;
        vDisturbanceMask = disturbanceMask;
        vWaterFade = waterFade;
        vJunctionMask = junctionMask;
        vViewDistance = viewDistance;

        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        ${WATER_FOG_VERTEX_GLSL}
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCameraPosition;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform vec3 uFoamColor;
      uniform vec3 uSedimentColor;
      uniform vec3 uReflectionColor;
      uniform vec3 uHorizonReflectionColor;
      uniform vec3 uSunReflectionColor;
      uniform vec3 uSunDirection;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWaterDepth;
      varying float vShoreDistance;
      varying float vFlowSpeed;
      varying float vRapidMask;
      varying vec2 vFlowDirection;
      varying float vDisturbanceMask;
      varying float vWaterFade;
      varying float vJunctionMask;
      varying float vViewDistance;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

      ${WATER_NOISE_GLSL}
      ${WATER_REFLECTION_GLSL}

      float getFlowSurfaceHeight(vec2 flowDomain) {
        float broad = waterNoise(flowDomain * vec2(0.028, 0.08));
        float detail = waterNoise(
          flowDomain * vec2(0.065, 0.15)
          + vec2(broad * 0.8, broad * -0.45)
          + vec2(13.7, -8.1)
        );

        return broad * 0.68 + detail * 0.32;
      }

      vec3 getFlowNormal(vec2 flowDomain, float strength) {
        const float epsilon = 0.22;
        float slopeAlong = getFlowSurfaceHeight(flowDomain + vec2(epsilon, 0.0))
          - getFlowSurfaceHeight(flowDomain - vec2(epsilon, 0.0));
        float slopeAcross = getFlowSurfaceHeight(flowDomain + vec2(0.0, epsilon))
          - getFlowSurfaceHeight(flowDomain - vec2(0.0, epsilon));
        vec3 localNormal = normalize(vec3(
          slopeAlong * strength * 2.2,
          1.0,
          slopeAcross * strength * 1.7
        ));
        vec2 direction = normalize(vFlowDirection);
        vec2 side = vec2(-direction.y, direction.x);
        vec2 worldSlope = direction * localNormal.x + side * localNormal.z;

        return normalize(vec3(worldSlope.x, localNormal.y, worldSlope.y));
      }

      void main() {
        float centerMask = clamp(1.0 - abs(vUv.y - 0.5) * 2.0, 0.0, 1.0);
        float depthMask = smoothstep(0.35, 1.8, vWaterDepth);
        float shoreNoise = (waterNoise(vWorldPosition.xz * 0.19) - 0.5) * 0.3;
        float perturbedShoreDistance = vShoreDistance + shoreNoise;
        float shoreAlpha = smoothstep(0.12, 0.85, perturbedShoreDistance);
        float centerSpeedScale = mix(1.0 / 2.8, 1.0, centerMask);
        float localFlowSpeed = max(vFlowSpeed, 0.01) * centerSpeedScale;
        float flowMeters = vUv.x - uTime * localFlowSpeed;
        vec2 flowDomain = vec2(flowMeters, (vUv.y - 0.5) * 8.0);
        float featureMask = clamp(max(max(vRapidMask, vJunctionMask), vDisturbanceMask), 0.0, 1.0);
        float normalStrength = mix(
          mix(0.03, 0.05, centerMask),
          mix(0.08, 0.11, centerMask),
          featureMask
        );
        vec3 normal = getFlowNormal(flowDomain, normalStrength);
        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
        vec3 color = mix(uShallowColor, uDeepColor, depthMask);
        float sedimentVisibility = (1.0 - depthMask) * (1.0 - centerMask * 0.35);
        color = mix(color, uSedimentColor, sedimentVisibility * 0.3);
        float broadFlowTone = waterNoise(flowDomain * vec2(0.028, 0.08));
        float localFlowTone = waterNoise2(
          flowDomain * vec2(0.065, 0.15)
          + vec2(broadFlowTone * 0.75, broadFlowTone * -0.4)
          + vec2(5.8, 11.3)
        );
        float flowTone = (broadFlowTone - 0.5) * 0.08 + (localFlowTone - 0.5) * 0.035;
        color *= 1.0 + flowTone;

        vec3 reflection = getTieredWaterReflection(
          mix(uHorizonReflectionColor, uReflectionColor, normal.y),
          vWorldPosition,
          normal,
          viewDir
        );
        float reflectionMix = mix(0.1, 0.38, fresnel);
        color = mix(color, reflection, reflectionMix);

        vec3 lightDirection = normalize(uSunDirection);
        vec3 halfDirection = normalize(lightDirection + viewDir);
        float specular = pow(max(dot(normal, halfDirection), 0.0), 96.0);
        color += uSunReflectionColor * specular * mix(0.08, 0.22, featureMask);

        float foamWarp = waterNoise2(
          flowDomain * vec2(0.032, 0.075) + vec2(-9.4, 17.2)
        );
        vec2 foamDomain = vec2(
          flowDomain.x * 0.065 + flowDomain.y * 0.024 + foamWarp * 1.15,
          flowDomain.y * 0.18 - flowDomain.x * 0.012 + foamWarp * -0.7
        );
        float foamBody = smoothstep(0.5, 0.72, waterNoise2(foamDomain));
        float foamBreaks = smoothstep(
          0.44,
          0.66,
          waterNoise(foamDomain * vec2(0.72, 1.35) + vec2(21.6, -3.8))
        );
        float foamDriver = clamp(
          max(max(vRapidMask * 0.92, vJunctionMask * 0.72), vDisturbanceMask),
          0.0,
          1.0
        );
        float foam = foamDriver * foamBody * foamBreaks * vWaterFade;
        color = mix(color, uFoamColor, foam * mix(0.42, 0.82, featureMask));

        float shallowAlpha = mix(0.16, 0.24, centerMask);
        float deepAlpha = mix(0.58, 0.68, centerMask);
        float alpha = mix(shallowAlpha, deepAlpha, depthMask) * shoreAlpha;
        alpha = max(alpha, foam * 0.62);
        float viewDistanceFade = 1.0 - smoothstep(
          max(vViewDistance - 55.0, 0.0),
          vViewDistance,
          distance(uCameraPosition.xz, vWorldPosition.xz)
        );
        alpha *= vWaterFade * viewDistanceFade;

        gl_FragColor = vec4(color, alpha);
        ${WATER_FOG_FRAGMENT_GLSL}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
