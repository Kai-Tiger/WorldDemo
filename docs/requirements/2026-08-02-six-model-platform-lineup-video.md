# Six-Model Platform Lineup Video / 六模型运行平台出场视频

## Requirement / 需求

Create a 25-second, 16:9 Remotion video that introduces six model configurations and visibly associates each name with the platform used to run it.

使用 Remotion 制作一个 25 秒、16:9 的横版视频，依次介绍六个模型配置，并在每个模型名称后清晰展示其运行平台。

## Summary / 概要

The video uses a short opening, six animated model entrances, and a final platform summary. Five entries use the Codex logo; GLM 5.2 uses the OpenCode logo.

视频包含简短开场、六个模型逐一出场动画和运行平台总览。五个条目使用 Codex logo，GLM 5.2 使用 OpenCode logo。

## User Request / 用户需求

- Present DeepSeek V4 Flash official, GPT 5.6 Sol xhigh, GPT 5.6 Luna max, GPT 5.6 Luna medium, GPT 5.5 xhigh, and GLM 5.2.
- Show the platform logo after each model name.
- Run GLM 5.2 in OpenCode and all other models in Codex.
- Deliver a 25-second horizontal 16:9 Remotion video.

- 展示 DeepSeek V4 Flash 正式版、GPT 5.6 Sol xhigh、GPT 5.6 Luna max、GPT 5.6 Luna medium、GPT 5.5 xhigh 和 GLM 5.2。
- 每个模型名称后显示对应平台 logo。
- GLM 5.2 对应 OpenCode，其他模型对应 Codex。
- 交付 25 秒、横版 16:9 的 Remotion 视频。

## Scope / 范围

- Add an isolated Remotion entry point for the model-lineup video.
- Use deterministic frame-based animation without CSS transitions or CSS animations.
- Use official local Codex artwork and the official OpenCode desktop icon.
- Keep the composition silent; no ranking, scores, or results are introduced.

- 新增独立的模型出场 Remotion 入口。
- 使用基于帧的确定性动画，不使用 CSS transition 或 CSS animation。
- 使用本机官方 Codex 图标和 OpenCode 官方桌面图标。
- 成片保持静音，不加入排名、分数或评测结果。

## Acceptance Criteria / 验收标准

- The composition is exactly 750 frames at 30 fps, 1920×1080, for a 25-second 16:9 result.
- All six names receive a distinct entrance animation.
- Every model name is immediately followed by the correct Codex or OpenCode logo.
- The final overview shows five Codex models and one OpenCode model.
- The isolated entry passes lint/TypeScript compilation and renders representative stills plus the final MP4 without errors.

- 合成参数为 30 fps、750 帧、1920×1080，得到精确 25 秒的 16:9 成片。
- 六个模型名称均有独立出场动画。
- 每个模型名称后紧跟正确的 Codex 或 OpenCode logo。
- 最终总览清楚呈现五个 Codex 模型和一个 OpenCode 模型。
- 独立入口通过 lint/TypeScript 编译，并能无错误渲染代表性静帧及最终 MP4。
