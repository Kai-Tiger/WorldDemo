# Requirement / 需求

Unify the visible water surface color between the mountain lake, outlet stream, snowmelt runoff, and main river.

统一高山湖、湖口小河、融雪径流和主河道的可见水面颜色。

# Summary / 概要

This change introduces a shared water palette and tunes lake and river shader blending so the lake no longer reads as a separate blue-green sheet while the river remains pale and gray.

本次变更新增共享水面调色板，并调整湖水与河水 shader 的混合方式，让湖水不再像单独的蓝绿色平面，同时避免河水继续显得过浅过灰。

# User Request / 用户需求

The user reported that the river and lake water colors still differ significantly in the latest screenshot and asked whether the water surface can be unified.

用户反馈最新截图里河流和湖水颜色仍然差别很大，并询问是否可以统一水面。

# Scope / 范围

Update water-surface palette usage and shader blending for the lake, outlet stream, snowmelt runoff, and main river. Do not change water paths, terrain geometry, vegetation placement, spawn behavior, leaf decals, enemy assets, or waterfall shape.

更新湖水、湖口小河、融雪径流和主河道的水面调色板引用与 shader 混合。不修改水路路径、地形几何、植被放置、出生点行为、落叶贴花、敌人资源或瀑布形状。

# Acceptance Criteria / 验收标准

- Lake, outlet stream, snowmelt runoff, and main river use the same shared water palette constants.
- The lake surface is less saturated and less dominated by deep blue-green in broad overhead views.
- The river surface keeps shallow-water detail but gains enough shared water color to match the lake family.
- Visual differences are limited to depth, shore fade, foam, flow, and terrain visibility rather than separate base colors.
- Build verification passes.
- Screenshot review checks lake center, lake shoreline, outlet stream, snowmelt runoff, and main river continuity.

- 湖水、湖口小河、融雪径流和主河道使用同一组共享水面调色常量。
- 俯视大范围湖面时，湖水饱和度降低，不再被深蓝绿色主导。
- 河水保留浅水细节，同时获得足够共享水色，与湖水属于同一视觉体系。
- 视觉差异仅来自水深、岸线渐隐、泡沫、水流和地形透底，而不是不同基础颜色。
- 构建验证通过。
- 截图复查湖心、湖岸、湖口小河、融雪径流和主河道连续性。
