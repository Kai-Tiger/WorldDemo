# Requirement / 需求

Make the main lake shoreline foam more continuous and make lake motion more visible.

让主湖岸线泡沫更加连续，并让湖面动态更加明显。

# Summary / 概要

This change moves the foam band slightly inward from the terrain-clipped edge, reduces its dependency on shoreline depth, and strengthens lake wave/ripple animation in the existing shader.

本次变更将泡沫带从容易被地形遮挡的最外缘向湖内侧移动，降低它对岸边水深的依赖，并在现有 shader 中增强湖面波纹动画。

# User Request / 用户需求

The user observed that some parts of the lake edge have white foam while others do not, suspected the water edge is being swallowed by terrain, and reported that the lake still lacks visible dynamic motion.

用户观察到湖水边缘有些地方有白边、有些没有，怀疑水边缘被地形吞掉，并反馈湖面仍然缺少明显动态效果。

# Scope / 范围

Update the lake surface shader foam and motion behavior only. Do not modify lake geometry, terrain height carving, water paths, shared water colors, waterfall behavior, vegetation placement, spawn behavior, leaf decals, or enemy assets.

仅更新湖面 shader 的泡沫和动态表现。不修改湖面几何、地形高度雕刻、水路路径、共享水色、瀑布行为、植被放置、出生点行为、落叶贴花或敌人资源。

# Acceptance Criteria / 验收标准

- Lake shoreline foam appears as a mostly continuous broken band around the main lake.
- Foam is offset inward from the exact terrain-clipped lake edge.
- Foam no longer disappears solely because the immediate shoreline depth is shallow.
- Lake surface waves and ripple highlights are more visible in still screenshots.
- Foam remains near the shoreline and does not fill the lake center.
- Build verification passes.

- 主湖岸线泡沫呈现大体连续但破碎自然的白色边带。
- 泡沫从被地形遮挡的湖面最外缘向湖内侧偏移。
- 泡沫不会仅因为紧贴岸边处水深较浅而消失。
- 静态截图中湖面波动和高光变化更明显。
- 泡沫仍集中在湖岸附近，不铺满湖心。
- 构建验证通过。
