# Requirement / 需求

- English: Replace the visibly straight water edge at river confluences with a natural curved bank transition.
- 中文：将河道汇流处明显的直线水岸改为自然的曲线过渡。

## Summary / 概要

- English: Confluence patch boundary samples curve inward toward the junction instead of remaining collinear.
- 中文：汇流补片的边界采样向汇流中心平滑内收，不再保持共线。

## User Request / 用户需求

- English: The river shown in the supplied screenshot has an unnatural straight line and should look natural.
- 中文：用户指出截图中的河道存在不自然的直线，希望调整得更自然。

## Scope / 范围

- English: Change only confluence bank-join geometry and its targeted regression test; preserve river paths, materials, flow attributes, and terrain.
- 中文：仅修改汇流处水岸连接几何及其定向回归测试；保持河流路径、材质、流动属性和地形不变。

## Acceptance Criteria / 验收标准

- English: Confluence bank joins are measurably non-collinear, water patches remain continuous and non-overlapping, all triangles face upward, and the mesh stays within budget.
- 中文：汇流水岸连接应可测地偏离直线，水面补片保持连续且不重叠，所有三角形朝上，并维持网格预算。
