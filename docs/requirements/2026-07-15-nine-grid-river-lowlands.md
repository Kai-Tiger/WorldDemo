# Nine-Grid River Lowlands / 九宫格河湖低地

## Requirement / 需求

中文：以现有 2048 × 2048 米地形为中心，将世界扩展为 3 × 3 九宫格，总面积扩大为原来的 9 倍。新增八格以相对平坦的低地为主，同时规划大量河道、湖泊和大面积起伏缓和的丘陵。

English: Keep the existing 2048 × 2048 meter terrain as the center and expand the world into a 3 × 3 grid with nine times the original area. The eight new cells should be relatively flat lowlands with extensive rivers, lakes, and large rolling hills.

## Summary / 概要

中文：世界边长扩大到 6144 米，中央格的原高度图和坐标保持不变。外围八格使用确定性的低起伏地形，并通过 384 米宽的过渡带衔接中央地形。每格新增一套双源汇流河网、一个终端湖和两组大尺度缓丘，共计 24 段河道、8 个湖泊和 16 组缓丘。

English: The world side length increases to 6144 meters while the original center heightmap and coordinates remain unchanged. The eight outer cells use deterministic low-relief terrain connected to the center by a 384-meter blend. Each cell receives a two-source confluence network, one terminal lake, and two broad hill groups, for 24 river reaches, 8 lakes, and 16 rolling hills in total.

## User Request / 用户需求

中文：用户要求地形面积扩大为当前的 9 倍，以现有地形为中心形成 3 × 3 格子；新地形相对平坦，但需要大量河道湖泊和大面积起伏丘陵。

English: The user requested a ninefold terrain expansion arranged as a 3 × 3 grid around the current terrain. The new terrain should remain relatively flat while containing many rivers and lakes plus broad rolling hills.

## Scope / 范围

中文：地图范围扩展至 X/Z 各 ±3072 米；中央 ±1024 米区域保持原始高度采样；外围使用低地基准、轻微连续起伏、16 组椭圆缓丘和世界外缘缓降。新增八套河网接入现有统一水面、地形切割、湿岸材质、植被排除和局部地形细分流程。不修改中央既有河湖，也不使用未提交的高山参考高度图。

English: Expand the map to ±3072 meters on X/Z; preserve original height sampling inside the central ±1024-meter area; use a lowland base, subtle continuous relief, 16 elliptical rolling hills, and a gentle world-edge falloff outside it. Connect eight new river networks to the existing unified water surface, terrain carving, wet-bank material, vegetation exclusion, and local terrain-detail pipelines. Existing center-cell water features remain unchanged, and the uncommitted mountain reference heightmap is not used.

## Acceptance Criteria / 验收标准

中文：世界为 6144 × 6144 米并包含 24 × 24、共 576 个地形块；中央格高度采样不变；外围八格均有 3 段连续下游河道和 1 个终端湖；新增河道总数为 24、湖泊为 8、缓丘为 16；河流地形低于水面，河湖接缝使用统一的五排过渡；单套河网不超过 12,000 个水面三角形；相关测试与生产构建通过。

English: The world is 6144 × 6144 meters with a 24 × 24 grid of 576 terrain chunks; center-cell height sampling is unchanged; every outer cell has three continuously descending river reaches and one terminal lake; totals are 24 reaches, 8 lakes, and 16 rolling hills; carved terrain remains below water and river-lake joins use the shared five-row transition; each network stays below 12,000 water-surface triangles; relevant tests and the production build pass.
