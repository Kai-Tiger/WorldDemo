# Requirement / 需求

Add subtle, natural wind sway to nearby grass and tree canopies while keeping roots, trunks, and distant vegetation visually stable.

为近景草地和树冠增加轻微、自然的风摆，同时保持根部、树干和远景植被稳定。

# Summary / 概要

Reuse and correct the existing grass vertex-sway shader, then add a height-weighted tree-canopy sway shader with matching directional-light shadow deformation. Both systems use one coherent world-space wind direction and fade before distant vegetation can shimmer.

复用并修正现有草地顶点摆动 Shader，并新增按高度加权、同步方向光阴影的树冠摆动 Shader。两套系统共享一致的世界空间风向，并在远景出现闪烁前停止摆动。

# User Request / 用户需求

The user asked for slight shader-based movement on the project's grass and trees so the environment feels more natural.

用户希望为项目中的草地和树木增加轻微的 Shader 摆动，使环境表现更加自然。

# Scope / 范围

Update the existing near-grass sway weighting and world-space wind handling; animate branch and leaf tree meshes while keeping trunks stable; synchronize canopy shadow deformation; update the shared animation-time path and focused tests. Do not change vegetation placement, density, LOD distances, models, textures, terrain, water, lighting, post-processing, or ground leaf decals.

更新现有近景草地的摆动权重和世界空间风向处理；仅让树木枝叶网格摆动并保持树干稳定；同步树冠阴影形变；更新共享动画时间链路和针对性测试。不修改植被分布、密度、LOD 距离、模型、贴图、地形、水体、光照、后处理或地面落叶贴花。

# Acceptance Criteria / 验收标准

- Nearby grass uses normalized vertex height so roots remain fixed and tips move subtly in one coherent world-space wind direction.
- Grass LOD1 and LOD2 remain static, and existing grass visibility, color, and placement behavior are unchanged.
- Tree branches and leaves sway lightly with world-position phase variation; trunks and unknown tree parts remain static.
- Tree sway is fully visible through 80 meters, fades out by 180 meters, and uses matching visible and shadow-depth deformation.
- Tree animation reuses the existing deterministic visual time and updates shared uniforms without traversing individual instances.
- `npm test` and `npm run build` pass, and browser runtime inspection reports no shader compilation errors.

- 近景草使用归一化顶点高度，使根部固定、草尖沿统一的世界空间风向轻微摆动。
- 草地 LOD1 和 LOD2 保持静止，现有草地可见性、颜色和分布行为不变。
- 树木枝叶按世界位置错相轻摆；树干和未识别的树木部件保持静止。
- 树木摆动在 80 米内完整生效，并在 180 米前淡出；可见材质与阴影深度材质使用一致形变。
- 树木动画复用现有确定性视觉时间，并通过共享 uniform 更新而不遍历单个实例。
- `npm test` 和 `npm run build` 通过，浏览器运行时检查无 Shader 编译错误。
