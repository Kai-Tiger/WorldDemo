# Requirement / 需求

## Summary / 概要

**中文：** 将远景模型草 LOD2 从单张竖直卡片改为两张互相垂直的十字卡片，避免从高俯角或侧面观察时草丛退化为贴地细线。

**English:** Convert distant model-grass LOD2 from one vertical card to two perpendicular crossed cards so that grass does not collapse into a ground-hugging line from elevated or side viewing angles.

## User Request / 用户需求

**中文：** 检查远处草看起来倒在地面的轴向问题，并在不改变现有草地分布、LOD 距离和光照的前提下修复。

**English:** Investigate the apparent axis issue that makes distant grass look flattened on the ground and fix it without changing grass distribution, LOD distances, or lighting.

## Scope / 范围

**中文：**

- 保留现有 GLB 节点变换烘焙、Y 轴向上和根部归零逻辑。
- 仅对 LOD2 将已归一化几何复制并绕局部 Y 轴旋转 90 度。
- 将两张卡片合并为一个 BufferGeometry，保留现有 UV、材质和单次 draw call 路径。
- 不修改草地分布、密度、LOD 距离、LOD 过渡或光照。

**English:**

- Preserve the existing GLB node-transform bake, Y-up orientation, and root grounding.
- Only for LOD2, duplicate normalized geometry and rotate the duplicate 90 degrees around local Y.
- Merge both cards into one BufferGeometry while preserving current UVs, material, and the single-draw-call path.
- Do not change grass distribution, density, LOD distances, LOD transitions, or lighting.

## Acceptance Criteria / 验收标准

**中文：**

- LOD2 合并后的 X、Y、Z 尺寸均大于零，且高度与单卡片归一化高度一致。
- 两组卡片法线正交，几何三角形数恰好是单卡片的两倍。
- 包围盒最小 Y 为 0，且 Y 仍是模型高度轴。
- UV 和材质保留，LOD2 仍只生成一个几何条目，不增加 draw call。
- 针对性测试和项目构建通过。

**English:**

- Merged LOD2 has non-zero X, Y, and Z extents, with height unchanged from the normalized single card.
- The two card-normal sets are perpendicular and the triangle count is exactly double that of one card.
- Bounding-box minimum Y is 0 and Y remains the model height axis.
- UVs and material are preserved, and LOD2 still produces one geometry entry without adding a draw call.
- Targeted tests and the project build pass.
