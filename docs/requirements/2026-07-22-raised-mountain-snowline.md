# Raised Mountain Snowline / 提高山脉雪线

## Requirement / 需求

Raise the mountain snowline by 100 meters while keeping the existing snow breakup, slope response, and distance transition stable.

将山脉雪线提高 100 米，同时保持现有积雪打散、坡度响应和远近过渡稳定。

## Summary / 概要

Use the existing perimeter-heightfield influence mask to shift the shared physical snow-elevation response upward by as much as 100 meters. Both detailed nearby shading and distant macro shading use the spatially raised line so an enterable mountain does not change its snowline as the player approaches, while the original central terrain keeps its current snow coverage.

使用现有外围高度场影响遮罩，将共享的物理积雪海拔响应最多提高 100 米。近距离精细着色与远距离宏观着色都使用这条按空间提高的雪线，避免玩家接近可进入山体时雪线发生变化，同时原始中央地形保持现有积雪覆盖。

## User Request / 用户需求

The snowline on the distant mountain range should be raised by 100 meters.

远处山脉的雪线可以提高 100 米。

## Scope / 范围

- Add the existing edge-mountain influence as a terrain vertex attribute.
- Raise the snow-elevation response by exactly 100 world meters where the perimeter mask is fully active, with a smooth proportional transition at its boundary.
- Preserve macro-noise variation, slope masks, cell-bombed snow sampling, and the 180–420 meter detail transition.
- Keep terrain height, collision, river materials, vegetation, and texture assets unchanged.
- Update the shader program cache key and terrain-material regression tests.

- 将现有外围山体影响值作为地形顶点属性传入 shader。
- 在外围遮罩完全生效处将积雪海拔响应准确提高 100 个世界米，并在遮罩边界按比例平滑过渡。
- 保持宏观噪声变化、坡度遮罩、cell bombing 积雪采样和 180–420 米细节过渡不变。
- 不修改地形高度、碰撞、河道材质、植被和纹理资源。
- 更新 shader 程序缓存键与地形材质回归测试。

## Acceptance Criteria / 验收标准

- Fully influenced perimeter mountains use an effective 155–230 meter transition instead of 55–130 meters.
- Central terrain retains the existing 55–130 meter transition.
- The same raised elevation mask drives detailed and macro snow coverage, preventing camera-distance snowline popping.
- High gentle slopes retain snow while cliffs remain comparatively bare.
- Existing terrain-material tests, the full test suite, production build, and a visual mountain check pass.

- 遮罩完全生效的外围山脉使用等效 155–230 米过渡，而不再是 55–130 米。
- 中央地形继续保留现有 55–130 米过渡。
- 精细积雪与宏观积雪由同一条提高后的海拔遮罩驱动，避免雪线随相机距离跳变。
- 高海拔缓坡仍有积雪，陡峭岩壁仍相对裸露。
- 现有地形材质测试、完整测试集、生产构建和山体视觉检查通过。
