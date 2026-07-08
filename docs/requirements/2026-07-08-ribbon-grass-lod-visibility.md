# Requirement / 需求

Fix Ribbon Grass near and far visibility so close 3D grass renders clearly and far grass no longer appears as white speckles.

修复 Ribbon Grass 近远景可见性，让近处 3D 草清晰显示，并避免远处草表现为白色碎点。

# Summary / 概要

The regular Ribbon Grass opacity map is too low for the previous LOD alpha cutoffs, the far grass color grading was too desaturated, and the billboard geometry was centered around the terrain instead of growing from it. This change aligns 3D LOD alpha testing with the asset opacity range, tints far grass back toward green, anchors billboards at ground level, makes LOD buckets exclusive, and slightly increases instance scale for readable close grass.

Ribbon Grass 普通 opacity 贴图数值低于此前 LOD 的 alpha 裁切阈值，远景草颜色分级过度去饱和，并且 billboard 几何以地面为中心而不是从地面长出。本次变更让 3D LOD 的 alpha test 匹配资产透明度范围，将远景草拉回绿色，将 billboard 锚定到地面，改为互斥 LOD 分桶，并略微提高实例缩放以改善近景可读性。

# User Request / 用户需求

The user reported that close grass was not visible, while distant ground showed white speckles that disappeared when approached.

用户反馈近景看不到草，远处地面出现白点，但靠近后又消失。

# Scope / 范围

This change only adjusts Ribbon Grass material cutoffs, material tinting, billboard geometry anchoring, grass instance scale, and LOD bucket selection. It does not change terrain, water, trees, player, camera, placement masks, or asset file paths.

本次变更只调整 Ribbon Grass 材质裁切阈值、材质乘色、billboard 几何锚点、草实例缩放和 LOD 分桶选择。不改变地形、水体、树木、玩家、相机、放置遮罩或资产路径。

# Acceptance Criteria / 验收标准

- Close Ribbon Grass 3D meshes are visible within the near LOD range.
- Far Ribbon Grass does not collapse into isolated white speckles or white clumps.
- LOD0, LOD1, LOD2, and billboard grass render in exclusive distance bands.
- Billboard grass grows from terrain height instead of being half buried.
- The project build succeeds.

- 近景 LOD 范围内可以看到 Ribbon Grass 3D 网格。
- 远景 Ribbon Grass 不再退化成孤立白点或白色草丛。
- LOD0、LOD1、LOD2 和 billboard 草在互斥距离区间渲染。
- Billboard 草从地形高度向上生长，而不是半截埋入地面。
- 项目构建成功。
