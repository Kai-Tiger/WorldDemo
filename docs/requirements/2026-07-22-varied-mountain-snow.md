# Varied Mountain Snow / 多样化山脉积雪

## Requirement / 需求

Break up the uniform horizontal snowline across the perimeter mountain range and leave some mountains completely free of snow.

打破外围山脉统一的水平雪线，并让部分山体完全没有积雪。

## Summary / 概要

Reuse the existing deterministic 333-meter world-space macro field as a mountain-scale climate signal. Keep the current 100-meter perimeter snowline raise as the minimum, add a regional raise of 0–100 meters, and smoothly remove snow from the warmest 20–25 percent of mountain regions.

复用现有约 333 米尺度的确定性世界空间宏观场作为山体气候信号。保留当前外围雪线至少提高 100 米的规则，再增加 0–100 米的区域抬升，并让最暖的约 20–25% 山体区域平滑过渡为完全无雪。

## User Request / 用户需求

The mountain snowlines look too uniform and should be more random, with some mountains having no snow.

山脉雪线看起来都在一条线上，过于单调，希望雪线更随机，并让部分山体没有积雪。

## Scope / 范围

- Derive regional snowline raise and snow retention from `vTerrainMacro.w` without adding textures, samplers, uniforms, vertex attributes, or heightfield assets.
- Raise the perimeter snowline by an additional 0–100 meters using `smoothstep(0.20, 0.75, vTerrainMacro.w)`.
- Fade snow retention to zero in warm regions using `1 - smoothstep(0.62, 0.74, vTerrainMacro.w)`.
- Gate both effects by the existing edge-mountain mask and apply them to the shared detailed/macro snow calculation.
- Preserve terrain height, collision, central terrain snow, slope response, alpine cell bombing, water, and river materials.
- Update the shader program cache key and terrain-material regression tests.

- 使用 `vTerrainMacro.w` 计算区域雪线抬升与积雪保留率，不新增纹理、采样器、uniform、顶点属性或高度场资源。
- 使用 `smoothstep(0.20, 0.75, vTerrainMacro.w)` 让外围雪线额外提高 0–100 米。
- 使用 `1 - smoothstep(0.62, 0.74, vTerrainMacro.w)` 让暖区积雪保留率渐变至零。
- 两项变化都由现有外围山体遮罩控制，并作用于精细与宏观积雪共享的计算路径。
- 保持地形高度、碰撞、中央地形积雪、坡度响应、高山 cell bombing、水体和河道材质不变。
- 更新 shader 程序缓存键与地形材质回归测试。

## Acceptance Criteria / 验收标准

- The perimeter range no longer presents one continuous horizontal snowline.
- Regional snowlines retain the existing 100-meter raise and vary upward by as much as another 100 meters.
- Approximately 20–25 percent of prominent perimeter mountain regions are fully snow-free, with broad continuous transitions rather than speckled holes.
- Central terrain is numerically unchanged, and a mountain keeps the same snowy or bare identity across the 180–420 meter distance blend.
- Texture and sampler budgets remain unchanged, with no new geometry attributes or heightfield assets.
- Targeted tests, the full suite, production build, four edge views, a matched near/far view, and Quality-mode WebGL logs pass.

- 外围山脉不再出现一条连续的水平雪线。
- 区域雪线保留现有至少提高 100 米的规则，并可再向上变化最多 100 米。
- 约 20–25% 的明显外围山体区域完全无雪，过渡宽阔连续，不出现碎斑空洞。
- 中央地形数值保持不变，同一山体跨越 180–420 米远近过渡时保持相同的有雪或无雪状态。
- 纹理与采样器预算保持不变，不新增几何属性或高度场资源。
- 定向测试、完整测试集、生产构建、四向边缘机位、同一山峰近远视角及 Quality 模式 WebGL 日志全部通过。
