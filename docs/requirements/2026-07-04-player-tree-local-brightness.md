# Requirement / 需求

English: Brighten only the player and trees after global environment brightness became acceptable but character and tree assets remained too dark.

中文：在整体环境亮度已经合适但人物和树木仍偏黑后，只单独提亮人物和树木。

# Summary / 概要

English: Increase the existing player material readability lift and add a subtle tree material emissive lift, without changing global exposure, AO, lights, terrain, water, or sky.

中文：提高已有的人物材质可读性补偿，并给树木材质增加轻微自发光补偿，不修改全局曝光、AO、灯光、地形、水体或天空。

# User Request / 用户需求

English: The user said the environment looked fine, but the character and trees became black, and asked whether they could be brightened independently.

中文：用户反馈环境没问题，但人物和树木都变黑了，并询问能否单独提亮。

# Scope / 范围

English: Adjust only player and tree material readability. Do not alter post-processing, lighting, terrain, water, grass, or unrelated user changes.

中文：只调整人物和树木材质可读性。不修改后处理、灯光、地形、水体、草或无关用户改动。

# Acceptance Criteria / 验收标准

English:
- Player armor is more readable in shadow without looking like it emits visible light.
- Tree crowns and trunks retain visible shape while staying naturally dark.
- Terrain, water, sky, and grass brightness remain unchanged.
- The production build completes successfully.

中文：
- 玩家盔甲在阴影中更可读，但不呈现明显发光效果。
- 树冠和树干保留可见形体，同时仍然自然偏暗。
- 地形、水体、天空和草地亮度保持不变。
- 生产构建成功完成。
