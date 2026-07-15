# World-Spanning Watershed / 覆盖全场景的大水系

## Requirement / 需求

Create a denser, continuous watershed that begins in the center mountains and remains visibly present throughout the complete three-by-three world.

创建一套更密集、连续的大水系，从中心山区发源，并在完整的 3×3 世界范围内持续可见。

## Summary / 概要

Connect all eight outer terrain cells to authored high-elevation mountain springs. Each outer basin contains a mountain cascade, a foothill lake and outlet, two staged Y-shaped confluences, local tributaries, a broad trunk, and a terminal lake. Use lower geometric detail for continent-scale water while preserving flow direction, terrain carving, shore blending, vegetation exclusion, and the unified water material contract.

将八个外围地形格全部连接到已规划的高海拔山泉。每个外围流域包含山区级联河、山麓湖及出水河、两个分级 Y 形汇流、本地支流、宽阔主干和终点湖。大陆尺度的远景水体采用较低几何细节，同时保持流向、地形切槽、岸线融合、植被排除和统一水材质约定。

## User Request / 用户需求

The current lake and river density is too low. Add one large water system that reaches from the mountain at the center point across the full map.

当前湖泊和河流密度太低；增加一套从中心点山地延伸并覆盖整张地图的大水系。

## Scope / 范围

- Extend all eight outer basins back to center-mountain headwaters.
- Increase the outer network from 24 to 48 river reaches and from 8 to 16 lakes.
- Keep every confluence as a valid three-arm Y junction.
- Add continuous inlet and outlet transitions for every new foothill lake.
- Apply terrain carving, wet-ground masks, grass rejection, and tree exclusion along the new center-to-edge corridors.
- Route mountain cascades around every existing hiking trail safety corridor.
- Use lower mesh density for continent-scale reaches and expanded lakes to keep rendering bounded.
- Do not change water shading, reflections, player water behavior, or unrelated terrain authoring.

- 将八个外围流域全部向内延伸至中心山区源头。
- 将外围河网从 24 段河增加到 48 段，湖泊从 8 个增加到 16 个。
- 所有汇流点保持为有效的三臂 Y 形节点。
- 为每个新增山麓湖增加连续的入水与出水过渡。
- 沿新增的中心至地图边缘水廊同步应用地形切槽、湿地材质、草地拒绝和树木排除。
- 山区级联河绕开全部既有登山路线安全带。
- 大陆尺度河段和外围湖泊采用较低网格密度，确保渲染预算可控。
- 不修改水体着色、反射、玩家涉水行为或无关地形规划。

## Acceptance Criteria / 验收标准

- Every outer cell owns one network whose source lies inside the original center terrain and whose sink is an outer lake.
- The expanded network contains exactly 48 reaches and 16 lakes.
- Water levels never rise in the downstream direction.
- All 39 river-lake interfaces use five continuous transition rows with shared shore edges.
- River geometry contains no lake-interior triangles, degenerate triangles, duplicate triangles, or non-manifold edges.
- Existing mountain-pass and hiking routes remain outside every river and lake exclusion zone.
- The unified water system remains below 150,000 triangles and all automated tests and the production build pass.

- 每个外围格都拥有一套源头位于原始中心地形内、终点为外围湖泊的河网。
- 扩展河网包含恰好 48 段河和 16 个湖泊。
- 水位沿下游方向始终不升高。
- 全部 39 个河湖接口都使用五排连续过渡，并共享岸线边。
- 河流几何中不存在湖内三角形、退化三角形、重复三角形或非流形边。
- 既有山口与登山路线保持在所有河流和湖泊排除区之外。
- 统一水系统保持在 150,000 个三角形以内，全部自动化测试与生产构建通过。
