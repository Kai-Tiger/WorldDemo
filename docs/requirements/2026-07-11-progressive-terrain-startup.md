# Requirement / 需求

Enter the game after the spawn terrain chunk is ready, then finish loading the complete terrain in the background.

出生点地形分块就绪后即可进入游戏，随后在后台完成整张地形的加载。

# Summary / 概要

Startup waits for the spawn chunk instead of all 64 terrain chunks. The remaining chunks keep their existing fixed priorities and frame budget, continue building after the first frame, and remain resident once loaded.

启动阶段只等待出生点分块，不再等待全部 64 个地形分块。其余分块沿用现有固定优先级和每帧预算，在首帧后继续生成，并在加载后保持常驻。

# User Request / 用户需求

The user requested a shorter waiting screen by entering the game first and loading non-critical terrain afterward.

用户要求缩短等待页面的停留时间，先进入游戏，再加载非关键地形。

# Scope / 范围

Change only the terrain readiness gate and pending terrain LOD reconciliation. Keep the full 2048-meter map, fixed spawn-centered terrain LOD, global height sampling and collision, water, loading screen, vegetation, scenery, and existing background asset loading unchanged.

仅调整地形就绪门槛和未完成地形任务的 LOD 重排。保持完整 2048 米地图、以出生点固定的地形 LOD、全局高度采样与碰撞、水体、等待页面、植被、景观和现有后台资源加载行为不变。

# Acceptance Criteria / 验收标准

- The game becomes ready after the spawn terrain chunk is loaded.
- All 64 terrain chunks are queued at startup and continue building after entry.
- All terrain chunks eventually load and remain resident without recentering around player movement.
- Changing render quality replaces unfinished terrain tasks with the newly required LOD.
- Existing automated tests and the production build succeed.

- 出生点地形分块加载完成后，游戏即可进入就绪状态。
- 启动时会排队全部 64 个地形分块，并在进入游戏后继续生成。
- 所有地形分块最终都会加载并保持常驻，不随玩家移动重新居中。
- 切换渲染画质时，未完成的地形任务会改用新画质要求的 LOD。
- 现有自动化测试和生产构建均成功。
