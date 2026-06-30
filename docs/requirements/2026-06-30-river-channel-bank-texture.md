# Requirement / 需求

Replace the separate riverbed texture layer with the riverbank texture on the terrain river channel.

用地形河道上的河岸贴图替换独立河床贴图层。

# Summary / 概要

The riverbed mesh should be removed so uneven terrain no longer exposes the global grass texture underneath it. The terrain material should use the riverbank rock texture across the carved river channel with a soft transition back to ground textures.

移除河床覆盖 mesh，避免凹凸河床露出底层全局草地贴图。地形材质应在雕刻出的河道范围内使用河岸岩石贴图，并与周围地面贴图平滑过渡。

# User Request / 用户需求

The user requested deleting the riverbed texture, deleting grass texture inside the riverbed, and replacing the whole riverbed area with the riverbank texture.

用户要求删除河床贴图，删除河床内的草地贴图，并把整个河床区域全部替换为河岸贴图。

# Scope / 范围

This change updates the river and terrain rendering path only: river texture loading, scene assembly, terrain vertex attributes, and terrain shader blending. It does not change terrain height carving, player controls, grass clump placement, or water gameplay logic.

本次只修改河流与地形渲染路径：河流贴图加载、场景组装、地形顶点属性和地形 shader 混合。不修改地形高度雕刻、玩家控制、草丛放置或水体玩法逻辑。

# Acceptance Criteria / 验收标准

- The scene no longer creates a separate riverbed mesh.
- `river-bed.webp` is no longer loaded or used by code.
- The carved river channel terrain uses the riverbank texture instead of grass, dirt, or dry grass.
- The riverbank texture fades smoothly back into surrounding ground textures outside the channel.
- Build verification passes.

- 场景不再创建独立河床 mesh。
- 代码不再加载或使用 `river-bed.webp`。
- 雕刻出的河道地形使用河岸贴图，而不是草地、泥地或干草贴图。
- 河岸贴图在河道外侧与周围地面贴图平滑过渡。
- 构建验证通过。
