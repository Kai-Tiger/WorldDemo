# Requirement / 需求

Limit the riverbank texture so it starts at the river slope instead of spreading onto flat ground.

限制河岸贴图范围，使它从河道坡面开始，而不是扩散到平坦地面。

# Summary / 概要

The riverbank rock texture should remain on the carved channel slopes, while flat ground above the bank should return to the normal ground textures. The center riverbed texture should remain unchanged.

河岸岩石贴图应保留在雕刻出的河道坡面上，河岸上方的平坦地面应恢复普通地面贴图。中心河床贴图保持不变。

# User Request / 用户需求

The user observed that the riverbank texture extends too far outward and requested moving it inward to where the slope begins.

用户观察到河岸贴图向外延伸太多，要求把它往里收到坡度开始的地方。

# Scope / 范围

This change updates terrain shader blending only. It does not change river carving, water geometry, wet bank meshes, player logic, grass placement, or texture assets.

本次只修改地形 shader 混合。不修改河道雕刻、水体几何、湿岸 mesh、玩家逻辑、草丛放置或贴图资源。

# Acceptance Criteria / 验收标准

- Flat ground outside the river slope no longer shows the riverbank rock texture.
- The riverbank texture remains visible on sloped channel sides.
- The transition from grass ground to riverbank texture is soft.
- The center riverbed texture band remains visible and unaffected by the slope filter.
- Build verification passes.

- 河道坡面外侧的平坦地面不再显示河岸岩石贴图。
- 河岸贴图仍显示在河道两侧坡面上。
- 草地到河岸贴图之间过渡柔和。
- 中心河床贴图带仍然可见，并且不受坡度过滤影响。
- 构建验证通过。
