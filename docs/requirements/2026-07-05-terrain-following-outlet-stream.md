# Terrain Following Outlet Stream / 贴地出口溪流

## Requirement / 需求

English: Prevent the waterfall outlet stream surface from floating above the terrain.

中文：防止瀑布出口溪流水面漂浮在地形上方。

## Summary / 概要

English: The outlet stream surface now samples the carved terrain height and adds only a small water offset, so it stays seated in the channel instead of rendering as a fixed-height strip.

中文：出口溪流水面现在采样雕刻后的地形高度，并只增加一个很小的水面偏移，因此会落在河槽里，而不是渲染成固定高度的水带。

## User Request / 用户需求

English: The user reported that the river channel is floating in the air after the waterfall outlet adjustment.

中文：用户反馈瀑布出口调整后河道飘在空中了。

## Scope / 范围

English: Update only the lake outlet stream surface height calculation. Do not change lake geometry, waterfall veil geometry, downstream river geometry, vegetation placement, player behavior, lighting, textures, or unrelated pending work.

中文：仅更新湖泊出口溪流水面高度计算。不改变湖泊几何、瀑布帘几何、下游主河道几何、植被摆放、玩家行为、灯光、贴图或无关待提交改动。

## Acceptance Criteria / 验收标准

English:
- The outlet stream surface follows the carved terrain channel.
- The outlet stream no longer appears as a floating fixed-height strip above sandy ground.
- The waterfall and plunge pool remain unchanged in intent.
- The project build passes.

中文：
- 出口溪流水面跟随雕刻后的地形河槽。
- 出口溪流不再表现为漂浮在沙地上方的固定高度水带。
- 瀑布和冲潭表现意图保持不变。
- 项目构建通过。
