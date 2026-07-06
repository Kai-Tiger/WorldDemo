# Requirement / 需求

English: Sync the terrain editor brush cursor's initial size with the Radius slider value.

中文：让地形编辑器笔刷光标的初始大小与 Radius 滑条数值保持同步。

# Summary / 概要

English: Initialize the brush cursor scale from the current radius state when the terrain editor is created, so the first visible circle matches the slider instead of starting at the mesh's default scale and jumping after the first slider change.

中文：在创建地形编辑器时用当前半径状态初始化笔刷光标缩放，让首次显示的圆圈就匹配滑条，而不是先使用网格默认缩放并在第一次滑条变化后跳变。

# User Request / 用户需求

English: The user reported that clicking Raise or Lower shows a circle, but after reducing the Radius slider the circle becomes larger; the initial circle size should correspond to the slider value.

中文：用户反馈点击 Raise 或 Lower 后会出现圆圈，但把 Radius 滑条调小后圆圈反而变大；初始圆圈大小应与滑条数值对应。

# Scope / 范围

English: Update only the terrain editor brush cursor initialization. Do not change radius range, default radius, brush cursor geometry, radius-to-world-scale mapping, painting behavior, save flow, terrain assets, water, vegetation, player behavior, or unrelated pending work.

中文：只更新地形编辑器笔刷光标初始化。不修改半径范围、默认半径、笔刷光标几何体、半径到世界缩放映射、绘制行为、保存流程、地形资产、水体、植被、玩家行为或无关未提交改动。

# Acceptance Criteria / 验收标准

English:
- The initial brush cursor scale is set from the current radius state.
- The default radius remains `5`.
- The radius slider remains `0.5` to `10` with `0.1` step precision.
- Moving the Radius slider smaller makes the brush cursor smaller.
- The production build completes successfully.

中文：
- 笔刷光标初始缩放由当前半径状态设置。
- 默认半径保持 `5`。
- 半径滑条保持 `0.5` 到 `10`，步进精度为 `0.1`。
- 将 Radius 滑条调小会让笔刷光标变小。
- 生产构建成功完成。
