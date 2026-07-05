# Requirement / 需求

Raise the terrain around the southwest lake shore near `289,-462` so the lake water visually reaches the bank instead of leaving a low exposed shelf.

抬高 `289,-462` 附近的湖西南侧岸线地形，让湖水视觉上贴到岸边，不再留下低洼裸露浅滩。

# Summary / 概要

Add a localized terrain raise to the existing lake basin shaping. The adjustment should behave like the opposite shore by lifting only the affected shore band toward the lake water level and fading out toward the lake center and surrounding terrain.

在现有湖盆塑形中加入局部地形抬升。调整应参考对岸效果，只把受影响的岸线带抬向湖水水位，并在靠近湖心和周边地形时淡出。

# User Request / 用户需求

The user identified that the lake water does not meet the bank on the side around coordinate `289,-462` and requested raising the terrain there so the water attaches to the shore.

用户指出 `289,-462` 这一侧的湖水没有贴岸，并要求参考对岸抬高该处地形，让湖水贴到岸边。

# Scope / 范围

Update `src/waterSystem.js` with a small, local southwest shore raise. Do not change lake water level, lake mesh shape, outlet alignment, waterfall geometry, or unrelated terrain systems.

在 `src/waterSystem.js` 中加入小范围的西南侧湖岸抬升。不改变湖水水位、湖面网格轮廓、出水口对齐、瀑布几何或无关地形系统。

# Acceptance Criteria / 验收标准

`npm run build` passes. The lake shore around `289,-462` is raised enough that the lake water reads as attached to the bank. The adjustment fades locally and does not reshape the whole lake or affect the opposite shore.

`npm run build` 通过。`289,-462` 附近湖岸被抬高到湖水能贴岸的视觉效果。该调整局部淡出，不重塑整片湖，也不影响对岸。
