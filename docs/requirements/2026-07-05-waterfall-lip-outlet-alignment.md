# Waterfall Lip Outlet Alignment / 瀑布口与出口溪流对齐

## Requirement / 需求

English: Align the waterfall starting edge with the end of the outlet stream.

中文：让瀑布起始边与出口溪流末端对齐。

## Summary / 概要

English: The waterfall geometry now samples the outlet stream's terrain-following surface height at the lip and uses the outlet stream's lateral direction for the waterfall top edge.

中文：瀑布几何现在在瀑布口采样出口溪流的贴地水面高度，并使用出口溪流末端的横向方向作为瀑布顶部边线方向。

## User Request / 用户需求

English: The user clarified that the river is now acceptable, but the waterfall start point does not line up with the river.

中文：用户说明现在河流没有问题，但瀑布的起点没有和河流对上。

## Scope / 范围

English: Update only the waterfall lip geometry placement and orientation relative to the outlet stream. Do not change the outlet stream path, terrain carving, lake geometry, downstream river geometry, waterfall shader, vegetation, player behavior, lighting, textures, or unrelated pending work.

中文：仅更新瀑布口几何相对出口溪流的位置和方向。不改变出口溪流路径、地形雕刻、湖泊几何、下游主河道几何、瀑布着色器、植被、玩家行为、灯光、贴图或无关待提交改动。

## Acceptance Criteria / 验收标准

English:
- The waterfall top edge starts at the outlet stream endpoint.
- The waterfall lip height matches the terrain-following outlet stream surface.
- The waterfall top edge uses the outlet stream's lateral direction instead of a fixed world-axis direction.
- The project build passes.

中文：
- 瀑布顶部边线从出口溪流末端开始。
- 瀑布口高度匹配贴地出口溪流水面。
- 瀑布顶部边线使用出口溪流的横向方向，而不是固定世界轴方向。
- 项目构建通过。
