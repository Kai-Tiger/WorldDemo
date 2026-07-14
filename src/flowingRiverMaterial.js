import * as THREE from 'three';
import {
  WATER_FOG_FRAGMENT_PARS_GLSL,
  WATER_FOG_VERTEX_GLSL,
  WATER_FOG_VERTEX_PARS_GLSL,
  WATER_NOISE_GLSL,
  createWaterUniforms,
} from './waterContext.js';
import {
  FLOWING_RIVER_DEEP_COLOR,
  FLOWING_RIVER_FOAM_COLOR,
  FLOWING_RIVER_SEDIMENT_COLOR,
  FLOWING_RIVER_SHALLOW_COLOR,
} from './waterPalette.js';
import {
  TERMINAL_LOWLAND_LAKE_TRANSITION,
} from './lowlandHeightPlan.js';

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
      uTerminalLakeBoundary: {
        value: new THREE.Vector4(
          TERMINAL_LOWLAND_LAKE_TRANSITION.center[0],
          TERMINAL_LOWLAND_LAKE_TRANSITION.center[1],
          TERMINAL_LOWLAND_LAKE_TRANSITION.radius,
          TERMINAL_LOWLAND_LAKE_TRANSITION.fadeLength,
        ),
      },
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
      varying vec3 vWorldNormal;
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
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
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
      uniform sampler2D uWaterEnvironmentMap;
      uniform float uWaterReflectionStrength;
      uniform vec4 uTerminalLakeBoundary;
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
      varying vec3 vWorldNormal;
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

      vec2 waterEquirectUv(vec3 direction) {
        vec3 ray = normalize(direction);
        return vec2(
          atan(ray.z, ray.x) * 0.15915494309189535 + 0.5,
          asin(clamp(ray.y, -1.0, 1.0)) * 0.3183098861837907 + 0.5
        );
      }

      vec3 getFlowingWaterReflection(
        vec3 fallbackColor,
        vec3 surfaceNormal,
        vec3 viewDirection
      ) {
        vec3 reflectionDirection = reflect(-viewDirection, surfaceNormal);
        vec3 environmentReflection = texture2D(
          uWaterEnvironmentMap,
          waterEquirectUv(reflectionDirection)
        ).rgb;

        return mix(
          fallbackColor,
          environmentReflection,
          uWaterReflectionStrength
        );
      }

      vec2 rotateFlowDomain(vec2 domain, float cosine, float sine) {
        return vec2(
          domain.x * cosine - domain.y * sine,
          domain.x * sine + domain.y * cosine
        );
      }

      float getFlowSurfaceHeight(
        vec2 macroFlowDomain,
        vec2 middleFlowDomain,
        vec2 microFlowDomain
      ) {
        float macroWave = waterNoise(
          macroFlowDomain * vec2(0.14, 0.32)
        );
        float middleWave = waterNoise2(
          middleFlowDomain * vec2(0.75, 1.60)
          + vec2(macroWave * 0.24, macroWave * -0.18)
          + vec2(13.7, -8.1)
        );

        #ifdef USE_SINGLE_LAYER_WATER
          float microWave = waterNoise(
            microFlowDomain * vec2(2.20, 4.20)
            + vec2(middleWave * -0.16, middleWave * 0.21)
            + vec2(-4.7, 23.9)
          );

          return macroWave * 0.48
            + middleWave * 0.34
            + microWave * 0.18;
        #else
          return macroWave * 0.58 + middleWave * 0.42;
        #endif
      }

      vec3 getFlowNormal(
        vec2 macroFlowDomain,
        vec2 middleFlowDomain,
        vec2 microFlowDomain,
        vec2 flowDirection,
        vec3 geometricNormal,
        float strength,
        float maximumSlope
      ) {
        const float epsilon = 0.08;
        vec2 middleAlongOffset = vec2(0.89100652, 0.45399050) * epsilon;
        vec2 middleAcrossOffset = vec2(-0.45399050, 0.89100652) * epsilon;
        vec2 microAlongOffset = vec2(0.85716730, -0.51503807) * epsilon;
        vec2 microAcrossOffset = vec2(0.51503807, 0.85716730) * epsilon;
        float slopeAlong = getFlowSurfaceHeight(
          macroFlowDomain + vec2(epsilon, 0.0),
          middleFlowDomain + middleAlongOffset,
          microFlowDomain + microAlongOffset
        ) - getFlowSurfaceHeight(
          macroFlowDomain - vec2(epsilon, 0.0),
          middleFlowDomain - middleAlongOffset,
          microFlowDomain - microAlongOffset
        );
        float slopeAcross = getFlowSurfaceHeight(
          macroFlowDomain + vec2(0.0, epsilon),
          middleFlowDomain + middleAcrossOffset,
          microFlowDomain + microAcrossOffset
        ) - getFlowSurfaceHeight(
          macroFlowDomain - vec2(0.0, epsilon),
          middleFlowDomain - middleAcrossOffset,
          microFlowDomain - microAcrossOffset
        );
        vec2 localSlope = vec2(
          slopeAlong * strength * 6.25,
          slopeAcross * strength * 4.55
        );
        localSlope *= min(
          1.0,
          maximumSlope / max(length(localSlope), 0.0001)
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

      vec3 getMicroFlowNormal(
        vec2 middleFlowDomain,
        vec2 microFlowDomain,
        vec2 flowDirection,
        vec3 geometricNormal,
        float strength
      ) {
        const float epsilon = 0.04;
        vec2 middleAlongOffset = vec2(0.89100652, 0.45399050) * epsilon;
        vec2 microAcrossOffset = vec2(0.51503807, 0.85716730) * epsilon;
        float middleAlong = waterNoise2(
          (middleFlowDomain + middleAlongOffset) * vec2(0.75, 1.60)
        ) - waterNoise2(
          (middleFlowDomain - middleAlongOffset) * vec2(0.75, 1.60)
        );
        float microAcross = waterNoise(
          (microFlowDomain + microAcrossOffset) * vec2(2.20, 4.20)
          + vec2(-4.7, 23.9)
        ) - waterNoise(
          (microFlowDomain - microAcrossOffset) * vec2(2.20, 4.20)
          + vec2(-4.7, 23.9)
        );
        vec2 localSlope = vec2(
          middleAlong * strength * 7.0,
          microAcross * strength * 5.0
        );
        localSlope *= min(1.0, 0.36 / max(length(localSlope), 0.0001));
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

      float getFlowTone(vec2 macroFlowDomain, vec2 middleFlowDomain) {
        float broadFlowTone = waterNoise2(
          macroFlowDomain * vec2(0.14, 0.32) + vec2(5.8, 11.3)
        );
        float localFlowTone = waterNoise(
          middleFlowDomain * vec2(0.75, 1.60)
          + vec2(broadFlowTone * 0.28, broadFlowTone * -0.2)
          + vec2(5.8, 11.3)
        );

        return clamp(
          (broadFlowTone - 0.5) * 0.16 + (localFlowTone - 0.45) * 0.12,
          -0.05,
          0.08
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
          float waterFade,
          out vec3 undistortedScene,
          out float waterThickness
        ) {
          vec2 inverseResolution = 1.0 / max(uSceneResolution, vec2(1.0));
          vec2 screenUv = gl_FragCoord.xy * inverseResolution;
          vec2 safeMinimum = inverseResolution * 0.5;
          vec2 safeMaximum = vec2(1.0) - safeMinimum;
          vec3 viewNormal = normalize(mat3(viewMatrix) * surfaceNormal);
          float refractionFade = shoreAlpha
            * waterFade
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
          waterThickness = clamp(opticalPathLength, 0.0, 6.0);

          vec3 absorption = vec3(0.28, 0.11, 0.055);
          vec3 scattering = vec3(0.014, 0.028, 0.040);
          vec3 transmittance = exp(
            -(absorption + scattering) * waterThickness
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

      float getFoamPattern(
        vec2 macroFlowDomain,
        vec2 middleFlowDomain,
        vec2 microFlowDomain
      ) {
        float foamMass = smoothstep(
          0.46,
          0.82,
          waterNoise2(
            macroFlowDomain * vec2(0.28, 0.82) + vec2(-9.4, 17.2)
          )
        );
        float foamBreakup = smoothstep(
          0.36,
          0.78,
          waterNoise(
            middleFlowDomain * vec2(0.75, 1.80) + vec2(21.6, -3.8)
          )
        );
        float foamPattern = foamMass * foamBreakup;

        #ifdef USE_SINGLE_LAYER_WATER
          float foamFleck = smoothstep(
            0.56,
            0.80,
            waterNoise2(
              microFlowDomain * vec2(1.55, 3.20) + vec2(8.7, 31.4)
            )
          );
          foamPattern *= mix(0.18, 1.0, foamFleck);
          foamPattern += foamMass * foamFleck * 0.10;
        #endif

        return clamp(foamPattern, 0.0, 1.0);
      }

      float getWakePattern(vec2 anchoredFlowDomain, float movingFoamPattern) {
        float anchoredStrand = smoothstep(
          0.56,
          0.78,
          waterNoise2(
            anchoredFlowDomain * vec2(0.72, 3.60) + vec2(-16.4, 9.7)
          )
        );
        float movingBreakup = smoothstep(0.08, 0.62, movingFoamPattern);

        return anchoredStrand * mix(0.12, 1.0, movingBreakup);
      }

      void main() {
        float terminalLakeSignedDistance = distance(
          vWorldPosition.xz,
          uTerminalLakeBoundary.xy
        ) - uTerminalLakeBoundary.z;
        float terminalLakeFade = smoothstep(
          0.0,
          uTerminalLakeBoundary.w,
          terminalLakeSignedDistance
        );
        float effectiveWaterFade = min(vWaterFade, terminalLakeFade);
        if (effectiveWaterFade <= 0.0001) {
          discard;
        }
        float junctionBlend = smoothstep(0.0, 1.0, vJunctionMask);
        float stripCenterMask = clamp(1.0 - abs(vUv.y - 0.5) * 2.0, 0.0, 1.0);
        float centerMask = mix(stripCenterMask, 1.0, junctionBlend);
        float depthMask = smoothstep(0.35, 1.8, vWaterDepth);
        float shoreNoise = (waterNoise(vWorldPosition.xz * 0.19) - 0.5) * 0.3;
        float perturbedShoreDistance = vShoreDistance + shoreNoise;
        float shoreAlpha = smoothstep(0.12, 0.85, perturbedShoreDistance);
        float foamShoreNoise = (
          waterNoise2(vWorldPosition.xz * 0.41 + vec2(7.3, -11.8)) - 0.5
        ) * 0.12;
        float foamShoreAlpha = smoothstep(
          0.03,
          0.32,
          vShoreDistance + foamShoreNoise
        );
        float primaryFlowMeters = vFlowUv.x - uTime * 0.85;
        float detailFlowMeters = vFlowUv.x - uTime * 1.15;
        vec2 macroFlowDomain = vec2(primaryFlowMeters, vFlowUv.y);
        vec2 middleFlowDomain = rotateFlowDomain(
          vec2(detailFlowMeters, vFlowUv.y),
          0.89100652,
          0.45399050
        ) + vec2(19.4, -7.6);
        vec2 microFlowDomain = rotateFlowDomain(
          vec2(detailFlowMeters, vFlowUv.y),
          0.85716730,
          -0.51503807
        ) + vec2(-12.8, 24.3);
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
          mix(0.055, 0.075, centerMask),
          mix(0.13, 0.16, centerMask),
          normalFeatureMask
        ) * flowIntensity;
        float maximumSurfaceSlope = mix(0.14, 0.25, normalFeatureMask);
        vec3 geometricNormal = normalize(vWorldNormal);
        if (geometricNormal.y < 0.0) {
          geometricNormal = -geometricNormal;
        }
        vec3 normal = getFlowNormal(
          macroFlowDomain,
          middleFlowDomain,
          microFlowDomain,
          surfaceFlowDirection,
          geometricNormal,
          normalStrength,
          maximumSurfaceSlope
        );
        vec3 microNormal = normal;
        #ifdef USE_SINGLE_LAYER_WATER
          microNormal = getMicroFlowNormal(
            middleFlowDomain,
            microFlowDomain,
            surfaceFlowDirection,
            geometricNormal,
            mix(0.11, 0.18, normalFeatureMask) * flowIntensity
          );
        #endif
        if (!gl_FrontFacing) {
          normal = -normal;
          microNormal = -microNormal;
        }
        float flowTone = clamp(
          getFlowTone(macroFlowDomain, middleFlowDomain) * flowIntensity,
          -0.05,
          0.08
        );
        float foamPattern = getFoamPattern(
          macroFlowDomain,
          middleFlowDomain,
          microFlowDomain
        );
        float shallowFoamSupport = 1.0 - smoothstep(
          0.45,
          1.15,
          vWaterDepth
        );
        float movingFoamSupport = smoothstep(0.65, 1.35, vFlowSpeed);
        float hydraulicSupport = shallowFoamSupport
          * movingFoamSupport
          * 0.22;
        float baseFoamDriver = clamp(
          max(
            max(
              smoothstep(0.08, 0.82, vRapidMask),
              hydraulicSupport
            ),
            vJunctionMask * 0.08
          ),
          0.0,
          1.0
        );
        float wakeHydraulic = max(
          smoothstep(0.28, 0.72, vRapidMask),
          shallowFoamSupport * smoothstep(0.90, 1.35, vFlowSpeed)
        );
        float wakeEnvelope = smoothstep(0.04, 0.14, vDisturbanceMask);
        float wakeShelter = smoothstep(0.18, 0.34, vDisturbanceMask);
        float wakeShear = wakeEnvelope
          * (1.0 - wakeShelter)
          * wakeHydraulic;
        float wakePattern = getWakePattern(vFlowUv, foamPattern);
        float baseFoamMask = baseFoamDriver
          * foamPattern
          * (1.0 - wakeEnvelope * wakeHydraulic);
        float wakeFoamMask = wakeShear * wakePattern * 0.38;
        float foamMask = max(baseFoamMask, wakeFoamMask);
        float foam = foamMask;
        float foamCoreMask = baseFoamMask
          * smoothstep(0.70, 0.90, foamPattern);
        float foamCore = foamCoreMask;
        float foamCoverage = clamp(
          foamMask * 0.72 + foamCoreMask * 0.22,
          0.0,
          0.94
        );

        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float nDotV = max(dot(normal, viewDir), 0.0001);
        vec3 waterFresnel = fresnelSchlick(nDotV, vec3(0.02037));
        float foamSpecularAttenuation = 1.0 - foam * 0.88;
        #ifdef USE_SINGLE_LAYER_WATER
          vec3 undistortedScene;
          float waterThickness;
          vec3 volume = getSingleLayerWaterVolume(
            normal,
            viewDir,
            geometricNormal,
            shoreAlpha,
            effectiveWaterFade,
            undistortedScene,
            waterThickness
          );
          volume *= 1.0 + flowTone * mix(0.75, 0.55, depthMask);
        #else
          vec3 color = mix(uShallowColor, uDeepColor, depthMask);
          float sedimentVisibility = (1.0 - depthMask)
            * (1.0 - centerMask * 0.35);
          color = mix(color, uSedimentColor, sedimentVisibility * 0.3);
          color *= 1.0 + flowTone * mix(1.0, 0.55, depthMask);
        #endif

        vec3 reflection = getFlowingWaterReflection(
          mix(
            uHorizonReflectionColor,
            uReflectionColor,
            clamp(abs(normal.y), 0.0, 1.0)
          ),
          normal,
          viewDir
        );
        vec3 reflectedEnergy = waterFresnel * foamSpecularAttenuation * 0.26;
        #ifdef USE_SINGLE_LAYER_WATER
          vec3 color = volume * (1.0 - reflectedEnergy)
            + reflection * reflectedEnergy;
        #else
          color = color * (1.0 - reflectedEnergy)
            + reflection * reflectedEnergy;
        #endif

        vec3 lightDirection = normalize(uSunDirection);
        float rapidSurface = clamp(
          max(vRapidMask, hydraulicSupport),
          0.0,
          1.0
        );
        float macroRoughness = mix(0.22, 0.32, rapidSurface);
        macroRoughness = mix(macroRoughness, 0.78, foam);
        macroRoughness = getSpecularAARoughness(normal, macroRoughness);
        vec3 macroSpecular = evaluateWaterSpecular(
          normal,
          viewDir,
          lightDirection,
          macroRoughness
        );
        #ifdef USE_SINGLE_LAYER_WATER
          float microRoughness = mix(0.09, 0.12, rapidSurface);
          microRoughness = mix(microRoughness, 0.82, foam);
          microRoughness = getSpecularAARoughness(
            microNormal,
            microRoughness
          );
          vec3 microSpecular = evaluateWaterSpecular(
            microNormal,
            viewDir,
            lightDirection,
            microRoughness
          );
          vec3 directSpecular = macroSpecular * 0.65
            + microSpecular * 0.35;
        #else
          vec3 directSpecular = macroSpecular;
        #endif
        vec3 sunSpecularColor = mix(
          vec3(1.0),
          uSunReflectionColor,
          0.35
        );
        directSpecular *= sunSpecularColor * uSunIntensity;
        directSpecular /= vec3(1.0) + directSpecular / 1.35;
        color += directSpecular * foamSpecularAttenuation * 0.40;

        float foamColorMix = clamp(
          baseFoamMask * 0.50
            + foamCore * 0.36
            + wakeFoamMask * 0.28,
          0.0,
          0.86
        );
        color = mix(color, uFoamColor, foamColorMix);

        float viewDistanceFade = 1.0 - smoothstep(
          max(vViewDistance - 55.0, 0.0),
          vViewDistance,
          distance(uCameraPosition.xz, vWorldPosition.xz)
        );

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
          float depthCoverage = mix(
            0.78,
            1.0,
            smoothstep(0.02, 0.65, waterThickness)
          );
          float coverage = clamp(
            max(
              shoreAlpha * depthCoverage,
              foamShoreAlpha * foamCoverage
            ) * effectiveWaterFade * viewDistanceFade,
            0.0,
            1.0
          );
          gl_FragColor = vec4(
            mix(undistortedScene, foggedWaterColor, coverage),
            1.0
          );
        #else
          float shallowAlpha = mix(0.16, 0.24, centerMask);
          float deepAlpha = mix(0.58, 0.68, centerMask);
          float alpha = mix(shallowAlpha, deepAlpha, depthMask) * shoreAlpha;
          alpha = clamp(
            alpha
              + foamShoreAlpha * foamCoverage * (1.0 - alpha) * 0.55,
            0.0,
            1.0
          );
          alpha *= effectiveWaterFade * viewDistanceFade;
          gl_FragColor = vec4(foggedWaterColor, alpha);
        #endif
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
