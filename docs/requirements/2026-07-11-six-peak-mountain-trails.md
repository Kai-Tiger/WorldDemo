# Six-Peak Mountain Trail Network / 六座主峰徒步网络

## Requirement / 需求

English: Add three connected, subtly visible mountain trails that let the player walk in both directions between the existing lowlands and six representative summits without changing the heightmap asset, water system, or fixed full-map terrain LOD strategy.

中文：新增三条相互连通、视觉上较隐约的登山徒步道，使角色能够从现有低地区域双向步行抵达六座代表性山峰，同时不修改高度图资产、水系或固定全图地形 LOD 策略。

## Summary / 概要

English: Generalize the retained natural mountain pass into a spatially indexed trail network with an east ridge, a central-west loop, and a southern loop. Calibrate the static profiles against the real heightmap, reuse shared summit spurs as one physical path, and blend overlapping corrections continuously so the result follows natural ridges instead of forming elevated platforms. Grade an eight-meter walkable core at no more than 35 degrees, add small natural summit landings, and render a narrow worn tread using only the existing grass, rock, and snow material layers.

中文：将保留的自然山口泛化为带空间索引的徒步路线网络，包括东北脊线、中西环线和南部环线。静态高程剖面按真实高度图校准，往返登顶支路只编译为一条物理路径，重叠地形修正连续融合，使路线顺应天然山脊而不是形成架空平台。八米宽可行走核心的坡度不超过 35 度；六个峰顶增加小型自然落脚面，窄幅踩踏痕迹只复用现有草地、岩石和积雪材质渲染。

## User Request / 用户需求

English: The user asked for several walkable routes that allow the character to reach most mountain summits, approved terrain modification, and selected six core peaks, subtle hiking trails, and a compact 35-degree route profile.

中文：用户希望规划并实现多条可步行登山线路，让角色能够抵达大部分山峰，并允许修改地形；用户选择了六座核心峰、隐约徒步道和紧凑的 35 度坡度方案。

## Scope / 范围

English:

- Preserve the existing lowland mountain pass and add the east ridge, central-west loop, and southern loop.
- Reach the six summits near `(-337,-412)`, `(-153,-665)`, `(-575,-359)`, `(163,-78)`, `(-311,130)`, and `(-7,-175)` while leaving the far-west and north peaks untouched.
- Use explicit static route control points, slope-limited height profiles, an eight-meter graded core, 22-meter blend shoulders, and three-meter summit landings.
- Keep ordinary trail cut and fill close to the original heightmap, deduplicate exact reverse traversals, and avoid straight retaining walls or geometric shelf silhouettes in overview shots.
- Add a narrow terrain trail mask, local grass and tree clearance, spatially indexed segment queries, and route-specific terrain detail floors without restoring gravel or the removed road network.
- Fix downhill ledge detection so continuous walkable slopes remain traversable while true cliffs still trigger falling.
- Preserve the heightmap asset, rivers, lakes, waterfalls, terrain-editor behavior, the fixed resident terrain coverage, and unrelated scenery.

中文：

- 保留现有低地自然山口，并新增东北脊线、中西环线和南部环线。
- 抵达 `(-337,-412)`、`(-153,-665)`、`(-575,-359)`、`(163,-78)`、`(-311,130)`、`(-7,-175)` 附近的六座山峰，同时保持远西峰与北峰不变。
- 使用明确的静态路线控制点、限坡高程剖面、八米塑形核心、22 米融合肩部和三米峰顶落脚面。
- 普通路段的挖填量应贴近原高度图，完全反向复用的支路去重，并在远景中避免直线挡墙、架空平台或几何化台阶轮廓。
- 增加窄幅地形路线遮罩、局部草木退让、带空间索引的线段查询和路线专用地形精度下限，不恢复碎石资源或已移除的道路网络。
- 修正下坡悬崖判断，使连续可走坡面能够正常往返，同时真实悬崖仍会触发坠落。
- 保持高度图资产、河流、湖泊、瀑布、地形编辑器行为、固定常驻地形范围和无关景观不变。

## Acceptance Criteria / 验收标准

English:

- All three routes and their `±1.5m` side lanes remain at or below 35 degrees after the complete water and terrain pipeline.
- The player can traverse every route uphill and downhill at the worst supported movement step without false ledge drops, and true unwalkable drops still cause falling.
- All six summit landings are standable and connected to their route entrances; terrain outside the blend shoulders and the two excluded peaks remains unchanged.
- The trail remains subtly readable through grass, rock, and snow, clears only its narrow grass/tree bands, and never restores gravel textures or authored road logic.
- Fixed overview shots show continuous mountain silhouettes with no elevated ribbon, vertical seam, or regular fortress-like switchback walls.
- Route queries use a 64-meter spatial index; only intersecting terrain chunks receive 128- or 256-segment detail floors, within the agreed chunk-count limits.
- Focused tests, the complete test suite, the production build, and the three deterministic visual checks pass without runtime or shader errors.

中文：

- 完整水系与地形处理后，三条路线中心及左右 `±1.5m` 侧线坡度均不超过 35 度。
- 在最坏移动步长下，角色能够双向走完全部路线且不会误触发坠落；真实不可走落差仍会导致坠落。
- 六个峰顶落脚面都可站立并与路线入口连通；融合肩部之外的地形及两个排除峰保持不变。
- 徒步道在草地、岩石和积雪中保持隐约可辨，只清理规定的窄幅草木区域，且不恢复碎石贴图或人工道路逻辑。
- 固定远景机位中的山体轮廓保持连续，不出现架空带状道路、垂直接缝或城墙式规则回头弯。
- 路线查询使用 64 米空间索引，只有实际相交的地形分块获得 128 或 256 segments 精度下限，并满足约定的分块数量上限。
- 定向测试、完整测试套件、生产构建及三个固定视觉检查全部通过，且没有运行时或 shader 错误。
