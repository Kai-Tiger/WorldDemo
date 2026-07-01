# Requirement / 需求

Refine the mountain water system so lake water, outlet streams, and river water feel visually unified, volumetric, and properly integrated with terrain and vegetation.

细化高山水系，让湖水、湖口小河和河水在视觉上统一，并具备体积感，同时正确融入地形和植被层级。

# Summary / 概要

This change aligns lake and stream shading with the existing river material, strengthens lake depth and reflection cues, extends wet/lake-bed terrain masks to the shoreline, sets water render ordering, and prevents generated grass clumps from jittering back into water after clustering.

本次变更将湖水和小河 shader 向现有河水材质对齐，强化湖水深度和反射线索，把湿岸与湖床地形 mask 延伸到岸线，设置水面渲染顺序，并阻止生成草簇在聚类偏移后重新落入水域。

# User Request / 用户需求

The user identified four visual issues: river and lake water were inconsistent, the lake looked plastic and lacked volume, grass and trees remained in the lake area, and water appeared layered over the ground instead of integrated with the environment.

用户指出四个视觉问题：河水和湖水不统一，湖水像塑料且缺少体积感，湖区仍有草和树，水面看起来覆盖在地面上而不是与环境融合。

# Scope / 范围

Update the existing water-system material constants, lake/stream shader behavior, water-system terrain masks, water render order, and grass placement water checks. Do not redesign the water path, add fluid simulation, replace vegetation models, or modify unrelated spawn/enemy assets.

更新现有水系材质常量、湖水/小河 shader 行为、水系地形 mask、水面渲染顺序和草地放置的水域检查。不重新设计水流路径，不加入流体模拟，不替换植被模型，也不修改无关的出生点或敌人资源。

# Acceptance Criteria / 验收标准

- Lake and stream water use the same palette, reflection tint, and bank reflection behavior as the main river.
- Lake shading shows stronger depth, restrained bed tint, shoreline fade, and shallow caustic cues.
- Terrain around the lake edge reads as lake bed or wet shoreline instead of exposed grass under transparent water.
- Water surfaces render after terrain and before foam/mist overlays.
- Grass placement rechecks clustered final positions against river, lake, water-system, and small-lake exclusions.
- Build verification passes.

- 湖水和小河使用与主河道一致的色调、反射颜色和岸边反射行为。
- 湖水 shader 呈现更强的水深、更克制的湖底染色、岸线渐隐和浅水焦散线索。
- 湖岸周围地形表现为湖床或湿岸，而不是透明水下露出的草地。
- 水面在地形之后、泡沫和雾化覆盖层之前渲染。
- 草地放置会对聚类后的最终位置重新检查主河、湖泊、水系和小湖排除区。
- 构建验证通过。
