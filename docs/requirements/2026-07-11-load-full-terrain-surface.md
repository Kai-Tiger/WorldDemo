# Requirement / 需求

Load and display the complete terrain surface globally instead of changing terrain coverage with player movement.

加载并全局展示完整地形表面，不再让地形覆盖范围随玩家移动变化。

# Summary / 概要

All 64 terrain chunks are built during scene loading and remain resident for the session. Terrain geometry and its material LOD no longer follow the player's movement range, while vegetation keeps its existing player-centered streaming behavior.

场景加载期间会创建全部 64 个地形分块，并在本次运行中保持常驻。地形几何及其材质 LOD 不再跟随玩家移动范围变化，植被则继续保持现有的以玩家为中心的流式加载行为。

# User Request / 用户需求

The user requested that ground materials appear globally when the project loads rather than appearing and changing according to the player's walking range.

用户要求地表材质在项目加载时全局展示，而不是根据玩家行走范围逐步出现或变化。

# Scope / 范围

Replace player-centered terrain mesh streaming with startup generation of the complete 2048m map. Keep 256m terrain chunks, quality-specific geometry and material LOD, terrain editing rebuilds, full-map height sampling, vegetation streaming, water, authored features, and world coordinates unchanged.

将以玩家为中心的地形网格流式加载替换为启动时生成完整 2048 米地图。保持 256 米地形分块、按画质区分的几何与材质 LOD、地形编辑重建、完整地图高度采样、植被流式加载、水体、既有内容和世界坐标不变。

# Acceptance Criteria / 验收标准

- Scene loading builds all 8 by 8 terrain chunks before the project becomes ready.
- Every terrain chunk remains loaded after player movement.
- Terrain LOD and material selection do not recenter around the player.
- Quality changes can still rebuild resident chunks without changing global coverage.
- Grass and trees continue to stream around the player.
- Automated tests and the production build succeed.

- 场景加载会在项目就绪前创建全部 8 x 8 个地形分块。
- 玩家移动后，每个地形分块仍保持加载。
- 地形 LOD 和材质选择不会以玩家位置重新居中。
- 切换画质后仍可重建常驻分块，且不会改变全局覆盖范围。
- 草和树继续围绕玩家流式加载。
- 自动化测试和生产构建成功。
