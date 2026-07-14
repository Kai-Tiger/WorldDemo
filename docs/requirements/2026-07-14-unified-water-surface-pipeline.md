# Requirement / 需求

- English: Replace the independent transparent river and lake surfaces with one topologically continuous water-surface pipeline per hydrological basin. River-to-lake connections must be represented by shared indexed geometry and shared water attributes, never by overlapping water meshes, alpha-cut river endings, or a legacy forward-transparent fallback.
- 中文：将相互独立的透明河流与湖泊水面替换为按水文盆地组织的拓扑连续水面管线。河湖连接必须由共享索引几何和共享水体属性表达，不得再使用重叠水面、河道末端 Alpha 裁剪或旧的前向透明回退路径。

- English: Render all base river and lake surfaces through a common Water Info prepass and a single fullscreen optical resolve on Performance, Balanced, and Quality. Only waterfalls, waterfall-lip foam, confluence foam, spray, and mist remain forward-rendered effects after the resolve.
- 中文：Performance、Balanced 与 Quality 三档的所有基础河湖水面都必须经过统一的 Water Info 预通道和唯一一次全屏光学合成。只有瀑布水帘、瀑布唇泡沫、汇流泡沫、飞沫与薄雾继续作为合成后的前向特效。

## Summary / 概要

- English: Build exactly four `BasinWaterSurfaceBatch` objects so frustum culling is retained without creating one map-wide mesh. The batches are: (1) alpine lake, cirque lake, mountain river network, and alpine-lake outlet; (2) Hero river, east lowland stream, east pond, and terminal lake; (3) northwest lake, northeast lake, and their connecting river network; and (4) the four southern lakes and their connecting river network.
- 中文：严格生成四个 `BasinWaterSurfaceBatch`，在不创建全地图巨型网格的前提下保留视锥裁剪。四个批次分别为：（1）高山湖、冰斗湖、山地河网和高山湖出口；（2）Hero 主河、东侧低地溪流、东侧池塘和终点湖；（3）西北湖、东北湖及连接河网；（4）南部四湖及连接河网。

- English: Each basin is one indexed `BufferGeometry` whose rivers, lakes, and inlet transition patches share topology. All four batches use one `UnifiedWaterAttributeMaterial` to write Water Info into a two-attachment MRT, and one fullscreen resolve computes refraction, absorption, scattering, Fresnel, reflection, and base water color exactly once per covered pixel.
- 中文：每个盆地都是一个索引化 `BufferGeometry`，其中河流、湖泊与入口过渡面共享拓扑。四个批次共用一个 `UnifiedWaterAttributeMaterial`，把 Water Info 写入双附件 MRT；唯一的全屏合成在每个被水面覆盖的像素上只计算一次折射、吸收、散射、Fresnel、反射和基础水色。

- English: River flow may continue a short distance into a lake only as flow direction, dynamic normal, rapid, disturbance, and foam attributes. `riverInfluence` blends those attributes but never multiplies surface coverage. Coverage remains continuous and fully opaque across every water-to-water junction.
- 中文：河流影响进入湖内时只保留为流向、动态法线、急流、扰动和泡沫等属性。`riverInfluence` 仅用于混合这些属性，绝不能乘到水面覆盖率；每个水水连接处的 coverage 必须连续且保持完整覆盖。

## User Request / 用户需求

- English: Eliminate the camera-angle-dependent dark river strips, disappearing inlet surfaces, disconnections, double refraction, and Z-fighting caused by independently rendered river and lake materials. Do not solve the inlet by stopping the river early, extending a second river surface into the lake, or preserving a nonzero alpha floor.
- 中文：消除由河流与湖泊材质独立渲染造成的随视角变化的深色河道条带、入口水面消失、断流、双重折射和 Z-fighting。不得通过提前截断河流、让第二张河面深入湖内或保留非零 Alpha 下限来处理入口。

- English: Use the complete shared-surface architecture: four hydrological basin batches, stitched river-to-lake transition topology, a common Water Info attribute prepass, and one single-layer optical resolve for all quality tiers. Preserve existing gameplay hydrology, player water detection, buoyancy, terrain sampling, terrain-height rules, and `height.webp`.
- 中文：采用完整的共享水面架构：四个水文盆地批次、缝合的河湖过渡拓扑、统一 Water Info 属性预通道，以及覆盖所有画质档的单层光学合成。保留现有玩法水文、玩家入水判断、浮力、地形采样、地形高度规则和 `height.webp`。

## Scope / 范围

### Unified surface geometry / 统一水面几何

- English: Every surface vertex provides the same eleven attributes: `waterDepth`, `shoreDistanceMeters`, `flowUv`, `flowDirection`, `junctionFlowDirection`, `flowSpeed`, `riverInfluence`, `rapidMask`, `junctionMask`, `disturbanceMask`, and `reflectionTier`. Lake-only values use neutral river defaults. `reflectionTier` is `0` for environment, `0.5` for probe, and `1` for alpine planar reflection.
- 中文：所有水面顶点都提供完全相同的十一项属性：`waterDepth`、`shoreDistanceMeters`、`flowUv`、`flowDirection`、`junctionFlowDirection`、`flowSpeed`、`riverInfluence`、`rapidMask`、`junctionMask`、`disturbanceMask` 和 `reflectionTier`。纯湖泊区域使用中性的河流属性默认值；`reflectionTier` 的 `0` 表示 environment、`0.5` 表示 probe、`1` 表示高山湖 planar reflection。

- English: Register all ten lakes and all fifteen river-to-lake interfaces. At each interface, find the river-centerline intersection with the analytic shoreline, retain the last complete cross-section outside the lake, remove the intersected lake outer-ring arc, and construct one unique five-row transition patch at signed positions `+L`, `+L/2`, `0`, `-L/2`, and `-L`, where `L = clamp(0.25 * inletWidth, 1m, 3m)`.
- 中文：登记全部十个湖泊和十五个河湖接口。每个接口都要计算河道中心线与解析湖岸的交点，保留湖外最后一个完整横断面，删除相交的湖泊外环弧段，并在有符号位置 `+L`、`+L/2`、`0`、`-L/2`、`-L` 生成唯一的五排过渡面，其中 `L = clamp(0.25 * 入口宽度, 1m, 3m)`。

- English: The `+L` row shares river indices, the `-L` row is inserted into and shares the lake's local inner-ring indices, and the inlet sector is retriangulated without coplanar overlap, flat end caps, cracks, duplicate triangles, degenerate triangles, non-manifold edges, or open interface edges. Wave displacement is suppressed at shared mouth vertices so river and lake surface heights remain identical.
- 中文：`+L` 行与河流索引共享，`-L` 行插入湖泊局部内环并共享其索引；入口扇区重新三角化，不得存在共面重叠、平头端面、裂缝、重复三角形、退化三角形、非流形边或接口开放边。共享河口顶点关闭湖泊波浪位移，保证河湖水面高度完全一致。

- English: Longitudinal influence is `smoothstep(-L, L, lakeSignedDistance)` and is multiplied by a lateral centerline weight that falls from full strength at `0.75 * halfWidth` to zero at `halfWidth`. Expected longitudinal samples are approximately `1` at `+L`, `0.5` at the shoreline, `0.15` at `-L/2`, and `0` at `-L`. Overlapping inlet influences combine as `1 - product(1 - Wi)`, with velocity normalized from the weighted velocity sum.
- 中文：纵向影响采用 `smoothstep(-L, L, lakeSignedDistance)`，并乘以横向中心线权重；横向权重在 `0.75 * halfWidth` 内为完整强度，到 `halfWidth` 时降为零。纵向采样预期为：`+L` 约 `1`、湖岸约 `0.5`、`-L/2` 约 `0.15`、`-L` 为 `0`。多个入口影响通过 `1 - product(1 - Wi)` 合并，速度由加权速度和归一化得到。

- English: Basin interior and river-to-lake junction coverage is always `1`. Only the true water-to-land perimeter uses `shoreDistanceMeters` with `fwidth()` for pixel-scale antialiasing. Shallow-water appearance comes from authored depth, absorption, refraction, scattering, and bed visibility rather than a multi-meter alpha fade. Removed mouth arcs generate no lake-shore foam, sediment bar, or dark shoreline band; river foam decays into the lake with `riverInfluence * riverInfluence`.
- 中文：盆地内部及河湖接口的 coverage 始终为 `1`。只有真实水陆外边界使用 `shoreDistanceMeters` 配合 `fwidth()` 进行像素级抗锯齿。浅水表现由 authored depth、吸收、折射、散射及河床可见度产生，不再使用数米宽的 Alpha 渐隐。被删除的入口湖岸弧段不得产生湖岸泡沫、泥沙横线或深色岸带；河流泡沫以 `riverInfluence * riverInfluence` 衰减进入湖内。

- English: Keep `getLakeOutsideFade()` exclusively for river-channel terrain, riverbed, wet-bank, gravel, underwater, vegetation, and related masks; every such river footprint remains strictly zero inside every lake. It must not control the unified surface coverage.
- 中文：`getLakeOutsideFade()` 仅继续用于河槽地形、河床、湿岸、砾石、水下、植被及相关遮罩；所有此类河流足迹在每个湖内都必须严格为零。它不得控制统一水面的 coverage。

### Water Info MRT and attribute material / Water Info MRT 与属性材质

- English: Create Water Info with `THREE.WebGLRenderTarget({ count: 2, depthTexture })`. In Balanced and Quality, attachment 0 (`WaterOptics`) is `RGBA16F`/`HalfFloatType`, `NearestFilter`, `NoColorSpace`: octahedral final world normal in R/G, authored depth in meters over `0–8m` in B, and coverage in A. Attachment 1 (`WaterMaterial`) is `RGBA8`/`UnsignedByteType`, `NearestFilter`, `NoColorSpace`: foam, roughness, `riverInfluence`, and `reflectionTier` in R/G/B/A.
- 中文：使用 `THREE.WebGLRenderTarget({ count: 2, depthTexture })` 创建 Water Info。Balanced 和 Quality 下，附件 0（`WaterOptics`）采用 `RGBA16F`/`HalfFloatType`、`NearestFilter`、`NoColorSpace`：R/G 存储八面体编码的最终世界法线，B 存储 `0–8m` 范围内以米为单位的 authored depth，A 存储 coverage。附件 1（`WaterMaterial`）采用 `RGBA8`/`UnsignedByteType`、`NearestFilter`、`NoColorSpace`：R/G/B/A 分别存储泡沫、roughness、`riverInfluence` 和 `reflectionTier`。

- English: Performance uses two packed `RGBA8` attachments, with an 8-bit octahedral normal and depth normalized by `8m`. If the preferred mixed floating-point framebuffer cannot initialize, dispose it and rebuild both attachments as `RGBA8`, emitting only one warning. The depth attachment is a `DepthTexture` using `DepthFormat`, `UnsignedIntType`, and `NearestFilter`, with no mipmaps, no stencil, and zero samples. Clear Water Info color to `0` and depth to `1`. Estimated additional storage is about `16 bytes/pixel` in high precision and `12 bytes/pixel` packed.
- 中文：Performance 使用两个 packed `RGBA8` 附件，其中法线为 8-bit 八面体编码，深度按 `8m` 归一化。若首选的混合浮点帧缓冲无法初始化，则销毁并将两个附件都重建为 `RGBA8`，且只警告一次。深度附件为 `DepthTexture`，使用 `DepthFormat`、`UnsignedIntType` 和 `NearestFilter`，不生成 mipmap、不使用 stencil、samples 为零。Water Info 颜色清为 `0`、深度清为 `1`。额外存储预算约为高精度 `16 bytes/pixel`、packed `12 bytes/pixel`。

- English: All four batches share one opaque GLSL 3 `UnifiedWaterAttributeMaterial` with `NoBlending`, depth write and depth test enabled, and `LessEqualDepth`. Its vertex stage performs final lake-wave displacement and mouth-wave suppression. Its fragment stage computes dynamic normals, flow, rapid, junction, disturbance, foam, roughness, coverage, and authored depth, then writes both MRT attachments. It samples no scene color and performs no refraction, reflection, absorption, scattering, Fresnel, tone mapping, or color-space conversion. Fragments with coverage below `1/255` are discarded before writing water depth.
- 中文：四个批次共用一个不透明的 GLSL 3 `UnifiedWaterAttributeMaterial`，使用 `NoBlending`，启用 depth write 与 depth test，并采用 `LessEqualDepth`。顶点阶段执行最终湖波位移与河口波浪抑制；片元阶段计算动态法线、流动、急流、汇流、扰动、泡沫、roughness、coverage 与 authored depth，并写入两个 MRT 附件。它不采样场景颜色，也不执行折射、反射、吸收、散射、Fresnel、tone mapping 或色彩空间转换。coverage 小于 `1/255` 的片元必须在写入水面深度前 discard。

### Unified resolve and pass order / 统一合成与 Pass 顺序

- English: All quality tiers use `BaseRenderPass -> UnifiedWaterPass -> GTAOPass (when enabled) -> AerialPerspectivePass (when enabled) -> ColorGradePass -> SMAA/Output/FXAA`. Performance must use packed Water Info, environment reflection, zero-pixel refraction, and low-detail normals through this same ownership model; it must not restore the old multi-transparent-surface path.
- 中文：所有画质档统一使用 `BaseRenderPass -> UnifiedWaterPass -> GTAOPass（按需启用） -> AerialPerspectivePass（按需启用） -> ColorGradePass -> SMAA/Output/FXAA`。Performance 通过同一水面所有权模型使用 packed Water Info、environment reflection、零像素折射和低细节法线；不得恢复旧的多透明水面路径。

- English: `UnifiedWaterPass` saves renderer, scene, visibility, camera-layer, clear, render-target, and shadow-update state; renders only the four basin batches into Water Info; then binds base color/depth, Water Info attachments, water-surface depth, environment, probe, and planar-reflection inputs to one resolve material. It restores all saved state on success or exception.
- 中文：`UnifiedWaterPass` 保存 renderer、scene、可见性、camera layer、clear、render target 与 shadow update 状态；只把四个盆地批次渲染进 Water Info；随后把 base color/depth、Water Info 附件、水面深度、environment、probe 与 planar reflection 输入绑定到唯一 resolve material。无论成功还是异常，都必须恢复全部保存状态。

- English: The fullscreen resolve copies the original scene when coverage is zero or when water is behind base-scene depth; reconstructs water world position from water depth; computes physical thickness from refracted scene depth with authored depth as cap and fallback; mixes river/lake absorption, scattering, and roughness by `riverInfluence`; executes Beer-Lambert attenuation, refraction, Fresnel, and reflection only once; and finishes with one `mix(sceneColor, waterColor, coverage)`. It writes linear HDR with alpha `1`, leaving tone mapping and output color space to `OutputPass`. Base-scene depth is preserved for existing GTAO and aerial perspective behavior, while water depth remains private to the unified pass.
- 中文：全屏合成在 coverage 为零或水面位于 base scene depth 后方时原样复制场景；从水面深度重建水面世界坐标；使用折射后的场景深度计算实际水体厚度，并以 authored depth 作为上限和回退；通过 `riverInfluence` 混合河湖的吸收、散射和 roughness；Beer-Lambert 衰减、折射、Fresnel 与反射均只执行一次；最终只调用一次 `mix(sceneColor, waterColor, coverage)`。输出为 Alpha `1` 的 linear HDR，tone mapping 与输出色彩空间仍由 `OutputPass` 负责。保留 base scene depth 以维持现有 GTAO 与大气透视行为，水面深度仅在统一水体 pass 内使用。

- English: Render waterfall curtains, lip foam, confluence foam, spray, and mist onto the same composer write buffer after optical resolve. Planar and probe capture hides both `surfaceRoot` and `effectsRoot` to prevent recursive capture. Water Info, composer color targets, and their independent depth textures follow the composer physical internal size, pixel ratio, and dynamic-resolution changes.
- 中文：光学合成后，将瀑布水帘、唇部泡沫、汇流泡沫、飞沫与薄雾绘制到同一个 composer write buffer。Planar 与 probe 捕获时同时隐藏 `surfaceRoot` 和 `effectsRoot`，防止递归捕获。Water Info、composer 颜色目标及各自独立的深度纹理必须同步 composer 的物理内部尺寸、像素比和动态分辨率变化。

### Scene integration and cleanup / 场景集成与清理

- English: Add `createUnifiedWaterSystem(terrain)` returning `surfaceRoot`, `effectsRoot`, `basinStats`, `update(time, camera)`, and `dispose()`. `surfaceRoot` contains only the four basin batches; `effectsRoot` contains only post-resolve forward water effects. `scene.js` uses these two roots as the water rendering entry points.
- 中文：新增 `createUnifiedWaterSystem(terrain)`，返回 `surfaceRoot`、`effectsRoot`、`basinStats`、`update(time, camera)` 与 `dispose()`。`surfaceRoot` 仅包含四个盆地批次，`effectsRoot` 仅包含合成后的前向水体特效；`scene.js` 只使用这两个根节点作为水体渲染入口。

- English: Convert `createRiverWaterMesh()`, `createWaterSystem()`, and `createSmallLakes()` to provide geometry/hydrology/effect sources instead of independently shaded optical surface meshes. Remove obsolete surface `renderOrder`, per-object reflection caps, standalone full-optics shaders, per-material scene-buffer binding, `USE_SINGLE_LAYER_WATER`, blending-mode quality switches, object-level reflection arbitration, `WaterCompositePass`, and the `singleLayerWater` quality/pass-order branch. Reuse existing noise, two-phase flow, reflection, and volumetric optical functions only where they directly support the attribute material or unified resolve.
- 中文：将 `createRiverWaterMesh()`、`createWaterSystem()` 与 `createSmallLakes()` 改为提供几何、水文或特效源，而不是创建独立着色的光学水面。移除失效的 surface `renderOrder`、对象级反射上限、独立全光学 Shader、逐材质场景缓冲绑定、`USE_SINGLE_LAYER_WATER`、按画质切换 blending、对象级反射抢占、`WaterCompositePass` 以及 `singleLayerWater` 画质/Pass 顺序分支。现有噪声、双相流动、反射和体积光学函数只在直接服务于属性材质或统一合成时复用。

- English: `waterContext.js` continues to own environment texture, local cube probe, alpine planar reflector, reflection update cadence and quality, and water-atmosphere parameters. It binds reflection textures, matrices, intensity, camera, and time only to the single resolve material. CPU hydrology, terrain carving, player water checks, buoyancy, gameplay sampling, and deterministic terrain assets remain numerically and behaviorally unchanged.
- 中文：`waterContext.js` 继续负责 environment texture、本地 cube probe、高山湖 planar reflector、反射更新频率与质量以及水雾环境参数；它只向唯一 resolve material 绑定反射纹理、矩阵、强度、相机和时间。CPU 水文、地形雕刻、玩家入水判断、浮力、玩法采样和确定性地形资源在数值和行为上均保持不变。

## Acceptance Criteria / 验收标准

### Topology and data / 拓扑与数据

- English: Exactly four indexed basin surface batches are created, limiting primary water-surface draw calls to four. The registry contains all ten lakes and all fifteen river-to-lake interfaces. Total primary-water triangles do not exceed 110% of the current baseline.
- 中文：严格创建四个索引化盆地水面批次，主要水面 draw call 不超过四个。Registry 包含全部十个湖泊和十五个河湖接口。主要水面三角形总数不超过当前基线的 110%。

- English: At every interface, measured `riverInfluence` is approximately `1`, `0.5`, `0.15`, and `0` at `+L`, shoreline, `-L/2`, and `-L`; coverage remains `1` across the complete water-to-water patch. Shared vertex positions differ by less than `1cm` and river/lake surface height differs by less than `5mm`. Automated topology checks find no duplicate coplanar triangle, degenerate triangle, non-manifold edge, crack, or open interface boundary.
- 中文：每个接口在 `+L`、湖岸、`-L/2` 和 `-L` 处测得的 `riverInfluence` 分别约为 `1`、`0.5`、`0.15` 和 `0`；完整水水过渡面的 coverage 始终为 `1`。共享顶点坐标误差小于 `1cm`，河湖水面高度差小于 `5mm`。自动化拓扑检查不得发现重复共面三角形、退化三角形、非流形边、裂缝或接口开放边。

- English: Full lake-interior scans verify that river-channel terrain, riverbed, wet-bank, gravel, underwater, vegetation, and related masks are exactly zero inside all lake boundaries. Existing CPU water levels, entry checks, buoyancy, terrain samples, terrain-height rules, and the bytes of `height.webp` remain unchanged.
- 中文：对全部湖内区域的完整扫描确认河槽地形、河床、湿岸、砾石、水下、植被及相关遮罩在所有湖岸边界内严格为零。现有 CPU 水位、入水判断、浮力、地形采样、地形高度规则以及 `height.webp` 文件字节保持不变。

### Render pipeline / 渲染管线

- English: Tests verify two MRT attachments, requested/fallback formats, `NearestFilter`, `NoColorSpace`, depth-texture format/type, clear values, packed-depth encoding, the one-warning RGBA8 fallback, and disposal. Water Info dimensions always match composer physical internal dimensions after resize, pixel-ratio, dynamic-resolution, and repeated quality changes.
- 中文：测试验证两个 MRT 附件、首选/回退格式、`NearestFilter`、`NoColorSpace`、深度纹理格式与类型、clear 值、packed depth 编码、只警告一次的 RGBA8 回退以及资源释放。经过 resize、像素比、动态分辨率和反复画质切换后，Water Info 尺寸始终与 composer 的物理内部尺寸一致。

- English: Performance, Balanced, and Quality all report `BaseRenderPass -> UnifiedWaterPass` before optional post effects. Shader and pass tests demonstrate one optical resolve per pixel and no active legacy transparent-water path. Foreground rocks, characters, banks, and terrain correctly occlude the water. Alpine planar, ordinary-lake probe, and river environment reflections select and degrade according to `reflectionTier` and the active quality profile.
- 中文：Performance、Balanced 与 Quality 三档在可选后处理前均报告 `BaseRenderPass -> UnifiedWaterPass`。Shader 与 Pass 测试证明每像素只进行一次光学合成，且旧透明水面路径不再处于激活状态。前景岩石、角色、河岸和地形正确遮挡水面。高山湖 planar、普通湖 probe 与河流 environment 反射按照 `reflectionTier` 和当前画质配置正确选择及降级。

- English: Switching among all three quality profiles for six consecutive cycles does not produce sustained growth in renderer programs, textures, render targets, event listeners, or retained materials. Exceptions during either Water Info or resolve leave renderer, scene, camera, visibility, background, render-target, and shadow-update state fully restored.
- 中文：连续六轮切换三档画质后，renderer programs、textures、render targets、事件监听器或保留材质的数量不得持续增长。Water Info 或合成阶段发生异常后，renderer、scene、camera、可见性、背景、render target 与 shadow update 状态必须全部恢复。

### Visual regression / 视觉回归

- English: Inspect every interface from top-down, oblique top-down, upstream/downstream, cross-mouth, `10–15°` grazing, and underwater `0.5m` upward-looking views. A full `360°` camera orbit produces no angle-dependent strip, disappearing water, disconnected flow, double refraction, dark river outline, Z-fighting, one-pixel crack, flat cap, or foam bar. The user's reported terminal-lake view, the spawn-point lake, and the terminal lake are fixed regression cameras.
- 中文：从正俯视、斜俯视、顺河/逆河、横跨河口、`10–15°` 掠射角和水下 `0.5m` 向上视角检查每个接口。相机完整环绕 `360°` 时不得出现随角度变化的条带、水面消失、断流、双重折射、深色河道轮廓、Z-fighting、一像素裂缝、平头端面或泡沫横封。用户报告的终点湖视角、出生点湖和终点湖均作为固定回归镜头。

- English: At `t=0s`, `5s`, and `15s`, lake waves, directional river flow, junction normals, disturbances, and foam remain temporally continuous across stitched topology. Waterfall curtains, lip foam, confluence foam, spray, and mist remain visible and correctly depth-sorted after the unified resolve.
- 中文：在 `t=0s`、`5s` 和 `15s`，湖波、河流定向流纹、汇流法线、扰动与泡沫在缝合拓扑上保持时间连续。瀑布水帘、唇部泡沫、汇流泡沫、飞沫与薄雾在统一合成后仍可见并正确进行深度排序。

### Performance and verification / 性能与验证

- English: Record before/after CPU frame time, GPU frame time, draw calls, triangles, programs, textures, render-target count, and estimated water-buffer memory for all three quality profiles using the same camera and deterministic scene state. Maximum accepted frame-time regression is `3%` for Performance, `5%` for Balanced, and `8%` for Quality. If a tier exceeds its limit, optimize MRT bandwidth or attribute-shader cost without reintroducing the old multi-transparent-water path.
- 中文：在相同相机和确定性场景状态下，记录三档画质改动前后的 CPU 帧时、GPU 帧时、draw calls、三角形数、programs、textures、render target 数量及水体缓冲显存估算。允许的最大帧时退化为 Performance `3%`、Balanced `5%`、Quality `8%`。若某档超限，应优化 MRT 带宽或属性 Shader 成本，不得重新引入旧的多透明水面路径。

- English: `npm test`, `npm run check:lowlands`, `npm run build`, and `git diff --check` all pass. The existing unrelated production-bundle size warning remains an accepted baseline warning. The implementation and this bilingual requirement document are committed together as `refactor: unify water surface rendering`.
- 中文：`npm test`、`npm run check:lowlands`、`npm run build` 与 `git diff --check` 全部通过。现有无关的生产包体积警告继续作为可接受的基线警告。实现代码与本双语需求文档一并提交，提交信息为 `refactor: unify water surface rendering`。
