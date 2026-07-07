# Requirement / 需求

Load trees only for currently loaded terrain chunks.

仅为当前已加载的地形分块加载树木。

# Summary / 概要

Tree and leaf decal generation now follows the terrain chunk lifetime instead of generating placements for the whole map at startup. Tree zones are created for loaded terrain chunks, generated progressively, and removed when their terrain chunk is no longer loaded.

树木和落叶贴花生成现在跟随地形分块生命周期，不再在启动时为整张地图生成放置点。树木分区会为已加载地形分块创建、渐进生成，并在对应地形分块不再加载时移除。

# User Request / 用户需求

The user asked whether trees still load outside terrain LOD and requested that only trees inside the current terrain be loaded.

用户询问树木是否仍会在地形 LOD 之外加载，并希望只加载当前地形里的树木。

# Scope / 范围

Update tree and leaf decal loading to follow terrain chunks. Do not change tree density, placement masks, model assets, terrain chunk radius, grass loading, water systems, player controls, camera behavior, lighting, or unrelated pending work.

更新树木和落叶贴花加载，使其跟随地形分块。不修改树木密度、放置遮罩、模型资源、地形分块半径、草地加载、水体系统、玩家控制、相机行为、光照或无关待处理改动。

# Acceptance Criteria / 验收标准

- Trees are no longer generated for the full map at startup.
- Trees and tree-related leaf decals are generated only for currently loaded terrain chunks.
- Trees and leaf decals are removed when their terrain chunk unloads.
- The existing Trees render toggle still hides and shows tree-related rendering.
- Existing tree placement rules and spawn-area replacement behavior remain in place.
- The project build succeeds.

- 启动时不再为整张地图生成树木。
- 树木和相关落叶贴花只为当前已加载地形分块生成。
- 地形分块卸载时，对应树木和落叶贴花会被移除。
- 现有 Trees 渲染开关仍能隐藏和显示树木相关渲染。
- 现有树木放置规则和出生点附近替换行为保持存在。
- 项目构建成功。
