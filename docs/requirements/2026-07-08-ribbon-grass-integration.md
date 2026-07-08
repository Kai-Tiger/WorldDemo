# Requirement / 需求

Replace the runtime grass visuals with the downloaded Ribbon Grass asset pack while keeping existing terrain placement, water exclusions, trees, player, and camera behavior unchanged.

使用下载的 Ribbon Grass 资产包替换运行时草地视觉，同时保持现有地形放置、水体避让、树木、玩家和相机行为不变。

# Summary / 概要

The grass system now uses the Ribbon Grass FBX variants and texture maps as the main grass asset source. The existing grass chunking, LOD rebuild flow, placement masks, wind sway, and visibility toggle remain in place.

草系统现在使用 Ribbon Grass 的 FBX 变体和贴图作为主要草资产来源。现有草地方块、LOD 重建流程、放置遮罩、风动和显示开关保持不变。

# User Request / 用户需求

The user asked to apply every file from `/Users/likai.lear/Downloads/ribbon_grass_tbdpec3r_high/` to the project, using all FBX LOD files, regular PBR maps, billboard maps, and metadata as project assets.

用户要求把 `/Users/likai.lear/Downloads/ribbon_grass_tbdpec3r_high/` 中的所有文件应用到项目里，使用全部 FBX LOD 文件、常规 PBR 贴图、billboard 贴图和元数据作为项目资产。

# Scope / 范围

This change is limited to grass asset loading, grass material setup, grass LOD rendering, copied Ribbon Grass assets, and the matching requirement document. It does not change terrain height data, terrain ground materials, water systems, tree systems, player movement, camera behavior, or unrelated existing working tree changes.

本次变更仅限于草资产加载、草材质设置、草 LOD 渲染、复制 Ribbon Grass 资产以及对应需求文档。不改变地形高度数据、地面材质、水体系统、树木系统、玩家移动、相机行为或无关的现有工作区改动。

# Acceptance Criteria / 验收标准

- All 34 downloaded Ribbon Grass files are present under `public/assets/vegetation/ribbon-grass/`.
- Runtime grass uses Ribbon Grass FBX variants `VarA` through `VarF`.
- LOD0, LOD1, LOD2, and billboard grass render through the existing instanced grass system.
- Grass materials use BaseColor, Normal, Roughness, AO, Opacity, Translucency, Cavity, Bump, Displacement, Gloss, and Specular where appropriate.
- Grass still avoids rivers, lakes, and water exclusion zones.
- Existing terrain, forest-floor ground material, trees, water, player, and camera behavior remain unchanged.
- The project build succeeds.

- 34 个下载的 Ribbon Grass 文件全部位于 `public/assets/vegetation/ribbon-grass/` 下。
- 运行时草地使用 Ribbon Grass 的 `VarA` 到 `VarF` FBX 变体。
- LOD0、LOD1、LOD2 和 billboard 草通过现有实例化草系统渲染。
- 草材质按需使用 BaseColor、Normal、Roughness、AO、Opacity、Translucency、Cavity、Bump、Displacement、Gloss 和 Specular。
- 草仍然避让河流、湖泊和水体排除区域。
- 现有地形、森林地面材质、树木、水体、玩家和相机行为保持不变。
- 项目构建成功。
