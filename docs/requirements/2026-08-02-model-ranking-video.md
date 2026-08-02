# Requirement / 需求

## Summary / 概要

Create a 15-second 16:9 Remotion video that presents the total ranking of the six evaluated Cold Mountain model implementations.

使用 Remotion 创建一段 15 秒、16:9 横屏视频，展示 Cold Mountain 六个模型实现的总排名。

## User Request / 用户需求

The video must show all six ranked models. Rows should enter sequentially, and the text inside every row must also animate into view.

视频必须展示六个模型的完整排名；各行需要依次进入，每一行内部的文字也需要带有进入动画。

## Scope / 范围

- Use the latest scores from `model-evaluation-2026-08-02/data/results.json`.
- Render at 1920 × 1080, 30 FPS, for exactly 450 frames.
- Animate the title, each ranking row, model names, four category scores, total scores, and footer note.
- Keep `main` as an unscored visual benchmark note only.

- 使用 `model-evaluation-2026-08-02/data/results.json` 中的最新分数。
- 以 1920 × 1080、30 FPS、共 450 帧渲染。
- 为标题、每个排名行、模型名称、四项分数、总分和页脚说明制作动画。
- `main` 仅作为不计分的视觉标杆说明。

## Acceptance Criteria / 验收标准

- The output MP4 is 1920 × 1080, 16:9, and 15 seconds long.
- Six rows appear in rank order with no clipping or overlap.
- Each row and its textual content have independent frame-driven entrance animations.
- Displayed values match the latest machine-readable evaluation data.
- The composition passes lint/type-check and renders successfully.

- 输出 MP4 为 1920 × 1080、16:9、时长 15 秒。
- 六行按排名顺序出现，无裁切或重叠。
- 每行及其文字内容均具有独立、由帧驱动的进入动画。
- 画面分数与最新机器可读评测数据一致。
- 项目通过 lint/类型检查并成功完成渲染。
