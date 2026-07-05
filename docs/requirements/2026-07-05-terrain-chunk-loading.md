# Requirement / 需求

Load terrain chunks around the player instead of creating the full map mesh at startup.

围绕玩家加载地形分块，而不是启动时一次性创建完整地图网格。

# Summary / 概要

The terrain now keeps height sampling available for the full map while only creating visible mesh chunks near the player. Chunks are loaded and unloaded gradually during gameplay to reduce startup cost and constant terrain mesh pressure.

地形仍然保留完整地图的高度采样能力，但只为玩家附近创建可见网格分块。分块会在游戏过程中逐步加载和卸载，以降低启动成本和常驻地形网格压力。

# User Request / 用户需求

The user reported performance issues and asked whether terrain could be loaded in chunks.

用户反馈当前存在性能问题，并询问是否可以让地形分块加载。

# Scope / 范围

Update terrain mesh lifetime management and the main loop terrain update call only. Do not change terrain height data, shader appearance, texture assets, water systems, vegetation density, player movement, camera behavior, or lighting.

仅更新地形网格生命周期管理和主循环中的地形更新调用。不修改地形高度数据、shader 外观、贴图资源、水体系统、植被密度、玩家移动、相机行为或光照。

# Acceptance Criteria / 验收标准

- Terrain startup no longer creates every map chunk at once.
- The player spawn area loads visible terrain immediately.
- Terrain chunks near the player continue loading during movement.
- Distant terrain chunks are removed and their geometries are disposed.
- Existing terrain height sampling APIs continue to work for player, camera, water, grass, trees, and decals.
- The project build succeeds.

- 地形启动时不再一次性创建全部地图分块。
- 玩家出生区域会立即加载可见地形。
- 玩家移动时附近地形分块会继续加载。
- 远处地形分块会被移除，并释放其 geometry。
- 现有地形高度采样 API 继续供玩家、相机、水体、草、树和贴花使用。
- 项目构建成功。
