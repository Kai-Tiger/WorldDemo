# Requirement / 需求

English: Add an adjustable tree-only exposure parameter so tree brightness can be tuned without changing the environment, player, or global post-processing.

中文：新增只影响树木的可调曝光参数，让树木亮度可独立调节，而不改变环境、玩家或全局后处理。

# Summary / 概要

English: Move tree brightness tuning into `vegetationConfig.js` by adding `TREE_EXPOSURE`, and derive tree material emissive intensity from that multiplier.

中文：通过新增 `TREE_EXPOSURE` 将树木亮度调节放入 `vegetationConfig.js`，并用该倍率派生树木材质自发光强度。

# User Request / 用户需求

English: The user reported that trees were still too dark and requested a parameter for adjusting tree exposure.

中文：用户反馈树木仍然很黑，并要求增加一个可调整树木曝光的参数。

# Scope / 范围

English: Add only a tree-specific exposure config and apply it to tree material readability. Do not change global exposure, AO, lighting, player brightness, terrain, water, grass, or unrelated user edits.

中文：只新增树木专用曝光配置，并应用到树木材质可读性。不修改全局曝光、AO、灯光、玩家亮度、地形、水体、草或无关用户改动。

# Acceptance Criteria / 验收标准

English:
- `TREE_EXPOSURE` exists in vegetation config and controls tree material brightness.
- Tree emissive intensity is derived from the exposure multiplier.
- Environment and player brightness remain unchanged.
- The production build completes successfully.

中文：
- 植被配置中存在 `TREE_EXPOSURE`，并可控制树木材质亮度。
- 树木自发光强度由曝光倍率派生。
- 环境和玩家亮度保持不变。
- 生产构建成功完成。
