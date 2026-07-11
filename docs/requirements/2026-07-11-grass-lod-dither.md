# Requirement / 需求

Replace abrupt distance-ring grass LOD switches with stable spatial dithering while keeping one rendered geometry per instance and preserving the existing quality-density subsets.

将草地按距离整圈硬切的 LOD 切换改为稳定的空间抖动过渡，同时保持每个实例只渲染一份几何，并保留现有质量档密度子集。

## Summary / 概要

**中文：** 使用每株草稳定的空间抖动值，将草地的整圈硬 LOD 切换改为分布在指定距离带内的渐进切换。

**English:** Replace ring-shaped hard grass LOD switches with gradual, spatially distributed transitions driven by one stable dither value per grass instance.

## User Request / 用户需求

**中文：** 为 LOD1 到 LOD2 等草地边界增加 5–10 米的稳定抖动过渡，避免镜头移动时出现成片跳变，并使最远 LOD 平滑退出可见范围。

**English:** Add stable 5–10 meter dither bands at grass LOD boundaries to avoid large-area popping during camera movement and progressively remove the farthest LOD at the visibility limit.

## Scope / 范围

**中文：**

- Performance、Balanced 和 Quality 的过渡宽度分别为 6、8 和 10 米。
- 每株草新增与 `lodRoll` 独立的确定性 `transitionRoll`。
- 过渡带从距离阈值前开始，并在阈值处完成，不改变最远可见距离。
- 一株草在每次 LOD 重建中只进入一个 LOD bucket，不双重渲染。
- 第三个距离带将 LOD2 抖动渐隐到不可见。
- 保留现有 `lodRoll` 质量档数量子集、原子提交、buffer 复用和 5 米重建阈值。
- 不修改草地分布、材质、模型或光照。

**English:**

- Use 6, 8, and 10 meter transition widths for Performance, Balanced, and Quality.
- Add a deterministic `transitionRoll` per instance, independent of `lodRoll`.
- Start each transition before its distance threshold and complete it at the threshold, preserving the maximum view distance.
- Assign each grass instance to exactly one LOD bucket per rebuild, without double rendering.
- Use the third transition band to dither LOD2 to invisible.
- Preserve existing `lodRoll` quality subsets, atomic commits, buffer reuse, and the 5 meter rebuild threshold.
- Do not modify grass distribution, materials, models, or lighting.

## Acceptance Criteria / 验收标准

**中文：**

- 过渡带外的 LOD 选择与原距离规则一致。
- 过渡带内相邻 LOD 同时具有空间分布的实例，但单个实例不会重复。
- 最远过渡带内的 LOD2 实例逐步减少，超过最远阈值后为零。
- `transitionRoll` 在区块重建和重载后保持稳定，且不影响 `lodRoll` 的质量档嵌套关系。
- 现有原子 LOD 作业、持久 InstancedMesh 和 DynamicDrawUsage buffer 测试继续通过。
- 针对性测试和项目构建通过。

**English:**

- LOD selection outside transition bands matches the original distance rules.
- Adjacent LODs both receive spatially distributed instances inside a transition band, while no individual instance is duplicated.
- LOD2 instance count progressively decreases in the final band and reaches zero beyond the far threshold.
- `transitionRoll` remains stable across chunk rebuilds and reloads without changing `lodRoll` quality nesting.
- Existing atomic LOD job, persistent InstancedMesh, and DynamicDrawUsage buffer tests continue to pass.
- Targeted tests and the project build pass.
