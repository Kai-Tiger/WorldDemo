# Requirement / 需求

Shorten the snowmelt runoff channels so they stop before entering the lake surface area.

缩短融雪径流河道，让它们在进入湖水区域前结束。

# Summary / 概要

This change moves the snowmelt channel endpoints to just outside the irregular lake boundary and removes the lake-level inflow ripple overlays that no longer match the shortened paths.

本次变更将融雪河道终点移动到不规则湖岸外侧，并移除不再适合缩短后路径的湖面入水涟漪覆盖层。

# User Request / 用户需求

The user clarified that the issue is not brightness tuning: the snowmelt rivers from the mountain should be shortened so they no longer continue under the lake water.

用户澄清问题不是调低亮度，而是从山上延伸下来的融雪河道应该缩短，不再继续进入湖水下方。

# Scope / 范围

Update the snowmelt path endpoints and remove obsolete snowmelt inflow ripples. Do not change the main downstream river path, lake geometry, shared water colors, waterfall behavior, vegetation placement, spawn behavior, leaf decals, or enemy assets.

更新融雪路径终点并移除过时的融雪入湖涟漪。不修改下游主河道路径、湖面几何、共享水色、瀑布行为、植被放置、出生点行为、落叶贴花或敌人资源。

# Acceptance Criteria / 验收标准

- All snowmelt channel endpoints are outside the lake boundary.
- Snowmelt terrain carving and wet masks no longer continue under the lake surface.
- No snowmelt ripple overlay is placed at lake water height after the channels stop on land.
- The snowmelt runoff still appears on the mountain side and fades before the lake.
- Build verification passes.
- Screenshot review confirms no white snowmelt channels extend under the lake water.

- 所有融雪河道终点都位于湖岸边界外。
- 融雪地形雕刻和湿润 mask 不再继续进入湖面下方。
- 融雪河道停在陆地后，不再在湖面高度生成涟漪覆盖层。
- 山坡侧仍能看到融雪径流，并在入湖前淡出。
- 构建验证通过。
- 截图复查确认湖水下方不再有白色融雪河道延伸。
