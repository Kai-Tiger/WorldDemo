# Requirement / 需求

English: Lower the terrain editor brush radius minimum to `0.5m` so fine terrain edits are possible.

中文：将地形编辑器笔刷半径最小值降低到 `0.5m`，以支持更精细的地形编辑。

# Summary / 概要

English: Update only the terrain editor radius slider limits so the existing brush can select sub-meter radii while preserving its default radius, maximum radius, strength behavior, terrain editing algorithm, and save flow.

中文：只更新地形编辑器半径滑条限制，让现有笔刷可以选择亚米级半径，同时保持默认半径、最大半径、强度行为、地形编辑算法和保存流程不变。

# User Request / 用户需求

English: The user said the current terrain edit granularity is too coarse and requested lowering the minimum radius to `0.5m`.

中文：用户反馈当前地形编辑粒度太粗，并要求将最小半径降低到 `0.5m`。

# Scope / 范围

English: Update only the radius input minimum and step precision for the in-scene terrain editor. Do not change the default brush radius, heightmap resolution, brush falloff, save endpoint, terrain asset files, water, vegetation, player behavior, or unrelated pending work.

中文：只更新场景内地形编辑器半径输入的最小值和步进精度。不修改默认笔刷半径、高度图分辨率、笔刷衰减、保存接口、地形资产文件、水体、植被、玩家行为或无关未提交改动。

# Acceptance Criteria / 验收标准

English:
- The terrain editor radius slider minimum is `0.5`.
- The radius slider step supports selecting `0.5m` precisely.
- The existing default radius remains unchanged.
- The production build completes successfully.

中文：
- 地形编辑器半径滑条最小值为 `0.5`。
- 半径滑条步进支持精确选择 `0.5m`。
- 现有默认半径保持不变。
- 生产构建成功完成。
