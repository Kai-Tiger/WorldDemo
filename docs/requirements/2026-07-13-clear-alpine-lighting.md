# Requirement / 需求

Establish a clear late-morning alpine lighting baseline that brightens the ground and vegetation without relying on increased exposure.

建立清朗高山上午的基础光照，在不依赖提高曝光的情况下改善地面与植被亮度。

# Summary / 概要

The environment now uses a higher 48-degree sun while preserving the authored azimuth, a brighter lower-hemisphere environment map and ground bounce, lighter clear-weather fog, restrained cloud coverage, reduced vegetation GTAO, and a subtler neutral color grade.

环境现在使用保留原方位的 48 度高太阳，并提亮环境贴图下半球与地面反弹光，采用更轻的清朗天气雾、克制的云量、排除植被的 GTAO，以及更轻微且中性的调色。

# User Request / 用户需求

The user reported that a supposedly clear scene looked uniformly dim, with weak reflection cues and coarse shadowing, and requested a staged improvement to the environment lighting and material response.

用户反馈清朗天气下的场景整体过暗、反射线索不足且阴影不够细腻，并要求分阶段改善环境光照和材质响应。

# Scope / 范围

Update only the shared clear-weather environment values, procedural environment-map lower hemisphere, deferred vegetation GTAO exclusion, GTAO strength presets, and pre-tonemap color-grade tints and vignette. Preserve exposure, world layout, terrain geometry, vegetation placement, water behavior, material textures, shadow implementation, gameplay, and unrelated pending changes.

仅更新共享清朗天气环境参数、程序化环境贴图下半球、延迟植被宿主的 GTAO 排除、GTAO 强度预设，以及色调映射前的调色与暗角。保持曝光、世界布局、地形几何、植被分布、水体行为、材质贴图、阴影实现、玩法和无关待处理改动不变。

# Acceptance Criteria / 验收标准

- Sun elevation is 48 degrees while retaining the existing horizontal azimuth.
- Exposure remains 1.14 and environment-map intensity is 1.05.
- The lower hemisphere and hemisphere ground bounce are visibly brighter than the previous cold-mist baseline.
- The performance fog fallback density is 0.00045 and visible clouds remain sparse at roughly 20–25% coverage.
- Balanced and Quality GTAO intensities are 0.20 and 0.24, and deferred grass and tree roots are excluded from GTAO.
- Vignette strength is 0.03 with near-neutral shadow and highlight tints.
- Focused tests, the full test suite, the lowlands check, and the production build pass.

- 太阳高度为 48 度，同时保留现有水平方位。
- 曝光保持 1.14，环境贴图强度为 1.05。
- 环境贴图下半球和半球光地面反弹明显亮于之前的冷雾基线。
- Performance 雾回退密度为 0.00045，可见云量保持稀疏，约为 20%–25%。
- Balanced 与 Quality 的 GTAO 强度分别为 0.20 和 0.24，延迟草地与树木宿主从 GTAO 中排除。
- 暗角强度为 0.03，并采用接近中性的阴影与高光色调。
- 定向测试、完整测试套件、低地形检查和生产构建通过。
