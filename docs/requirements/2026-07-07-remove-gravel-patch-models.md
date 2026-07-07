# Remove Gravel Patch Models / 删除碎石 Patch 模型

## Requirement / 需求

English: Remove the runtime gravel patch model overlay from the scene while keeping the terrain shader's gravel material layer intact.

中文：从场景中删除运行时碎石 patch 模型覆盖层，同时保留地形 shader 中的碎石材质层。

## Summary / 概要

English: The scene no longer imports, creates, adds, or updates the gravel overlay manager. The generated gravel patch asset script and GLB patch models are removed from the project.

中文：场景不再导入、创建、添加或更新碎石覆盖层管理器。项目中删除生成碎石 patch 资产的脚本和 GLB patch 模型。

## User Request / 用户需求

English: The user asked where the gravel models are introduced and requested that all of those gravel models be deleted.

中文：用户询问项目里的碎石模型在哪里引入，并要求把这些碎石模型全部删除。

## Scope / 范围

English: Remove only the gravel patch model overlay system and its generated assets. Do not remove terrain gravel albedo or normal textures, terrain shader gravel blending, vegetation rock models, water systems, grass, trees, player, or camera behavior.

中文：仅删除碎石 patch 模型覆盖系统及其生成资产。不删除地形碎石 albedo 或 normal 贴图、不删除地形 shader 的碎石混合、不删除植被岩石模型、水系、草、树、玩家或相机行为。

## Acceptance Criteria / 验收标准

English:
- Runtime code has no remaining references to `gravelOverlay`, `createGravelOverlay`, `GravelOverlay`, `gravel-patches`, `GRAVEL_PATCH`, or `GRAVEL_OVERLAY`.
- The gravel patch `.glb` files and their generator script are removed.
- The application builds successfully.
- The terrain gravel texture layer remains in place.

中文：
- 运行时代码中不再保留 `gravelOverlay`、`createGravelOverlay`、`GravelOverlay`、`gravel-patches`、`GRAVEL_PATCH` 或 `GRAVEL_OVERLAY` 引用。
- 碎石 patch `.glb` 文件及其生成脚本已删除。
- 应用可以成功构建。
- 地形碎石贴图层保持不变。
