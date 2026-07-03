# Requirement / 需求

English: Rebalance the post-processing pipeline so the scene remains readable after AO, ACES tone mapping, anti-aliasing, and color grading.

中文：重新平衡后处理管线，让场景在启用 AO、ACES 色调映射、抗锯齿和色彩分级后仍然保持可读性。

# Summary / 概要

English: Raise exposure, soften ambient occlusion, reduce color grade contrast, and lift shadows slightly to prevent the player, trees, and terrain from crushing to black.

中文：提高曝光、减弱环境遮蔽、降低色彩分级对比度，并轻微提亮暗部，避免玩家、树木和地形压成纯黑。

# User Request / 用户需求

English: The user reported that the post-processed scene looked improved but too dark and requested implementation of the brightness rebalance plan.

中文：用户反馈后处理后的场景有所改善但亮度太低，并要求实现亮度重新平衡方案。

# Scope / 范围

English: Adjust only post-processing brightness, AO, and color grading parameters. Do not change scene lights, terrain, water, vegetation, gameplay, or unrelated user edits.

中文：只调整后处理亮度、AO 和色彩分级参数。不修改场景灯光、地形、水体、植被、玩法或无关的用户改动。

# Acceptance Criteria / 验收标准

English:
- The player silhouette and tree crowns retain visible detail in shaded views.
- Terrain remains brighter without becoming flat or washed out.
- AO still adds contact depth but no longer over-darkens the forest.
- The production build completes successfully.

中文：
- 阴影视角下玩家轮廓和树冠仍保留可见细节。
- 地形更明亮，但不变得平淡或过曝。
- AO 仍提供接触层次，但不再让森林区域过暗。
- 生产构建成功完成。
