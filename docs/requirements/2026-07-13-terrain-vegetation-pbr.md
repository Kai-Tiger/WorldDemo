# Terrain and Vegetation PBR / 地表与植被 PBR

## Requirement / 需求

Improve ground, tree, and grass light response for the clear alpine environment without changing terrain geometry, vegetation layout, or vegetation density.

在不改变地形几何、植被布局或植被密度的前提下，改善清朗高山环境中的地面、树木和草地光照响应。

## Summary / 概要

Add tiered technical terrain maps, bounded forest-floor AO and roughness, scree-specific normal detail, brighter non-metal terrain response, dielectric tree highlights with directional canopy backlighting, and direction-aware grass translucency.

新增分级地表技术贴图、受限的森林地表 AO 与粗糙度、匹配碎石的法线细节、更明亮的非金属地表响应、带方向性树冠背光的介电树木高光，以及受光照方向控制的草地透射。

## User Request / 用户需求

The clear-weather ground and trees currently look too dark and flat. Reflections are weak, foliage lacks believable backlighting, and terrain layers reuse mismatched technical maps. New textures may be created when needed.

当前清朗天气下的地面和树木过暗且缺少层次，反射响应偏弱，植被没有可信的背光效果，部分地表层还复用了不匹配的技术贴图；必要时允许制作新贴图。

## Scope / 范围

- Generate 1K and 2K linear KTX2 terrain maps. The packed map stores forest AO in R, forest roughness in G, and scree tangent-normal XY in B/A; a standalone scree normal is also exported for inspection and future use.
- Keep the globally used Medium terrain material within nine active texture samplers by reading all new runtime data through one packed sampler.
- Remap forest AO to 0.75–1.0 and roughness to 0.55–0.92, and lift overly dark rock, scree, and bank color multipliers while preserving low wet-bank roughness.
- Force vegetation metalness to zero; limit canopy roughness to 0.60–0.78, restore 0.35 specular intensity where supported, reduce fixed emissive lift to 0.04, and add sun-directional alpha/luminance-based canopy backlighting.
- Correct the spawn-tree tint, grass roughness channel, grass translucency color space and directionality, and far-grass color matching.
- Exclude tree and grass hosts from GTAO through the scene-level vegetation host configuration delivered with the clear-lighting stage.

- 生成 1K 与 2K 线性 KTX2 地表贴图。打包贴图的 R 存储森林 AO、G 存储森林粗糙度、B/A 存储碎石切线空间法线 XY；同时导出独立碎石法线，供审查和后续使用。
- 全局使用的 Medium 地表材质通过同一个打包 sampler 读取全部新增运行时数据，使有效纹理 sampler 保持在九个以内。
- 将森林 AO 映射到 0.75–1.0、粗糙度映射到 0.55–0.92；提亮过暗的岩石、碎石和河岸乘色，同时保留湿河岸的低粗糙度。
- 所有植被金属度归零；树冠粗糙度限制在 0.60–0.78，材质支持时恢复 0.35 高光强度，将固定 emissive 抬升降至 0.04，并增加基于太阳方向及 alpha/明度的树冠背光。
- 修正出生点树木乘色、草地粗糙度通道、草地透射贴图色彩空间与方向响应，并匹配远景草颜色。
- 树木和草地由清朗光照阶段的场景级植被 host 配置排除出 GTAO。

## Acceptance Criteria / 验收标准

- Both texture tiers are valid linear KTX2 files with mip levels, and the scree normal tiles 4×4 without edge discontinuities; generated normal vectors remain unit length within floating-point tolerance.
- Medium terrain declares at most nine texture uniforms, samples packed R/G for forest response, and reconstructs scree normal Z from packed B/A.
- Forest AO and roughness remain within the specified bounds; rock, scree, and bank multipliers are brighter without changing wet-bank roughness logic.
- Canopy and depth materials retain identical wind deformation and alpha-cutout shadows; only canopy surface materials receive directional backlighting.
- Tree and grass instances, LOD distances, placement masks, and density are unchanged.
- Focused terrain, tree, and grass tests pass, followed by the complete test suite and production build.

- 两档贴图均为带 mip 的有效线性 KTX2；碎石法线进行 4×4 平铺时没有边缘断裂，生成法线长度在浮点误差范围内保持为 1。
- Medium 地表最多声明九个纹理 uniform，使用打包 R/G 驱动森林响应，并从打包 B/A 重建碎石法线 Z。
- 森林 AO 与粗糙度保持在指定区间；岩石、碎石和河岸乘色得到提亮，湿河岸粗糙度逻辑不变。
- 树冠表面和深度材质保持一致的风动及 alpha-cutout 阴影；只有树冠表面材质获得方向性背光。
- 树木与草地实例、LOD 距离、放置遮罩和密度保持不变。
- 地表、树木和草地的针对性测试通过，随后完整测试与生产构建通过。
