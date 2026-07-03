# Requirement / 需求

English: Restore scene contrast and improve player readability after the post-processing brightness rebalance made the world look washed out while the player remained dark.

中文：在后处理亮度调整导致场景发灰且玩家仍偏暗后，恢复场景对比度并提升玩家可读性。

# Summary / 概要

English: Reduce global exposure and shadow lift, soften AO slightly, and add a small material-only emissive lift to the player model so the character is visible without over-brightening the terrain.

中文：降低全局曝光和暗部抬升，轻微减弱 AO，并给玩家模型添加很弱的材质自发光提亮，让角色可见，同时不继续过度提亮地形。

# User Request / 用户需求

English: The user reviewed the latest screenshot and requested implementation of the plan to fix the washed-out scene and dark player.

中文：用户查看最新截图后，要求实现修复场景发灰和玩家偏暗的方案。

# Scope / 范围

English: Adjust only post-processing brightness/contrast/AO values and player material readability. Do not change terrain, water, vegetation, scene lights, gameplay, or unrelated user edits.

中文：只调整后处理亮度、对比度、AO 参数和玩家材质可读性。不修改地形、水体、植被、场景灯光、玩法或无关用户改动。

# Acceptance Criteria / 验收标准

English:
- Terrain and grass regain contrast and no longer look globally washed out.
- The player armor shows readable shape in shaded daylight.
- Forest areas remain dark enough for depth without crushing the player silhouette.
- The production build completes successfully.

中文：
- 地形和草地恢复对比度，不再整体发灰。
- 玩家盔甲在阴影日光下能看出形体。
- 森林区域仍保留暗部层次，但不把玩家轮廓压成黑块。
- 生产构建成功完成。
