# Requirement / 需求

Remove the transparent film-like overlay visible on riverbanks.

移除河岸上可见的透明薄膜状覆盖层。

# Summary / 概要

The scene should no longer create or add the separate wet-bank transparent mesh. The river water surface and terrain riverbank textures should remain unchanged.

场景不应再创建或添加独立的透明湿河岸网格。河流水面和地形河岸贴图应保持不变。

# User Request / 用户需求

The user identified the film-like layer on the riverbank and asked to remove it.

用户指出河岸上的薄膜状图层，并要求将其去掉。

# Scope / 范围

This change updates scene assembly only. It does not delete wet-bank helper code, change water rendering, alter terrain textures, or modify player, grass, or tree behavior.

本次只修改场景装配。不删除湿河岸辅助代码，不修改水体渲染，不改变地形贴图，也不修改玩家、草丛或树木行为。

# Acceptance Criteria / 验收标准

- `RiverWetBanks` is no longer created or added to the scene.
- The transparent film-like overlay on riverbanks is gone.
- The river water mesh remains visible.
- Build verification passes.

- 场景中不再创建或添加 `RiverWetBanks`。
- 河岸上的透明薄膜状覆盖层消失。
- 河流水面网格仍然可见。
- 构建验证通过。
