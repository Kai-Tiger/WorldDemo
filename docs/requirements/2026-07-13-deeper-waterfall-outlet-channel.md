# Requirement / 需求

- English: Deepen the river channel immediately downstream of the waterfall and make its banks steeper.
- 中文：加深瀑布出口下游的河槽，并让两侧河岸坡度更陡。

## Summary / 概要

- English: Increase the upper main-river depth near the waterfall, narrow its bank profile, and rebake the terrain heightmap.
- 中文：提高主河上游瀑布出口附近的河槽深度，收窄岸坡剖面，并重新烘焙地形高度图。

## User Request / 用户需求

- English: The river just after the waterfall looks very shallow; dig it deeper and steepen the banks.
- 中文：用户认为瀑布刚出来的河道非常浅，希望挖深并加陡河岸。

## Scope / 范围

- English: Change only the `hero-main-upper` depth and bank-width profiles, the deterministic baked heightmap, and directly affected regression expectations. Preserve the water surface level, river width, waterfall, and downstream reaches.
- 中文：仅修改 `hero-main-upper` 的深度与岸坡宽度参数、确定性烘焙高度图及直接受影响的回归预期；保持水面高度、河宽、瀑布本体和下游河段不变。

## Acceptance Criteria / 验收标准

- English: Water depth 24 meters downstream is at least 1.35 meters; the representative upper-bank run is at most 4.5 meters with a slope of at least 0.32; water clearance, rock placement, deterministic baking, tests, and build remain valid.
- 中文：瀑布下游 24 米处水深至少 1.35 米；代表性上游岸坡水平宽度不超过 4.5 米且坡度至少为 0.32；水面净空、岩石摆放、确定性烘焙、测试与构建均保持有效。
