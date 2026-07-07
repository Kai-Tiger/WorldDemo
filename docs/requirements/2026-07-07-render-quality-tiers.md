# Requirement / 需求

Add render quality tiers to reduce frame cost while preserving a high-quality option.

新增渲染质量档位，在保留高画质选项的同时降低帧成本。

# Summary / 概要

The game now exposes Performance, Balanced, and Quality presets. The presets adjust render pixel ratio, post-processing passes, shadow-map size, and terrain chunk radius so low-end or heavy scenes can recover frame rate without permanently removing the high-quality pipeline.

游戏现在提供 Performance、Balanced 和 Quality 三个预设。预设会调整渲染像素比、后处理 pass、阴影贴图尺寸和地形分块半径，让低性能或高压力场景可以恢复帧率，同时不永久移除高画质管线。

# User Request / 用户需求

The user reported stable low frame rate even with grass and trees hidden, asked what was consuming resources, and chose to add quality tiers.

用户反馈即使隐藏草和树，帧率仍然稳定偏低，要求检查资源消耗来源，并选择新增质量档位。

# Scope / 范围

Update runtime render quality controls, post-processing preset wiring, terrain chunk radius configuration, shadow map sizing, and hidden-tree update skipping. Do not change water shapes, terrain shader appearance, player controls, camera behavior, vegetation density, model assets, or unrelated pending work.

更新运行时渲染质量控制、后处理预设接线、地形分块半径配置、阴影贴图尺寸，以及隐藏树木时跳过树木更新。不修改水体形状、地形 shader 外观、玩家控制、相机行为、植被密度、模型资源或无关待处理改动。

# Acceptance Criteria / 验收标准

- The HUD includes Performance, Balanced, and Quality render presets.
- Performance and Balanced presets reduce render pixel ratio and avoid the heaviest post-processing passes.
- Quality keeps the heavy high-quality post-processing path without the broken SMAA loader path.
- Terrain loading radius and shadow map size follow the selected preset.
- Hidden trees no longer continue tree-manager updates.
- The project build succeeds.

- HUD 包含 Performance、Balanced 和 Quality 渲染预设。
- Performance 和 Balanced 预设会降低渲染像素比，并避开最重的后处理 pass。
- Quality 保留高负载的高画质后处理路径，但避开有问题的 SMAA 加载路径。
- 地形加载半径和阴影贴图尺寸会跟随所选预设。
- 隐藏树木后不再继续执行树木管理器更新。
- 项目构建成功。
