# Requirement / 需求

Add visible animated foam to the lake edge and make the lake surface feel less static.

为湖水边缘增加明显的动态泡沫，并让湖面不再显得静止。

# Summary / 概要

This change strengthens the lake shoreline foam mask, animates the foam breakup with time-based procedural noise, and adds subtle lake surface movement through shader-driven waves.

本次变更强化湖岸泡沫遮罩，用基于时间的程序噪声驱动泡沫破碎动画，并通过 shader 波动让湖面产生细微运动。

# User Request / 用户需求

The user reported that the lake edge is transparent and the lake looks like still water without visible wave motion, then requested white foam along the edge for separation.

用户反馈湖水边缘透明，湖面看起来像一摊没有波动和动画的死水，并希望在边缘加入白色泡沫来区分。

# Scope / 范围

Update the existing lake surface shader only. Do not change lake geometry, water paths, shared water colors, snowmelt path lengths, waterfall behavior, vegetation placement, spawn behavior, leaf decals, or enemy assets.

仅更新现有湖面 shader。不修改湖面几何、水路路径、共享水色、融雪路径长度、瀑布行为、植被放置、出生点行为、落叶贴花或敌人资源。

# Acceptance Criteria / 验收标准

- Lake shorelines show a broken white foam edge instead of only transparent water.
- Shore foam is animated with `uTime` and procedural noise.
- The lake surface has subtle moving ripples and no longer reads as static.
- Foam remains concentrated near the shoreline and does not fill the lake center.
- Build verification passes.
- Screenshot review confirms the lake edge is readable against terrain.

- 湖岸线显示破碎的白色泡沫边缘，而不只是透明水面。
- 岸边泡沫使用 `uTime` 和程序噪声进行动画。
- 湖面具备细微运动波纹，不再显得静止。
- 泡沫集中在湖岸附近，不铺满湖心。
- 构建验证通过。
- 截图复查确认湖岸边缘能与地形清晰区分。
