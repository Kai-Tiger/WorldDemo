# Requirement / 需求

Double the expected green model-grass density and add naturally clustered dry-yellow grass among the green grass.

将绿色模型草的期望密度提高一倍，并在绿草中加入自然成簇分布的枯黄草。

# Summary / 概要

Raise the total candidate density so green grass remains at 5.0 clumps per square meter while dry grass contributes about 12.5 percent of the final population. Reuse the existing Ribbon Grass assets and instance meshes, with deterministic world-space clustering and per-instance color.

提高草地候选总密度，使绿色草保持每平方米 5.0 丛，同时让枯黄草约占最终草量的 12.5%。复用现有 Ribbon Grass 资源和实例网格，通过确定性的世界坐标聚类与实例颜色实现枯草效果。

# User Request / 用户需求

The user asked for twice as much green model grass, plus small clusters of dry-yellow grass scattered naturally through it.

用户要求将绿色模型草增加到原来的两倍，并在其中自然散布一簇簇的枯黄草。

# Scope / 范围

Update grass candidate density, deterministic dry-grass classification, placement metadata, legacy and streamed instance colors, persistent LOD color buffers, and focused tests. Preserve the existing models, textures, material count, draw-call count, LOD distances and keep ratios, per-frame generation budgets, terrain and water exclusions, mountain-trail exclusions, wind sway, trees, terrain materials, lighting, and post-processing.

更新草地候选密度、确定性枯草分类、放置元数据、旧路径与流式路径的实例颜色、持久 LOD 颜色缓冲及专项测试。保持现有模型、贴图、材质数量、Draw Call 数量、LOD 距离与保留比例、每帧生成预算、地形与水域排除、山路排除、风摆、树木、地形材质、光照和后处理不变。

# Acceptance Criteria / 验收标准

- Expected green candidate density is 5.0 clumps per square meter; dry grass is 10–15 percent of accepted grass and total candidate density is `40 / 7`.
- Dry grass is deterministic, continuous across zone boundaries, strongly clustered within about one meter, and approaches the background rate by five meters.
- Green and dry instances share the same meshes and materials, so dry coloring adds no draw calls or grass asset variants.
- Matrix and color buffers use the same LOD filtering and ordering, are reused, and commit atomically.
- Grass exclusions and all unrelated scene behavior remain unchanged.
- Focused grass tests, the full test suite, the production build, and fixed-camera visual checks pass.

- 绿色候选草的期望密度为每平方米 5.0 丛；枯草占已接受草的 10–15%，候选总密度为 `40 / 7`。
- 枯草分类可复现、跨 zone 边界连续，在约一米范围内明显成簇，并在五米处接近背景比例。
- 绿草与枯草共享相同网格和材质，因此枯草着色不增加 Draw Call 或草地资源变体。
- 矩阵与颜色缓冲使用相同的 LOD 筛选和顺序，持续复用并原子提交。
- 草地排除规则及所有无关场景行为保持不变。
- 草地专项测试、全量测试、生产构建和固定镜头视觉检查全部通过。
