# Requirement / 需求

Flip the ribbon-grass textures vertically so blade roots and tips align with the grass geometry.

上下翻转 ribbon-grass 贴图，使草叶根部和尖端与草模型几何正确对应。

# Summary / 概要

All nine ribbon-grass KTX2 maps now use a vertical texture transform that maps `v` to `1 - v`. The shared transform keeps base color, opacity, normal, roughness, ambient occlusion, translucency, and billboard textures aligned across every grass LOD.

全部九张 ribbon-grass KTX2 贴图现在使用将 `v` 映射为 `1 - v` 的垂直纹理变换。统一变换会让基础颜色、透明度、法线、粗糙度、环境遮蔽、透光和 billboard 贴图在所有草地 LOD 中保持对齐。

# User Request / 用户需求

The user observed that the grass texture was visibly upside down and requested a vertical flip.

用户发现草地贴图明显上下颠倒，并要求进行垂直翻转。

# Scope / 范围

Apply a vertical UV transform only to ribbon-grass textures after KTX2 loading. Do not alter grass geometry, placement, scale, density, animation, terrain materials, trees, or other textures.

仅在 KTX2 加载后对 ribbon-grass 贴图应用垂直 UV 变换。不修改草模型几何、放置、缩放、密度、动画、地形材质、树木或其他贴图。

# Acceptance Criteria / 验收标准

- Every ribbon-grass texture uses `offset.y = 1` and `repeat.y = -1`.
- A source V coordinate of 0.2 transforms to 0.8 while U remains unchanged.
- Color, alpha, normal, AO, roughness, translucency, and billboard maps remain mutually aligned.
- Automated tests and the production build succeed.

- 每张 ribbon-grass 贴图都使用 `offset.y = 1` 和 `repeat.y = -1`。
- 原始 V 坐标 0.2 会转换为 0.8，U 坐标保持不变。
- 颜色、透明、法线、AO、粗糙度、透光和 billboard 贴图继续彼此对齐。
- 自动化测试和生产构建成功。
