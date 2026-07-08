# Requirement / 需求

Remove Ribbon Grass LOD rendering and cover the visible scene with near 3D Ribbon Grass.

移除 Ribbon Grass 的 LOD 渲染，并用近景 3D Ribbon Grass 覆盖当前可见场景。

# Summary / 概要

The grass system should stop switching between LOD0, LOD1, LOD2, and billboard impostors. Runtime grass now uses only the LOD0 Ribbon Grass meshes, disables opacity clipping for immediate visibility, and fills generated terrain zones uniformly without terrain mask, patch, river, lake, or water-system filtering.

草系统应停止在 LOD0、LOD1、LOD2 和 billboard impostor 之间切换。运行时草现在只使用 LOD0 Ribbon Grass 网格，关闭透明裁切以立刻保证可见，并在已生成的地形方块内均匀铺草，不再使用地形遮罩、斑块、河流、湖泊或水系统过滤。

# User Request / 用户需求

The user said close grass was completely missing and requested removing all LODs and filling the scene with grass immediately.

用户反馈近景完全没有草，并要求立刻去掉所有 LOD，把草铺满场景。

# Scope / 范围

This change only affects Ribbon Grass runtime loading, placement filtering, and rendering. It does not change terrain, water, trees, player, camera, or source asset files.

本次变更只影响 Ribbon Grass 的运行时加载、放置过滤和渲染。不改变地形、水体、树木、玩家、相机或源资产文件。

# Acceptance Criteria / 验收标准

- Runtime grass uses only Ribbon Grass LOD0 mesh geometry.
- No LOD1, LOD2, or billboard grass is loaded or rendered.
- Grass opacity clipping is disabled so close grass is visible.
- Grass placement no longer depends on grass masks, patch clustering, river exclusions, lake exclusions, or water exclusions.
- Visible generated terrain zones are covered with 3D grass.
- The project build succeeds.

- 运行时草只使用 Ribbon Grass LOD0 网格几何。
- 不再加载或渲染 LOD1、LOD2 或 billboard 草。
- 关闭草的透明裁切，确保近景草可见。
- 草放置不再依赖草地遮罩、斑块聚类、河流排除、湖泊排除或水体排除。
- 已生成的可见地形方块用 3D 草覆盖。
- 项目构建成功。
