# Requirement / 需求

**中文：** 将地图中的实际树木数量提高到原来的约三倍，同时保持符合水系、海拔与山坡条件的自然分布。

**English:** Increase the realized tree count across the map to approximately three times the previous amount while preserving natural placement based on hydrology, elevation, and slope conditions.

## Summary / 概要

**中文：** 同步提高树木目标密度与候选采样密度，并按面积倍率缩短最小间距，使最终实例数接近三倍，而不改变现有生态噪声、海拔分层和坡度遮罩。树木继续避开所有河流、湖泊和山路，并在南部小湖岸边保留额外缓冲。

**English:** Scale both target density and candidate sampling density, and reduce minimum spacing by the corresponding area factor so the final instance count approaches three times the previous amount without changing ecological noise, elevation bands, or slope masks. Trees continue to avoid rivers, lakes, and trails, with an additional shoreline buffer around the southern small lakes.

## User Request / 用户需求

**中文：** 用户认为当前树木密度不足，希望数量变成原来的三倍，并要求分布符合自然水流和山坡规律。

**English:** The user found the current forest too sparse, requested roughly three times as many trees, and asked that their distribution follow natural water-flow and hillside patterns.

## Scope / 范围

**中文：** 树木密度倍率、候选网格密度、最小树间距、南部小湖的树木岸线缓冲，以及对应自动化验证。草地密度、树木模型、渲染距离、水系形状和地形本身不在本次范围内。

**English:** Tree density scaling, candidate-grid density, minimum tree spacing, the tree shoreline buffer for southern small lakes, and corresponding automated verification. Grass density, tree models, render distance, water geometry, and terrain shapes are outside this change.

## Acceptance Criteria / 验收标准

**中文：**

- 三个海拔区间的目标树木密度均为原来的三倍。
- 固定合成地形上的实际生成数量为旧算法的 2.8–3.2 倍。
- 原有地表遮罩、坡度调制、生态聚类、河流/湖泊排除和山路排除继续生效。
- 南部小湖水面外保留 5 米树木缓冲带。
- `npm test` 与 `npm run build` 通过。

**English:**

- Target tree density is tripled in all three elevation bands.
- Realized placement count on fixed synthetic terrain is 2.8–3.2 times the legacy algorithm.
- Existing ground masks, slope modulation, ecological clustering, river/lake exclusion, and trail exclusion remain active.
- A five-meter tree buffer remains outside southern small-lake shorelines.
- `npm test` and `npm run build` pass.
