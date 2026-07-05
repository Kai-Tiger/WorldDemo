# Gravel Overlay Mesh / 碎石覆盖网格

## Requirement / 需求

Add a separate terrain-following gravel mesh layer so gravel reads as a physical ground cover instead of only a terrain material blend.

新增一层独立的跟随地形碎石网格，让碎石看起来像铺在地面上的物理覆盖层，而不只是地形材质混合。

## Summary / 概要

The scene now creates a chunked gravel overlay around the player. Each overlay chunk samples terrain height, sits slightly above the ground, uses the existing gravel albedo and normal textures, and breaks up edges with a coverage attribute and alpha-tested shader logic.

场景现在会在玩家周围生成分块碎石覆盖网格。每个覆盖层方块会采样地形高度、略微高出地表、使用现有碎石 albedo 和 normal 贴图，并通过 coverage 属性和 alpha-test shader 逻辑打散边缘。

## User Request / 用户需求

"Implement the terrain-following gravel overlay mesh plan."

"实现跟随地形的碎石覆盖 mesh 计划。"

## Scope / 范围

Add the gravel overlay mesh system, wire it into scene creation and per-frame player-position updates, and add gravel overlay tuning constants. Do not add individual pebble models, replace terrain geometry, change water systems, change player behavior, or alter unrelated vegetation settings.

新增碎石覆盖网格系统，将其接入场景创建和每帧玩家位置更新，并添加碎石覆盖层调参常量。不添加独立碎石模型、不替换地形几何、不改变水系、不改变玩家行为，也不修改无关植被设置。

## Acceptance Criteria / 验收标准

- Gravel appears as a separate mesh layer above suitable ground rather than only as terrain shader color.
- The gravel mesh follows terrain height and uses a small vertical offset to avoid z-fighting.
- Gravel overlay chunks generate around the player and unload when outside the active radius.
- Overlay coverage favors low, flatter ground and excludes rivers, water-system areas, and small lakes.
- Overlay material uses existing gravel albedo and normal textures with alpha-tested noisy edges.
- `npm run build` completes successfully.

- 碎石会作为独立 mesh 层显示在合适地面上，而不只是地形 shader 颜色。
- 碎石网格跟随地形高度，并使用小幅垂直偏移避免 z-fighting。
- 碎石覆盖层方块围绕玩家生成，并在离开活动半径后卸载。
- 覆盖层优先出现在低地平缓区域，并避开河流、水系区域和小湖。
- 覆盖层材质使用现有碎石 albedo 和 normal 贴图，并具备 alpha-test 噪声破边。
- `npm run build` 成功完成。
