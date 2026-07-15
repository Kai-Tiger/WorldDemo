# Requirement / 需求

## Summary / 概要

Fit the expanded watershed's river surfaces to the loaded terrain before generating terrain chunks, then carve the riverbeds from that same fitted profile.

在生成地形分块前，将扩展水系的河面纵剖面拟合到已加载地表，并使用同一纵剖面开挖河床。

## User Request / 用户需求

The newly created rivers must not pass through the sky. They must run in channels carved into the terrain surface.

新建河道不能从空中穿过，必须在地表开挖河道并沿河床流动。

## Scope / 范围

- Fit compiled expanded-river samples below the uncarved terrain surface.
- Preserve shared endpoint continuity while lowering source, lake, or confluence levels only when terrain clearance requires it.
- Apply the fitted profile before the first terrain chunk is built.
- Keep the existing eight basin networks, sixteen lakes, and forty-eight reaches unchanged.

- 将扩展河流的编译采样点拟合到未开挖地表以下。
- 保持共享端点连续；仅在地形净空需要时下调源头、湖泊或汇流节点水位。
- 在首个地形分块生成前应用拟合结果。
- 保持现有八个流域、十六个湖泊和四十八条河段的拓扑不变。

## Acceptance Criteria / 验收标准

- Interior river samples do not rise above the sampled uncarved terrain and remain non-rising downstream.
- Terrain carving places the riverbed below the fitted water surface at the channel centerline.
- Water geometry and terrain carving read the same compiled river profile.
- Existing watershed topology and lake connections continue to pass automated tests.

- 河段内部采样点不高于对应的未开挖地表，且水位沿下游方向不升高。
- 河道中心线处的地形开挖结果低于拟合后的河面。
- 水面几何与地形开挖读取同一套编译河流纵剖面。
- 现有水系拓扑与湖泊连接继续通过自动化测试。
