# Requirement / 需求

Reduce grass placement density by about 20%.

将草地生成密度降低约 20%。

# Summary / 概要

Grass LOD densities are reduced from `[20, 5, 1.25]` to `[16, 4, 1]`, keeping the same LOD distance thresholds and placement rules.

草地 LOD 密度从 `[20, 5, 1.25]` 降为 `[16, 4, 1]`，同时保持现有 LOD 距离阈值和放置规则不变。

# User Request / 用户需求

The user said the current grass density is a little too high and asked to reduce it by about 20%.

用户反馈当前草的密度有点大，并要求降低约 20%。

# Scope / 范围

English: Update only the grass LOD density values. Do not change grass sway, LOD distances, placement masks, patch clustering, models, textures, terrain, water, trees, lighting, or unrelated pending work.

中文：仅更新草地 LOD 密度数值。不修改草地摆动、LOD 距离、放置遮罩、斑块聚类、模型、贴图、地形、水体、树木、光照或无关待提交改动。

# Acceptance Criteria / 验收标准

- Near grass density is reduced from 20 to 16 clumps per square meter.
- Mid grass density is reduced from 5 to 4 clumps per square meter.
- Far grass density is reduced from 1.25 to 1 clump per square meter.
- Existing grass LOD distances and placement behavior remain unchanged.
- Build verification passes.

- 近处草密度从每平方米 20 丛降至 16 丛。
- 中距离草密度从每平方米 5 丛降至 4 丛。
- 远处草密度从每平方米 1.25 丛降至 1 丛。
- 现有草地 LOD 距离和放置行为保持不变。
- 构建验证通过。
