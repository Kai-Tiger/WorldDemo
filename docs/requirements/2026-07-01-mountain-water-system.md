# Requirement / 需求

Create a complete mountain water system where snowmelt feeds an alpine lake, the lake drains through an outlet stream, falls as a waterfall, and joins the existing river.

创建完整高山水系：雪水融化汇入高山湖泊，湖水经出水口小河流出，形成瀑布，并最终汇入现有河流。

# Summary / 概要

The scene should include terrain-carved lake and stream features, reflective lake water, reflective snowmelt over wet rock, a multi-layer waterfall, impact foam, and a confluence treatment that blends into the existing river.

场景应包含经地形下陷和雕刻形成的湖泊与水道、带反射的湖水、岩壁上具备反光的融雪水膜、多层瀑布、冲击泡沫，以及自然并入现有河流的汇流处理。

# User Request / 用户需求

The user requested planning and implementing a full water ecology system: snowmelt near the mountains collects into a lake centered around `(300, -400)`, exits the lake through a gap, flows to a waterfall near `(409, -421)`, and merges with the existing river. The user also requested high-quality snowmelt, reflective water on rock walls, high-quality waterfall visuals, and autonomous screenshot validation.

用户要求规划并实现完整水系生态：山上融化的雪水在 `(300, -400)` 附近汇集成湖，湖水通过缺口形成小河，在 `(409, -421)` 附近岩壁处形成瀑布，并汇入现有河流。用户还要求高质量雪水效果、岩壁水体可反光、高质量瀑布视觉，并允许自主截图验收。

# Scope / 范围

This change adds water-system terrain deformation, material masks, lake water, snowmelt runoff, waterfall visuals, impact foam, and scene update integration. It does not implement real-time CFD/SPH fluid simulation, replace the existing downstream river, add gameplay water physics, or change player controls.

本次增加水系地形下陷/雕刻、材质 mask、湖水、融雪径流、瀑布视觉、冲击泡沫和场景更新集成。不实现实时 CFD/SPH 流体模拟，不替换现有下游河流，不增加水体玩法物理，也不修改玩家控制。

# Acceptance Criteria / 验收标准

- Terrain is lowered for the lake basin, outlet stream, snowmelt grooves, and waterfall plunge pool.
- The lake has an irregular round shape near `(300, -400)` and uses reflective/refractive lake water.
- Snowmelt water follows terrain and wet rock paths, with visible reflective highlights on rock walls.
- The lake outlet stream flows toward the waterfall lip near `(409, -421)`.
- The waterfall uses layered water ribbons, mist, and impact foam rather than a single flat transparent plane.
- The waterfall base blends into the existing river through a plunge pool and downstream foam.
- Build verification passes.
- Screenshot QA is performed for lake, snowmelt, waterfall, and confluence views.

- 湖盆、湖口小河、融雪浅沟和瀑布冲击池的地形被下陷/雕刻。
- 湖泊位于 `(300, -400)` 附近，形状为不规则圆形，并使用带反射/折射的湖水。
- 融雪水体贴地形和湿岩路径流动，岩壁水面有可见反光。
- 湖口小河流向 `(409, -421)` 附近的瀑布口。
- 瀑布使用多层水幕、水雾和冲击泡沫，而不是单张透明平面。
- 瀑布底部通过冲击池和下游泡沫自然并入现有河流。
- 构建验证通过。
- 对湖泊、融雪、瀑布和汇流视角执行截图验收。
