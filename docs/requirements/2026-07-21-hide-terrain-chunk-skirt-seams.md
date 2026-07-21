# Hide Terrain Chunk Skirt Seams / 隐藏地形区块裙边接缝

## Requirement / 需求

Terrain chunk crack-hiding skirts must not appear as dotted stripes on distant snowy mountains or as bright boundary lines across lowland ground.

用于遮挡地形区块裂缝的裙边，不应在远处雪山上显示为点状条纹，也不应在低地地面上形成明亮的交界线。

## Summary / 概要

Move terrain skirts slightly behind the terrain surface during depth testing so the surface consistently wins at shared chunk edges, while retaining the skirts as fallback coverage for genuine LOD gaps.

在深度测试中将地形裙边轻微后移，使共享区块边缘始终优先显示地表，同时保留裙边对真实 LOD 裂缝的兜底遮挡能力。

## User Request / 用户需求

Remove the stripe-like marks visible on distant mountains and the similar boundary mark visible on the ground. These marks must not be treated as river carving.

去除远山上可见的条纹，以及地面上类似的交界痕迹；这些痕迹不应被当作河道切割处理。

## Scope / 范围

- Adjust only the depth behavior of the existing terrain-skirt material.
- Keep terrain height generation, snow shading, river carving, water masks, and LOD geometry unchanged.
- Add regression coverage for the terrain-skirt depth offset.

- 仅调整现有地形裙边材质的深度行为。
- 保持地形高度生成、积雪着色、河道切割、水体遮罩和 LOD 几何不变。
- 新增地形裙边深度偏移的回归测试。

## Acceptance Criteria / 验收标准

- Terrain skirts use a positive polygon offset so shared-edge terrain surfaces render in front of them.
- Skirts remain present for genuine LOD gaps and unloaded-neighbor boundaries.
- The fixed lowland-hills view shows no grid-aligned dotted mountain stripes or bright ground seam in balanced and performance quality modes.
- Terrain LOD tests, the full test suite, and the production build pass.

- 地形裙边使用正向多边形偏移，使共享边缘的地表稳定渲染在其前方。
- 裙边继续保留，用于遮挡真实 LOD 裂缝和邻块尚未加载时的边界。
- 固定 lowland-hills 机位在平衡与性能画质下均不再出现沿网格排列的远山点状条纹或地面亮色接缝。
- 地形 LOD 测试、完整测试集和生产构建全部通过。
