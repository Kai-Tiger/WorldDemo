# Requirement / 需求

Replace the brown dirt material on natural slopes with the existing alpine rock material while keeping flat lowland terrain grassy.

将自然山坡上的棕色泥土材质替换为现有高山岩石材质，同时保持平缓低地为草地。

# Summary / 概要

Natural terrain now uses two base surface layers: forest-floor grass on eligible flat lowland ground and alpine rock everywhere else, with a bounded cross-fade band between them. The transition blends color, surface normal, and roughness while sampling both layers only inside that band. Dirt and gravel remain available to the road overlay, and snow, riverbank, riverbed, lake, and wet-shore overrides keep their existing order and behavior.

自然地形现在只使用两个基础表面层：符合条件的平缓低地使用森林草地，其余区域统一使用高山岩石，并在两者之间加入有限宽度的交叉淡化带。过渡带同时混合颜色、表面法线和粗糙度，且只在该区域采样两层。泥土和碎石继续供道路覆盖层使用，积雪、河岸、河床、湖泊与湿岸覆盖保持原有顺序和行为。

# User Request / 用户需求

The user asked to replace all brown slope areas with rock, preserve grass on flat ground, retain the dirt texture for roads, and soften the visibly hard boundary between grass and rock.

用户要求将所有棕色山坡区域改为岩石，平地继续保留草地，让道路继续使用泥土贴图，并柔化草地与岩石之间明显生硬的边界。

# Scope / 范围

Update only the natural base-surface selection in the terrain shader and its targeted tests. Preserve the existing forest-floor and rock sampling implementations, road dirt/gravel textures, texture loading interfaces and assets, snow and water material overrides, terrain geometry, height data, vegetation placement, lighting, player, and camera behavior.

仅更新地形 shader 的自然基础表面选择及其定向测试。保留现有森林草地与岩石采样实现、道路泥土/碎石贴图、纹理加载接口和资源、积雪与水体材质覆盖、地形几何、高度数据、植被放置、光照、玩家和相机行为。

# Acceptance Criteria / 验收标准

- Flat eligible lowland terrain continues to sample the forest-floor grass color and normal layers.
- Every natural surface outside the grass branch samples the existing alpine rock layer.
- Grass and rock colors, normals, and roughness transition smoothly across a bounded blend band.
- Both base layers are sampled together only inside the blend band.
- The natural base-surface branch no longer samples ground-dirt color or normal textures.
- Roads continue to sample the existing ground-dirt and gravel textures.
- Snow and water overrides remain after the base surface and road overlay.
- Targeted tests, the full test suite, and the production build succeed.
- Close and fixed-camera visual checks show no brown dirt slope band, hard grass/rock seam, missing material, or shader error.

- 符合条件的平缓低地继续采样森林草地颜色和法线层。
- 草地分支以外的所有自然表面统一采样现有高山岩石层。
- 草地与岩石的颜色、法线和粗糙度在有限宽度的混合带内平滑过渡。
- 仅在混合带内同时采样两个基础材质层。
- 自然基础表面分支不再采样地面泥土颜色或法线贴图。
- 道路继续采样现有地面泥土与碎石贴图。
- 积雪与水体覆盖仍位于基础表面和道路覆盖之后。
- 定向测试、完整测试套件和生产构建成功。
- 近景与固定镜头视觉检查中不再出现棕色泥土山坡带、生硬的草地/岩石接缝、材质缺失或 shader 错误。
