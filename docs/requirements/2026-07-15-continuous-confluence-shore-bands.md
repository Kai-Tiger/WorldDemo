# Continuous Confluence Shore Bands / 连续的汇流岸带

## Requirement / 需求

中文：修复英雄河道 Y 形汇流处湿岸和砂砾带被河床材质笔直截断的问题，并消除分支切换产生的河床纹理直线。

English: Fix the straight truncation of wet and gravel shore bands by the riverbed material at hero-river Y confluences, and remove riverbed texture lines caused by branch switching.

## Summary / 概要

中文：从汇流区统一的 Y 形水面边界距离生成河床、湿岸和砂砾三层遮罩，并在分支坐标竞争区域将河段纹理平滑交叉淡化为连续的世界空间河床纹理。

English: Derive bed, wet-bank, and gravel-bank masks from one shared Y-shaped water-boundary distance field and smoothly cross-fade branch-local texture into continuous world-space riverbed texture where branch coordinates compete.

## User Request / 用户需求

中文：用户指出汇流岸边出现明显断带，并要求修复。

English: The user identified a visible broken band along a confluence shore and requested a fix.

## Scope / 范围

中文：调整英雄河道两个 Y 形汇流点的材质遮罩与河床局部坐标融合；不改变水面拓扑、河道路径、地形高度、水位、植被排除或非汇流河段的岸带规则。

English: Adjust material masks and local riverbed-coordinate blending at the two hero-river Y confluences. Do not change water topology, river paths, terrain height, water levels, vegetation exclusions, or shore-band rules away from confluences.

## Acceptance Criteria / 验收标准

中文：两个汇流点的河床边界外始终存在连续湿岸或砂砾带；河床内部相邻 0.5 米采样的可见河段纹理纵向跳变小于 2 米、横向跳变小于 1 米，坐标竞争区由连续世界空间纹理覆盖；相关河流测试、完整测试、生产构建和浏览器实景检查通过。

English: A continuous wet or gravel bank remains immediately outside the bed boundary at both confluences; adjacent 0.5-meter samples inside the bed keep visible branch-texture longitudinal jumps below 2 meters and lateral jumps below 1 meter while coordinate competition is covered by continuous world-space texture; and relevant river tests, the full test suite, production build, and browser visual checks pass.
