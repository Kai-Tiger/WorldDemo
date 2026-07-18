# Requirement / 需求

## Summary / 概要

Create a stronger, non-repeating distant silhouette with varied foothills and separated outer high-hill groups.

通过在可玩地形四周布置具有差异的前丘和彼此留有空隙的最外圈高丘群，形成更明显且不重复的远景轮廓。

## User Request / 用户需求

The distant terrain looks too flat. Add varied 50–100 meter foothills on every side and separated 200–300 meter outer high hills without river channels on their surfaces.

远处地形过于平坦；四周都需要增加不重复的 50–100 米前丘，并在最外圈布置彼此留有空隙的 200–300 米高丘，丘面不能出现河道。

## Scope / 范围

- Update only the procedural rolling hills in the eight outer terrain cells.
- Add separated high-hill groups around the outer perimeter with varied elevations, footprints, rotations, and slope profiles.
- Fade out procedural river carving, wet/bed material masks, and vegetation exclusions across high-hill surfaces.
- Share high-hill sampling across adjacent outer cells so hills crossing a cell boundary remain seamless.
- Preserve the original center terrain, its transition band, roads, and water layout.
- Vary each direction through different hill counts, footprints, rotations, outlines, and slope profiles.

- 仅调整八个外围地形区块中的程序化丘陵。
- 在最外圈布置彼此分离的高丘群，并持续改变其高度、占地、朝向和坡面曲线。
- 在高丘表面渐隐程序化河道雕刻、河床/湿地材质遮罩和植被排除带。
- 相邻外围区块共同采样跨界高丘，避免区块边界切断丘体。
- 保持中心原始地形、过渡带、道路和水系布局不变。
- 通过不同的丘陵数量、占地尺寸、朝向、轮廓和坡面曲线区分各个方向。

## Acceptance Criteria / 验收标准

- Every outer terrain cell contains at least two hills.
- Each hill has 50–100 meters of configured relief above the surrounding plain.
- All four sides contain outer high hills with 200–300 meter summit elevations.
- High-hill centers remain separated by visible lowland gaps.
- River carving and river-surface material masks are fully suppressed on the main high-hill surfaces.
- High hills remain continuous across terrain-cell boundaries without straight cut seams.
- All eight hill groups have distinct parameter signatures and irregular outlines.
- The center terrain remains unchanged, and the terrain/water tests and production build pass.

- 每个外围地形区块至少包含两座丘陵。
- 每座丘陵相对周边平原的配置高差在 50–100 米之间。
- 四个方向的最外圈都包含峰顶高度为 200–300 米的高丘。
- 高丘中心之间保留可见的低地空隙。
- 主要高丘表面完全不进行河道雕刻，也不显示河床或湿地材质线。
- 高丘跨越地形区块边界时保持连续，不出现直线切缝。
- 八组丘陵都具有不同的参数组合和不规则轮廓。
- 中心地形保持不变，地形/水系测试与生产构建通过。
