# Tree LOD Edge Blending / 树木 LOD 边缘融合

## Requirement / 需求

中文：消除模型树与全图远景树之间清晰可见的 LOD 边界，同时避免默认生成全地图高精度模型树造成的过高性能成本。

English: Remove the clearly visible LOD boundary between model trees and the full-map distant-tree field without paying the excessive cost of generating high-detail model trees across the entire map by default.

## Summary / 概要

中文：保留现有全图远景树批次，将其近端渐入带从 80 米扩大到 320 米，并让远景树在模型树可见范围结束前完成渐入。模型树区块退出时，远景森林已经完整覆盖其后方，避免出现稀疏圆环或明确边界线。

English: Keep the existing full-map distant-tree batch, widen its near transition from 80 to 320 meters, and complete its fade-in before the model-tree visibility range ends. When a model-tree chunk exits, the distant forest already fully covers the area behind it, avoiding a sparse ring or obvious boundary line.

## User Request / 用户需求

中文：用户反馈树木 LOD 仍有明确边界线，希望默认渲染全图树木，或者进一步扩大 LOD 边缘。

English: The user reported that the tree LOD still has a clear boundary and requested either full-map tree rendering by default or a larger LOD edge.

## Scope / 范围

中文：仅修改远景树近端渐入宽度和渐入区间，并更新对应定向测试。不改变模型树可见距离、树木密度、放置规则、模型资产、远景树形状、地形、草地、水体或无关工作区改动。

English: Change only the distant trees' near fade width and fade interval, plus the corresponding targeted test. Do not change model-tree visibility distances, tree density, placement rules, model assets, distant-tree silhouettes, terrain, grass, water, or unrelated workspace changes.

## Acceptance Criteria / 验收标准

中文：

- 远景树在模型树可见距离之前的 320 米范围内逐渐显现。
- 到达模型树区块退出距离时，远景树已达到完整可见度。
- 远景树仍以单批次覆盖到地图边缘，模型树可见距离和生成预算保持不变。
- 定向测试、完整测试和生产构建通过。

English:

- Distant trees fade in across the 320 meters before the model-tree visibility distance.
- Distant trees reach full visibility by the distance where model-tree chunks exit.
- Distant trees remain a single batch covering the map edge, while model-tree visibility distances and generation budgets remain unchanged.
- Targeted tests, the full test suite, and the production build pass.
