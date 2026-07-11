# Requirement / 需求

**中文：** 实施确定性的世界坐标草群生成系统，在保持现有渲染预算和生态排除规则的同时恢复自然团块感。

**English:** Implement deterministic world-space grass communities that restore natural clumping while preserving the existing rendering budget and ecological exclusion rules.

## Summary / 概要

**中文：** 将全地图模型草从区块内均匀随机撒点迁移为世界坐标的多尺度草群分布，使草地呈现稳定的密集核心、破碎边缘和明确空地。

**English:** Replace uniform per-chunk random grass scattering with a multi-scale world-space community field that produces stable dense cores, broken edges, and readable open gaps.

## User Request / 用户需求

**中文：** 改善模型草过于随机、缺少自然团块感的分布，在不增加 draw call、纹理或实时材质成本的前提下，建立可跨区块稳定重建的草群。

**English:** Improve model grass that looks uniformly random and lacks natural clumps by creating communities that rebuild consistently across chunks without adding draw calls, textures, or real-time material cost.

## Scope / 范围

**中文：**

- 使用全局整数 cell 生成每平方米 2.5 个基础候选，区块采用半开范围分配实例。
- 使用约 14 米宏观尺度和 3.2 米微观尺度的两层旋转 value-noise。
- 空隙与核心的候选接受率分别为 0.08 和 0.96，大样本平均接受率保持在 55%–70%。
- 先进行群落接受判定，通过后才采样地形高度、法线和 ground mask。
- 群落 influence 同时控制边缘与核心的草丛尺寸。
- 同一群落的主变体、次变体和其他变化比例为 72% / 20% / 8%。
- 保留 4 米水域缓冲、`normalY >= 0.88`、`groundMask >= 0.35`、`lodRoll`、`transitionRoll` 和质量档嵌套关系。
- 不启用海拔渐隐，不修改草材质、LOD 距离或光照。

**English:**

- Generate 2.5 base candidates per square meter from global integer cells and assign instances to chunks with half-open bounds.
- Use two rotated value-noise scales at approximately 14 meters for macro communities and 3.2 meters for internal breakup.
- Use gap/core candidate acceptance of 0.08/0.96 and retain 55%–70% average acceptance over a large sample.
- Reject candidates by community before sampling terrain height, normal, and ground mask.
- Use community influence to size grass at edges and cores.
- Distribute primary, secondary, and other variants within one community at 72% / 20% / 8%.
- Preserve the 4 meter water buffer, `normalY >= 0.88`, `groundMask >= 0.35`, `lodRoll`, `transitionRoll`, and nested quality subsets.
- Do not enable altitude fading or modify grass materials, LOD distances, or lighting.

## Acceptance Criteria / 验收标准

**中文：**

- 同一世界坐标和 cell seed 永远返回相同的群落影响、接受结果和变体。
- 相邻区块连接后与同范围单一区块的实例集合一致，边界无重复、遗漏或密度台阶。
- 候选密度为 2.5/㎡，大样本实际接受率为 55%–70%，空隙与核心接受率覆盖 0.08–0.96。
- 被群落拒绝的候选不调用地形 surface sampling。
- 同群落变体统计接近 72% / 20% / 8%，核心平均草丛大于边缘。
- 区块重载后位置、矩阵、变体、`lodRoll` 和 `transitionRoll` 保持一致。
- 针对性测试、完整测试和项目构建通过。

**English:**

- The same world coordinate and cell seed always returns identical community influence, acceptance, and variant.
- Joining adjacent chunks produces the same instance set as one chunk covering the combined bounds, without duplicates, omissions, or density steps.
- Candidate density is 2.5/m², large-sample actual acceptance is 55%–70%, and gap/core acceptance spans 0.08–0.96.
- Candidates rejected by the community never invoke terrain surface sampling.
- Per-community variants remain close to 72% / 20% / 8%, and core grass is larger than edge grass.
- Reloading a chunk preserves positions, matrices, variants, `lodRoll`, and `transitionRoll`.
- Targeted tests, the full test suite, and the project build pass.
