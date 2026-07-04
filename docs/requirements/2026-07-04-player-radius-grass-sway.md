# Requirement / 需求

Limit animated grass movement to a 2 meter radius around the player.

将草地动画摆动限制在玩家周围 2 米半径内。

# Summary / 概要

This change passes the player position into the grass shader and masks wind displacement by distance, so only grass very close to the player moves while all other grass remains static.

本次将玩家位置传入草地 shader，并按距离遮罩风动位移，让只有玩家近处的草会摆动，其余草保持静止。

# User Request / 用户需求

The user reported that distant grass movement still creates noise and requested that only grass within a 2 meter radius of the player center should move.

用户反馈远处草地摆动仍然产生噪点，并要求只有玩家中心半径 2 米内的草会摆动。

# Scope / 范围

Update only grass animation masking and the grass update data flow. Do not change grass density, grass color, terrain textures, global post-processing, lighting, water, trees, player behavior, leaf decals, enemy assets, or unrelated pending work.

仅更新草地动画遮罩和草地更新数据流。不修改草密度、草颜色、地形贴图、全局后处理、灯光、水体、树木、玩家行为、落叶贴花、敌人资源或无关待提交改动。

# Acceptance Criteria / 验收标准

- Grass within 2 meters of the player has subtle wind movement.
- Grass outside the player radius is static and no longer produces movement-based noise.
- Existing grass brightness and LOD noise reductions remain unchanged.
- Build verification passes.

- 玩家 2 米内的草保留轻微风动。
- 玩家半径外的草保持静止，不再产生基于运动的噪点。
- 既有草地亮度和 LOD 噪点削减效果保持不变。
- 构建验证通过。
