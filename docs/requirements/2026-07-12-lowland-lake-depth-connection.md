# Lowland Lake Depth and Creek Connection / 低地湖深度与河道衔接

## Requirement / 需求

**English:** Deepen the newly added east meadow pond and make its outlet creek connect cleanly to both lake surfaces without exposed terrain strips or a visible river overlay inside the pond.

**中文：** 加深新增的东侧草甸湖，并让出口河道与两端湖面自然衔接，消除河道露土断带以及湖内可见的独立河面叠层。

## Summary / 概要

**English:** Increase the pond basin depth, keep the creek at lake level until it leaves the source shore, align its render height with the lake surfaces, fade the creek at the irregular pond boundary, and use one-meter terrain sampling around the lowland water features.

**中文：** 提高湖盆深度，让河水越过源湖岸线后再开始下降，对齐河面与湖面的渲染高度，按不规则湖岸渐显河面，并把低地水系周边地形采样提高到一米精度。

## User Request / 用户需求

**English:** The user reported that the newly added lake was not carved deeply enough and that the creek-to-lake water connection was visibly broken.

**中文：** 用户反馈新增湖泊开挖深度不足，并且河道与湖水之间存在明显的衔接问题。

## Scope / 范围

**English:** Update the east meadow pond depth, the lowland creek water-level profile and lake-transition fade, and the local terrain detail floor. Add focused regression coverage for pond depth, shoreline water continuity, and terrain triangles crossing the creek. Do not change the main river path, water shaders, player controls, or unrelated terrain and vegetation systems.

**中文：** 调整东侧草甸湖深度、低地河道水位剖面与湖岸过渡渐隐，并提高局部地形最低精度；新增湖深、岸线水位连续性和地形三角跨河的定向回归测试。不修改主河路径、水体 shader、玩家控制或无关地形与植被系统。

## Acceptance Criteria / 验收标准

**English:**

- The pond is at least 4.5 meters deep at its center and at least 2.8 meters deep halfway to the shore.
- The creek surface matches the source and terminal lake surfaces at their shore transitions.
- The creek is hidden inside the pond and fades in only around the irregular outlet boundary.
- Lowland water chunks use 256 terrain segments, and the regression point no longer has a terrain triangle above visible creek water.
- The complete automated test suite and production build pass, and fixed-camera visual checks show a deeper pond and continuous creek.

**中文：**

- 湖心深度至少为 4.5 米，湖心到岸线中点处深度至少为 2.8 米。
- 河面在源湖和终点湖的岸线过渡处与湖面高度一致。
- 河面在湖内保持隐藏，只在不规则出水口边界附近渐显。
- 低地水系区块使用 256 段地形精度，回归坐标处不再有地形三角高出可见河面。
- 完整自动化测试和生产构建通过，固定机位视觉检查显示湖盆更深且河道连续。
