# Requirement / 需求

Use the newly generated independent terrain texture layers to refresh the in-game grassland material while leaving other systems unchanged.

使用新生成的独立地形贴图层刷新游戏里的草地材质，同时保持其他系统不变。

# Summary / 概要

Update the lowland terrain material to use the new moss, dirt, dry grass, and gravel albedo textures as separate blended layers.

更新低地地形材质，使用新的苔藓、泥土、干草和碎石 albedo 贴图作为独立混合层。

# User Request / 用户需求

The user asked to use the generated texture list to recreate the grassland in the game, with everything else unchanged.

用户要求使用上面生成的贴图列表重新生成游戏里的草地，其他内容保持不变。

# Scope / 范围

This change is limited to terrain material texture inputs and lowland grassland color blending. It does not change terrain geometry, height data, water, riverbeds, alpine materials, vegetation placement, player behavior, lighting, or camera behavior.

本次变更仅限于地形材质贴图输入和低地草地颜色混合。不改变地形几何、高度数据、水体、河床、高山材质、植被放置、玩家行为、光照或相机行为。

# Acceptance Criteria / 验收标准

- Lowland grassland terrain uses the new moss, dirt, dry grass, and gravel texture assets.
- Existing river, lake, alpine, snow, vegetation, and scene behavior remain unchanged.
- The project build succeeds.

- 低地草地区域使用新的苔藓、泥土、干草和碎石贴图资源。
- 现有河流、湖泊、高山、雪地、植被和场景行为保持不变。
- 项目构建成功。
