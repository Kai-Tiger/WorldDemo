# Requirement / 需求

Fix Ribbon Grass rendering so grass blades use the opacity mask correctly and no longer appear as black card-like clumps.

修复 Ribbon Grass 渲染，让草叶正确使用透明遮罩，不再显示成黑色面片或黑色线团。

# Summary / 概要

The Ribbon Grass asset is an alpha-cutout mesh asset. Its opacity texture must be used for the blade silhouette, and the material color grading should not over-darken the result.

Ribbon Grass 是依赖 alpha 裁切的草叶面片资产。必须使用 opacity 贴图裁出草叶轮廓，同时材质调色不能把草过度压暗。

# User Request / 用户需求

The user reported that the grass appears black in-game and requested the prepared fix plan be implemented.

用户反馈游戏里的草是黑色的，并要求实现已确认的修复计划。

# Scope / 范围

Update only the Ribbon Grass material/shader settings needed to restore opacity cutout and brighter natural green grass. Keep existing mesh LOD, placement density, water exclusion, slope exclusion, terrain, water, trees, player, and camera behavior unchanged.

只更新 Ribbon Grass 材质和 shader 设置，以恢复透明裁切并让草呈现更自然的绿色。保持现有 mesh LOD、分布密度、水体排除、陡坡排除、地形、水、树、玩家和相机行为不变。

# Acceptance Criteria / 验收标准

- `npm run build` passes.
- Ribbon Grass uses its opacity map for blade cutout.
- Nearby grass no longer appears as black cards or black tangled clumps.
- Grass remains green with mild root/cavity darkening only.
- Existing 3D LOD behavior remains active and billboard impostors stay disabled.
- No unrelated dirty files are staged or committed.

- `npm run build` 通过。
- Ribbon Grass 使用 opacity 贴图裁切草叶轮廓。
- 近景草不再显示为黑色面片或黑色线团。
- 草保持绿色，只允许根部和缝隙有轻微暗部。
- 现有 3D LOD 行为保持启用，不恢复 billboard impostor。
- 不暂存或提交无关 dirty 文件。
