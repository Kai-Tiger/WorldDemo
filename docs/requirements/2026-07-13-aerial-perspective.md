# Requirement / 需求

Add clear-air aerial perspective to the Balanced and Quality render paths without introducing a second depth render or double-applying fog.

为 Balanced 与 Quality 渲染路径增加清朗空气透视，同时不引入第二次深度渲染，也不重复叠加雾效。

# Summary / 概要

A lightweight full-screen pass now reconstructs world positions from the base scene depth captured by the existing water-composite path. It applies distance-, height-, and sun-aware Rayleigh and Mie scattering after GTAO and before color grading. The pass replaces scene and water Exp2 fog in Balanced and Quality, while Performance restores the existing clear-weather fog fallback.

新增轻量全屏 pass，利用现有水体合成路径捕获的基础场景深度重建世界位置，并在 GTAO 之后、调色之前加入随距离、高度和太阳方向变化的 Rayleigh 与 Mie 散射。Balanced 与 Quality 使用该效果替代场景和水体 Exp2 雾，Performance 则恢复原有清朗天气雾回退。

# User Request / 用户需求

The user requested clearer atmospheric depth and air-layer separation for the bright alpine environment, without heat-haze distortion or a uniformly grey fog wash.

用户要求为明亮高山环境增加更清晰的空气层次和远近分离，同时不要热浪扭曲，也不要整屏均匀灰雾。

# Scope / 范围

Add shared atmosphere parameters, one depth-aware post-processing pass, quality-tier enablement, scene-fog switching, and an internal water-controller flag that disables water fog while aerial perspective is active. Preserve exposure, terrain and vegetation materials, geometry, water reflection/refraction behavior, gameplay, and unrelated pending work.

增加共享大气参数、一个深度感知后处理 pass、质量分档开关、场景雾切换，以及在空气透视启用时关闭水体雾的内部水控制器标记。保持曝光、地形和植被材质、几何、水体反射折射行为、玩法及无关待处理改动不变。

# Acceptance Criteria / 验收标准

- Performance omits the aerial-perspective pass and uses FogExp2 density 0.00045.
- Balanced and Quality place aerial perspective after GTAO and before color grading.
- The pass reuses the base scene depth captured by WaterCompositePass and does not add a depth prepass.
- World position reconstruction uses inverse projection and camera-world matrices.
- Scattering responds to view distance, average world height, and view-to-sun alignment.
- Depth values at the far plane preserve the procedural sky unchanged.
- Scene and water Exp2 fog densities are zero while aerial perspective is enabled and restore on Performance.
- Focused tests and the production build pass.

- Performance 不启用空气透视 pass，并使用密度 0.00045 的 FogExp2。
- Balanced 与 Quality 将空气透视放在 GTAO 之后、调色之前。
- 该 pass 复用 WaterCompositePass 捕获的基础场景深度，不新增深度预通道。
- 世界位置重建使用逆投影矩阵和相机世界矩阵。
- 散射随视距、世界平均高度和视线与太阳的夹角变化。
- 远平面深度保持程序化天空不变。
- 空气透视启用时，场景和水体 Exp2 雾密度均为零；切回 Performance 后恢复。
- 定向测试和生产构建通过。
