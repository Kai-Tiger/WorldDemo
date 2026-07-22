# Larger Far-Tree Volume / 增大远景树体积

## Requirement / 需求

中文：将远景树的可见体积统一增加 20%，让远处森林拥有更充足的树冠体量。

English: Increase the visible volume of distant trees uniformly by 20% so the far forest has fuller canopy mass.

## Summary / 概要

中文：远景树轮廓的最小与最大宽度、高度均乘以 1.2。远景树仍使用现有单批次渲染、分布、颜色和 LOD 渐入设置。

English: Multiply the minimum and maximum width and height of distant-tree silhouettes by 1.2. Distant trees retain the existing single-batch rendering, distribution, colors, and LOD fade settings.

## User Request / 用户需求

中文：用户要求将远景树的体积再增加 20%。

English: The user requested another 20% increase to distant-tree volume.

## Scope / 范围

中文：仅调整远景树轮廓的宽度和高度范围，并更新定向测试。不修改树木数量、密度、位置、颜色、近景模型树、LOD 距离、渐入宽度、地形、草地、水体或无关工作区改动。

English: Change only the width and height ranges of distant-tree silhouettes and update the targeted test. Do not change tree count, density, positions, colors, near model trees, LOD distance, fade width, terrain, grass, water, or unrelated workspace changes.

## Acceptance Criteria / 验收标准

中文：

- 远景树宽度范围从 6–10 米增加到 7.2–12 米。
- 远景树高度范围从 14–24 米增加到 16.8–28.8 米。
- 远景树数量、单批次渲染和 320 米 LOD 渐入保持不变。
- 定向测试和生产构建通过。

English:

- The distant-tree width range increases from 6–10 meters to 7.2–12 meters.
- The distant-tree height range increases from 14–24 meters to 16.8–28.8 meters.
- Distant-tree count, single-batch rendering, and the 320-meter LOD fade remain unchanged.
- The targeted tests and production build pass.
