# Single-Page Model Lineup Video / 单页六模型依次入场视频

## Requirement / 需求

Revise the six-model Remotion video so all model entries appear sequentially on one persistent two-column page.

修改六模型 Remotion 视频，使所有模型在同一个持续显示的双栏页面中依次入场。

## Summary / 概要

The Codex and OpenCode columns remain visible for the full 25-second composition. Five Codex rows and one OpenCode row enter one after another without switching to full-screen model scenes.

Codex 与 OpenCode 双栏在 25 秒合成中持续可见。五条 Codex 模型和一条 OpenCode 模型依次进入，不再切换到单模型全屏页面。

## User Request / 用户需求

- Follow the supplied two-column platform layout.
- Keep all six models on one page and animate them into the page sequentially.
- Remove the large title at the top.
- Increase the model-name font by two size steps.
- Increase left and right padding by 50 pixels.

- 参考用户提供的双栏平台布局。
- 六个模型保持在同一个页面并依次入场。
- 移除顶部大标题。
- 模型名字体放大两个字号档位。
- 左右 padding 各增加 50 像素。

## Scope / 范围

- Replace the opening, full-screen model scenes, and closing summary with one persistent layout.
- Animate cards, names, accent dots, and platform logos from Remotion frame values only.
- Change horizontal page padding from 122 pixels to 172 pixels.
- Change model-name text from 24 pixels to 28 pixels.
- Preserve 1920×1080, 30 fps, 750 frames, and silent delivery.

- 将开场、单模型全屏场景和结尾总览替换为一个持续显示的页面。
- 卡片、名称、强调点和平台 logo 仅通过 Remotion 帧值驱动动画。
- 页面水平 padding 从 122 像素改为 172 像素。
- 模型名字体从 24 像素改为 28 像素。
- 保持 1920×1080、30 fps、750 帧和静音交付。

## Acceptance Criteria / 验收标准

- No large top title is visible at any time.
- Codex and OpenCode columns stay on the same page throughout the model entrances.
- The six rows enter in the requested order and remain visible after entering.
- Each row ends with the correct platform logo.
- The composition renders as an exact 25-second 16:9 MP4 and passes representative-frame visual checks.

- 任意时间均不显示顶部大标题。
- 模型入场期间 Codex 与 OpenCode 双栏始终保持在同一页面。
- 六行按指定顺序进入，并在进入后持续可见。
- 每行末尾显示正确的平台 logo。
- 合成渲染为精确 25 秒的 16:9 MP4，并通过代表性关键帧视觉检查。
