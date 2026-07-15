# Full-World Terrain and Trees / 全图地形与树木

## Requirement / 需求

中文：让整张 6144 × 6144 米地图的地形和树木都能进入远景画面。近处保持现有质量，远处允许降低几何与树木表现成本，但必须能辨认出地形轮廓和森林覆盖。

English: Keep terrain and trees across the complete 6144 × 6144 meter map visible in long-distance views. Preserve existing near quality while allowing cheaper distant geometry and tree rendering, provided the terrain silhouette and forest coverage remain recognizable.

## Summary / 概要

中文：相机远裁面扩展到 9216 米，覆盖地图最大对角距离；地形增加 32 × 32 远景 LOD，高质量 LOD 中心随玩家跨区块移动；全图树木使用一个约一万级实例的程序化轮廓批次补足远景，进入近景范围后与现有高模树渐变交接。

English: Extend the camera far plane to 9216 meters, covering the maximum map diagonal; add a 32 × 32 distant terrain LOD whose high-detail focus follows the player across chunks; and fill the complete map with one roughly ten-thousand-instance procedural tree-silhouette batch that cross-fades into the existing detailed trees at close range.

## User Request / 用户需求

中文：用户希望所有树木和地形能够全图显示，远处可以降低质量，但仍需看得出来。

English: The user requested that all terrain and trees remain visible across the whole map, with lower quality permitted in the distance as long as they remain discernible.

## Scope / 范围

中文：扩大主相机观察距离；为三个质量档增加 32 段远景地形层级；让地形 LOD 焦点跟随玩家但继续保留全部 576 个区块；新增确定性、低密度、无阴影的远景树轮廓场，沿用现有地形坡度、河湖、山径和植被排除规则；近景树模型、密度和阴影保持不变。不采用工作区中未完成的树木图集实现。

English: Increase the main camera view distance; add a 32-segment distant terrain level to all three quality presets; move terrain LOD focus with the player while retaining all 576 chunks; add a deterministic, low-density, shadow-free distant tree silhouette field that honors existing terrain slope, river, lake, trail, and vegetation exclusion rules; and leave near tree models, density, and shadows unchanged. The unfinished tree-atlas implementation already present in the workspace is not used.

## Acceptance Criteria / 验收标准

中文：9216 米观察距离大于地图对角线；576 个地形区块始终存在，最远普通区块使用 32 × 32 网格，玩家所在区块维持 256 × 256；远景树为单批次、8,000–20,000 个实例、每实例两个三角形且不投射阴影；远景树在近景树距离附近抖动渐变并在地图边缘前保持可见；河湖与山径排除继续生效；相关测试、生产构建和浏览器实景检查通过。

English: The 9216-meter view distance exceeds the map diagonal; all 576 terrain chunks remain present, ordinary far chunks use a 32 × 32 grid, and the player chunk remains 256 × 256; distant trees use one batch with 8,000–20,000 instances, two triangles per instance, and no shadows; distant trees dither-cross-fade around the detailed-tree distance and remain visible to the map edge; river, lake, and trail exclusions remain active; and relevant tests, production build, and browser visual checks pass.
