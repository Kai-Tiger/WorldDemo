# Requirement / 需求

## Summary / 概要

Make the model-name typewriter animation advance at a uniform speed.

将模型名称的打字进入动画调整为匀速。

## User Request / 用户需求

The last character of each model name visibly stalls before appearing. Remove that timing hitch.

每行模型名进入时，最后一个字符会出现明显停顿；需要消除该卡顿。

## Scope / 范围

- Change only the character-reveal timing for model names.
- Keep the row entrance, score animation, layout, duration, and ranking data unchanged.

- 仅修改模型名称的字符揭示时间曲线。
- 保持整行进入、分数动画、排版、时长和排名数据不变。

## Acceptance Criteria / 验收标准

- Every model-name character receives an equal share of the reveal duration.
- The final character appears without an extra ease-out delay.
- The project passes lint/type-check and the 15-second MP4 renders successfully.

- 模型名称的每个字符占用相等的揭示时长。
- 最后一个字符不再受到额外缓出延迟。
- 项目通过 lint/类型检查，并成功重新渲染 15 秒 MP4。
