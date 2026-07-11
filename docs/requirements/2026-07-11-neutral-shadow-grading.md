# Requirement / 需求

Preserve readable terrain and vegetation shadows before ACES tone mapping without raising global exposure or flattening contact shading.

在 ACES 色调映射之前保留可读的地形和植被暗部，不提高全局曝光，也不洗平接触阴影。

# Summary / 概要

Set the pre-tonemap color-grade contrast to a neutral value and reduce the screen vignette while retaining the existing shadow lift, saturation, cold/warm tint, bloom, sharpening, exposure, and pass order.

将色调映射前的调色对比度设为中性值并减弱屏幕暗角，同时保留现有暗部提升、饱和度、冷暖染色、Bloom、锐化、曝光和 Pass 顺序。

# User Request / 用户需求

The current base lighting and grass-covered ground appear too dark. Improve readability without hiding material problems behind stronger global lighting.

当前基础光照和草地地面看起来偏暗。在不用更强全局光照掩盖材质问题的前提下提高画面可读性。

# Scope / 范围

- Change pre-tonemap contrast from `1.05` to `1.0`.
- Change vignette strength from `0.18` to `0.08`.
- Keep shadow lift at `0.015` and retain saturation and cold/warm tint.
- Do not change renderer exposure, sun, hemisphere light, environment intensity, bloom, sharpening, GTAO, or terrain textures.
- Keep the existing render-pass order.

- 将色调映射前对比度从 `1.05` 调整为 `1.0`。
- 将暗角强度从 `0.18` 调整为 `0.08`。
- 暗部提升保持 `0.015`，并保留饱和度与冷暖染色。
- 不修改渲染器曝光、太阳、半球光、环境强度、Bloom、锐化、GTAO 或地形贴图。
- 保持现有渲染 Pass 顺序。

# Acceptance Criteria / 验收标准

- The color-grade shader uses neutral `1.0` contrast and `0.08` vignette strength.
- Existing shadow lift remains `0.015`.
- Sky and water highlights do not change because of exposure or light adjustments in this commit.
- Post-processing pass order and quality-preset behavior remain unchanged.
- Automated post-processing tests and the production build pass.

- 调色 Shader 使用中性 `1.0` 对比度和 `0.08` 暗角强度。
- 现有暗部提升保持 `0.015`。
- 本提交不通过曝光或光照调整改变天空与水面高光。
- 后处理 Pass 顺序与质量档行为保持不变。
- 后处理自动化测试与生产构建通过。
