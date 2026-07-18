# Cold Mountain 统一水面 Harness Benchmark Prompt

> 审计日期：2026-07-14  
> 适用项目：当前 `my-example` 冻结快照  
> 用途：测试大模型在大型代码库理解、脏工作区保护、Three.js/WebGL 实现、自动化测试、浏览器验证和性能取证方面的能力。

## 使用说明

当前项目已经包含完整的第三人称高山场景基础：分块地形、植被流送与 LOD、水文网络、玩家与相机、画质档、动态分辨率、后处理、固定镜头和性能采样。最适合作为主评测任务的工作不是从零搭建 Demo，也不是增加天气或 NPC，而是完成并证明当前统一水面渲染管线切换。

正式对比不同模型前：

1. 暂停所有会修改源目录的进程或会话。
2. 将当前目录完整复制为不可变评测快照。
3. 每个候选模型使用该快照的独立副本。
4. 记录快照 SHA 或文件 manifest hash。
5. 不要硬编码测试总数；以冻结快照上的实际 baseline 为准。

资源真源是 `public/`。`dist/` 是生成结果。项目没有 HDR/EXR，环境光来自程序化纹理。

## Prompt

````text
# Cold Mountain 项目任务：完成并证明统一水面渲染管线切换

你是一名资深 Three.js、WebGL、实时渲染、图形性能和自动化验证工程师。

请直接在当前仓库的冻结评测副本中完成实现、测试和验证，不要只输出方案或示例代码。

本任务用于同时评估：

- 大型代码库理解能力
- 脏工作区与已有实现保护能力
- 跨模块架构推理能力
- Indexed BufferGeometry 和拓扑算法能力
- GLSL、MRT、深度、透明与后处理能力
- Three.js 状态保存、恢复和资源释放能力
- 自动化测试能力
- 浏览器与真实 WebGL/GPU 验证能力
- 截图、性能、资源生命周期证据收集能力
- 对未验证事项的诚实汇报能力

## 0. 快照与安全前提

你当前工作的目录必须是从原项目冻结出的独立评测副本，而不是仍被其他进程修改的活动工作区。

开始前记录：

```bash
git rev-parse HEAD
git status --short --branch
git diff --stat
git diff
node --version
npm --version
```

如果评测方提供了冻结快照 ID、manifest hash 或 baseline artifact 目录，也必须记录。

重要约束：

- 当前仓库包含有意保留的、尚未提交的统一水面重构。
- 这些已有修改属于任务起点，不是需要清除的垃圾状态。
- 不得执行 `git reset`、`git checkout`、`git restore`、`git clean`、`git stash` 或其他会丢失已有工作的命令。
- 不得把文件恢复成旧版 `main`。
- 不得整体覆盖已有实现。
- 编辑前重新读取目标文件；如果文件在本次运行中意外变化，停止并报告冲突。
- 除非用户随后明确要求，否则不要 commit、push 或创建 PR。
- 不得硬编码测试总数。以冻结快照上实际运行出的 baseline 为准。

## 1. 开始编辑前必须阅读

先阅读根目录及相关子目录中的项目说明，例如：

- `AGENTS.md`
- `CLAUDE.md`，如果存在

然后完整阅读：

- `docs/requirements/2026-07-14-unified-water-surface-pipeline.md`

检查当前工作区、调用链和测试，至少包括：

### 运行时集成

- `src/main.js`
- `src/scene.js`
- `src/postProcessing.js`
- `src/renderQuality.js`

### 统一水面

- `src/unifiedWaterSurface.js`
- `src/unifiedWaterPass.js`
- `src/waterContext.js`
- `src/waterSystem.js`
- `src/riverChannel.js`
- `src/smallLakes.js`
- `src/flowingRiverMaterial.js`
- `src/hydrology/riverNetwork.js`
- `src/hydrology/riverNetworkWaterGeometry.js`

### 验证工具

- `src/goldenShots.js`
- `src/performanceBenchmark.js`

### 相关测试

- `tests/unified-water-surface.test.js`
- `tests/unified-water-pass.test.js`
- `tests/lake-water-optics.test.js`
- `tests/water-context.test.js`
- `tests/post-processing.test.js`
- `tests/flowing-water-time.test.js`
- 其他涉及 hydrology、terrain、river、lake 和 quality preset 的测试

先运行一次 baseline：

```bash
npm test
npm run check:lowlands
npm run build
git diff --check
```

记录真实输出。如果冻结 baseline 本身失败，先判断它是任务中明确需要完成的统一水面缺口，还是快照损坏/环境问题；不要静默改变预期。

## 2. 唯一目标

完成、加固并证明现有统一水面架构：

- 所有基础河流和湖泊水面只能由四个索引化 basin batch 持有。
- 所有画质档都通过一个 Water Info MRT 预通道和一次全屏 optical resolve 完成水体光学。
- 不得再建立第二套独立水 Shader。
- 只有瀑布水帘、唇部泡沫、汇流泡沫、飞沫和薄雾允许作为 resolve 后的 forward effects。
- 已经正确实现的部分不要为了“符合旧审计描述”而重写；应通过测试和运行时证据证明它们正确。
- 仍存在的拓扑、所有权、反射、生命周期、视觉或性能缺口必须真正修复，不能只修改测试或截图。

## 3. 可复用资源

资源真源均位于 `public/`。

浏览器 URL 会去掉 `public` 前缀，例如：

```text
文件：public/assets/terrain/height.webp
URL： /assets/terrain/height.webp
```

必须先检查项目现有 TextureLoader、KTX2Loader、GLTFLoader 和 FBXLoader 用法，复用已有 loader、缓存、色彩空间、Meshopt 和 disposal 模式，不要创建平行加载系统。

### 3.1 KTX2 Basis 转码器

- `public/basis/basis_transcoder.js`
- `public/basis/basis_transcoder.wasm`

运行时 transcoder path 应继续使用项目已有的 `/basis/`。

### 3.2 地形与水岸纹理

- `public/assets/terrain/height.webp`
- `public/assets/terrain/rock-alpine.webp`
- `public/assets/terrain/rock-alpine-normal.png`
- `public/assets/terrain/snow-alpine.webp`
- `public/assets/terrain/scree-alpine.webp`
- `public/assets/terrain/river-bed.webp`
- `public/assets/terrain/river-bank-rock-wet-light-alt.webp`
- `public/assets/terrain/forest-floor/optimized/forest_floor_basecolor_1k.jpg`
- `public/assets/terrain/forest-floor/optimized/forest_floor_basecolor_2k.jpg`
- `public/assets/terrain/forest-floor/optimized/forest_floor_normal_1k.jpg`
- `public/assets/terrain/forest-floor/optimized/forest_floor_normal_2k.jpg`
- `public/assets/terrain/forest-floor/optimized/forest_floor_orm_1k.ktx2`
- `public/assets/terrain/forest-floor/optimized/forest_floor_orm_2k.ktx2`

不得修改 `public/assets/terrain/height.webp` 的字节。开始和结束时都记录其 SHA-256。

### 3.3 Ribbon Grass 贴图

以下每种贴图都有 `1k` 和 `2k` 两档：

```text
public/assets/vegetation/ribbon-grass/optimized/ktx2/
  Ribbon_Grass_AO_{1k,2k}.ktx2
  Ribbon_Grass_BaseColor_{1k,2k}.ktx2
  Ribbon_Grass_Billboard_BaseColor_{1k,2k}.ktx2
  Ribbon_Grass_Billboard_Normal_{1k,2k}.ktx2
  Ribbon_Grass_Billboard_Opacity_{1k,2k}.ktx2
  Ribbon_Grass_Normal_{1k,2k}.ktx2
  Ribbon_Grass_Opacity_{1k,2k}.ktx2
  Ribbon_Grass_Roughness_{1k,2k}.ktx2
  Ribbon_Grass_Translucency_{1k,2k}.ktx2
```

花括号表示现有文件族，不是可以直接传给 loader 的 URL。

### 3.4 Ribbon Grass 模型

六个变体 `VarA` 到 `VarF`，每个有 `LOD0`、`LOD1`、`LOD2`：

```text
public/assets/vegetation/ribbon-grass/optimized/models/
  Ribbon_Grass_tbdpec3r_High_tbdpec3r_VarA_LOD0.glb
  ...
  Ribbon_Grass_tbdpec3r_High_tbdpec3r_VarF_LOD2.glb
```

### 3.5 树木模型

- `public/assets/vegetation/tree_01.glb`
- `public/assets/vegetation/tree_02.glb`
- `public/assets/vegetation/tree_03.glb`
- `public/assets/vegetation/tree_04.glb`
- `public/assets/vegetation/tree_spawn.glb`

### 3.6 岩石模型

- `public/assets/vegetation/rock_01.glb`
- `public/assets/vegetation/rock_02.glb`
- `public/assets/vegetation/rock_03.glb`
- `public/assets/vegetation/rock_04.glb`
- `public/assets/vegetation/rock_05.glb`
- `public/assets/vegetation/rock_06.glb`
- `public/assets/vegetation/rock_07.glb`
- `public/assets/vegetation/rock_08.glb`
- `public/assets/vegetation/rock_09.glb`

### 3.7 玩家模型与动画

- `public/assets/player/stand.fbx`
- `public/assets/player/walk.fbx`

### 3.8 当前任务不使用的休眠角色资源

下列文件存在，但本任务不得引入敌人、NPC 或战斗。路径大小写敏感：

- `public/assets/enemy/e2.fbx`
- `public/assets/enemy/Stand.fbx`
- `public/assets/enemy/walk.fbx`
- `public/assets/enemy/run.fbx`
- `public/assets/enemy/sit.fbx`
- `public/assets/enemy/attack.fbx`
- `public/assets/enemy/thrust_attack.fbx`
- `public/assets/enemy/cross_guard.fbx`
- `public/assets/enemy/hurt.fbx`
- `public/assets/enemy/death.fbx`

### 3.9 资源边界

- `dist/` 与 `dist/assets/` 是生成结果，不是资源真源，不得手工编辑。
- 项目不存在 HDR 或 EXR 文件。
- 环境照明是程序化生成的，不得添加不存在的 HDR/EXR 路径。
- 当前 `hero-4k` 名称实际仍映射到 2k 资源，不要借本任务制造不存在的 4k 资源或改变质量预算。
- 浏览器验证中不能出现资源 404、Basis/KTX2 转码错误或错误加载休眠 enemy 资产。

## 4. 实现要求

### 4.1 基础水面拓扑

最终必须满足：

- 严格四个基础水面 renderable。
- 每个 basin 只能有一个 Mesh、一个 indexed `BufferGeometry` 和一个基础水面 draw。
- 覆盖需求文档定义的十个湖泊和十五个唯一河湖接口。
- 每个顶点提供需求定义的十一项属性：
  - `waterDepth`
  - `shoreDistanceMeters`
  - `flowUv`
  - `flowDirection`
  - `junctionFlowDirection`
  - `flowSpeed`
  - `riverInfluence`
  - `rapidMask`
  - `junctionMask`
  - `disturbanceMask`
  - `reflectionTier`

每个河湖接口必须使用唯一的五排过渡：

```text
+L
+L/2
0
-L/2
-L
```

其中：

```text
L = clamp(0.25 * inletWidth, 1m, 3m)
```

要求：

- 河流端和湖泊端必须共享真实顶点索引。
- 空间坐标重合但索引相互独立不算拓扑缝合。
- 删除与河口相交的原湖岸弧，并重新三角化入口扇区。
- 共享河口位置误差小于 1cm。
- 河湖表面高度差小于 5mm。
- 不得存在裂缝、T-junction、重叠面、共面重复三角形、退化三角形、非流形边、水水接口开放边、平头 cap 或错误 winding。
- 合法的水陆外轮廓可以开放，验证器必须区分合法外边界和非法水水接口边界。

`riverInfluence` 在中心线纵向应近似满足：

```text
+L         = 1
shoreline  = 0.5
-L/2       = 0.15625
-L         = 0
```

横向要求：

- 在 `0.75 * halfWidth` 范围内保持完整影响。
- 在 bank edge 衰减到 0。

多个入口影响重叠时：

```text
combined = 1 - product(1 - Wi)
```

流向来自所有贡献的加权速度和，再归一化。

必须增加一个不依赖当前 authored 空间布局的合成重叠入口测试。

水水过渡区域 coverage 必须保持 1。`getLakeOutsideFade()` 可以继续影响地形、河床、湿岸、砾石、水下和植被 footprint，但绝不能控制统一水面 coverage。

测试必须直接检查真实 positions、indices 和 attributes，不能只相信 registry metadata 或 `userData.stats`。

### 4.2 单一光学所有权

所有基础水面必须使用：

```text
四个 basin surface batches
→ Water Info MRT
→ 一次 fullscreen resolve
```

Water Info pass：

- 两个颜色 attachment。
- 独立水深纹理。
- attachment 使用 `NearestFilter` 和 `NoColorSpace`。
- Balanced/Quality 使用需求指定的高精度格式。
- Performance 使用 packed RGBA8，但仍走同一统一路径。
- 共享一个 opaque GLSL 3 attribute material。
- `NoBlending`。
- 开启 depth test/write。
- 不采样 scene color。
- 不执行 reflection、refraction、absorption、scattering、Fresnel、tone mapping 或色彩空间转换。

Fullscreen resolve：

- 每个覆盖像素只执行一次水体光学。
- 负责折射、吸收、散射、Fresnel、反射、泡沫和雾。
- 保留 base-scene depth，供后续 GTAO 和 aerial perspective 使用。
- Performance 必须保留统一路径，不能恢复旧透明水面。

必须退休或转换所有活动或休眠的重复基础水面光学所有权，包括：

- 独立透明河流/湖泊全光学材质
- `USE_SINGLE_LAYER_WATER`
- `WaterCompositePass`
- `singleLayerWater` 分支
- 每对象 scene-color/depth buffer uniforms
- 每对象 reflection arbitration/caps
- 依赖基础 surface `renderOrder` 的透明排序
- 仍能构成备用基础水面的“兼容”全光学 Shader

`createRiverWaterMesh()`、`createWaterSystem()` 和 `createSmallLakes()` 可以继续提供几何、水文数据或允许的 effects，但不能拥有独立基础河湖光学。

透明材质只允许用于 resolve 后的：

- 瀑布水帘
- lip foam
- confluence foam
- spray
- mist

必须通过运行时 scene traversal、材质分类和 draw trace 证明单一所有权，不能只靠源码搜索。

### 4.3 Pass 和反射语义

三档 pass 顺序必须为：

```text
BaseRenderPass
→ UnifiedWaterPass
→ optional GTAO
→ optional AerialPerspective
→ ColorGrade
→ AA / Output
```

`reflectionTier`：

```text
0   = environment
0.5 = probe
1   = alpine planar
```

降级规则：

- Performance：所有 tier 使用 environment。
- Balanced：tier 0 使用 environment，tier 0.5 和 1 使用 probe。
- Quality：0/0.5/1 分别使用 environment/probe/planar。
- planar 缺失时降到 probe。
- probe 缺失时降到 environment。

`waterContext.js` 继续拥有：

- 程序化 environment
- local cube probe
- alpine planar reflector
- 更新 cadence
- 质量配置
- 水体雾和光照参数

这些资源只能绑定给唯一 fullscreen resolve material。

probe/planar 捕获时必须同时隐藏：

- `surfaceRoot`
- `effectsRoot`

防止水体递归捕获自己。

### 4.4 状态恢复和资源生命周期

UnifiedWaterPass 在正常路径和异常路径都必须恢复：

- 当前 render target
- active cube face 和 mip level
- clear color、alpha、depth
- auto-clear 状态
- scene background
- scene override material
- camera layers
- 对象 visibility
- matrix update 状态
- shadow auto-update/needs-update 状态

分别在三个阶段注入异常并测试恢复：

1. Water Info render
2. fullscreen resolve
3. effects render

当首选 MRT 创建失败时：

- 先 dispose 失败资源。
- 再创建 packed fallback。
- 同一类失败只能输出一次 warning。

Water Info target 必须在以下变化后与 composer 的物理内部尺寸完全一致：

- resize
- DPR 变化
- dynamic-resolution scale 变化
- quality rebuild

完成一次 warm-up 后，连续运行六轮：

```text
Performance → Balanced → Quality
```

要求 programs、textures、render targets、materials 和 event listeners 不出现持续或单调增长。

## 5. 自动化测试要求

新增或加强测试，至少覆盖：

- 四个真实基础 water drawables
- 十湖、十五接口、十一属性
- 五排位置及共享索引
- T-junction、几何重复、共面重叠、degenerate、non-manifold、open interface edge 和 winding 检测
- 合成重叠入口的 influence 与 velocity
- coverage 与 `getLakeOutsideFade()` 边界
- MRT 格式、packed encode/decode、clear values、fallback 和 disposal
- 三档反射选择和缺失输入降级
- resize、DPR、dynamic resolution 和 quality rebuild
- 三个异常阶段的状态恢复
- legacy 基础光学路径已退休
- 六轮资源生命周期

禁止：

- 删除、跳过或禁用测试
- 仅为通过测试而降低断言精度
- 把当前 bug 改写成“兼容预期”
- 用 metadata-only、regex-only 或 mock-only 测试声称完成真实拓扑或 GPU 要求
- 修改需求文档来匹配实现

如果旧测试仍在认可 legacy optics，应把它更新为更严格的新架构行为测试，而不是简单删除。

## 6. 浏览器和视觉验证

必须启动真实应用并使用真实 WebGL。

优先复用已有机制：

- `?shot=<key>`
- `?capture=1`
- `?quality=performance|balanced|quality`
- `?benchmark=1`
- benchmark timing 参数
- `body.is-ready`
- `body.assets-ready`
- `window.__renderBenchmarkResults`
- `window.__renderBenchmarkEnvironment`

如果现有机制缺少绝对水时间、reflection-ready 状态、GPU readback 或资源计数，只增加最小且可测试的诊断接口；不要创建第二套截图框架或引入应用框架。

捕获前必须等待：

```text
body.is-ready
body.assets-ready
reflection/probe/planar ready
```

确定性捕获必须固定：

- camera
- simulation time
- water time
- vegetation streaming/LOD 状态
- quality
- viewport
- DPR
- drawing-buffer size
- dynamic-resolution scale
- reflection readiness

支持至少三个绝对水时间：

```text
0s
5s
15s
```

验证矩阵：

1. 枚举 `listGoldenShotNames()` 的全部现有固定镜头，在 Balanced、固定时间下捕获。
2. 对水体关键镜头额外覆盖 Performance、Balanced、Quality。
3. 对十五个河湖接口至少生成：
   - 俯视
   - 斜俯视
   - 顺河/逆河
   - 横跨河口
   - 10–15° 掠射角
   - 水下约 0.5m 向上
4. 对每个接口执行完整方位环绕；可只保存关键帧、像素统计和失败帧。
5. 同一 URL 和状态重复捕获至少三次，确认结果位于同一环境的确定性噪声阈值内。

不能只凭 RGB 截图肉眼判断。应使用浏览器/GPU readback 或最小诊断扩展验证：

- coverage 连续
- 水面 depth 有效
- 不存在一像素孔洞或随视角出现的 seam
- 前景 terrain、bank、rock、player 正确遮挡水面
- 使用可区分的测试颜色时，GPU 实际选择了正确的 environment/probe/planar
- resolve 后 effects 仍有 draw 和可见像素

视觉硬门槛：

- 无裂缝
- 无 inlet gap
- 无断流或 missing water
- 无重复折射或双层水面
- 无 Z-fighting
- 无随视角出现的硬黑河道条带
- 无横封河口的泡沫/沉积线
- 无一像素 seam
- 无平头 river cap
- 无 winding 导致的消失或翻面
- 无错误 foreground occlusion
- 无 reflection recursion
- 无缺失或排序错误的瀑布、泡沫、飞沫和薄雾
- 河流方向性流纹能连续进入湖内并自然衰减
- 浅水外观来自真实 depth、吸收、折射、散射和河床可见性，而不是宽 Alpha fade

Console/network 必须满足：

- 无 Shader compile/link 错误
- 无 WebGL invalid operation/framebuffer 错误
- 无资源 404
- 无 Basis/KTX2 转码错误
- 不请求 HDR/EXR
- 不加载休眠 enemy 资源

如果当前 harness 没有可用浏览器或真实 GPU，明确把这些项目标记为 blocked，不得伪造已验证结果。

## 7. 性能与资源验证

所有 before/after 对比必须使用同一个冻结快照基线，以及相同的：

- 浏览器版本
- GPU
- viewport
- DPR
- drawing-buffer size
- quality
- fixed camera
- deterministic time
- warm-up
- sampling duration
- cache procedure

优先扩展现有 `FrameBenchmark`，不要另写互不兼容的 FPS Demo。

至少记录：

- CPU render-submission time
- GPU frame time，来自 WebGL timer query
- total draw calls
- primary-water draw calls
- triangles
- programs
- textures
- live render-target count
- estimated water-buffer bytes
- 环境元数据
- timer-query availability/disjoint 状态

不得把 rAF 间隔或墙钟 FPS 当成 GPU time。

如果 GPU timer query 不可用，标记 blocked，不得发明数值。

相对冻结 baseline，median CPU 或 GPU frame-time 最大允许回退：

- Performance：3%
- Balanced：5%
- Quality：8%

另外：

- 全地图水体诊断相机下，基础 Water Info surface draw 必须严格为 4。
- fullscreen optical resolve 必须严格为 1。
- 普通相机下基础 surface draw 不得超过 4。
- effects draw 单独统计。
- 不得通过降低分辨率、修改既定 quality profile、关闭反射、隐藏植被、减少 water coverage 或关闭 effects 来通过性能门槛。

## 8. 必须保持不变

除非有可复现证据证明是完成统一水面的必要修改，否则不得改变：

- CPU hydrology
- authored water levels
- terrain carving
- terrain sampling
- `public/assets/terrain/height.webp`
- player controls
- third-person camera
- gameplay water checks
- vegetation exclusion、streaming 和 LOD
- 三档既定质量预算
- dynamic resolution 行为
- `waterContext.js` 的反射所有权和更新 cadence
- waterfall、foam、spray、mist 的 resolve 后顺序
- 与本任务无关的 terrain editor、道路、山体和玩法

## 9. 明确禁止

- 手工编辑 `dist/`
- 修改或替换 `public/` 资源
- 创建第二个基础水面 Shader
- 使用重叠水面、Alpha floor、camera-specific hide 或 capture-only 分支掩盖问题
- 只修截图，不修真实运行时
- 硬编码一个镜头、接口或画质档
- 禁用测试、跳过测试或弱化断言
- 把源码正则匹配当成真实 GPU 证明
- 把实现自己生成的 metadata 当作唯一拓扑真相
- 修改需求以匹配 bug
- 加入天气、敌人、NPC、照片模式、任务或其他无关功能
- 加入不必要框架、loader 或依赖
- commit 或 push
- 声称运行了实际未运行的浏览器、GPU、性能或泄漏检查

## 10. 最终验证命令

至少执行并记录：

```bash
npm test
npm run check:lowlands
npm run build
git diff --check
shasum -a 256 public/assets/terrain/height.webp
git status --short
git diff --stat
```

启动浏览器验证：

```bash
npm run preview -- --host 127.0.0.1 --port 4173
```

示例入口：

```text
http://127.0.0.1:4173/?shot=shore&capture=1&quality=balanced
http://127.0.0.1:4173/?shot=waterfall&capture=1&quality=quality
http://127.0.0.1:4173/?shot=terminal-lake-overhead&capture=1&quality=performance
http://127.0.0.1:4173/?benchmark=1&shot=river-reference-overhead&quality=balanced
```

实际镜头名以 `listGoldenShotNames()` 为准。

不要硬编码测试总数。新增测试可以提高总数，但不得删除、跳过或遗漏原有测试。

## 11. 完成定义

只有以下全部满足才算完成：

1. 标准测试、lowlands、build 和 `git diff --check` 通过。
2. `height.webp` hash 与 baseline 一致。
3. 四个真实基础 drawables、十湖、十五接口、十一属性和五排拓扑由真实 buffer 验证。
4. 无 crack、T-junction、几何重复、共面重叠、degenerate、non-manifold、open interface edge 或 invalid winding。
5. 多入口 influence、coverage 和 velocity 正确。
6. 运行时只有四个基础 Water Info surface draws 和一次 optical resolve。
7. 没有活动或休眠的备用基础光学实现。
8. MRT、depth、reflection tier、occlusion 和 effect ordering 在真实 WebGL 上通过。
9. 三个异常阶段都完整恢复状态。
10. 六轮 warmed quality cycle 无持续资源增长。
11. 固定视图、接口视图和环绕检查满足视觉标准。
12. 无 Shader/WebGL 错误、资源 404 或不存在的 HDR/EXR 请求。
13. 三档性能在规定预算内，且没有降低质量语义。
14. 最终每项结论都能指向可重放的 artifact。

任何 blocked 或未执行项都必须如实列出；不能因为 Node tests 和 build 通过就宣称真实 GPU、视觉和性能已经通过。

## 12. 最终回复格式

严格按以下结构回复：

### Snapshot

- Frozen snapshot identity:
- Initial git status:
- Baseline test count:
- Final test count:
- Node/npm/browser/GPU/viewport/DPR:
- Baseline artifact directory:
- Final artifact directory:

### Files changed

| Repo-relative file | 修改原因 | 如何保留原有冻结修改 |
|---|---|---|

### Verification

| Exact command | Exit status | 关键结果 | Artifact/log path |
|---|---:|---|---|

### Topology and ownership

- Basin drawable count:
- Lake count:
- Interface count:
- Attribute count:
- Primary Water Info draws:
- Fullscreen resolve count:
- Triangle baseline/final/delta:
- Topology validator artifact:
- Legacy-path runtime trace:

### Browser and visual evidence

- Golden-shot manifest:
- Interface-view manifest:
- Orbit/readback results:
- Deterministic repeat-diff results:
- Console/network log:
- Shader/WebGL/404 summary:
- Remaining visual defects:

### Performance

| Quality | Baseline CPU | Final CPU | Delta | Baseline GPU | Final GPU | Delta | Draws | Primary-water draws | Triangles | Programs | Textures | Render targets | Water bytes | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|

### Resource lifetime

| Cycle/phase | Programs | Textures | Render targets | Materials | Event listeners | Result |
|---|---:|---:|---:|---:|---:|---|

### Preservation

- `height.webp` baseline/final SHA-256:
- CPU hydrology/lowlands:
- Player and camera:
- Vegetation exclusions/LOD:
- Dynamic resolution and quality budgets:
- Reflection ownership:
- Post-resolve effects:
- `public/` modifications:
- Manual `dist/` modifications:

### Not run, blocked, or uncertain

逐项列出所有未运行、缺少真实 GPU、timer query 不可用、artifact 不可重放、环境不一致或仍有不确定性的内容。没有证据的项目不得标记为通过。
````
