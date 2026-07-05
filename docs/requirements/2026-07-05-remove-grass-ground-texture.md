# Requirement / 需求

Remove the lowland grass ground texture from the terrain material while leaving other systems unchanged.

从地形材质中移除低地草地底图，同时保持其他系统不变。

# Summary / 概要

The terrain shader no longer loads or samples the moss/grass ground texture and its normal map. Lowland terrain now starts from the existing dirt layer, with the existing dry grass and gravel overlays still applied.

地形 shader 不再加载或采样苔藓/草地底图及其法线贴图。低地地形现在以现有泥土地层作为基底，并继续保留现有干草和砾石覆盖混合。

# User Request / 用户需求

The user said the current grass ground texture looks bad and asked to remove it without changing anything else.

用户表示当前草地底图太难看，并要求去掉它，其他内容不要改变。

# Scope / 范围

Update only the terrain material texture loading and shader sampling for the lowland grass ground base. Do not change grass clumps, terrain geometry, height data, water, vegetation placement, lighting, player behavior, or texture assets.

仅更新低地草地底图基底相关的地形材质贴图加载和 shader 采样。不修改草丛、地形几何、高度数据、水体、植被放置、光照、玩家行为或贴图资源。

# Acceptance Criteria / 验收标准

- The moss/grass ground albedo texture is no longer loaded by the terrain material.
- The moss/grass ground normal texture is no longer loaded by the terrain material.
- Lowland terrain still renders using the existing dirt, dry grass, and gravel layers.
- The project build succeeds.

- 地形材质不再加载苔藓/草地底色贴图。
- 地形材质不再加载苔藓/草地法线贴图。
- 低地地形仍使用现有泥土、干草和砾石层渲染。
- 项目构建成功。
