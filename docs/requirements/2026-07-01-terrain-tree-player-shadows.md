# Requirement / 需求

Add shadows for terrain, trees, and the player, while keeping grass out of the shadow system.

为地形、树木和人物添加影子，同时让草地不参与阴影系统。

# Summary / 概要

Terrain should receive shadows from the player and trees. Player and tree meshes should cast shadows, grass instanced meshes should not cast or receive shadows, and the sun shadow camera should follow the active gameplay area around the player.

地形应接收人物和树木投下的影子。人物和树木网格应投射阴影，草的实例化网格不投射也不接收阴影，太阳光阴影相机应跟随玩家附近的活动区域。

# User Request / 用户需求

The user reported that the game currently has no visible shadows and requested shadows for terrain, trees, and the player, but not for grass.

用户反馈游戏里目前没有可见影子，并要求给地形、树木和人物加影子，但草地不需要。

# Scope / 范围

This change updates shadow rendering setup only: terrain shader shadow receiving, sun light shadow targeting, and grass shadow flags. It does not change gameplay, terrain geometry, vegetation placement, water rendering, or texture assets.

本次只修改阴影渲染设置：地形 shader 接收阴影、太阳光阴影目标跟随，以及草的阴影标记。不修改玩法、地形几何、植被摆放、水体渲染或贴图资源。

# Acceptance Criteria / 验收标准

- Terrain receives shadows from the player and trees.
- Player meshes and tree instances cast shadows.
- Grass instances do not cast or receive shadows.
- The shadow camera follows the player area so shadows remain visible during gameplay.
- Build verification passes.

- 地形能够接收人物和树木投下的影子。
- 人物网格和树木实例会投射阴影。
- 草实例不投射也不接收阴影。
- 阴影相机跟随玩家区域，保证游玩时阴影可见。
- 构建验证通过。
