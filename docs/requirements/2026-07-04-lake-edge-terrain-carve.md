# Requirement / 需求

Expose the main lake water edge by carving the surrounding terrain lower.

通过降低周围地形来露出主湖湖水边缘。

# Summary / 概要

The lake basin now follows the lake's irregular per-angle outline instead of a fixed base radius, and the immediate outer shore is carved slightly below the water level so terrain does not swallow the water edge.

湖盆现在跟随湖泊每个角度上的不规则轮廓，而不是固定基础半径；紧贴湖外侧的岸线会被略微挖到水位以下，避免地形吞掉湖水边缘。

# User Request / 用户需求

The user showed a screenshot where the lake edge appeared clipped by terrain and asked to check whether the shoreline was being swallowed, allowing the terrain to be dug away to expose the lake edge.

用户提供截图，湖水边缘看起来被地形遮挡，并要求检查岸线是否被吞掉，同时允许挖掉地形来露出湖水边缘。

# Scope / 范围

Update only the main lake terrain basin carving around the shoreline. Do not change the water shader, water color palette, lake mesh shape, vegetation placement, player behavior, lighting, post-processing, or unrelated pending work.

仅更新主湖岸线附近的地形湖盆雕刻。不修改水体 shader、水面调色、湖面网格形状、植被放置、玩家行为、灯光、后处理或无关的待提交改动。

# Acceptance Criteria / 验收标准

- The visible main lake edge is no longer swallowed by shore terrain.
- The shoreline terrain immediately under and outside the lake edge remains below the water level.
- Lake center, foam behavior, outlet stream, snowmelt, and river visuals remain unchanged in intent.
- Build verification passes.

- 主湖可见边缘不再被岸边地形吞掉。
- 紧贴湖水边缘内外的岸线地形保持在水位以下。
- 湖心、泡沫行为、湖口小河、融雪径流和河流视觉意图保持不变。
- 构建验证通过。
