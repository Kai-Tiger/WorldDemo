# Stop Snowmelt Before Lake / 阻止融雪河道伸入湖内

## Requirement / 需求

English: Stop the snowmelt river meshes from visibly extending into the lake interior.

中文：阻止融雪河道 mesh 明显伸入湖泊内部。

## Summary / 概要

English: The snowmelt path endpoints are moved back outside the irregular lake boundary, and the visible water fades at the shore instead of after entering the lake.

中文：融雪路径终点移回不规则湖岸边界外侧，可见水面在湖岸处淡出，而不是进入湖中后再淡出。

## User Request / 用户需求

English: The user showed that the river channels extend into the lake again and asked to fix it.

中文：用户展示河道又伸进湖里面，并要求修复。

## Scope / 范围

English: Update only the snowmelt path endpoints and snowmelt water fade behavior. Do not change the upstream mountain runoff shape, lake geometry, outlet stream, waterfall, terrain heightmap asset, vegetation, player, camera, or unrelated pending work.

中文：仅更新融雪路径终点和融雪水面淡出行为。不修改上游山地径流形状、湖泊几何、出水口溪流、瀑布、地形高度图资产、植被、玩家、相机或无关待提交改动。

## Acceptance Criteria / 验收标准

English:
- Snowmelt path endpoints are outside the irregular lake boundary.
- No blue stream strip visibly extends into the lake interior.
- Snowmelt still reads as flowing down from higher terrain to the lake shore.
- Build verification passes.

中文：
- 融雪路径终点位于不规则湖岸边界外。
- 湖泊内部不再明显出现蓝色河道条带。
- 融雪水流仍能看出从更高地形流向湖岸。
- 构建验证通过。
