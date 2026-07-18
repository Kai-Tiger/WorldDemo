# Nine-Grid Reference Terrain / 九宫格参考地形

## Requirement / 需求

中文：将当前地图重构为以扩张前 2048 × 2048 米原始地形为中央格的 3 × 3 九宫格世界。其余八格使用用户提供的树状山脉高度图作为地形来源，并以缓坡处理中央接缝和世界外缘；移除当前新增的外围高山环与程序化阻挡地形。

English: Rebuild the world as a 3 × 3 grid centered on the original pre-expansion 2048 × 2048 meter terrain. Use the user-provided dendritic mountain heightmap as the terrain source for the other eight cells, blend the center seam and world perimeter with gentle slopes, and remove the currently added outer mountain ring and procedural barrier terrain.

## Summary / 概要

中文：每格保持 2048 × 2048 米，最终地图为 6144 × 6144 米。中央格完整保留原高度图、地标、水系和现有 X/Z 坐标；外围八格通过一张 1024 × 1024 的派生高度图 `nine-grid-height.png` 进行整图平面映射。派生图在中央孔洞与世界外缘各设置 640 米缓坡衰减带，将参考地形逐渐降至约 15 米；运行时再用 128 米宽的融合带连接中央原始地形。外围参考地形只读，中央地形继续支持现有无损编辑。

English: Each cell remains 2048 × 2048 meters, producing a 6144 × 6144 meter world. The center cell preserves the original heightmap, landmarks, waterways, and existing X/Z coordinates, while the eight surrounding cells use a 1024 × 1024 derived heightmap named `nine-grid-height.png` through one planar mapping across the full world. The derived map applies 640-meter gentle attenuation bands around the center opening and the outer world perimeter, reducing reference terrain toward approximately 15 meters; a 128-meter runtime blend then joins it to the original center terrain. Reference-derived outer terrain is read-only, while the center terrain retains its existing lossless editing workflow.

## User Request / 用户需求

中文：用户要求不再使用当前 4096 × 4096 地图上的新增外围高山地形，而是以扩张前的原地图为中心构建 3 × 3 大地图。外围八个格子都应明显采用新附件的高度图地貌，并允许修改高度图边缘，使各格接壤处和地图最外缘以自然缓坡过渡。

English: The user requested replacing the newly added outer mountain terrain in the current 4096 × 4096 world with a 3 × 3 large map centered on the original pre-expansion terrain. All eight surrounding cells must visibly use the newly attached heightmap relief, and the heightmap edges may be modified so cell joins and the world perimeter transition through natural gentle slopes.

参考源 / Reference source: the user attachment is a 1000 × 1000 grayscale image with SHA-256 `9c0e1cf16b3d9b66b9783682e0738459eba1e43b52d376c4e5ed9ff085066107`. The generated 1024 × 1024 runtime asset `public/assets/terrain/nine-grid-height.png` has SHA-256 `cb06df74256ef8aa6d7e3a148ef54ec8b96dd9be3d2401b422403eab3080acb6` at implementation time.

## Scope / 范围

中文：

- 将地图边长设为 6144 米，范围为 X/Z 各 ±3072 米；每个九宫格单元为 2048 米。
- 中央 2048 × 2048 米区域继续由原始高度图驱动，不缩放、不平移现有内容，也不改变既有坐标。
- 将参考图处理为 1024 × 1024 派生资产，并按整个 6144 × 6144 米世界进行一次平面映射；中央一格由原始地形覆盖，其余八格使用其对应的参考图区域，避免八份相同贴片重复或镜像拼接。
- 在派生高度图的中央孔洞边缘和世界最外缘使用 640 米宽的缓坡衰减，将高度平滑趋近约 15 米；在运行时使用 128 米宽的平滑融合带匹配中央原地形，避免高度断层。
- 删除现有 520–600 米外围山环、强制抬升带及相关程序化越界屏障，不保留规则围墙或环形平台。
- 沿用 256 米地形分块，扩展为 24 × 24、共 576 块；外围派生地形不可在地形编辑器中修改，中央原始高度图仍可编辑和保存。

English:

- Set the map side length to 6144 meters, spanning ±3072 meters on both X and Z; each grid cell is 2048 meters wide.
- Keep the central 2048 × 2048 meter region driven by the original heightmap without scaling, translating, or changing any existing coordinates.
- Process the reference into a 1024 × 1024 derived asset and map it once across the complete 6144 × 6144 meter world; override the center cell with the original terrain and use the corresponding reference-map region for each of the other eight cells, avoiding eight repeated or mirrored tiles.
- Apply 640-meter gentle attenuation bands at the derived map's center opening and outer world perimeter so heights approach approximately 15 meters smoothly; use a 128-meter runtime blend to match the original center terrain without height discontinuities.
- Remove the existing 520–600 meter outer mountain ring, forced uplift band, and related procedural traversal barrier; retain no regular wall or annular platform.
- Continue using 256-meter terrain chunks, expanded to 24 × 24 for 576 chunks; keep the derived outer terrain read-only in the terrain editor while preserving editing and saving for the original center heightmap.

## Acceptance Criteria / 验收标准

中文：

- 世界尺寸为 6144 × 6144 米，玩家边界为 ±3072 米，分块数量为 576，末分块键为 `23,23`。
- 中央原地图的高度、水系、地标和 X/Z 坐标与扩张前一致；中央区域仍可无损编辑和保存。
- 外围八格均从同一整图平面映射的对应区域采样，能够辨认参考图的树状支脉和深谷结构，且不会表现为八张完全相同或对称复制的贴片。
- 中央接缝在 128 米融合带内高度连续；中央孔洞与世界外缘的 640 米衰减带形成缓坡并平滑趋近约 15 米，不出现竖直断壁、锯齿环墙或平顶平台。
- 旧的 520–600 米外围高山环和程序化强制阻挡不再参与高度、法线或碰撞采样；外围参考地形仍具有正常可碰撞几何。
- 派生资产尺寸、来源哈希和生成结果哈希得到自动验证；相关单元测试、完整测试套件、低地检查和生产构建通过。

English:

- The world measures 6144 × 6144 meters, player bounds are ±3072 meters, the terrain contains 576 chunks, and the final chunk key is `23,23`.
- Heights, waterways, landmarks, and X/Z coordinates in the original center map remain consistent with the pre-expansion terrain, and the center remains losslessly editable and saveable.
- All eight outer cells sample their corresponding regions from one full-world planar mapping, visibly preserving the reference image's dendritic spurs and deep valleys without appearing as eight identical or symmetrically duplicated tiles.
- The center seam is height-continuous through the 128-meter blend band; the 640-meter attenuation bands around the center opening and outer perimeter form gentle slopes approaching approximately 15 meters without vertical cliffs, sawtooth ring walls, or flat-topped platforms.
- The former 520–600 meter outer mountain ring and procedural forced barrier no longer participate in height, normal, or collision sampling; the reference-derived outer terrain remains normally collidable.
- Automated checks validate the derived asset dimensions, source hash, and generated hash; targeted unit tests, the full test suite, the lowland check, and the production build pass.
