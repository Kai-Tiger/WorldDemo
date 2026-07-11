# Requirement / 需求

Remove the ground-dirt material family completely and soften the remaining terrain and road material boundaries.

彻底移除地面泥土材质组，并进一步柔化剩余地形与道路材质的边缘过渡。

# Summary / 概要

The terrain runtime no longer loads, exposes, or samples ground-dirt textures. Authored roads remain visible by using only the existing neutral gravel color and normal layers. Road masks receive a wider spatial feather, while the grass-to-rock blend uses a broader, subtly noise-broken mask so color, normal, roughness, and occlusion transitions no longer read as hard contours.

地形运行时不再加载、暴露或采样地面泥土贴图。既有道路继续保留，但只使用现有的中性碎石颜色与法线层。道路遮罩获得更宽的空间羽化，草地到岩石的混合则使用更宽且带轻微噪声破边的遮罩，使颜色、法线、粗糙度和环境遮蔽不再呈现生硬轮廓。

# User Request / 用户需求

The user asked to remove the remaining brown dirt texture entirely and reported that the visible material boundaries were still not soft enough.

用户要求彻底去掉仍然可见的棕色泥土贴图，并反馈当前材质边缘过渡仍不够柔和。

# Scope / 范围

Remove the current `ground_dirt` source and compressed assets, runtime loading, material inputs, shader uniforms, UVs, and optimizer entries. Convert the existing road overlay to gravel-only and soften its mask without changing road routes, terrain shaping, vegetation exclusion, snow, water, player, camera, or lighting behavior. Keep unrelated legacy dirt-named assets and historical requirement documents unchanged.

移除当前 `ground_dirt` 源资源与压缩资源、运行时加载、材质输入、shader uniform、UV 和优化脚本条目。将现有道路覆盖层改为仅使用碎石并柔化其遮罩，不修改道路路线、地形塑形、植被排除、积雪、水体、玩家、相机或光照行为。保留无关的旧 dirt 命名资源和历史需求文档不变。

# Acceptance Criteria / 验收标准

- Runtime code and terrain optimization tooling contain no `ground_dirt`, `GroundDirt`, or `groundDirt` references.
- The complete seven-file ground-dirt material family is removed from the tracked terrain material assets.
- Roads sample only the existing gravel albedo and normal textures and retain visible trail/cart variation.
- Road color, normal, roughness, and occlusion share the same widened edge mask.
- Grass and rock use the same broader noise-broken blend for color, normal, roughness, and macro grading.
- Snow, riverbank, riverbed, lake, and wet-shore overrides retain their existing order and behavior.
- Targeted tests, the full test suite, the production build, and close visual checks succeed without shader errors or missing-resource requests.

- 运行时代码和地形优化工具中不再包含 `ground_dirt`、`GroundDirt` 或 `groundDirt` 引用。
- 完整的七文件地面泥土材质组从已跟踪地形材质资源中删除。
- 道路只采样现有碎石颜色与法线贴图，同时保留小径和车道的可见差异。
- 道路颜色、法线、粗糙度和环境遮蔽共用同一个加宽后的边缘遮罩。
- 草地和岩石的颜色、法线、粗糙度与宏观调色共用同一个更宽且带噪声破边的混合值。
- 积雪、河岸、河床、湖泊与湿岸覆盖保持原有顺序和行为。
- 定向测试、完整测试、生产构建和近景视觉检查全部通过，且无 shader 错误或缺失资源请求。
