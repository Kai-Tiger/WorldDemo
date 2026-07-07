# Requirement / 需求

Darken the imported spawn replacement tree so it matches the surrounding forest better.

压暗导入的出生点替换树，使它更接近周围森林的颜色。

# Summary / 概要

The imported `tree_spawn.glb` model now receives spawn-tree-only material tuning at load time. Its material color is multiplied darker and its emissive lift is reduced, while the normal tree models keep their existing color and readability settings.

导入的 `tree_spawn.glb` 模型现在会在加载时应用仅针对出生点替换树的材质调色。它的材质颜色会被压暗，暗部补光会降低，而普通树模型保持现有颜色和可读性设置。

# User Request / 用户需求

The user showed a screenshot and reported that the additionally imported `tree.glb` looks too light.

用户展示截图并反馈额外导入的 `tree.glb` 颜色有点浅。

# Scope / 范围

Update only the runtime material tuning for the spawn replacement tree. Do not edit GLB assets, normal tree models, tree placement rules, lighting, post-processing, terrain, grass, water, player behavior, or unrelated pending work.

仅更新出生点替换树的运行时材质调色。不编辑 GLB 资源、普通树模型、树木放置规则、光照、后处理、地形、草、水体、玩家行为或无关待处理改动。

# Acceptance Criteria / 验收标准

- `tree_spawn.glb` appears darker and less washed out in game.
- Normal tree models keep their existing material treatment.
- Spawn tree placement count and scale remain unchanged.
- Tree alpha/depth behavior remains unchanged.
- The project build succeeds.

- `tree_spawn.glb` 在游戏中更暗，不再显得过浅发白。
- 普通树模型保持现有材质处理。
- 出生点替换树数量和缩放保持不变。
- 树木 alpha/depth 行为保持不变。
- 项目构建成功。
