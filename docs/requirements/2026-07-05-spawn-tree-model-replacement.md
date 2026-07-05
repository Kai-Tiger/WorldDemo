# Requirement / 需求

English: Replace the 10 existing trees nearest the player spawn point with the new provided tree model.

中文：将玩家出生点最近的 10 棵现有树木替换为新提供的树木模型。

# Summary / 概要

English: Add the new tree model as a spawn-area-only asset, load it alongside the normal tree models, and reassign only the nearest 10 generated tree placements to use it with a smaller scale multiplier.

中文：将新树木模型作为仅用于出生点附近的资产加入项目，与普通树模型一起加载，并只把最近的 10 个已生成树木位置改为使用该模型，同时应用较小的缩放倍率。

# User Request / 用户需求

English: The user provided `/Users/likai.lear/Downloads/tree.glb` and asked to replace 10 existing trees near the spawn point with this new tree model.

中文：用户提供了 `/Users/likai.lear/Downloads/tree.glb`，并要求在出生点附近换掉 10 棵现有树木。

# Scope / 范围

English: Update only tree asset loading and tree placement reassignment for the spawn area. Do not change global tree density, terrain, water, grass, player spawn, camera behavior, lighting, or unrelated pending work.

中文：只更新树木资产加载和出生点附近树木位置重分配。不修改全局树木密度、地形、水体、草、玩家出生点、相机行为、灯光或无关未提交改动。

# Acceptance Criteria / 验收标准

English:
- The new GLB is available under `public/assets/vegetation/`.
- The normal random tree model pool remains limited to the existing four tree models.
- Exactly the 10 generated tree placements nearest `PLAYER_SPAWN_POSITION` are reassigned to the new model.
- Total generated tree placement count remains unchanged.
- The new model uses a fixed scale multiplier so it matches the rough size of existing trees.
- The production build completes successfully.

中文：
- 新 GLB 位于 `public/assets/vegetation/` 下。
- 普通随机树木模型池仍然只包含原有 4 个树模型。
- 只有距离 `PLAYER_SPAWN_POSITION` 最近的 10 个已生成树木位置会被改为新模型。
- 已生成树木位置总数保持不变。
- 新模型使用固定缩放倍率，使尺寸大致匹配现有树木。
- 生产构建成功完成。
