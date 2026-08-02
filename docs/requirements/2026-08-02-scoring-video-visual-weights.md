# Requirement / 需求

## Summary / 概要

Update the visual-effect subdimension wording in the scoring-method video.

更新评分方法视频中的视觉效果二级维度文案。

## User Request / 用户需求

Change materials/lighting to 4 points and stability to 2.5 points.

将材质/光照调整为 4 分，将稳定性调整为 2.5 分。

## Scope / 范围

- Modify only the visual-effect row in the `ScoringMethod` Remotion composition.
- Keep terrain, water, vegetation, composition, other scoring rows, layout, animation, and duration unchanged.

- 仅修改 Remotion `ScoringMethod` Composition 的视觉效果行。
- 保持地形、水系、植被、构图、其他评分行、排版、动画和时长不变。

## Acceptance Criteria / 验收标准

- The visual row displays `材质/光照 4` and `稳定性 2.5`.
- The visual subdimensions still total 25 points.
- The project passes lint/type-check and the 15-second MP4 renders successfully.

- 视觉效果行显示 `材质/光照 4` 和 `稳定性 2.5`。
- 视觉效果二级维度合计仍为 25 分。
- 项目通过 lint/类型检查，并成功重新渲染 15 秒 MP4。
