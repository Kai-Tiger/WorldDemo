# Requirement / 需求

Add left-menu toggles to hide all grass and all trees so runtime rendering pressure can be reduced.

在左上角菜单增加开关，用于隐藏所有草和所有树，从而降低运行时渲染压力。

# Summary / 概要

The existing position HUD now includes Grass and Trees toggles. Grass can be hidden and its per-frame manager update skipped; trees and tree-related leaf decals can be hidden together.

现有坐标 HUD 增加了 Grass 和 Trees 开关。关闭草会隐藏草并跳过每帧草管理器更新；关闭树会同时隐藏树和树相关的落叶贴花。

# User Request / 用户需求

The user asked to add two toggle switches in the upper-left menu to remove all grass and all trees to reduce rendering pressure.

用户要求在页面左上角菜单里增加两个 toggle 开关，可以去掉所有草、所有树，以降低渲染压力。

# Scope / 范围

Update only the HUD controls, their styling, and the runtime visibility/update wiring for grass and trees. Do not change vegetation density, placement generation, terrain, water, post-processing, player controls, camera behavior, or asset files.

仅更新 HUD 控件、样式，以及草和树的运行时显示/更新绑定。不修改植被密度、放置生成、地形、水体、后处理、玩家控制、相机行为或资源文件。

# Acceptance Criteria / 验收标准

- The upper-left HUD includes checked Grass and Trees toggles by default.
- Turning Grass off hides grass and skips the grass manager update.
- Turning Grass back on restores grass rendering and updates.
- Turning Trees off hides tree instances and tree-related leaf decals.
- Turning Trees back on restores tree instances and leaf decals.
- The project build succeeds.

- 左上角 HUD 默认显示已开启的 Grass 和 Trees 开关。
- 关闭 Grass 会隐藏草并跳过草管理器更新。
- 重新开启 Grass 会恢复草渲染和更新。
- 关闭 Trees 会隐藏树实例和树相关落叶贴花。
- 重新开启 Trees 会恢复树实例和落叶贴花。
- 项目构建成功。
