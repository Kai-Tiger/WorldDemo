# Mountain Access Slope / 山地通行缓坡

## Requirement / 需求

English: Modify the terrain so the player can walk from the low plain to the existing highland instead of being blocked by the cliff between them.

中文：调整地形，让角色能够从低处平原步行到现有高地，不再被两者之间的陡坎阻断。

## Summary / 概要

English: Add an 81-meter graded mountain-access trail that connects the lowland carriage road at about 0 meters to the highland forest trail at 28 meters. The six-meter walkable core follows a smooth height profile, while broad shoulders blend it into the surrounding mountain and retain the waterfall-side rock walls.

中文：新增一条约 81 米长的山地接驳坡，将约 0 米高的低地马车道连接到 28 米高的高地林间小道。六米宽的可行走核心采用连续高程曲线，两侧宽肩部平滑融入山体，并保留瀑布旁的岩壁结构。

## User Request / 用户需求

English: The user asked to change the current terrain and plan a slope that lets the character travel from the low plain to higher ground.

中文：用户希望修改现有地形，规划出一条可让角色从低处平原走上高地的山坡。

## Scope / 范围

English:
- Add a winding mountain-access trail between the existing carriage road and waterfall-overlook trail.
- Grade terrain height along the route from 0 to 28 meters without changing the player's movement or maximum walkable-slope rules.
- Keep a three-meter half-width fully graded core and blend the terrain back to its original height over an 18-meter outer shoulder.
- Apply river and lake shaping after the road grade so the waterfall and water channels remain intact.
- Reuse the existing trail material, vegetation exclusion, and one-meter terrain LOD behavior.
- Add focused regression coverage for continuous ascent, the center and side walkability margin, route connections, unaffected distant terrain, and a deterministic visual-check camera.

中文：
- 在现有马车道与瀑布观景小道之间新增一条弯曲的山地接驳路线。
- 沿路线将地形从 0 米连续塑形到 28 米，不修改角色移动逻辑或最大可行走坡度规则。
- 保持半宽三米的完整塑形核心，并在外侧 18 米肩部范围内平滑过渡回原始地形。
- 在道路塑形之后继续应用河流与湖泊塑形，确保瀑布和水道保持完整。
- 复用现有小道路面材质、植被排除和一米精度地形 LOD 行为。
- 增加针对连续上升、中心及两侧可走余量、路网连接、远处地形不受影响和固定视觉机位的回归测试。

## Acceptance Criteria / 验收标准

English:
- The access trail joins the lowland carriage road near `(444, -397)` and the highland forest trail near `(389, -345)` without a step at either end.
- Height rises continuously from 0 to 28 meters along the route.
- The center line and both 1.5-meter side lines remain at or below a 35-degree design slope, safely below the player's 50-degree limit.
- The visible trail remains clear of generated grass and trees and retains one-meter terrain vertices.
- Terrain outside the graded shoulder is unchanged, and the nearby waterfall and river remain visibly intact.
- Automated tests and the production build pass, and the mountain-access Golden Shot renders without console warnings or errors.

中文：
- 接驳坡在 `(444, -397)` 附近接入低地马车道，并在 `(389, -345)` 附近接入高地林间小道，两端均无台阶。
- 路线高程从 0 米连续上升至 28 米。
- 中心线及左右各 1.5 米线路均不超过 35° 的设计坡度，明显低于角色 50° 的限制。
- 可见小道不生成草木，并维持一米精度的地形顶点。
- 塑形肩部之外的地形保持不变，邻近瀑布与河道的视觉结构保持完整。
- 自动化测试与生产构建通过，山地接驳固定机位渲染时控制台无警告或错误。
