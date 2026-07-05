# Requirement / 需求

English: Leaf decal textures `leaf1` and `leaf2` should lie flat on the terrain instead of standing vertically.

中文：`leaf1` 和 `leaf2` 叶片贴花应平铺在地形表面，而不是垂直立在地面上。

# Summary / 概要

English: Align the decal plane's local normal with the terrain normal before applying random yaw rotation.

中文：先将贴花平面的本地法线对齐到地形法线，再应用随机水平旋转。

# User Request / 用户需求

English: The project has `leaf1` and `leaf2`, but they are placed in the wrong direction in the scene and are vertical to the ground. The user wants them laid flat.

中文：项目里有 `leaf1` 和 `leaf2`，但这两个在场景里摆放的方向不对，垂直于地面了，用户希望它们平铺。

# Scope / 范围

English: Update only the leaf decal orientation logic. Do not change leaf density, scatter radius, texture assets, tree placement, terrain shape, lighting, water, grass, or other scene systems.

中文：只更新叶片贴花的朝向逻辑。不修改叶片密度、散布半径、贴图资源、树木摆放、地形形状、光照、水体、草地或其它场景系统。

# Acceptance Criteria / 验收标准

English: `leaf1` and `leaf2` instances use the decal plane normal to align with the terrain normal, so the rendered leaves lie flat on the ground while preserving their random yaw rotation.

中文：`leaf1` 和 `leaf2` 实例使用贴花平面法线对齐地形法线，因此渲染出的叶片平铺在地面上，同时保留随机旋转角度。

English: The project build completes successfully.

中文：项目构建成功完成。
