# Requirement / 需求

## Summary / 概要

**English:** Give the two northern lowland lakes visibly rugged, natural shorelines inspired by the supplied forest-lake reference.

**中文：** 参考用户提供的森林湖泊图片，为北部低地的两个湖泊制作明显崎岖、自然的岸线。

## User Request / 用户需求

**English:** Create two lakes with this kind of shape, with rugged edges.

**中文：** 做两个这种形状的湖泊，要求边缘崎岖。

## Scope / 范围

**English:** Update only `northwest-shallow-lake` and `northeast-shallow-lake`. Reuse the existing unified water material, river connections, terrain masks, and vegetation exclusions. Add a multi-scale deterministic shoreline profile, provide enough angular geometry segments to preserve its smaller bays and headlands, and rebake the tracked lowland heightmap to match the new shores.

**中文：** 仅修改 `northwest-shallow-lake` 与 `northeast-shallow-lake`。复用现有统一水材质、河流连接、地形遮罩和植被排除逻辑；新增确定性的多尺度岸线轮廓，增加足够的角向几何分段以保留小型港湾与岬角，并重新烘焙受版本控制的低地高度图以匹配新岸线。

## Acceptance Criteria / 验收标准

**English:**

- Exactly the two northern shallow lakes use the rugged shoreline profile.
- Each lake has at least 20 sampled radial direction changes around its shore.
- Lake meshes use 144 angular segments so the rugged outline is visible.
- River-to-lake boundaries remain continuous, visible water stays above terrain, focused shoreline tests pass, and the production build succeeds.

**中文：**

- 仅两个北部浅湖使用崎岖岸线轮廓。
- 每个湖泊沿岸采样至少出现 20 次径向转折。
- 湖面网格使用 144 个角向分段，确保崎岖轮廓可见。
- 河湖边界保持连续，可见水面不穿地，岸线相关定向测试通过且生产构建成功。
