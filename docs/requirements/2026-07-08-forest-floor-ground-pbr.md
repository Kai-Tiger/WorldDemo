# Requirement / 需求

Replace the lowland grass ground material with the downloaded forest floor PBR texture set, while leaving other terrain and scene textures unchanged.

使用下载的森林地面 PBR 贴图替换低地草地地面材质，同时保持其他地形与场景贴图不变。

# Summary / 概要

The terrain shader now loads the forest floor BaseColor, Normal, Roughness, AO, and Displacement maps and uses them for lowland ground rendering. The maps are sampled through shader-side cell bombing to reduce obvious repeated tiling.

地形 shader 现在加载森林地面的 BaseColor、Normal、Roughness、AO 和 Displacement 贴图，并用于低地地面渲染。这些贴图通过 shader 侧 cell bombing 采样，以减少明显的重复平铺。

# User Request / 用户需求

The user asked to replace the project's grass ground texture with the downloaded forest floor texture set, use BaseColor, Normal, Roughness, AO, and Displacement or Bump for better ground quality, and adopt cell bombing to avoid repeated texture grids.

用户要求用下载的森林地面贴图替换项目里的草地地面贴图，使用 BaseColor、Normal、Roughness、AO 以及 Displacement 或 Bump 提升地面质量，并采用 cell bombing 避免重复纹理网格。

# Scope / 范围

This change is limited to lowland terrain ground material inputs and terrain shader sampling. It does not overwrite existing terrain assets and does not replace riverbed, riverbank, rock, snow, gravel, water, vegetation, player, camera, or terrain height behavior.

本次变更仅限于低地地面材质输入和地形 shader 采样。不覆盖已有地形资源，也不替换河床、河岸、岩石、雪地、碎石、水体、植被、玩家、相机或地形高度行为。

# Acceptance Criteria / 验收标准

- Lowland grass ground areas render with the forest floor PBR texture set.
- BaseColor, Normal, Roughness, AO, and Displacement maps are loaded and used by the terrain shader.
- Cell bombing reduces obvious repeated texture grids on lowland ground.
- Existing river, lake, alpine, snow, gravel, vegetation, and scene behavior remain unchanged.
- The project build succeeds.

- 低地草地地面区域使用森林地面 PBR 贴图渲染。
- BaseColor、Normal、Roughness、AO 和 Displacement 贴图被地形 shader 加载并使用。
- Cell bombing 减少低地地面上明显的重复纹理网格。
- 现有河流、湖泊、高山、雪地、碎石、植被和场景行为保持不变。
- 项目构建成功。
