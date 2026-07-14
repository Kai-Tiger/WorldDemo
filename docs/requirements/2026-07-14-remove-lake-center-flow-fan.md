# Remove Lake-Center Flow Fan / 移除湖心流场扇形

## Requirement / 需求

River-to-lake transitions must not create a visible radial fan from an inlet to the lake center.

河湖过渡不得产生从入湖口延伸至湖心的可见径向扇形。

## Summary / 概要

Confine river flow coordinates and directional attributes to the existing inlet transition. Blend flow coordinates back to continuous lake-local coordinates and make them fully lake-owned at the inner `-L` row.

将河流流动坐标和方向属性限制在既有河口过渡区内。流动坐标应平滑恢复为连续的湖泊局部坐标，并在湖内 `-L` 行完全由湖泊接管。

## User Request / 用户需求

The fan-shaped connection between the lake-center vertex and the river mouth looks unnatural and must be removed.

湖心点与河道之间的扇形连接不自然，需要移除。

## Scope / 范围

- Update unified lake vertex attributes only; preserve shared topology, coverage, water levels, terrain, and lake boundaries.
- Keep river flow influence inside the five-row inlet transition.
- Add a regression test for both terminal-lake inlets.

- 仅修改统一湖面顶点属性；保持共享拓扑、覆盖率、水位、地形和湖岸边界不变。
- 河流流动影响继续限制在五行河口过渡区内。
- 为终点湖的两个入口新增回归测试。

## Acceptance Criteria / 验收标准

- At the inner `-L` transition row, `flowUv` equals lake-local coordinates and river direction, speed, and influence are zero.
- The inlet-to-lake transition values and indexed shared topology remain unchanged.
- No radial flow-coordinate discontinuity extends from an inlet to the lake center.
- The full test suite, lowland deterministic check, production build, and `git diff --check` pass.

- 在湖内 `-L` 过渡行，`flowUv` 等于湖泊局部坐标，河流方向、速度和影响均为零。
- 河口过渡数值和索引共享拓扑保持不变。
- 不再有从入湖口延伸至湖心的径向流动坐标断层。
- 完整测试、低地确定性检查、生产构建和 `git diff --check` 全部通过。
