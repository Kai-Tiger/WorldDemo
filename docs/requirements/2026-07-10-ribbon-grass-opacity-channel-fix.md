# Ribbon Grass Opacity Channel Fix / Ribbon Grass 透明通道修复

## Requirement / 需求

Restore visible Ribbon Grass by sampling the asset's opacity mask from its red channel while preserving alpha-cutout blade silhouettes.

通过读取资产透明贴图的红色通道恢复 Ribbon Grass 显示，同时保留 alpha 裁切形成的草叶轮廓。

## Summary / 概要

The Ribbon Grass opacity texture stores coverage in the red channel, while Three.js samples the green channel for `alphaMap` by default. Override only the grass alpha-map shader chunk to sample red and keep the existing `alphaTest` threshold.

Ribbon Grass 的 opacity 贴图将遮罩数据存储在红色通道，而 Three.js 默认从 `alphaMap` 的绿色通道采样。仅覆盖草材质的透明贴图 shader 片段，使其读取红色通道，并保留现有 `alphaTest` 阈值。

## User Request / 用户需求

The user reported that no grass is visible in the project and requested the diagnosed opacity-channel issue be fixed.

用户反馈项目中的草完全不显示，并要求修复已经定位的透明贴图通道问题。

## Scope / 范围

Update the shared Ribbon Grass material shader so near, mid, and far 3D LOD materials sample the opacity texture's red channel. Do not change grass placement, density, scale, LOD distances, water exclusions, color grading, terrain, or texture assets.

更新 Ribbon Grass 共用材质 shader，使近、中、远三档 3D LOD 材质均从 opacity 贴图红色通道采样。不修改草的分布、密度、缩放、LOD 距离、水体排除、颜色分级、地形或贴图资产。

## Acceptance Criteria / 验收标准

- `npm run build` passes.
- Ribbon Grass is visible wherever existing placement rules allow it.
- Grass blades use the red-channel opacity mask and do not show black rectangular card backgrounds.
- The existing `alphaTest = 0.12`, 3D LOD behavior, placement rules, and performance settings remain unchanged.
- No unrelated dirty or untracked files are staged or committed.

- `npm run build` 通过。
- 在现有放置规则允许的区域内，Ribbon Grass 能正常显示。
- 草叶使用红色通道透明遮罩，且不出现黑色矩形面片背景。
- 保持现有 `alphaTest = 0.12`、3D LOD、放置规则和性能设置不变。
- 不暂存或提交无关的 dirty 或未跟踪文件。
