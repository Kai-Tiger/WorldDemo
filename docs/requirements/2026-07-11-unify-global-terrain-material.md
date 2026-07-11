# Requirement / 需求

Remove visible square seams between terrain chunks by using one consistent ground material globally.

通过全局使用一致的地表材质，消除地形分块之间可见的方形接缝。

# Summary / 概要

Every terrain chunk now uses the shared Medium layered PBR material regardless of geometry resolution. Geometry LOD remains active, but albedo selection, masks, world-space UV sampling, normal handling, roughness, occlusion, and shadow reception no longer change at chunk boundaries.

所有地形分块现在无论几何精度如何，都使用共享的 Medium 分层 PBR 材质。几何 LOD 继续生效，但基础颜色选择、遮罩、世界空间 UV 采样、法线处理、粗糙度、环境遮蔽和阴影接收不再在分块边界发生变化。

# User Request / 用户需求

The user reported that the ground texture still looked incorrect and asked to fix the visible material discontinuities shown in the screenshot.

用户反馈地面贴图仍然不正确，并要求修复截图中可见的材质断层。

# Scope / 范围

Decouple terrain material selection from chunk geometry resolution and update the targeted material-selection tests. Keep terrain geometry LOD, full-map residency, texture assets, layer masks, vegetation, water, lighting, and authored world content unchanged.

将地形材质选择与分块几何精度解耦，并更新针对材质选择的测试。保持地形几何 LOD、完整地图常驻、贴图资源、图层遮罩、植被、水体、光照和既有世界内容不变。

# Acceptance Criteria / 验收标准

- 256-, 128-, and 64-segment terrain chunks use the same shared Medium material.
- Material appearance and shadow reception do not switch at chunk boundaries.
- Terrain geometry LOD remains unchanged.
- Automated tests and the production build succeed.
- Browser verification shows no square material patch around the player.

- 256、128 和 64 段地形分块使用同一个共享 Medium 材质。
- 材质外观和阴影接收不会在分块边界切换。
- 地形几何 LOD 保持不变。
- 自动化测试和生产构建成功。
- 浏览器验证中玩家周围不再出现方形材质色块。
