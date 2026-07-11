# Requirement / 需求

Keep tree shadows complete inside the configured shadow range without chunk-based shadow stages.

让配置阴影范围内的树木展示完整阴影，不再出现按分块切换的生硬阶段。

## Summary / 概要

Tree geometry continues to use the existing full-detail instanced models. Visible tree zones now always cast shadows, while the directional-light shadow camera uses the configured shadow distance as its horizontal coverage radius, includes the complete terrain-and-tree height range, and aligns its center in light space.

树木几何继续使用现有完整细节的实例模型。可见树区现在始终投射阴影；方向光阴影相机使用已配置的阴影距离作为水平覆盖半径，同时纳入完整的地形与树木高度范围，并在光源空间对齐相机中心。

## User Request / 用户需求

The user reported that tree shadows switch too abruptly and are visibly cut off, and requested complete shadows for trees inside the active range instead of hard LOD-like stages.

用户反馈树木阴影切换过于生硬且会被明显截断，希望有效范围内的树木展示完整阴影，而不是类似 LOD 的硬阶段。

## Scope / 范围

Remove the per-terrain-chunk binary tree-shadow switch, fit each quality tier's single shadow camera to its configured horizontal distance and the world height range, and keep the light position, far plane, and light-space texel snapping aligned with that fit. Do not change tree geometry, placement, density, grass shadows, terrain shape, water, or gameplay.

移除按地形分块执行的树影二值开关，让各画质档的单个阴影相机同时拟合配置的水平距离与世界高度范围，并让光源位置、远裁剪面和光源空间纹素对齐与拟合结果保持一致。不修改树木几何、摆放、密度、草地阴影、地形形状、水体或玩法。

## Acceptance Criteria / 验收标准

- Tree models do not gain a geometry LOD and visible tree instances continue casting shadows at all distances inside the tree visibility range.
- The Performance, Balanced, and Quality shadow cameras cover configured core widths of 360 m, 520 m, and 840 m respectively, plus a small clipping-safety margin, horizontally centered on the player.
- Shadow-camera bounds include terrain from below its skirts through the tallest tree crowns; texel snapping happens in light space and depth coverage matches the fitted bounds.
- Tree shadows no longer switch as an entire 256 m terrain chunk or clip at the former narrow shadow-camera boundary.
- Targeted tests, the full test suite, and the production build pass.

- 树模型不新增几何 LOD，可见范围内的树实例始终保持投射阴影。
- Performance、Balanced 和 Quality 的阴影相机分别覆盖 360 米、520 米和 840 米的配置核心宽度，并额外保留少量防裁剪余量，在水平方向以玩家为中心。
- 阴影相机边界覆盖地形裙边以下到最高树冠的高度；纹素对齐在光源空间完成，深度覆盖与拟合边界一致。
- 树影不再按整个 256 米地形块切换，也不会在原先狭窄的阴影相机边界处被截断。
- 针对性测试、完整测试套件和生产构建全部通过。
