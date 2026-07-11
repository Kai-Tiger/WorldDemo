# Requirement / 需求

Use a single grass material on flat terrain to remove the noisy patchwork of ground textures.

在平缓地形上使用单一草地材质，消除杂乱的地表贴图拼块。

# Summary / 概要

Flat lowland terrain now always uses the existing forest-floor grass albedo and normal maps. The previous moisture and splat-based switching between forest floor, dry grass, gravel, and dirt has been removed from the flat-ground branch. Roads, water banks and beds, steep rock, alpine terrain, and snow retain their dedicated materials.

平缓低地现在始终使用现有的森林草地颜色贴图和法线贴图。平地分支中原先基于湿度和 splat 遮罩在森林地表、枯草、碎石和泥土之间切换的逻辑已移除。道路、水岸与河床、陡峭岩壁、高山地形和积雪仍保留各自的专用材质。

# User Request / 用户需求

The user reported that the terrain textures looked very cluttered and requested only one grass texture on flat ground.

用户反馈地形贴图非常杂乱，并要求平缓地面上只保留一种草地贴图。

# Scope / 范围

Simplify the flat-lowland terrain shader branch to the forest-floor layer and stop loading the dry-grass and blend-splat textures that this change makes unused. Do not alter terrain geometry, slopes, height data, roads, water, snow, vegetation placement, or authored features.

将平缓低地的地形 shader 分支简化为森林草地层，并停止加载因此不再使用的枯草和混合 splat 贴图。不修改地形几何、坡度、高度数据、道路、水体、积雪、植被放置或既有内容。

# Acceptance Criteria / 验收标准

- Flat lowland terrain samples only the forest-floor grass color layer.
- Flat-ground shader code no longer selects dry grass, gravel, or dirt by moisture weights.
- Forest-floor normal detail remains active in the globally selected Medium material.
- Roads may still use dirt and gravel, and non-flat terrain may still use rock, snow, and water materials.
- Unused dry-grass and blend-splat textures are no longer loaded at startup.
- Automated tests and the production build succeed.
- Browser verification shows a continuous grass surface without the previous bright gravel islands on flat ground.

- 平缓低地只采样森林草地颜色层。
- 平地 shader 不再根据湿度权重选择枯草、碎石或泥土。
- 全局选用的 Medium 材质继续保留森林草地法线细节。
- 道路仍可使用泥土和碎石，非平地仍可使用岩石、积雪和水体材质。
- 启动时不再加载未使用的枯草和混合 splat 贴图。
- 自动化测试和生产构建成功。
- 浏览器验证中平地呈现连续草地，不再出现此前明亮的碎石斑块。
