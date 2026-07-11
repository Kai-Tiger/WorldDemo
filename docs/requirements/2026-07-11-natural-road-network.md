# Natural Road Network / 自然道路网络

## Requirement / 需求

English: Add authored roads to the terrain that read as naturally worn forest paths and carriage tracks rather than straight or paved routes.

中文：在地形中加入人工规划但观感自然的道路，使其呈现为林间踩踏小径和马车碾压出的车辙，而不是笔直或铺装道路。

## Summary / 概要

English: Add a winding forest trail from the lake-side spawn toward the waterfall overlook and a wider carriage road that follows the north side of the main river valley. Both roads reuse the existing layered dirt and gravel PBR materials, follow streamed terrain geometry, and clear only the grass and trees that overlap their surfaces.

中文：新增一条从湖畔出生点通往瀑布观景位置的弯曲林间小径，以及一条沿主河谷北岸延伸的宽马车道。两条道路复用现有泥土与碎石 PBR 分层材质，随流式地形几何生成，并仅清除与路面重叠的草木。

## User Request / 用户需求

English: The user asked to plan roads in the map that resemble naturally formed forest paths or roads worn by carriage traffic.

中文：用户希望在地图中规划一些道路，观感类似自然形成的林间小道或马车驶过的道路。

## Scope / 范围

English:
- Define two static Catmull-Rom routes: a 2.2-meter forest trail and a 5-meter river-valley carriage road.
- Store trail/cart masks and signed lateral coordinates on terrain vertices.
- Reuse the existing compacted-dirt and gravel albedo/normal layers for road rendering.
- Add darker paired wheel ruts, a lightly regrown center strip, irregular widths, broken edges, and faded endpoints.
- Keep snow and water materials above roads in the terrain material order.
- Exclude grass and tree trunks from the road footprint while retaining vegetation at the edges.
- Preserve one-meter terrain geometry in chunks intersected by the narrow trail.
- Add focused road-network, terrain-attribute, shader-order, and visual-camera regression coverage.

中文：
- 定义两条静态 Catmull-Rom 路线：一条 2.2 米宽的林间小径和一条 5 米宽的河谷马车道。
- 在地形顶点中保存小径/马车道遮罩及带符号的横向坐标。
- 复用现有压实泥土与碎石的 albedo/normal 分层材质渲染道路。
- 加入更深的双轮车辙、轻微返青的中央带、不规则宽度、破碎边缘与渐隐端点。
- 保持雪层和水系材质在地形材质顺序中覆盖道路。
- 从路面范围排除草和树干，同时保留路缘植被。
- 对林间窄路经过的地形分块维持一米顶点精度。
- 增加道路网络、地形属性、shader 顺序和固定视觉机位的针对性回归覆盖。

## Acceptance Criteria / 验收标准

English:
- The forest trail winds through the spawn-area rocks without crossing the main lake.
- The carriage road follows the main river's north bank without covering the river or terminal lake.
- Carriage-road fragments show two readable wheel ruts and a distinct center strip.
- Road edges vary and blend into the surrounding terrain instead of forming uniform straight bands.
- Grass and trees do not intersect the visible road surfaces, while edge vegetation remains present.
- Roads stay aligned after terrain chunk LOD changes and terrain-editor rebuilds.
- Snow and water overrides remain visually and programmatically later than the road material layer.
- All automated tests and the production build pass, and the road Golden Shot renders without console errors.

中文：
- 林间小径绕行出生点区域的岩石并保持不穿越主湖。
- 马车道沿主河北岸延伸，且不覆盖河水或终点湖。
- 马车道路面可辨认出两道轮辙和独立的中央带。
- 道路边缘具有变化并融入周围地形，不形成均匀笔直的色带。
- 草木不会穿入可见路面，同时路缘仍保留植被。
- 道路在地形分块 LOD 切换和地形编辑器重建后仍与地形对齐。
- 雪层与水系覆盖在视觉和程序顺序上均位于道路材质层之后。
- 全部自动化测试和生产构建通过，道路固定机位渲染时没有控制台错误。
