# Edge Heightfield Mountains / 边缘高度场山脉

## Requirement / 需求

Replace the program-generated distant hills and isolated peaks on all four map edges with real scalar heightfields that form continuous mountain ranges and can be entered by the player at close range.

使用真实的标量高度场替换地图四边程序生成的远景丘陵与孤立山峰，使其形成连续山脉，并允许玩家近距离进入。

## Summary / 概要

Build one 4000×800 RG16 heightfield for each map edge, decode the fields into 12–420 meter terrain, and use the same sampled surface for rendering, normals, collision, water fitting, and vegetation protection. Blend adjacent fields at corners and fade their inner boundaries into the unchanged center terrain.

为地图每条边构建一张 4000×800 的 RG16 高度场，将其解码为 12–420 米的地形，并让渲染、法线、碰撞、水系贴合与植被保护共同使用同一采样表面。相邻高度场在四角连续混合，内侧边界平滑过渡到保持不变的中心地形。

## User Request / 用户需求

The four generated grayscale references should become true heightfields, completely cover the old procedural edge mountains and hills, and support close-range player traversal.

将四张已生成的灰度参考图变成真正的高度场，完全覆盖原有程序生成的边缘山峰和丘陵，并支持玩家近距离行走进入。

## Scope / 范围

- Add four deterministic RG16 runtime heightfields, matching 16-bit previews, and a reproducible build script.
- Map the north, east, south, and west fields clockwise around the 6144-meter world with square world-space texels and an approximately 1227.57-meter band depth.
- Remove the procedural outer hills, isolated peaks, ridge anchors, and sinusoidal edge relief.
- Use the imported fields for terrain geometry, LOD bounds, surface normals, player collision, raycasts, water fitting, and mountain vegetation/material protection.
- Preserve the editable center heightmap and reject terrain brush edits outside it.
- Add deterministic close-range visual checks and regression tests for decoding, interpolation, corner blending, assets, traversal, and runtime sampling.

- 新增四张确定性的 RG16 运行时高度场、对应的 16 位预览图及可复现的构建脚本。
- 将北、东、南、西四张高度场顺时针映射到 6144 米世界边缘，保持世界空间像素为正方形，山带纵深约 1227.57 米。
- 移除程序生成的外围丘陵、孤立山峰、山脊锚点和正弦边缘起伏。
- 将导入高度场统一用于地形几何、LOD 包围范围、表面法线、玩家碰撞、射线检测、水系贴合以及山地植被和材质保护。
- 保持中心可编辑高度图不变，并拒绝作用在其范围外的地形笔刷编辑。
- 新增确定性的四边近景检查，以及解码、插值、四角混合、资源、通路与运行时采样回归测试。

## Acceptance Criteria / 验收标准

- All four edge bands are continuous scalar terrain surfaces with no separate procedural mountain geometry or fallback relief.
- Heights decode from RG16 across the 12–420 meter range without 8-bit stepping or periodic stripe artifacts.
- Inner transitions and corner overlaps remain continuous and do not add mountain heights together.
- Terrain rendering and gameplay collision sample the same surface, including normal probes at the playable world boundary.
- At least one continuous route through every raw mountain band remains within the player's 50-degree slope limit; the final fitted runtime surface retains an accessible route into the edge mountains.
- The original center terrain, its water systems, and its editable height data remain unchanged.
- Targeted tests, the full test suite, the production build, and four close-range visual checks pass.

- 四条边缘山带都是连续的标量地表，不再保留独立的程序山体几何或备用起伏。
- 高度以 RG16 在 12–420 米范围内解码，不出现 8 位台阶或周期性条纹伪影。
- 内侧过渡与四角重叠保持连续，不会把相邻山体高度叠加。
- 地形渲染与游戏碰撞采样同一表面，并正确处理可玩世界边界处的法线探针。
- 每张原始山带至少保留一条坡度不超过玩家 50 度限制的连续通路；完成水系贴合后的运行时表面仍保留可进入边缘山地的路线。
- 原有中心地形、水系和可编辑高度数据保持不变。
- 定向测试、完整测试集、生产构建和四边近景视觉检查全部通过。
