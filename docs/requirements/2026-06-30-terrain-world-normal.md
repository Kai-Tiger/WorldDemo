# Requirement / 需求

Fix terrain material blending so textures do not change when the camera rotates.

修复地形材质混合，避免贴图随相机旋转发生变化。

# Summary / 概要

Terrain shader normal-dependent blending should use world-space normals instead of view-space normals. This keeps slope, rock, snow, riverbank, riverbed, and lighting calculations stable as the camera turns.

地形 shader 中依赖法线的混合应使用世界空间法线，而不是视图空间法线。这样坡度、岩石、雪地、河岸、河床和光照计算会在相机转动时保持稳定。

# User Request / 用户需求

The user reported that all terrain textures appeared to change when rotating the view and asked to fix the root cause.

用户反馈所有地形贴图都会随着视角转动而变化，并要求修复根本原因。

# Scope / 范围

This change updates terrain shader normal space only. It does not alter terrain geometry, river masks, water transparency, texture assets, or player logic.

本次只修改地形 shader 的法线空间。不修改地形几何、河流遮罩、水面透明度、贴图资源或玩家逻辑。

# Acceptance Criteria / 验收标准

- Terrain normal-dependent material blending uses world-space normals.
- Grass, rock, snow, riverbank, and riverbed texture distribution remains stable while rotating the camera.
- Lighting no longer rotates incorrectly with the camera.
- Water reflection may still vary with view angle.
- Build verification passes.

- 地形中依赖法线的材质混合使用世界空间法线。
- 旋转相机时，草地、岩石、雪地、河岸和河床贴图分布保持稳定。
- 光照不再错误地跟随相机旋转。
- 水面反射仍可以随视角变化。
- 构建验证通过。
