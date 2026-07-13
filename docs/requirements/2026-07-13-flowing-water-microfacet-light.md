# Flowing Water Microfacet Lighting / 流动水体微表面光照

## Requirement / 需求

为现有所有流动水系补充沿水流方向稳定的微表面光照，使河道、支流、山地水网、低地溪流及湖泊出口的流动水面具有连贯、可控且抗闪烁的高光，同时保持现有几何、流向数据、泡沫造型和反射模式的视觉语义。实现必须采用流向切线基底、GGX/Smith/Schlick 微表面镜面模型、基于屏幕空间导数的镜面抗锯齿、按反射模式选择后再采样，以及泡沫区域的镜面抑制。

Add stable, flow-oriented microfacet lighting to every existing flowing-water system so that rivers, tributaries, alpine water networks, lowland streams, and the flowing lake-outlet corridor receive coherent, controllable, anti-aliased highlights while preserving the current geometry, flow data, foam shapes, and reflection-mode semantics. The implementation must use a flow-direction tangent basis, a GGX/Smith/Schlick microfacet specular model, screen-derivative specular anti-aliasing, reflection sampling performed only after mode selection, and specular suppression in foamy regions.

## Summary / 概要

阶段一只升级流动水材质的光照与反射采样路径。片元着色器应将水流方向（含汇流处的流向混合）转换为稳定的局部切线基底，再把流动法线映射到世界空间；使用 Cook-Torrance 框架中的 GGX 法线分布、Smith 几何遮蔽和 Schlick Fresnel 计算太阳镜面，并以水的介电常数作为基础反射率。法线的屏幕空间导数用于提高有效粗糙度，减轻远景高光闪烁。反射源必须根据当前模式选择后再进行一次对应采样，泡沫遮罩则降低最终镜面能量。

Phase one upgrades only the lighting and reflection-sampling path of flowing-water materials. The fragment shader should convert the water-flow direction, including blended directions at junctions, into a stable local tangent basis and transform the animated flow normal into world space. Sun specular should use a Cook-Torrance model with a GGX normal distribution, Smith geometric masking-shadowing, Schlick Fresnel, and a dielectric base reflectance appropriate for water. Screen-space normal derivatives should raise the effective roughness to reduce distant highlight shimmer. The shader must select the active reflection source before making its corresponding single sample, and the foam mask must attenuate final specular energy.

## User Request / 用户需求

用户希望提升当前河流及其他流动水面的光感与水流质感，并要求技术方案不限于既有 river-creator 做法。阶段一明确覆盖流向切线基底、GGX/Smith/Schlick、导数镜面抗锯齿、按模式选择反射采样和泡沫抑制镜面；明确不加入屏幕空间折射，也不修改水体几何、湖泊材质或瀑布系统。

The user wants stronger light response and a more convincing sense of flow across the current rivers and other moving water, without limiting the solution to the existing river-creator approach. Phase one explicitly includes a flow-aligned tangent basis, GGX/Smith/Schlick shading, derivative-based specular anti-aliasing, reflection sampling selected by mode, and foam-driven specular suppression. It explicitly excludes screen-space refraction and changes to water geometry, lake materials, or waterfall systems.

## Scope / 范围

- 为所有使用流动水材质的水系应用同一套改进，包括主河道、支流、山地水网、低地溪流以及湖泊出口至瀑布前的流动河段；不修改湖面材质、瀑布水帘、瀑布边缘或水雾。 / Apply the same improvement to every system using the flowing-water material, including the main river, tributaries, alpine networks, lowland streams, and the flowing corridor from the lake outlet to before the waterfall; do not modify lake-surface materials, waterfall curtains, waterfall lips, or mist.
- 使用顶点/片元已有的流向数据构建正交切线基底。切线沿混合后的流向，副切线由几何法线与切线构造，流动法线通过该基底转换至世界空间；汇流区域必须纳入现有 `flowDirection` 与 `junctionFlowDirection` 的混合，不新增或重写网格属性。 / Build an orthonormal tangent basis from the existing vertex/fragment flow data. The tangent follows the blended flow direction, the bitangent is constructed from the geometric normal and tangent, and the animated flow normal is transformed into world space through that basis. Junction regions must incorporate the existing blend of `flowDirection` and `junctionFlowDirection`, without adding or rewriting mesh attributes.
- 采用 Cook-Torrance 镜面项：GGX/Trowbridge-Reitz 法线分布函数、Smith 遮蔽-阴影函数和 Schlick Fresnel；水的介电基础反射率使用约 `F0 = 0.02–0.022`（对应约 `IOR = 1.333`），并对粗糙度、分母及点积做有限值保护。 / Use a Cook-Torrance specular term with a GGX/Trowbridge-Reitz normal-distribution function, Smith masking-shadowing, and Schlick Fresnel. Use a dielectric water base reflectance around `F0 = 0.02–0.022` (approximately `IOR = 1.333`) and guard roughness, denominators, and dot products against invalid values.
- 通过 `dFdx`、`dFdy` 或等价的 `fwidth` 法线方差估计提高有效粗糙度，并对结果钳制，以减少远景水面高光锯齿、闪烁和孤立亮点，同时保留近景流向细节。 / Raise effective roughness using normal-variance estimates from `dFdx`, `dFdy`, or equivalent `fwidth`, and clamp the result to reduce distant specular aliasing, shimmer, and isolated fireflies while retaining close-range directional flow detail.
- 在流动水着色路径中先读取 `uWaterReflectionMode` 并选择环境、探针或平面反射分支，再只采样被选中的反射源；保留现有模式含义、可用性判断和安全回退，不改变湖泊或瀑布的反射行为。 / In the flowing-water shading path, read `uWaterReflectionMode` and select the environment, probe, or planar-reflection branch before sampling only the chosen source. Preserve existing mode meanings, availability checks, and safe fallbacks, without changing lake or waterfall reflection behavior.
- 使用现有泡沫遮罩衰减最终镜面贡献，使白色泡沫不出现镜面热点；保留现有泡沫颜色、形状、透明度和动画。 / Attenuate final specular contribution with the existing foam mask so that white foam does not receive mirror-like hotspots; preserve the current foam color, shape, opacity, and animation.
- 不实现屏幕空间折射，不采样场景颜色或场景深度，不新增折射渲染目标或渲染通道。 / Do not implement screen-space refraction, sample scene color or scene depth, or add refraction render targets or render passes.
- 不修改河流网格、岸线、UV/流向属性生成、水网拓扑、湖泊、瀑布、粒子、碰撞或玩法逻辑；不新增纹理、绘制调用或可见水体对象。 / Do not modify river meshes, banks, UV/flow-attribute generation, water-network topology, lakes, waterfalls, particles, collisions, or gameplay logic; do not add textures, draw calls, or visible water objects.

## Acceptance Criteria / 验收标准

- 所有流动水材质都使用由混合流向构建的正交切线基底；汇流前后法线与高光方向连续，不再仅依赖固定世界轴解释流动法线。 / Every flowing-water material uses an orthonormal tangent basis built from the blended flow direction; normal and highlight orientation remain continuous through junctions, and animated flow normals are no longer interpreted only against fixed world axes.
- 着色器包含并实际使用 GGX 法线分布、Smith 几何项和 Schlick Fresnel；水的 `F0`、粗糙度、分母和输出均处于有限安全范围，不产生 NaN、无穷值或明显镜面火花。 / The shader contains and actively uses a GGX normal distribution, Smith geometry term, and Schlick Fresnel; water `F0`, roughness, denominators, and outputs remain within finite safe ranges and produce no NaNs, infinities, or obvious specular fireflies.
- 有效粗糙度包含基于法线屏幕导数的抗锯齿修正；远景与斜视角下的水面高光闪烁明显降低，同时近景的流向纹理和高光层次没有被整体抹平。 / Effective roughness includes anti-aliasing derived from screen-space normal derivatives; highlight shimmer is visibly reduced at distance and grazing angles without globally flattening close-range directional texture and highlight structure.
- 每个流动水片元只采样当前 `uWaterReflectionMode` 选中的反射源；环境、探针和平面模式及其不可用时的回退均有确定结果，未选中的反射采样器不会被无条件读取。 / Each flowing-water fragment samples only the reflection source selected by the current `uWaterReflectionMode`; environment, probe, and planar modes, including unavailable-source fallbacks, produce deterministic results, and unselected reflection samplers are not read unconditionally.
- 泡沫遮罩在最终镜面合成中产生可验证的衰减：泡沫浓度越高，镜面热点越弱；非泡沫水面仍保留微表面高光，且泡沫的颜色、透明度和运动保持不变。 / The foam mask produces verifiable attenuation in final specular composition: stronger foam yields weaker specular hotspots, while non-foamy water retains microfacet highlights and foam color, opacity, and motion remain unchanged.
- 视觉回归覆盖主河道、汇流俯视、河岸近景、低地溪流及瀑布邻近河段；流向光感一致、汇流连续、远景闪烁降低，湖面与瀑布外观保持不变。 / Visual regression covers the main river, overhead junctions, close riverbanks, lowland creeks, and the river segment near the waterfall; flow-oriented lighting is coherent, junctions are continuous, distant shimmer is reduced, and lake and waterfall appearance remains unchanged.
- 代码中没有新增场景颜色/深度折射采样、折射渲染目标或额外渲染通道，也没有修改水体几何、流向属性生成、湖泊或瀑布实现；纹理数量、绘制调用和可见水体数量不增加。 / No scene-color/depth refraction sampling, refraction render target, or additional render pass is added, and water geometry, flow-attribute generation, lakes, and waterfalls are not modified; texture count, draw-call count, and visible-water object count do not increase.
- `npm test`、`npm run build`、`npm run check:lowlands` 和 `git diff --check` 均通过，且阶段一改动仅涉及上述流动水光照范围。 / `npm test`, `npm run build`, `npm run check:lowlands`, and `git diff --check` all pass, and phase-one changes remain limited to the flowing-water lighting scope described above.
