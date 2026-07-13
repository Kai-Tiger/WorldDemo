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
      attribute vec2 flowUv;
      attribute float disturbanceMask;
      attribute float waterFade;
      attribute float junctionMask;
      attribute vec2 junctionFlowDirection;
      attribute float viewDistance;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWaterDepth;
      varying float vShoreDistance;
      varying float vFlowSpeed;
      varying float vRapidMask;
      varying vec2 vFlowDirection;
      varying vec2 vFlowUv;
      varying float vDisturbanceMask;
      varying float vWaterFade;
      varying float vJunctionMask;
      varying vec2 vJunctionFlowDirection;
      varying float vViewDistance;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        vUv = uv;
        vWaterDepth = waterDepth;
        vShoreDistance = shoreDistance;
        vFlowSpeed = flowSpeed;
        vRapidMask = rapidMask;
        vFlowDirection = flowDirection;
        vFlowUv = flowUv;
        vDisturbanceMask = disturbanceMask;
        vWaterFade = waterFade;
        vJunctionMask = junctionMask;
        vJunctionFlowDirection = junctionFlowDirection;
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
      varying vec2 vFlowUv;
      varying float vDisturbanceMask;
      varying float vWaterFade;
      varying float vJunctionMask;
      varying vec2 vJunctionFlowDirection;
      varying float vViewDistance;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

      ${WATER_NOISE_GLSL}
      ${WATER_REFLECTION_GLSL}

      float getFlowSurfaceHeight(
        vec2 primaryFlowDomain,
        vec2 detailFlowDomain
      ) {
        float broad = waterNoise(primaryFlowDomain * vec2(0.11, 0.30));
        float detail = waterNoise2(
          detailFlowDomain * vec2(0.24, 0.68)
          + vec2(broad * 0.34, broad * -0.27)
          + vec2(13.7, -8.1)
        );

        return broad * 0.58 + detail * 0.42;
      }

      vec3 getFlowNormal(
        vec2 primaryFlowDomain,
        vec2 detailFlowDomain,
        vec2 flowDirection,
        float strength
      ) {
        const float epsilon = 0.18;
        float slopeAlong = getFlowSurfaceHeight(
          primaryFlowDomain + vec2(epsilon, 0.0),
          detailFlowDomain + vec2(epsilon, 0.0)
        ) - getFlowSurfaceHeight(
          primaryFlowDomain - vec2(epsilon, 0.0),
          detailFlowDomain - vec2(epsilon, 0.0)
        );
        float slopeAcross = getFlowSurfaceHeight(
          primaryFlowDomain + vec2(0.0, epsilon),
          detailFlowDomain - vec2(0.0, epsilon)
        ) - getFlowSurfaceHeight(
          primaryFlowDomain - vec2(0.0, epsilon),
          detailFlowDomain + vec2(0.0, epsilon)
        );
        vec3 localNormal = normalize(vec3(
          slopeAlong * strength * 2.0,
          1.0,
          slopeAcross * strength * 1.45
        ));
        vec2 direction = normalize(flowDirection);
        vec2 side = vec2(-direction.y, direction.x);
        vec2 worldSlope = direction * localNormal.x + side * localNormal.z;

        return normalize(vec3(worldSlope.x, localNormal.y, worldSlope.y));
      }

      float getFlowTone(vec2 primaryFlowDomain, vec2 detailFlowDomain) {
        float broadFlowTone = waterNoise2(
          primaryFlowDomain * vec2(0.11, 0.30) + vec2(5.8, 11.3)
        );
        float localFlowTone = waterNoise(
          detailFlowDomain * vec2(0.24, 0.68)
          + vec2(broadFlowTone * 0.28, broadFlowTone * -0.2)
          + vec2(5.8, 11.3)
        );

        return clamp(
          (broadFlowTone - 0.5) * 0.12 + (localFlowTone - 0.45) * 0.08,
          -0.05,
          0.08
        );
      }

      float getFoamPattern(vec2 primaryFlowDomain, vec2 detailFlowDomain) {
        float foamBody = smoothstep(
          0.50,
          0.70,
          waterNoise2(
            primaryFlowDomain * vec2(0.18, 0.55) + vec2(-9.4, 17.2)
          )
        );
        float foamBreaks = smoothstep(
          0.52,
          0.72,
          waterNoise(
            detailFlowDomain * vec2(0.42, 1.10) + vec2(21.6, -3.8)
          )
        );

        return foamBody * foamBreaks;
      }

      void main() {
        float junctionBlend = smoothstep(0.0, 1.0, vJunctionMask);
        float stripCenterMask = clamp(1.0 - abs(vUv.y - 0.5) * 2.0, 0.0, 1.0);
        float centerMask = mix(stripCenterMask, 1.0, junctionBlend);
        float depthMask = smoothstep(0.35, 1.8, vWaterDepth);
        float shoreNoise = (waterNoise(vWorldPosition.xz * 0.19) - 0.5) * 0.3;
        float perturbedShoreDistance = vShoreDistance + shoreNoise;
        float shoreAlpha = smoothstep(0.12, 0.85, perturbedShoreDistance);
        float primaryFlowMeters = vFlowUv.x - uTime * 0.85;
        float detailFlowMeters = vFlowUv.x - uTime * 1.15;
        vec2 primaryFlowDomain = vec2(primaryFlowMeters, vFlowUv.y);
        vec2 detailFlowDomain = vec2(
          detailFlowMeters + 19.4,
          -vFlowUv.y + 7.6
        );
        vec2 junctionDirection = normalize(vJunctionFlowDirection);
        vec2 surfaceFlowDirection = normalize(mix(
          vFlowDirection,
          junctionDirection,
          junctionBlend
        ));

        float flowIntensity = mix(
          0.9,
          1.08,
          smoothstep(0.45, 1.8, vFlowSpeed)
        );
        float normalFeatureMask = clamp(
          max(vRapidMask, vJunctionMask * 0.35),
          0.0,
          1.0
        );
        float normalStrength = mix(
          mix(0.03, 0.05, centerMask),
          mix(0.075, 0.095, centerMask),
          normalFeatureMask
        ) * flowIntensity;
        vec3 normal = getFlowNormal(
          primaryFlowDomain,
          detailFlowDomain,
          surfaceFlowDirection,
          normalStrength
        );
        float flowTone = clamp(
          getFlowTone(primaryFlowDomain, detailFlowDomain) * flowIntensity,
          -0.05,
          0.08
        );
        float foamPattern = getFoamPattern(
          primaryFlowDomain,
          detailFlowDomain
        );

        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
        vec3 color = mix(uShallowColor, uDeepColor, depthMask);
        float sedimentVisibility = (1.0 - depthMask) * (1.0 - centerMask * 0.35);
        color = mix(color, uSedimentColor, sedimentVisibility * 0.3);
        color *= 1.0 + flowTone * mix(1.0, 0.55, depthMask);

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
        float specular = pow(max(dot(normal, halfDirection), 0.0), 56.0);
        color += uSunReflectionColor
          * specular
          * mix(0.06, 0.12, clamp(vRapidMask, 0.0, 1.0));

        float foamDriver = clamp(
          max(
            max(vRapidMask * 0.72, vJunctionMask * 0.10),
            smoothstep(0.18, 0.58, vDisturbanceMask)
          ),
          0.0,
          1.0
        );
        float foam = foamDriver * foamPattern * shoreAlpha * vWaterFade;
        color = mix(color, uFoamColor, foam * 0.58);

        float shallowAlpha = mix(0.16, 0.24, centerMask);
        float deepAlpha = mix(0.58, 0.68, centerMask);
        float alpha = mix(shallowAlpha, deepAlpha, depthMask) * shoreAlpha;
        alpha = clamp(alpha + foam * (1.0 - alpha) * 0.35, 0.0, 1.0);
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
