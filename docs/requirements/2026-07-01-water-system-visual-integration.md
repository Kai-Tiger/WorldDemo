# Requirement / 需求

Improve the mountain water system so lake water, streams, and the existing river read as one coherent water system instead of separate plastic-looking overlays.

改进高山水系视觉，让湖水、小河和现有河流看起来属于同一套水体，而不是彼此割裂的塑料覆盖层。

# Summary / 概要

This change unifies water colors and reflection behavior, adds lake depth and shoreline blending, removes grass and trees from water-covered areas, and tightens the visual layering between terrain, water, foam, and vegetation.

本次统一水体颜色和反射行为，为湖水增加水深和岸线融合，去除被水覆盖区域的草和树，并调整地形、水面、泡沫和植被之间的视觉层级。

# User Request / 用户需求

The user reported four issues: river water and lake water are visually inconsistent, the lake lacks volume and looks like plastic, grass and trees remain inside the lake, and the water texture/rendering layers make water appear to sit on top of the ground.

用户反馈四个问题：河水和湖水视觉不统一，湖水没有体积感且像塑料，湖水区域仍有草和树，水系贴图和渲染层级导致水像覆盖在地面上。

# Scope / 范围

Update the water-system shaders, lake geometry attributes, terrain lake-bed masking, and vegetation placement exclusions. Do not add real-time fluid simulation, replace the existing downstream river path, or change player controls.

更新水系 shader、湖面几何属性、地形湖床 mask 和植被放置排除。不增加实时流体模拟，不替换现有下游河道路径，也不修改玩家控制。

# Acceptance Criteria / 验收标准

- Lake water, outlet stream, snowmelt, and river water use a consistent palette and reflection style.
- The lake surface has depth-based color, transparency, shoreline fade, restrained reflections, and shallow-water bottom visibility.
- Grass and tree placement excludes the lake, wet lake edge, outlet stream, snowmelt channels, and plunge pool.
- Terrain under the lake reads as lake bed or wet shoreline rather than grass.
- Render layering no longer makes the lake look like a flat plastic sheet over vegetation or ground.
- Build verification passes.
- Screenshot QA checks lake overview, lake shoreline, outlet/river continuity, and vegetation exclusion.

- 湖水、湖口小河、融雪水和河水使用统一的色调与反射风格。
- 湖面具备基于水深的颜色、透明度、岸线渐隐、克制反射和浅水可见湖底。
- 草和树的放置排除湖水、湿湖岸、湖口小河、融雪水道和瀑布冲击池。
- 湖水下方地形呈现湖床或湿岸，而不是草地。
- 渲染层级不再让湖水像平面塑料片覆盖在植被或地面上。
- 构建验证通过。
- 截图验收覆盖湖面总览、湖岸近景、湖口/河流连续性和植被排除。
