# Requirement / 需求

Directly reduce the lateral width of the riverbank texture.

直接减少河岸贴图的横向覆盖宽度。

# Summary / 概要

The riverbank texture should no longer use the full river influence radius. It should fade out near the channel slope boundary so surrounding flat ground keeps the regular grass texture.

河岸贴图不应继续使用完整河道影响半径。它应在接近河道坡面边界的位置淡出，让周围平坦地面保留普通草地贴图。

# User Request / 用户需求

The user noted that the previous slope filter did not directly reduce riverbank texture width and requested implementing the narrower lateral texture range.

用户指出上一次坡度过滤并没有直接减少河岸贴图宽度，要求实现更窄的横向贴图范围。

# Scope / 范围

This change updates the river material mask width only. It does not change river carving, water geometry, the center riverbed texture band, wet bank meshes, player logic, or texture assets.

本次只修改河流材质 mask 的宽度。不修改河道雕刻、水体几何、中心河床贴图带、湿岸 mesh、玩家逻辑或贴图资源。

# Acceptance Criteria / 验收标准

- The riverbank texture fades out around the channel slope boundary instead of extending to the full influence radius.
- Flat ground near the river keeps the regular grass texture.
- The center riverbed texture band remains unchanged.
- The transition from riverbank texture to grass remains soft.
- Build verification passes.

- 河岸贴图在河道坡面边界附近淡出，而不是延伸到完整影响半径。
- 河流附近的平坦地面保留普通草地贴图。
- 中心河床贴图带保持不变。
- 河岸贴图到草地之间仍然柔和过渡。
- 构建验证通过。
