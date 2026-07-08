# Requirement / 需求

Restore Ribbon Grass mesh LOD while removing grass from lake bottoms, river bottoms, water exclusion areas, and steep slopes.

恢复 Ribbon Grass 的三维模型 LOD，并去掉湖底、河底、水体排除区和陡坡上的草。

# Summary / 概要

The grass system should no longer use one full-distance LOD0 layer. It should show nearby grass clearly, reduce geometry with distance, and avoid underwater or steep terrain placement.

草系统不应再使用全距离 LOD0 单层铺满。它需要近景清晰可见、远距离降低几何复杂度，并避免在水下和陡坡地形上生成草。

# User Request / 用户需求

Remove grass from lake beds, river beds, and steep slopes, then implement an LOD system.

把湖底、河底、陡坡上的草去掉，另外实现 LOD 系统。

# Scope / 范围

Update only the Ribbon Grass runtime placement and mesh LOD behavior. Keep terrain, water, trees, player, camera, and existing grass material visibility behavior unchanged.

只更新 Ribbon Grass 的运行时放置规则和模型 LOD 行为。保持地形、水、树、玩家、相机以及当前草材质可见性策略不变。

# Acceptance Criteria / 验收标准

- Grass does not spawn inside river, lake, small lake, or water shore exclusion areas.
- Grass does not spawn on terrain below the steep-slope normal threshold or ground smoothness mask.
- Grass uses LOD0 near the player, LOD1 at mid distance, and LOD2 at far distance.
- Billboard impostors remain disabled so the previous white-dot artifact does not return.
- `npm run build` passes.

- 草不会生成在河流、湖泊、小湖或水岸排除区内。
- 草不会生成在低于陡坡法线阈值或地面平滑度遮罩的位置。
- 草在玩家近处使用 LOD0，中距离使用 LOD1，远距离使用 LOD2。
- billboard impostor 保持禁用，避免之前的白点问题回归。
- `npm run build` 通过。
