# Requirement / 需求

## Summary / 概要

Make the ranking-video title reveal at a uniform character speed.

将排名视频标题的字符揭示动画调整为匀速。

## User Request / 用户需求

The final character of “六模型综合排名” visibly stalls before appearing. Remove that timing hitch.

“六模型综合排名”的最后一个字出现前有明显停顿，需要消除该卡顿。

## Scope / 范围

- Change only the title character-reveal timing.
- Keep row animations, scores, layout, and video duration unchanged.

- 仅修改标题的字符揭示时间曲线。
- 保持排名行动画、分数、排版和视频时长不变。

## Acceptance Criteria / 验收标准

- Every title character receives an equal share of the 28-frame reveal duration.
- The final character appears without an extra ease-out delay.
- The project passes lint/type-check and the 15-second ranking MP4 renders successfully.

- 标题每个字符占用相等的 28 帧揭示时长份额。
- 最后一个字符不再受到额外缓出延迟。
- 项目通过 lint/类型检查，并成功重新渲染 15 秒排名视频。
