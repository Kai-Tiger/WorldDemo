# Requirement / 需求

English: Cap the terrain editor brush radius so the maximum slider value creates a `10m` radius circle.

中文：限制地形编辑器笔刷半径，使半径滑条最大值对应 `10m` 半径圆圈。

# Summary / 概要

English: Reduce the terrain editor radius slider maximum from `80m` to `10m` and lower the default radius to `5m`, while preserving the existing `0.5m` minimum, `0.1m` step precision, direct world-meter cursor scaling, painting behavior, and save flow.

中文：将地形编辑器半径滑条最大值从 `80m` 降低到 `10m`，并将默认半径降低到 `5m`，同时保留现有 `0.5m` 最小值、`0.1m` 步进精度、直接按世界米数缩放的笔刷光标、绘制行为和保存流程。

# User Request / 用户需求

English: The user reported that the brush circle is already very large when the radius slider is near the small end, and requested that the maximum slider value produce a `10m` radius circle.

中文：用户反馈半径滑条很小时圆圈已经非常大，并要求滑条最大值时圆圈半径为 `10m`。

# Scope / 范围

English: Update only the terrain editor radius input maximum and default radius. Do not change the brush cursor geometry, radius-to-world-scale mapping, brush strength, terrain editing algorithm, save endpoint, heightmap assets, water, vegetation, player behavior, or unrelated pending work.

中文：只更新地形编辑器半径输入最大值和默认半径。不修改笔刷光标几何体、半径到世界缩放的映射、笔刷强度、地形编辑算法、保存接口、高度图资产、水体、植被、玩家行为或无关未提交改动。

# Acceptance Criteria / 验收标准

English:
- The radius slider minimum remains `0.5`.
- The radius slider maximum is `10`.
- The radius slider step remains `0.1`.
- The default radius is `5` and is within the slider range.
- The brush cursor still scales directly from the selected radius.
- The production build completes successfully.

中文：
- 半径滑条最小值保持 `0.5`。
- 半径滑条最大值为 `10`。
- 半径滑条步进保持 `0.1`。
- 默认半径为 `5`，且位于滑条范围内。
- 笔刷光标仍然直接按所选半径缩放。
- 生产构建成功完成。
