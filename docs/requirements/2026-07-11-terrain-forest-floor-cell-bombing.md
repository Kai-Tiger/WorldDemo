# Requirement / 需求

**English:** Reduce the visible grid repetition in flat lowland forest-floor terrain with shader-side cell bombing.

**中文：** 使用 shader 侧 cell bombing 减少平坦低地森林地表的可见网格重复。

## Summary / 概要

**English:** Sample the existing forest-floor BaseColor and Normal maps from four deterministic world-space cells with randomized quarter turns and offsets, then blend the candidates with shared smooth weights and stable explicit texture gradients.

**中文：** 使用四个确定性的世界空间 cell 采样现有森林地表 BaseColor 和 Normal 贴图，为每个 cell 随机选择四分之一旋转和偏移，再通过共享的平滑权重与稳定的显式纹理导数混合候选结果。

## User Request / 用户需求

**English:** The user reported that the ground texture repeats too visibly and asked to implement the proposed cell bombing optimization.

**中文：** 用户反馈地面贴图重复感过强，并要求开始实施已提出的 cell bombing 优化方案。

## Scope / 范围

**English:** Limit the change to flat-lowland forest-floor color and normal sampling in the shared terrain material. Preserve terrain geometry LOD, world-space chunk continuity, texture assets, grading, roads, alpine rock, snow, river, lake, water overrides, and all unrelated scene behavior.

**中文：** 本次变更仅限共享地形材质中的平坦低地森林地表颜色与法线采样。保持地形几何 LOD、世界空间分块连续性、纹理资源、调色、道路、高山岩石、雪地、河流、湖泊、水体覆盖以及所有无关场景行为不变。

## Acceptance Criteria / 验收标准

- **English:** Forest-floor BaseColor and Normal use the same four world-space cells, randomized transforms, and blend weights.
- **中文：** 森林地表 BaseColor 与 Normal 使用相同的四个世界空间 cell、随机变换和混合权重。
- **English:** Normal-map candidates are converted to slopes, inverse-rotated into one frame, blended, and rebuilt as a normalized surface normal.
- **中文：** 法线贴图候选先转换为斜率，逆旋转到同一坐标系后混合，并重建为归一化表面法线。
- **English:** Explicit gradients keep mip selection stable across cell boundaries, with no shader errors, chunk seams, or camera-motion shimmer.
- **中文：** 显式导数保证 cell 边界的 mip 选择稳定，不出现 shader 错误、分块接缝或镜头移动闪烁。
- **English:** Road, alpine, snow, river, lake, and water sampling remain unchanged, and the automated tests and production build pass.
- **中文：** 道路、高山、雪地、河流、湖泊和水体采样保持不变，自动化测试与生产构建通过。
