# Requirement / 需求

## Summary / 概要

Create a 15-second Remotion video that presents the four-part scoring method used in the Cold Mountain model evaluation.

使用 Remotion 创建一段 15 秒视频，展示 Cold Mountain 模型评测采用的四项评分方法。

## User Request / 用户需求

Turn the scoring-method table into a video with the same sequential row-entry treatment as the model-ranking video.

将评分方法表格制作成视频，沿用模型排名视频的逐行流入效果。

## Scope / 范围

- Add a separate `ScoringMethod` composition to the existing Remotion project.
- Render at 1920 × 1080, 30 FPS, for 450 frames.
- Present the table header and four scoring dimensions: instruction adherence, code logic, visual effect, and performance frame rate.
- Animate each row and stagger the score, subdimensions, and scoring-principle text inside it.

- 在现有 Remotion 项目中新增独立的 `ScoringMethod` Composition。
- 以 1920 × 1080、30 FPS、450 帧渲染。
- 展示表头以及指令遵循度、代码逻辑、视觉效果、性能帧率四个评分维度。
- 每行依次进入，行内分值、二级维度和评分原则错峰进入。

## Acceptance Criteria / 验收标准

- The output MP4 is 1920 × 1080, 16:9, and exactly 15 seconds long.
- All four rows are readable without clipping or overlap.
- Row and cell animations are driven by Remotion frames, not CSS transitions.
- Text matches the scoring-method table in the evaluation report.
- The project passes lint/type-check and renders successfully.

- 输出 MP4 为 1920 × 1080、16:9，精确 15 秒。
- 四行内容均清晰可读，无裁切或重叠。
- 行与单元格动画由 Remotion 帧驱动，不使用 CSS transition。
- 文本与评测报告中的评分方法表一致。
- 项目通过 lint/类型检查并成功渲染。
