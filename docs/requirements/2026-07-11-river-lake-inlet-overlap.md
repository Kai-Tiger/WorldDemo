# River–Lake Inlet Overlap / 河湖入口衔接

## Requirement / 需求

**中文：** 修复树状河流进入高山湖时在岸边提前截断的问题，使河面自然汇入湖面。

**English:** Fix the dendritic river ending prematurely at the alpine lake shore so the river surface flows naturally into the lake surface.

## Summary / 概要

**中文：** 将高山湖入口节点延伸到湖面内部，并让最后一段河道转向湖心，使河流末端透明渐隐发生在湖面覆盖范围内。

**English:** Move the alpine-lake inlet node inside the lake and turn the final reach toward the lake center so the river endpoint fade occurs beneath the lake surface.

## User Request / 用户需求

**中文：** 用户反馈河流和湖泊的交汇处不自然，截图中河面在湖岸外形成明显的截断端点。

**English:** The user reported that the river–lake junction looked wrong; the screenshot showed a visibly truncated river endpoint outside the lake shore.

## Scope / 范围

**中文：** 仅调整 `j4-alpine-lake` 的末端路径、水位控制点和高山湖入口节点，并增加对应几何测试。不修改水体 shader、其他河段、湖泊形状、植被或玩法逻辑。

**English:** Adjust only the `j4-alpine-lake` terminal path, level control point, and alpine-lake inlet node, plus a targeted geometry test. Do not change water shaders, other reaches, lake shape, vegetation, or gameplay logic.

## Acceptance Criteria / 验收标准

**中文：**

- 河流末端进入高山湖内部后再完成透明渐隐。
- 河流在湖岸处保持完整可见，不再出现岸外截断或空隙。
- 河网水位继续沿下游单调不升高，现有河网与构建测试通过。

**English:**

- The river endpoint enters the alpine lake before completing its alpha fade.
- The river remains fully connected at the shore without an exposed cutoff or gap.
- River levels remain non-rising downstream, and the existing river-network and build checks pass.
