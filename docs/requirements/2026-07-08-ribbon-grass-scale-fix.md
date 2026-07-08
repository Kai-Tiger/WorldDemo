# Requirement / 需求

Fix Ribbon Grass visibility by correcting the imported FBX asset scale, opacity cutoff, and nearby generation priority.

通过修正导入的 Ribbon Grass FBX 资产缩放、透明裁切阈值和近处生成优先级来恢复草的可见性。

# Summary / 概要

The Ribbon Grass FBX files use centimeter-like source dimensions, the regular opacity map peaks below the previous alpha-test cutoff, and grass chunks were generated in grid order instead of player-nearest order. The runtime now converts FBX geometry to meter-scale grass, lowers the 3D grass alpha cutoff to match the asset's opacity range, and prioritizes nearby grass chunk generation.

Ribbon Grass 的 FBX 文件使用类似厘米的源尺寸，普通 opacity 贴图的最大值低于之前的 alpha-test 裁切阈值，并且草地方块此前按网格顺序而不是玩家最近顺序生成。运行时现在将 FBX 几何转换为米制草丛尺寸，降低 3D 草的透明裁切阈值以匹配该资产的 opacity 范围，并优先生成玩家附近的草地方块。

# User Request / 用户需求

The user reported that no grass was visible after entering the game.

用户反馈进入游戏后看不到草。

# Scope / 范围

This change only adjusts the Ribbon Grass geometry scale used during import normalization, the shared 3D grass alpha-test threshold, and grass chunk scheduling priority. It does not change grass placement rules, density, LOD distances, terrain, water, trees, player, or camera behavior.

本次变更只调整 Ribbon Grass 导入归一化时使用的几何缩放、3D 草共享的 alpha-test 阈值以及草地方块生成调度优先级。不改变草的放置规则、密度、LOD 距离、地形、水体、树木、玩家或相机行为。

# Acceptance Criteria / 验收标准

- Ribbon Grass meshes are scaled to normal grass size in world units.
- Ribbon Grass opacity pixels are not fully discarded by alpha testing.
- Grass chunks nearest to the player generate before distant chunks.
- Existing grass placement and LOD systems continue to run.
- The project build succeeds.

- Ribbon Grass 网格在世界单位中缩放为正常草丛大小。
- Ribbon Grass 的 opacity 像素不会被 alpha test 全部裁掉。
- 离玩家最近的草地方块先于远处方块生成。
- 现有草放置和 LOD 系统继续运行。
- 项目构建成功。
