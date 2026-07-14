# Requirement / 需求

> Superseded / 已废止
>
> English: This intermediate lake-overlap requirement is retained only as iteration history and is superseded by [2026-07-14-natural-terminal-lake-inlets.md](./2026-07-14-natural-terminal-lake-inlets.md). The accepted behavior reaches zero at the shoreline and allows no river influence inside the lake.
>
> 中文：此湖内重叠方案仅作为迭代记录保留，已由 [2026-07-14-natural-terminal-lake-inlets.md](./2026-07-14-natural-terminal-lake-inlets.md) 取代。最终验收行为是在湖岸归零，湖内不允许任何河流影响。

## Summary / 概要

- English: Blend the east lowland stream continuously into the terminal lake.
- 中文：让东侧低地河道与终点湖水连续衔接。

## User Request / 用户需求

- English: The river and lake appear visually disconnected at their meeting point.
- 中文：河水与湖水在交汇处看起来像断开了。

## Scope / 范围

- English: Move the terminal-lake inlet fade window farther inside the lake so the stream remains visible until the lake surface provides full coverage.
- 中文：将终点湖入口的河面淡出区移到湖内，使河面在湖面能够完整覆盖前保持可见。
- English: Add a focused regression test for the terminal-lake inlet transition.
- 中文：为终点湖入口过渡补充一个针对性的回归测试。

## Acceptance Criteria / 验收标准

- English: The stream remains fully visible at the shoreline and for two meters inside the lake.
- 中文：河面在湖岸线以及湖内两米范围保持完整可见。
- English: The stream fades smoothly inside the lake and is fully handed off to the lake surface eight meters from shore.
- 中文：河面在湖内平滑淡出，并在距岸八米处完全交由湖面覆盖。
- English: The focused transition test, the existing lowland water tests, and the production build pass.
- 中文：入口过渡测试、现有低地水体测试及生产构建均通过。
