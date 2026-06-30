# Requirement / 需求

Add a narrow riverbed texture band at the deepest center of the river.

在河流最深的中心区域增加一条窄河床贴图带。

# Summary / 概要

The terrain river channel should keep using the riverbank texture overall, but the deepest center strip should blend into the riverbed texture with a natural transition.

地形河道整体继续使用河岸贴图，但最深处中心窄带应自然过渡到河床贴图。

# User Request / 用户需求

The user requested replacing the texture at the deepest part of the river, approximately 0.5 meters wide, with the riverbed texture and making the transition natural.

用户要求把河流最深处大约 0.5 米宽的区域替换成河床贴图，并要求过渡自然。

# Scope / 范围

This change updates terrain material blending only. It does not restore a separate riverbed mesh and does not alter river geometry, water shape, player logic, or grass placement.

本次只修改地形材质混合。不恢复独立河床 mesh，不修改河道几何、水面形状、玩家逻辑或草丛放置。

# Acceptance Criteria / 验收标准

- The river center uses `river-bed.webp` through the terrain shader.
- The main visible riverbed strip is approximately 0.5 meters wide.
- The riverbed texture blends smoothly into the surrounding riverbank texture.
- The river channel does not expose grass texture inside the water.
- Build verification passes.

- 河流中心通过地形 shader 使用 `river-bed.webp`。
- 主要可见河床带宽度约为 0.5 米。
- 河床贴图与周围河岸贴图平滑过渡。
- 河道水下区域不露出草地贴图。
- 构建验证通过。
