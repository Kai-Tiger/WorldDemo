# Requirement / 需求

Reduce grass wind-sway temporal noise by making nearby grass patches move more coherently.

通过让邻近草丛更一致地随风摆动，降低草地风动产生的时间噪点。

# Summary / 概要

Grass sway now uses a regional wind phase so grass within the same area moves in a more unified direction, while only a small amount of local variation remains near the player.

草地摆动现在使用区域级风相位，让同一区域内的草更统一地同向摆动，同时只在玩家近处保留少量局部变化。

# User Request / 用户需求

The user asked whether each grass blade currently moves differently and requested grass in one area to sway together in the same direction to reduce noise.

用户询问当前是否每颗草都以不同方式摆动，并要求让一片草可以同时往同一个方向摆动，以减少噪点。

# Scope / 范围

English: Update only the grass material wind-sway shader formula. Do not change grass density, placement, LOD, models, textures, lighting, post-processing, terrain, water, trees, or unrelated pending work.

中文：仅更新草材质的风动 shader 公式。不修改草密度、摆放、LOD、模型、贴图、光照、后处理、地形、水体、树木或无关待提交改动。

# Acceptance Criteria / 验收标准

- Grass within the same local area sways with a more coherent regional phase.
- Fine local flutter is reduced, especially outside the immediate player area.
- Close grass still has subtle natural movement.
- Existing grass density, borders, LOD behavior, brightness, and far-grass stability remain unchanged.
- Build verification passes.

- 同一局部区域内的草使用更一致的区域相位摆动。
- 细碎局部抖动减少，尤其是玩家近处以外的区域。
- 近处草仍保留轻微自然风动。
- 现有草地密度、边缘、LOD 行为、亮度和远处草稳定性保持不变。
- 构建验证通过。
