# Requirement / 需求

Establish a clear late-morning alpine lighting baseline that brightens the ground and vegetation without relying on increased exposure.

建立清朗高山上午的基础光照，在不依赖提高曝光的情况下改善地面与植被亮度。

# Summary / 概要

The environment now uses a higher 48-degree sun while preserving the authored azimuth, a brighter lower-hemisphere environment map and calibrated sky fill, lighter clear-weather fog, restrained cloud coverage, reduced vegetation GTAO, and a subtler neutral color grade. Final fixed-camera calibration raises the forest lower-half luminance above 75 without changing exposure.

环境现在使用保留原方位的 48 度高太阳，并提亮环境贴图下半球与校准后的天空填充光，采用更轻的清朗天气雾、克制的云量、排除植被的 GTAO，以及更轻微且中性的调色。最终固定镜头校准在不改变曝光的前提下，将森林下半区平均亮度提高到 75 以上。

# User Request / 用户需求

The user reported that a supposedly clear scene looked uniformly dim, with weak reflection cues and coarse shadowing, and requested a staged improvement to the environment lighting and material response.

用户反馈清朗天气下的场景整体过暗、反射线索不足且阴影不够细腻，并要求分阶段改善环境光照和材质响应。

# Scope / 范围

Update only the shared clear-weather environment values, procedural environment-map lower hemisphere, deferred vegetation GTAO exclusion, GTAO strength presets, and pre-tonemap color-grade tints and vignette. Preserve exposure, world layout, terrain geometry, vegetation placement, water behavior, material textures, shadow implementation, gameplay, and unrelated pending changes.

仅更新共享清朗天气环境参数、程序化环境贴图下半球、延迟植被宿主的 GTAO 排除、GTAO 强度预设，以及色调映射前的调色与暗角。保持曝光、世界布局、地形几何、植被分布、水体行为、材质贴图、阴影实现、玩法和无关待处理改动不变。

# Acceptance Criteria / 验收标准

- Sun elevation is 48 degrees while retaining the existing horizontal azimuth.
- Exposure remains 1.14; environment-map intensity is 1.20 and hemisphere intensity is 2.15 after fixed-camera calibration.
- The lower hemisphere and hemisphere ground bounce are visibly brighter than the previous cold-mist baseline.
- The performance fog fallback density is 0.00045 and visible clouds remain sparse at roughly 20–25% coverage.
- Balanced and Quality GTAO intensities are 0.20 and 0.24, and deferred grass and tree roots are excluded from GTAO.
- Vignette strength is 0.03 with near-neutral shadow and highlight tints.
- In the fixed Balanced forest capture, lower-half mean luminance is at least 75, pixels below 64 stay at or below 45%, and near-white clipping stays below 1%.
- Focused tests and the production build pass; unrelated dirty-worktree lowland failures remain out of scope.

- 太阳高度为 48 度，同时保留现有水平方位。
- 曝光保持 1.14；固定镜头校准后，环境贴图强度为 1.20，半球光强度为 2.15。
- 环境贴图下半球和半球光地面反弹明显亮于之前的冷雾基线。
- Performance 雾回退密度为 0.00045，可见云量保持稀疏，约为 20%–25%。
- Balanced 与 Quality 的 GTAO 强度分别为 0.20 和 0.24，延迟草地与树木宿主从 GTAO 中排除。
- 暗角强度为 0.03，并采用接近中性的阴影与高光色调。
- Balanced 固定森林截图中，下半区平均亮度至少为 75，低于 64 的像素不超过 45%，近白剪裁不超过 1%。
- 定向测试和生产构建通过；工作区中无关的低地形失败不在本阶段范围内。
