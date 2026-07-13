import * as THREE from 'three';
import {
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
      uSceneColor: { value: null },
      uSceneDepth: { value: null },
      uSceneResolution: { value: new THREE.Vector2(1, 1) },
      uCameraNear: { value: 0.25 },
      uCameraFar: { value: 1800 },
      uRefractionPixels: { value: 0 },
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
      varying float vWaterViewDepth;
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
        vec4 viewPosition = viewMatrix * worldPosition;
        vWorldPosition = worldPosition.xyz;
        vWaterViewDepth = -viewPosition.z;
        ${WATER_FOG_VERTEX_GLSL}
        gl_Position = projectionMatrix * viewPosition;
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
      uniform float uSunIntensity;
      #ifdef USE_SINGLE_LAYER_WATER
        uniform sampler2D uSceneColor;
        uniform sampler2D uSceneDepth;
        uniform vec2 uSceneResolution;
        uniform float uCameraNear;
        uniform float uCameraFar;
        uniform float uRefractionPixels;
      #endif

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
      varying float vWaterViewDepth;
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
        vec3 geometricNormal,
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
        vec2 localSlope = vec2(
          slopeAlong * strength * 2.0,
          slopeAcross * strength * 1.45
        );
        vec2 direction = normalize(flowDirection);
        vec3 flowTangent = vec3(direction.x, 0.0, direction.y);
        flowTangent = normalize(
          flowTangent - geometricNormal * dot(flowTangent, geometricNormal)
        );
        vec3 flowBitangent = normalize(cross(flowTangent, geometricNormal));

        return normalize(
          geometricNormal
          + flowTangent * localSlope.x
          + flowBitangent * localSlope.y
        );
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
          -0.03,
          0.04
        );
      }

      vec3 fresnelSchlick(float cosine, vec3 f0) {
        float fresnelFactor = pow(1.0 - clamp(cosine, 0.0, 1.0), 5.0);
        return f0 + (1.0 - f0) * fresnelFactor;
      }

      float distributionGGX(float nDotH, float roughness) {
        float alpha = roughness * roughness;
        float alphaSquared = alpha * alpha;
        float denominator = nDotH * nDotH * (alphaSquared - 1.0) + 1.0;

        return alphaSquared / max(3.14159265 * denominator * denominator, 0.0001);
      }

      float visibilitySmithGGXCorrelated(
        float nDotV,
        float nDotL,
        float roughness
      ) {
        float alpha = roughness * roughness;
        float alphaSquared = alpha * alpha;
        float ggxV = nDotL * sqrt(
          max(nDotV * nDotV * (1.0 - alphaSquared) + alphaSquared, 0.0001)
        );
        float ggxL = nDotV * sqrt(
          max(nDotL * nDotL * (1.0 - alphaSquared) + alphaSquared, 0.0001)
        );

        return 0.5 / max(ggxV + ggxL, 0.0001);
      }

      float getSpecularAARoughness(vec3 normal, float roughness) {
        vec3 normalDx = dFdx(normal);
        vec3 normalDy = dFdy(normal);
        float normalVariance = 0.5 * (
          dot(normalDx, normalDx) + dot(normalDy, normalDy)
        );
        float kernelRoughnessSquared = min(normalVariance * 2.0, 0.25);

        return clamp(
          sqrt(roughness * roughness + kernelRoughnessSquared),
          0.08,
          0.8
        );
      }

      vec3 evaluateWaterSpecular(
        vec3 normal,
        vec3 viewDirection,
        vec3 lightDirection,
        float roughness
      ) {
        vec3 halfDirection = normalize(lightDirection + viewDirection);
        float nDotV = max(dot(normal, viewDirection), 0.0001);
        float nDotL = max(dot(normal, lightDirection), 0.0);
        float nDotH = max(dot(normal, halfDirection), 0.0);
        float vDotH = max(dot(viewDirection, halfDirection), 0.0);
        vec3 waterF0 = vec3(0.02037);
        vec3 fresnel = fresnelSchlick(vDotH, waterF0);
        float distribution = distributionGGX(nDotH, roughness);
        float visibility = visibilitySmithGGXCorrelated(
          nDotV,
          nDotL,
          roughness
        );

        return fresnel * distribution * visibility * nDotL;
      }

      #ifdef USE_SINGLE_LAYER_WATER
        float getLinearViewDepth(float depth) {
          float denominator = uCameraFar
            - depth * (uCameraFar - uCameraNear);

          return (uCameraNear * uCameraFar) / max(denominator, 0.000001);
        }

        vec3 getSingleLayerWaterVolume(
          vec3 surfaceNormal,
          vec3 viewDirection,
          vec3 geometricNormal,
          float shoreAlpha,
          out vec3 undistortedScene
        ) {
          vec2 inverseResolution = 1.0 / max(uSceneResolution, vec2(1.0));
          vec2 screenUv = gl_FragCoord.xy * inverseResolution;
          vec2 safeMinimum = inverseResolution * 0.5;
          vec2 safeMaximum = vec2(1.0) - safeMinimum;
          vec3 viewNormal = normalize(mat3(viewMatrix) * surfaceNormal);
          float refractionFade = shoreAlpha
            * vWaterFade
            * smoothstep(0.08, 0.6, vWaterDepth);
          vec2 candidateUv = screenUv
            + viewNormal.xy
            * uRefractionPixels
            * inverseResolution
            * refractionFade;
          vec2 insideMinimum = step(safeMinimum, candidateUv);
          vec2 insideMaximum = step(candidateUv, safeMaximum);
          float uvIsValid = insideMinimum.x
            * insideMinimum.y
            * insideMaximum.x
            * insideMaximum.y;
          vec2 clampedCandidateUv = clamp(
            candidateUv,
            safeMinimum,
            safeMaximum
          );
          float undistortedRawDepth = texture2D(uSceneDepth, screenUv).r;
          float refractedRawDepth = texture2D(
            uSceneDepth,
            clampedCandidateUv
          ).r;
          float undistortedViewDepth = getLinearViewDepth(
            undistortedRawDepth
          );
          float refractedViewDepth = getLinearViewDepth(refractedRawDepth);
          float depthIsBehindWater = step(
            vWaterViewDepth + 0.01,
            refractedViewDepth
          );
          float depthIsFinite = (1.0 - step(0.999999, undistortedRawDepth))
            * (1.0 - step(0.999999, refractedRawDepth));
          float depthContinuity = 1.0 - step(
            max(0.75, undistortedViewDepth * 0.015),
            abs(refractedViewDepth - undistortedViewDepth)
          );
          float validRefraction = uvIsValid
            * depthIsBehindWater
            * depthIsFinite
            * depthContinuity;
          vec2 refractedUv = mix(
            screenUv,
            clampedCandidateUv,
            validRefraction
          );

          undistortedScene = texture2D(uSceneColor, screenUv).rgb;
          vec3 refractedScene = texture2D(uSceneColor, refractedUv).rgb;

          float surfaceFacing = max(
            abs(dot(viewDirection, geometricNormal)),
            0.2
          );
          float authoredPathLength = clamp(
            max(vWaterDepth, 0.0) / surfaceFacing,
            0.0,
            6.0
          );
          float viewRayCosine = clamp(
            vWaterViewDepth / max(
              distance(uCameraPosition, vWorldPosition),
              0.0001
            ),
            0.25,
            1.0
          );
          float screenPathLength = clamp(
            max(refractedViewDepth - vWaterViewDepth, 0.0)
              / viewRayCosine,
            0.0,
            6.0
          );
          float pathLengthLimit = min(
            6.0,
            max(authoredPathLength * 1.5, 0.08)
          );
          float opticalPathLength = mix(
            authoredPathLength,
            min(screenPathLength, pathLengthLimit),
            validRefraction
          );

          vec3 absorption = vec3(0.28, 0.11, 0.055);
          vec3 scattering = vec3(0.014, 0.028, 0.040);
          vec3 transmittance = exp(
            -(absorption + scattering) * opticalPathLength
          );
          const float phaseG = 0.15;
          float lightViewCosine = clamp(
            dot(normalize(uSunDirection), viewDirection),
            -1.0,
            1.0
          );
          float phaseDenominator = pow(
            max(
              1.0 + phaseG * phaseG
                - 2.0 * phaseG * lightViewCosine,
              0.01
            ),
            1.5
          );
          float phase = clamp(
            (1.0 - phaseG * phaseG) / phaseDenominator,
            0.65,
            1.35
          );
          vec3 scatteringColor = mix(uDeepColor, uShallowColor, 0.50);

          return refractedScene * transmittance
            + scatteringColor * (1.0 - transmittance) * phase;
        }
      #endif

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
        vec3 geometricNormal = normalize(cross(
          dFdx(vWorldPosition),
          dFdy(vWorldPosition)
        ));
        if (geometricNormal.y < 0.0) {
          geometricNormal = -geometricNormal;
        }
        vec3 normal = getFlowNormal(
          primaryFlowDomain,
          detailFlowDomain,
          surfaceFlowDirection,
          geometricNormal,
          normalStrength
        );
        if (!gl_FrontFacing) {
          normal = -normal;
        }
        float flowTone = clamp(
          getFlowTone(primaryFlowDomain, detailFlowDomain) * flowIntensity,
          -0.03,
          0.04
        );
        float foamPattern = getFoamPattern(
          primaryFlowDomain,
          detailFlowDomain
        );
        float foamDriver = clamp(
          max(
            max(vRapidMask * 0.72, vJunctionMask * 0.10),
            smoothstep(0.18, 0.58, vDisturbanceMask)
          ),
          0.0,
          1.0
        );
        float foam = foamDriver * foamPattern * shoreAlpha * vWaterFade;

        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float nDotV = max(dot(normal, viewDir), 0.0001);
        vec3 waterFresnel = fresnelSchlick(nDotV, vec3(0.02037));
        float foamSpecularAttenuation = 1.0 - foam * 0.9;
        #ifdef USE_SINGLE_LAYER_WATER
          vec3 undistortedScene;
          vec3 color = getSingleLayerWaterVolume(
            normal,
            viewDir,
            geometricNormal,
            shoreAlpha,
            undistortedScene
          );
          color *= 1.0 + flowTone * mix(0.45, 0.25, depthMask);
        #else
          vec3 color = mix(uShallowColor, uDeepColor, depthMask);
          float sedimentVisibility = (1.0 - depthMask)
            * (1.0 - centerMask * 0.35);
          color = mix(color, uSedimentColor, sedimentVisibility * 0.3);
          color *= 1.0 + flowTone * mix(1.0, 0.55, depthMask);
        #endif

        vec3 reflection = getTieredWaterReflection(
          mix(
            uHorizonReflectionColor,
            uReflectionColor,
            clamp(abs(normal.y), 0.0, 1.0)
          ),
          vWorldPosition,
          normal,
          viewDir
        );
        vec3 reflectedEnergy = waterFresnel * foamSpecularAttenuation * 0.26;
        color = color * (1.0 - reflectedEnergy) + reflection * reflectedEnergy;

        vec3 lightDirection = normalize(uSunDirection);
        float calmRoughness = mix(0.24, 0.18, centerMask);
        float rapidRoughness = mix(0.36, 0.28, centerMask);
        float roughness = mix(
          calmRoughness,
          rapidRoughness,
          clamp(vRapidMask, 0.0, 1.0)
        );
        roughness = mix(roughness, 0.72, foam);
        roughness = getSpecularAARoughness(normal, roughness);
        vec3 directSpecular = evaluateWaterSpecular(
          normal,
          viewDir,
          lightDirection,
          roughness
        ) * uSunReflectionColor * uSunIntensity;
        directSpecular = min(
          directSpecular,
          vec3(mix(0.18, 0.32, clamp(vRapidMask, 0.0, 1.0)))
        );
        color += directSpecular * foamSpecularAttenuation * 0.40;

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

        float waterFogFactor = 1.0 - exp(
          -uWaterFogDensity * uWaterFogDensity
            * vWaterFogDepth * vWaterFogDepth
        );
        vec3 foggedWaterColor = mix(
          color,
          uWaterFogColor,
          clamp(waterFogFactor, 0.0, 1.0)
        );
        #ifdef USE_SINGLE_LAYER_WATER
          gl_FragColor = vec4(
            mix(undistortedScene, foggedWaterColor, alpha),
            1.0
          );
        #else
          gl_FragColor = vec4(foggedWaterColor, alpha);
        #endif
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
