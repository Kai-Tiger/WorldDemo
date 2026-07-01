# Requirement / 需求

Make the player shadow visibly readable in gameplay.

让游戏中的人物影子清晰可见。

# Summary / 概要

The sun direction should be shared by the light, sun visual, and terrain shader, with a lower angle that produces a readable player shadow. Terrain shadow response should be stronger while keeping the scene readable.

太阳方向应由灯光、太阳视觉和地形 shader 共享，并使用更低的角度产生可读的人物影子。地形阴影响应应更明显，同时保持场景可读。

# User Request / 用户需求

The user reported that the player still had no visible shadow after the first shadow implementation.

用户反馈第一次阴影实现后，人物仍然没有可见影子。

# Scope / 范围

This change updates shadow visibility only: shared sun direction, shadow camera size, and terrain shadow strength. It does not add fake blob shadows, change gameplay, alter vegetation placement, or modify water behavior.

本次只修改阴影可见性：共享太阳方向、阴影相机范围和地形阴影强度。不添加假的圆形贴片阴影，不修改玩法，不改变植被摆放，也不修改水体行为。

# Acceptance Criteria / 验收标准

- The light, sun visual, and terrain shader use the same sun direction.
- The sun angle produces a longer, readable player shadow.
- Terrain shadows are stronger but do not make the scene overly dark.
- Grass remains excluded from shadow casting and receiving.
- Build verification passes.

- 灯光、太阳视觉和地形 shader 使用同一个太阳方向。
- 太阳角度能产生更长、更清晰的人物影子。
- 地形阴影更明显，但不会让场景过暗。
- 草地仍然不参与投射或接收阴影。
- 构建验证通过。
