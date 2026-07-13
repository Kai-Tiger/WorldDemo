# Clear Saturated Alpine Atmosphere / 清透高饱和高山环境

## Requirement / 需求

Restore a clear, realistic late-morning alpine atmosphere with a saturated blue sky, transparent near air, readable distant terrain, and vivid vegetation without raising the fixed exposure or introducing a stylized neon filter.

恢复写实的高山上午环境：天空呈高饱和蓝色，近景空气清透、远山层次可读、植被鲜明，同时不提高固定曝光，也不引入荧光化的游戏滤镜。

## Summary / 概要

Reduce the stacked gray veil from aerial perspective and the sky horizon, then restore restrained local color in terrain and grass. Keep exposure at `1.14`, preserve ACES and the existing post-processing order, and use a distance-ramped atmosphere that is inactive within 180 meters and approaches a bounded 32% opacity only in the far distance.

降低空气透视与天空地平线叠加产生的灰幕，并以克制的局部调色恢复地表和草的色彩。曝光固定为 `1.14`，保留 ACES 与现有后处理顺序；空气层在 180 米内关闭，远距离才平滑趋近 32% 的不透明度上限。

## User Request / 用户需求

The user reported that the scene looked foggy and desaturated despite clear weather. They requested a high-saturation blue sky and transparent air, then clarified after visual review that the environment saturation should be restrained to a realistic vivid level rather than the more aggressive first calibration.

用户反馈清朗天气下画面仍然灰蒙、低饱和，希望得到高饱和蓝天和透明空气；在视觉复核后又明确要求收回偏高的环境饱和度，保持写实鲜明而非激进增艳。

## Scope / 范围

- Calibrate the sun, hemisphere fill, Performance fog, sky colors, cloud threshold, cloud colors, horizon haze, and broad solar Mie halo.
- Add `nearClearDistance`, `fullDensityDistance`, and `minimumHeightDensity` to the shared atmosphere profile.
- Apply a smooth 180–900 meter distance ramp, asymptotic opacity cap, and bounded Mie color mix in the existing aerial-perspective pass.
- Increase global saturation slightly while retaining neutral contrast, ACES output, vignette, and exposure.
- Restore color retention and green balance on the existing forest-floor layer and tune near/far grass color, saturation, highlight compression, shadow lift, and emissive fill.
- Do not add render passes, texture samples, textures, weather settings, tree-specific saturation shaders, geometry changes, or gameplay changes.

- 校准太阳光、半球补光、Performance 雾、天空与云层颜色、云阈值、地平线雾化和宽太阳 Mie 光晕。
- 在共享大气配置中增加 `nearClearDistance`、`fullDensityDistance` 和 `minimumHeightDensity`。
- 在现有空气透视 pass 中加入 180–900 米平滑距离渐入、渐近不透明度上限和有界 Mie 颜色混合。
- 轻量提高全局饱和度，同时保持中性对比、ACES 输出、暗角和曝光不变。
- 恢复现有森林地表层的颜色保留与绿色平衡，并调整近远景草色、饱和度、高光压缩、阴影抬升和 emissive 补光。
- 不新增渲染 pass、纹理采样、贴图、天气设置、树冠专用饱和 shader、几何或玩法改动。

## Acceptance Criteria / 验收标准

- Exposure remains `1.14`; sun, hemisphere, and environment-map intensities are `3.25`, `2.05`, and `1.20`.
- Performance fog uses density `0.00030` and the clean blue `#719bb7` color.
- Balanced and Quality use density `0.00048`, height falloff `0.004`, minimum height density `0.18`, a 180-meter clear zone, a 900-meter full-density distance, and a maximum opacity of `0.32`.
- Aerial opacity is below 2% around 300 meters, approximately 15% around 700 meters, approximately 21% around 900 meters, and never exceeds 32%; sky-depth pixels bypass the pass.
- The sky uses zenith `#236fc4`, horizon `#67a9d6`, cloud threshold `0.48`, cloud color `#e8eef2`, and cloud shadow `#7890a0`, with restrained horizon and broad Mie contributions.
- Global grade saturation is `1.03`, contrast is `1.0`, and shadow lift is `0.012`; forest-floor color retention is `0.70`, and grass uses local saturation `0.90` with restrained near/far tints.
- Automated tests, production build, lowland check, and `git diff --check` pass.
- Fixed visual captures show no visible white veil inside 300 meters, readable tree silhouettes at 700 meters, saturated unclipped sky and vegetation, and no regression to fluorescent foliage.

- 曝光保持 `1.14`；太阳、半球光和环境贴图强度分别为 `3.25`、`2.05` 和 `1.20`。
- Performance 雾密度为 `0.00030`，颜色为纯净蓝 `#719bb7`。
- Balanced 和 Quality 使用密度 `0.00048`、高度衰减 `0.004`、最低高度密度 `0.18`、180 米透明区、900 米完整散射距离及 `0.32` 最大不透明度。
- 空气层在约 300 米低于 2%、700 米约 15%、900 米约 21%，且始终不超过 32%；天空深度像素直接跳过该 pass。
- 天空使用天顶 `#236fc4`、地平线 `#67a9d6`、云阈值 `0.48`、云色 `#e8eef2`、云影 `#7890a0`，并限制地平线与宽 Mie 光晕贡献。
- 全局调色饱和度为 `1.03`、对比度为 `1.0`、阴影抬升为 `0.012`；森林地表颜色保留系数为 `0.70`，草使用 `0.90` 的局部饱和度和收敛后的近远景色。
- 自动测试、生产构建、低地检查和 `git diff --check` 全部通过。
- 固定视觉截图中 300 米内无可见白幕、700 米树群轮廓可读，天空和植被饱和且不剪裁，树叶不出现荧光化回退。
