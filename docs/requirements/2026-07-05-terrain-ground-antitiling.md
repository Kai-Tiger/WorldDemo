# Requirement / 需求

Reduce the visible top-down checker/grid repetition in lowland terrain ground textures.

减少低地地形贴图在俯视角下可见的棋盘格/网格重复。

# Summary / 概要

Update terrain shader sampling so grass, dirt, and dry grass ground textures use larger mixed world scales instead of a single visible 8m repeat.

更新地形 shader 采样方式，让草地、泥土、干草地面贴图使用更大的混合世界尺度，而不是单一可见的 8m 重复。

# User Request / 用户需求

The user reported that the top-down terrain ground texture still repeats every 8 meters and asked to fix it.

用户反馈地面贴图俯视时仍然每 8 米重复一次，并要求修复。

# Scope / 范围

This change updates only terrain shader sampling for lowland ground textures. It does not change terrain geometry, height data, texture assets, water, vegetation, lighting, player behavior, or alpine/river material masks.

本次只更新低地地面贴图的地形 shader 采样。不改变地形几何、高度数据、贴图资源、水体、植被、光照、玩家行为或高山/河道材质遮罩。

# Acceptance Criteria / 验收标准

- Lowland grass, dirt, and dry grass terrain textures no longer show an obvious 8m square repeat from overhead.
- Existing terrain material blending and river/lake material overrides remain in place.
- The project build succeeds.

- 低地草地、泥土、干草地形贴图在俯视时不再呈现明显的 8 米方格重复。
- 现有地形材质混合以及河流/湖泊材质覆盖保持有效。
- 项目构建成功。
