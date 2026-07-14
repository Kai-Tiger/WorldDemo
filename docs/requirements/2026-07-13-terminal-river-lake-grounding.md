# Requirement / 需求

> Superseded / 已废止
>
> English: This intermediate four-meter lake-overlap requirement is retained only as iteration history and is superseded by [2026-07-14-natural-terminal-lake-inlets.md](./2026-07-14-natural-terminal-lake-inlets.md). The accepted transition now occurs entirely outside the shoreline.
>
> 中文：此湖内四米重叠方案仅作为迭代记录保留，已由 [2026-07-14-natural-terminal-lake-inlets.md](./2026-07-14-natural-terminal-lake-inlets.md) 取代。最终采用的过渡完全位于湖岸之外。

- English: Stop the Hero river at the terminal-lake transition, ground its lower-reach shore edges, and remove the visible riverbed strip beneath the lake.
- 中文：让 Hero 主河在终点湖过渡区结束，使下游河段的岸边水面贴合地形，并移除湖水下方可见的河床条带。

## Summary / 概要

- English: Align the lower river to the terminal-lake level before the shore, fade its water and visible terrain-material masks over four meters inside the lake, and lower only the transparent outer vertices to a two-centimeter terrain clearance. Keep the submerged channel and underwater relief mask while preventing the clear lake from revealing a river-shaped material strip to its center.
- 中文：在湖岸前将下游河面平滑对齐到终点湖水位，在湖内四米同步渐隐河水及可见地形材质遮罩，并仅将透明外缘顶点压到距离地形两厘米的位置。保留水下河槽和地形细节抑制遮罩，同时避免透明湖水显露通往湖心的河道形材质条带。

## User Request / 用户需求

- English: Fix the river channel extending into the terminal lake, the lower river water appearing to float above the ground, and the remaining river-shaped split visible across the lake surface.
- 中文：修复河道伸进终点湖、下游河水看起来悬在地面之上，以及湖面仍显露河道形分割条带的问题。

## Scope / 范围

- English: Add internal terminal-lake transition metadata to the Hero network; compute the actual centerline-to-shore crossing; blend the visible water level for twelve meters before shore; end geometry after a four-meter lake overlap; ground the two transparent boundary vertices of each lower-reach row outside the lake; refresh water depths, normals, and bounds. Fade only the terminal reach's visible bed, wet-bank, and gravel material masks over the same four-meter overlap while retaining its underwater mask. Preserve the river centerline, channel terrain and collision, visible core depth, width, shaders, lake mesh, other reaches, and baked heightmap.
- 中文：为 Hero 河网增加内部终点湖过渡元数据；计算中心线与湖岸的实际交点；在岸前十二米融合可见水位；河面进入湖内四米后停止生成；将湖外下游河段每行两侧的透明边界顶点贴近地形；刷新水深、法线和包围体。在同一四米重叠区仅渐隐终点河段的河床、湿岸和砾石可见材质遮罩，并保留其水下遮罩。保持河流中心线、河槽地形与碰撞、可见河心水深、河宽、Shader、湖泊网格、其他河段和烘焙高度图不变。

## Acceptance Criteria / 验收标准

- English: The river is fully visible at the terminal shore, reaches zero water and visible-material fade four meters inside the lake, generates no water or riverbed strip toward the lake center, and matches the lake surface height at the overlap. The underwater mask and approximately 1.5-meter channel depth remain intact. Outside the lake, lower-reach transparent edge vertices remain about 0.02 meters above terrain while center vertices retain the authored descending surface and depth. Targeted tests, the full test suite, lowland bake verification, production build, and terminal-lake overhead and low-angle visual checks pass.
- 中文：河水在终点湖岸保持完整可见，进入湖内四米时河水和可见材质遮罩均渐隐为零，不再生成通往湖心的水面或河床条带，并在重叠区与湖面高度一致。水下遮罩和约 1.5 米河槽深度保持不变。湖外下游河段的透明边缘顶点距离地形约 0.02 米，河心顶点保持既定的下降水面和深度。定向测试、完整测试、低地烘焙校验、生产构建以及终点湖俯视和低角度视觉检查均通过。
