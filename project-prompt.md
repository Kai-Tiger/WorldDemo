你是一名资深实时图形工程师、Three.js 游戏原型工程师和技术美术。请直接在当前输出工作区从零实现一个完整、可运行、可验收的 Web 3D 项目：`Cold Mountain`。

不要只写方案、伪代码或 TODO。不要等待追问；遇到未明确的细节请做合理的、最简单的工程判断并继续，直到项目可以安装、测试、构建和在浏览器中游玩。

这同时是一项代码质量基准测试。你的产出会与其他模型在完全相同的输入资产、机器环境、时间窗口和验收流程下进行横向比较。不要针对评分表写“看起来存在”的空壳实现；评测会阅读源代码、运行测试、检查浏览器、改变输入、切换画质并观察真实渲染指标。所有功能声明都必须能从代码、测试或浏览器行为中得到证实。

本任务中的关键词按以下方式解释：

- **必须 / 不得**：硬性要求；违反会扣除对应项，严重时触发总分上限；
- **应 / 应当**：默认要求；只有存在明确工程理由时才可偏离，并须在最终报告解释；
- **建议 / 可以 / 可选**：不会单独导致失败，但实现质量可作为同分比较依据；
- **等价方案**：只有在最终可观察行为、性能成本和可测试性不低于原要求时才算等价；
- **完成**：不是“代码已写”，而是对应功能已运行、已验证、无已知阻断问题。

若前文与后文存在歧义，以更具体、可验证的条款为准；若仍有冲突，优先级依次为：资源和安全边界 > 可运行性 > P0 > P1 > 自动化验收契约 > P2 > 视觉润色。

## 1. 任务定位

制作一个第三人称高山自然环境探索原型。玩家应能在大尺度高山、林地、草坡、道路、河谷、湖泊和瀑布之间移动。视觉气质是清晰、湿润、偏冷的高山晴日上午：蓝天、薄云、远景空气透视、暖色阳光、冷色阴影、可读而不昏暗。

这不是一个孤立 shader demo，也不是静态场景。最终交付必须同时具备：

- 可探索的连续地形；
- 可用角色和第三人称相机；
- 分层 PBR 地表；
- 从山地源头到湖泊、瀑布、下游河流和终端湖的连通水系；
- 草、树和岩石构成的自然生态；
- 有性能意识的 LOD、实例化和画质档；
- 可重复验证的固定观察机位、测试和构建结果。

优先级顺序是：正确可运行 > 核心体验完整 > 视觉质量 > 工具和额外润色。先完成 P0 和 P1，再做 P2。不要为了炫技牺牲稳定性。

## 2. 干净评测与目录边界

当前工作目录就是输出项目根目录。评测开始时只预置以下资源目录，其他项目文件都必须由你从零创建：

```text
public/assets/
public/basis/
```

只能检查和使用当前工作区内的文件。禁止搜索、读取或引用当前工作区之外的目录；禁止尝试定位同名项目、参考实现、Git 历史、构建产物、缓存、对话日志或其他可能包含答案的文件。这是一次从零构建评测。

`public` 是文件系统前缀，不属于浏览器 URL。例如：

```text
文件路径：public/assets/terrain/height.webp
浏览器 URL：/assets/terrain/height.webp
```

不要修改预置资源字节。最终运行时不能依赖网络资源。

开始编码前只做一次简短的资源预检：

1. 检查本提示词中标为“必须使用”的文件是否存在；
2. 记录缺失、大小为零或扩展名与内容明显不匹配的文件；
3. 不要遍历工作区之外的路径，不要读取 Git 对象或历史；
4. 预检通过后立即进入实现，不要把大量时间消耗在资产考古；
5. 如果某个非关键可选资产缺失，采用最简单的本地程序化替代并在最终报告说明；
6. 如果 `height.webp`、玩家 FBX 或 KTX2 transcoder 这类关键资产缺失，明确报告阻断，不得伪造“已完成”；
7. 预检不得修改、重编码或覆盖任何预置文件。

允许生成的文件仅限当前项目需要的源码、配置、测试、文档、构建输出和验收证据。不得把 base64 资产、第三方库源码、大型生成网格或截图直接嵌入 JavaScript 来规避资源规则。

## 3. 技术栈与命令

使用以下最小技术栈：

- Vite；
- 原生 JavaScript ES Modules；
- Three.js；
- HTML 和 CSS；
- 自定义 GLSL / `THREE.ShaderMaterial`，仅用于确实需要的地形、水体、风动或后处理；
- Node 内建 `node:test` 做不依赖浏览器/WebGL 的 CPU 逻辑测试。

不要使用 React、Vue、Angular、Babylon.js、PlayCanvas 或其他游戏引擎。不要加入后端服务、数据库、账号、战斗、NPC、任务系统、联网或音频。不要下载、生成或引用任何外部素材。

运行时依赖应保持最小。除 `three` 和 `vite` 外，只有在确有必要且能说明用途时才加入依赖。测试、构建和预览不得要求全局安装工具。不要复制 Three.js examples 源码到项目；应从 `three/addons/...` 导入官方 loader、decoder 和 post-processing 模块。

必须使用现代浏览器支持的 ES Modules，不得引入 CommonJS/ESM 混用问题。应用不得依赖 Node API、绝对本地路径、开发服务器私有状态或仅在 `vite dev` 下成立的行为；`vite preview` 必须表现一致。

必须提供并实际跑通：

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

建议锁定可复现版本。可直接使用 Three `0.179.x` 和 Vite `7.x`，也可使用兼容的稳定版本，但不得依赖已废弃 API。

## 4. 可用资源清单与使用契约

本节是评测资产白名单。实现只能依赖本节明确列出的运行时资产；即使预置目录中因打包或历史原因出现其他图片、模型、备份、源文件或中间产物，也应忽略。这样可以保证不同模型在同一输入集合上比较。评测者应在开始前确认白名单资产对所有模型一致。

### 4.1 KTX2 转码器

```text
public/basis/basis_transcoder.js
public/basis/basis_transcoder.wasm
```

如果加载 KTX2，使用 Three.js `KTX2Loader`，transcoder path 为 `/basis/`，并在 renderer 创建后调用 `detectSupport(renderer)`。KTX2 加载失败不能被静默吞掉。

### 4.2 高度图

```text
public/assets/terrain/height.webp
```

- 4096×4096 RGB WebP；
- 代表约 2048×2048 世界单位的地形；
- 建议最高高度约 300 世界单位；
- 普通像素高度值为 `0.2126*r + 0.7152*g + 0.0722*b`；
- 为保留低地水系精度，若 `b === 254 && r <= 32`，高度码应读取为 `r + g / 255`；
- 最终世界高度为 `heightCode / 255 * 300`；
- 世界 z 与图片 y 方向相反；
- 不得把高度图当颜色贴图贴在地面上。

必须由同一套地形采样真源提供 `getHeightAt(x,z)` 和 `getNormalAt(x,z)`，供网格、角色、相机、植被和水系共同使用，避免视觉与碰撞高度不一致。

### 4.3 推荐地表与水岸纹理

基础高山层：

```text
public/assets/terrain/rock-alpine.webp
public/assets/terrain/rock-alpine-normal.png
public/assets/terrain/snow-alpine.webp
public/assets/terrain/scree-alpine.webp
```

森林地表，优先按画质选择 1k 或 2k：

```text
public/assets/terrain/forest-floor/optimized/forest_floor_basecolor_1k.jpg
public/assets/terrain/forest-floor/optimized/forest_floor_basecolor_2k.jpg
public/assets/terrain/forest-floor/optimized/forest_floor_normal_1k.jpg
public/assets/terrain/forest-floor/optimized/forest_floor_normal_2k.jpg
public/assets/terrain/forest-floor/optimized/forest_floor_orm_1k.ktx2
public/assets/terrain/forest-floor/optimized/forest_floor_orm_2k.ktx2
```

草地、苔藓和宏观混合：

```text
public/assets/terrain/materials/dry_grass_albedo.png
public/assets/terrain/materials/dry_grass_normal.png
public/assets/terrain/materials/moss_albedo.png
public/assets/terrain/materials/moss_normal.png
public/assets/terrain/materials/blend_mask_splat.png
```

碎石 normal 可用：

```text
public/assets/terrain/forest-floor/optimized/scree_alpine_normal_1k.ktx2
public/assets/terrain/forest-floor/optimized/scree_alpine_normal_2k.ktx2
```

水岸和河床：

```text
public/assets/terrain/river-bed.webp
public/assets/terrain/river-bank-rock-wet-light-alt.webp
```

Albedo/base-color 使用 sRGB；normal、ORM、opacity、AO、roughness、height 和 mask 使用线性色彩空间。地形材质默认 `metalness = 0`，干土、岩石和碎石整体偏高 roughness。不要把所有地表元素烘成一张嘈杂贴图。

### 4.4 玩家与动画

```text
public/assets/player/stand.fbx
public/assets/player/walk.fbx
```

使用 `FBXLoader`。将角色自动归一化到约 1.8 世界单位高、脚底落在局部 y=0，并移除 walk 动画的根位移，让代码控制实际移动。站立和行走之间应平滑 cross-fade。模型加载前可显示轻量占位体，但加载成功后必须替换。

### 4.5 树木

```text
public/assets/vegetation/tree_01.glb
public/assets/vegetation/tree_02.glb
public/assets/vegetation/tree_03.glb
public/assets/vegetation/tree_04.glb
public/assets/vegetation/tree_spawn.glb
```

使用 `GLTFLoader`。识别树干和树冠材质；透明树叶应正确设置 alpha test、双面或合适的 shadow material。树木必须实例化或批处理，不得每棵树创建独立材质和完整加载器。

### 4.6 岩石

```text
public/assets/vegetation/rock_01.glb
public/assets/vegetation/rock_02.glb
public/assets/vegetation/rock_03.glb
public/assets/vegetation/rock_04.glb
public/assets/vegetation/rock_05.glb
public/assets/vegetation/rock_06.glb
public/assets/vegetation/rock_07.glb
public/assets/vegetation/rock_08.glb
public/assets/vegetation/rock_09.glb
```

将岩石用于河道障碍、瀑布池、湖岸和少量 hero 构图。随机旋转、非均匀缩放和适当嵌入地面；不要均匀撒满地图。相同源模型应实例化。

### 4.7 Ribbon grass 模型

目录：

```text
public/assets/vegetation/ribbon-grass/optimized/models/
```

共有六个变体 `VarA` 到 `VarF`，每个有 `LOD0`、`LOD1`、`LOD2`：

```text
Ribbon_Grass_tbdpec3r_High_tbdpec3r_VarA_LOD0.glb
Ribbon_Grass_tbdpec3r_High_tbdpec3r_VarA_LOD1.glb
Ribbon_Grass_tbdpec3r_High_tbdpec3r_VarA_LOD2.glb
...
Ribbon_Grass_tbdpec3r_High_tbdpec3r_VarF_LOD0.glb
Ribbon_Grass_tbdpec3r_High_tbdpec3r_VarF_LOD1.glb
Ribbon_Grass_tbdpec3r_High_tbdpec3r_VarF_LOD2.glb
```

文件名中的 `...` 仅表示 B/C/D/E 采用完全相同的命名规则，不能把带省略号的字符串传给 loader。GLB 可能使用 Meshopt 压缩，给 `GLTFLoader` 配置 Three.js `MeshoptDecoder`。

### 4.8 Ribbon grass 贴图

目录：

```text
public/assets/vegetation/ribbon-grass/optimized/ktx2/
```

每种都有 `_1k.ktx2` 和 `_2k.ktx2`：

```text
Ribbon_Grass_AO
Ribbon_Grass_BaseColor
Ribbon_Grass_Billboard_BaseColor
Ribbon_Grass_Billboard_Normal
Ribbon_Grass_Billboard_Opacity
Ribbon_Grass_Normal
Ribbon_Grass_Opacity
Ribbon_Grass_Roughness
Ribbon_Grass_Translucency
```

例如：

```text
public/assets/vegetation/ribbon-grass/optimized/ktx2/Ribbon_Grass_BaseColor_2k.ktx2
public/assets/vegetation/ribbon-grass/optimized/ktx2/Ribbon_Grass_Normal_2k.ktx2
public/assets/vegetation/ribbon-grass/optimized/ktx2/Ribbon_Grass_Opacity_2k.ktx2
```

### 4.9 明确不使用的资源

`public/assets/enemy/` 中的 FBX 不属于本任务。不得加入敌人、战斗或 NPC，也不得在运行时误加载该目录。

## 5. P0：必须完成的可玩基线

### 5.1 页面和启动

- 全屏 `<canvas>`，页面无滚动条；
- 首屏有简洁 loading overlay，并显示当前阶段；
- 地形和玩家可用后尽快进入第一帧，植被可异步补齐；
- 资源失败要输出明确错误，不能无限停留在假进度；
- 浏览器控制台不能有未处理异常、资源 404、KTX2 或 Meshopt 解码错误。

### 5.2 第三人称角色

- WASD 相对相机方向移动；
- 鼠标左键拖拽旋转相机，滚轮缩放；
- 角色贴合地形，能从小落差自然下落，不能爬上明显不可行走的陡壁；
- 角色转向运动方向，idle/walk 动画正确切换；
- 相机平滑跟随，不能穿入地形；
- 角色和相机不能越出地图边界；
- 可选调试飞行：Alt 上升、Ctrl 下降，便于评测远景，但不能破坏正常地面移动。

### 5.3 地形

- 必须使用提供的 `height.webp`，不能用程序化噪声替代；
- 世界至少覆盖约 2048×2048 单位，远处可见完整山体轮廓；
- 网格法线正确，不能出现整块黑面、反面或明显接缝；
- 为避免一次创建超大网格，可按 chunk 构建并围绕玩家流送；
- 至少有近、中、远三级几何密度，或同等效果的可证明方案；
- 相邻 chunk 边界不能出现明显裂缝；
- 提供稳定的高度、法线和坡度查询 API。

### 5.4 最小 HUD

HUD 至少显示：

- FPS；
- 玩家 x/y/z；
- Performance / Balanced / Quality 画质选择；
- Grass 和 Trees 显示开关。

HUD 要小而清晰，不能遮住主要画面。默认 Balanced。

## 6. P1：核心视觉与世界系统

### 6.1 分层地形 PBR

地表必须根据世界高度、坡度、宏观噪声、道路和水系 mask 分层，而不是单材质铺满：

- 平缓低地：forest floor、苔藓和草地；
- 干燥开阔坡面：dry grass / scree；
- 陡坡和山脊：岩石，优先三平面映射以减少拉伸；
- 高海拔和背风凹地：自然的积雪；
- 河床和湖床：river-bed；
- 水边过渡：较暗、较湿的 river-bank；
- 道路：压实土、碎石或裸岩，与周围自然融合。

必须做到：

- albedo 不承担假阴影；
- normal 强度可信，不把细碎石做成巨石；
- 多尺度宏观色差打散平铺重复；
- layer 之间用平滑或 height-aware 混合，不能出现硬直线；
- 大石头、草丛和落叶用实例或 decal 提供轮廓细节，不要全塞进地表贴图；
- 近景有细节，远景不过度闪烁或摩尔纹。

### 6.2 连通水系

创建一个能从高山读到低地的完整水文叙事：

1. 至少三条高海拔支流；
2. 支流在自然河谷中汇流；
3. 至少一个高山小湖或 tarn；
4. 河流进入一个较大的高山湖；
5. 高山湖有明确出口；
6. 出口形成瀑布和瀑布池；
7. 瀑布池继续形成蜿蜒的下游主河；
8. 主河最终进入一个低地终端湖。

水面和地形必须共同设计：

- 河道沿曲线生成带状网格，不允许用矩形 plane 假装弯曲河流；
- 河流纵向 UV 或自定义 attribute 沿真实流向增长，横向信号表示岸到岸位置；
- 水位总体沿下游不升高；
- 河床应真实下挖，岸线与周围地形连续；
- 河流与湖泊交界不能重叠闪烁、突然截断或留下干地塞子；
- 汇流处不能出现三角空洞或明显叠层；
- 植被排除逻辑与可见水域使用同一水系真源；
- 湖面可以平缓，河流必须有明确流向，瀑布必须有垂直运动感。

### 6.3 水体视觉

主要水体必须使用自定义 shader 或等价的统一水体方案，实现：

- 浅水到深水颜色变化；
- 两个尺度以上的波纹/法线扰动；
- Fresnel 天空反射；
- 太阳高光；
- 清澈浅水能读到河床；
- 河流速度沿流向变化，岸边慢、中心快；
- 岸边透明衰减；
- 被噪声打散的泡沫；
- 急流、瀑布唇部、汇流和石头附近的动机性白水；
- 水体接收与空气透视一致的远景雾化。

不要整条河铺均匀白边，不要使用纯蓝色半透明塑料，不要让水面递归反射自己。反射可以根据画质选择环境贴图、低频 probe 或 planar 方案；实现越高级越好，但稳定性优先。

### 6.4 植被生态

草：

- 使用提供的 ribbon grass GLB 和贴图；
- 至少使用多个形态变体；
- 用 `InstancedMesh` 或等价批处理；
- 根据坡度、海拔、地表 mask 和湿度形成草地群落，不要均匀随机铺满；
- 从根部固定、上部弯曲的风动，加入低频区域阵风和轻微高频 flutter；
- 玩家靠近时有轻微弯折或扰动；
- 有距离 LOD、密度衰减和淡出，不能突然整片消失。

树：

- 使用四个普通树变体，出生区域可少量使用 `tree_spawn.glb`；
- 分布应形成林缘、林间空地和高度带，不要规则网格；
- 避开河道、湖面、道路和过陡坡；
- 树冠有轻微风动和透光感；
- 使用实例化、空间分区或 chunk 流送。

岩石：

- 河流、瀑布池和湖岸有少量构图明确的 hero rocks；
- 岩石接触地面，不能漂浮；
- 水中石头周围应影响泡沫或水流视觉；
- 不要让同一模型、旋转和尺度形成明显重复。

### 6.5 道路与探索引导

至少创建：

- 一条能从出生区引向高山湖/瀑布的步道；
- 一条低地较宽的碎石或车辙道路；
- 一个能看到湖泊、瀑布或河谷的观景点。

道路可以程序化曲线生成，但应轻微压平或贴合地形，并排除密集草木。道路不是无限延伸的贴图直线。

### 6.6 天空、灯光和后处理

- 程序化渐变天空或离线生成的本地 DataTexture 环境，不得引用不存在的 HDR/EXR；
- 稀疏、柔和、缓慢移动的云；
- HemisphereLight + DirectionalLight 或等价物；
- 主方向光投射稳定阴影；
- renderer 使用正确的 sRGB 输出、ACES 或等价 tone mapping；
- 远景有空气透视/雾，近景保持清晰；
- 可用轻量 GTAO/SSAO、抗锯齿、很弱的 bloom 和 sharpen，但不能让角色、草或水体产生脏边和严重 ghosting；
- 不要用过度曝光掩盖材质问题，也不要把阴影压黑。

## 7. P2：工程与工具加分项

### 7.1 画质与动态性能

三档画质应同时影响真实成本，而不只是改一个标签：

- Performance：低 DPR、较短植被距离、低纹理档、低阴影和简化水反射；
- Balanced：默认体验；
- Quality：更远可见距离、更高纹理档、更好阴影和水反射。

可加入保守的动态分辨率，但必须避免频繁跳动。1280×720、Balanced、场景稳定 5 秒后，以常见桌面独显为参考，目标平均 45 FPS 以上；无法在当前环境测出真实 GPU 性能时，也必须报告 draw calls、triangles、textures 和帧时间趋势。

### 7.2 地形编辑器

提供仅用于调试的最小地形编辑模式：

- Raise / Lower；
- Radius；
- Strength；
- 鼠标在可见地形上雕刻；
- 修改后角色、高度查询和受影响 chunk 同步；
- Save 通过 Vite dev middleware 非破坏性导出到 `artifacts/terrain/height-edited.webp`；
- 不得覆盖、重命名或修改预置的 `public/assets/terrain/height.webp`；
- 不需要 undo、redo、材质绘制或生产级权限系统。

此功能只能写入当前输出项目的 `artifacts/terrain/`。生产 build 和 preview 不需要开放文件写入；保存只要求在开发服务器中可用。若时间不足，优先保证 P0/P1，不要为了编辑器牺牲主体验。

### 7.3 调试与可重复观察

支持 URL 参数：

```text
?quality=performance|balanced|quality
?debug=1
?shot=spawn|lake|waterfall|river|forest|vista
```

`shot` 必须把角色和相机固定到设计好的代表性机位，便于截图对比。机位坐标由你根据实际地形和水系选择，不要求匹配任何隐藏参考实现，但每个命名场景必须真的看得到对应主题。

debug HUD 可额外显示：frame ms、draw calls、triangles、geometries、textures、programs 和当前 resolution scale。

## 8. 架构要求

你可以自由设计文件结构，评测不要求匹配某个现有项目。但必须保持职责清楚，至少在概念上分开：

- 启动/主循环；
- 地形采样与地形渲染；
- 地形材质；
- 水文数据/河道几何；
- 水体材质与更新；
- 植被放置和流送；
- 玩家输入、移动和相机；
- 环境灯光和后处理；
- 画质配置与调试。

避免循环依赖。随机放置必须使用固定 seed，刷新页面后重要构图保持一致。加载器、几何、纹理、材质和 render target 要有明确所有权，替换或卸载时正确 dispose。

不要为了“架构感”创建大量空壳类。只抽象真正共享的数据和行为。每个新增模块都应服务于上述可观察需求。

## 9. 自动化验证

为纯 CPU 逻辑编写有价值的 Node 测试，至少覆盖：

- 高度图普通编码与精确低地编码；
- 世界坐标到高度图坐标的映射；
- 双线性高度采样；
- 法线/坡度判断；
- 河网下游水位不升高；
- 河带网格顶点、索引和 UV/flow attribute 合法；
- 河流到湖泊的端点连续性；
- 植被不会生成在水域、道路或不可接受陡坡中；
- 固定 seed 的放置结果可重复；
- 画质 preset 的关键成本确实逐档增加。

测试不得要求真实 WebGL context，也不要只断言 shader 字符串中存在某个单词。算法实现和测试应互相独立，不得为了过测试硬编码结果。

## 10. 浏览器人工验收

完成后必须启动本地页面并逐项检查：

1. 默认入口：loading 正常退出，玩家可见，控制可用；
2. `?shot=spawn`：角色、近景地面和相机比例；
3. `?shot=lake`：湖面、湖床、岸线和远山；
4. `?shot=waterfall`：出口、瀑布、瀑布池和白水；
5. `?shot=river`：弯曲河道、流向、河床、岸草和石头；
6. `?shot=forest`：树木密度、林缘、草地和阴影；
7. `?shot=vista`：天空、云、空气透视、地形 LOD 和整体构图；
8. 三档画质切换：无崩溃、无材质丢失、真实成本变化；
9. resize：相机比例、renderer、后处理和反射目标正确更新；
10. 控制台：无未处理错误、404 或 shader compile error。

如果 harness 能截图，为六个 `shot` 各保存一张 1280×720 PNG 到输出项目的 `artifacts/screenshots/`。截图是验收证据，不要提交临时调试截图到运行时资源目录。

## 11. 失败模式禁令

以下任一情况都会显著扣分：

- 只提供说明，没有可运行代码；
- 使用程序化地形替代给定高度图；
- 只做一个平面湖或矩形河；
- 水面漂浮、穿地、在河湖接口处重叠或断开；
- 整条河都是均匀白色泡沫；
- 地表只铺一张纹理或有明显拉伸/重复；
- 每根草、每棵树都是独立 draw call；
- 草木长在水里、道路中央或陡峭岩壁；
- 角色模型尺寸错误、脚悬空、动画根位移导致滑步；
- 相机频繁穿地；
- 为了看起来“完成”而吞掉加载、shader 或测试错误；
- 引入不存在的 HDR/EXR、CDN 或外部 URL；
- 误用 `public` 前缀形成 `/public/assets/...` 浏览器 URL；
- 搜索工作区之外的参考实现或同名项目。

## 12. 完成定义与最终报告

只有同时满足以下条件才算完成：

- `npm test` 全部通过；
- `npm run build` 成功；
- `npm run preview` 可以打开并游玩；
- 资源请求无 404；
- P0 全部完成；
- P1 各系统至少有可观察、互相连通的实现；
- 已进行上述浏览器人工验收；
- 没有遗留会阻止游玩的 TODO 或占位实现。

最终回复必须简洁列出：

1. 完成了什么；
2. 项目绝对路径；
3. 使用了哪些提供的资产族；
4. 测试和构建的真实结果；
5. 浏览器检查过哪些入口；
6. Balanced 档的 FPS/帧时间、draw calls、triangles 和 textures；
7. 尚存的已知限制，不得隐瞒。

## 13. 产品质量子分（100 分）

不要为了自评分篡改实现；此表供外部评测使用。工程质量另按第 27 节独立评分，避免“画面能看但代码不可维护”或“代码整齐但项目不可玩”互相掩盖。

- 10 分：安装、测试、构建、启动、无资源错误；
- 15 分：角色、移动、动画、相机和探索体验；
- 15 分：高度图地形、LOD、道路和地表 PBR；
- 20 分：连通水系几何、岸线、流向、泡沫、河湖瀑布接口；
- 15 分：草、树、岩石的生态分布、风动、实例化和 LOD；
- 10 分：天空、灯光、阴影、空气透视和后处理；
- 10 分：性能、画质档、流送和稳定性；
- 5 分：HUD、固定机位、调试工具和验收证据。

## 14. 实施顺序与阶段门槛

本节规定的是完成顺序，不要求在最终回复中逐步复述。每个阶段必须留下可运行状态，不能同时铺开十几个半成品系统。

### 14.1 阶段 A：项目骨架和资产预检

完成内容：

- 创建 `package.json`、Vite 入口、HTML、CSS 和最小应用入口；
- 锁定依赖版本并生成 lockfile；
- 创建 renderer、scene、camera、resize 和 animation loop；
- 校验必须资产路径，明确 URL 使用 `/assets/...` 而不是 `/public/assets/...`；
- 提供用户可见的 loading/error overlay；
- 在无业务内容时先渲染一个明确的本地占位画面，确认页面和渲染循环成立。

阶段出口：

- `npm install` 成功；
- `npm run dev` 页面可打开；
- 控制台没有模块解析错误；
- resize 后 canvas 像素尺寸与相机 aspect 正确。

### 14.2 阶段 B：可玩的垂直切片

完成内容：

- 解码真实高度图；
- 显示至少一个包含出生区的地形区域；
- 共享高度采样能驱动地形、角色脚底和相机；
- 玩家占位体或真实模型可用 WASD 移动；
- 第三人称相机可旋转、缩放且不进入地面；
- 加入基础天空、光照和雾；
- 添加最小 HUD。

阶段出口：

- 从刷新页面到可控制角色不超过合理时间；
- 玩家不会出生在水下、地图外或不可行走陡坡；
- 连续移动 60 秒没有掉出地形、NaN 或相机失控；
- 此时即使高级资产失败，仍应给出明确错误而不是黑屏。

### 14.3 阶段 C：地表和连通水系

完成内容：

- 分层地形材质；
- 完整河网数据；
- 河床塑形；
- 河、湖、瀑布和池的几何连接；
- 统一水体视觉；
- 水域查询和植被排除共用数据真源；
- `lake`、`waterfall`、`river` 三个固定机位可观察。

阶段出口：

- 水位单调性、河带几何和接口连续性测试通过；
- 主要水体没有矩形假河、明显 z-fighting、悬空水面或干地堵口；
- 玩家在岸边移动时相机和角色仍稳定。

### 14.4 阶段 D：生态、道路和远景

完成内容：

- 草、树、岩石按生态规则分布；
- 树和草的实例化、LOD、风动与流送；
- 道路、出生区、观景点和探索路径；
- 远山、空气透视、云和构图；
- 六个固定观察机位全部可用。

阶段出口：

- 固定 seed 刷新后构图一致；
- 水中、道路中央和陡壁上的错误植被比例接近零；
- LOD 切换没有大面积同步闪烁；
- `forest` 和 `vista` 机位明确展示对应主题。

### 14.5 阶段 E：性能、验证和收尾

完成内容：

- 三档画质真正改变渲染成本；
- 测试覆盖关键纯函数和跨系统契约；
- 运行 build 和 preview；
- 完成浏览器人工验收；
- 清理自己造成的未使用代码、调试日志、泄漏和临时文件；
- 更新 README 和最终报告。

阶段出口：

- 所有完成定义均有真实证据；
- 不存在为了“以后可能用”而保留的空模块；
- 不存在被注释掉的大段替代实现；
- 最终源码与实际运行的 build 来自同一状态。

## 15. 世界坐标、高度采样与数据真源

### 15.1 坐标约定

除非资产自身需要局部变换，世界空间统一采用：

- Three.js 右手坐标系；
- `+Y` 为上；
- 地形中心为 `(0, 0, 0)`；
- 地形 X/Z 范围均为 `[-1024, +1024]`；
- 地形总边长为 2048；
- 图片左到右对应世界 `-X` 到 `+X`；
- 图片上到下对应世界 `+Z` 到 `-Z`；
- 所有距离、速度、半径和高度均使用同一世界单位；
- 角色约 1.8 单位高，可近似理解为 1 世界单位约等于 1 米。

世界坐标到高度图 UV 的标准映射为：

```text
u = (x + 1024) / 2048
v = 1 - (z + 1024) / 2048
```

采样前将 `u`、`v` clamp 到 `[0, 1]`。像素坐标使用完整的 `[0, width - 1]` 与 `[0, height - 1]` 范围，不能使用 `width` 或 `height` 作为最后一个有效索引。

### 15.2 高度编码

每个像素先按以下规则得到 `heightCode`：

```text
if b === 254 and r <= 32:
    heightCode = r + g / 255
else:
    heightCode = 0.2126 * r + 0.7152 * g + 0.0722 * b
```

随后：

```text
worldHeight = heightCode / 255 * 300
```

要求：

- 条件判断使用解码后的 0–255 整数通道，不要先归一化再与 254 比较；
- 双线性插值发生在解码后的连续高度值上，不能先插值 RGB 再触发特殊编码分支；
- 不要对高度图应用 sRGB 转换；
- 不要用 GPU displacement 的另一份近似数据驱动可见地形，同时用 CPU 数据驱动碰撞；
- 若为效率创建降采样版本，必须证明其边界、低地水道和碰撞误差可接受。

### 15.3 最小查询契约

实现等价于以下职责的 API；命名可以不同，但语义必须唯一且可测试：

```js
getHeightAt(x, z) -> number
getNormalAt(x, z, target?) -> normalized Vector3 or plain { x, y, z }
getSlopeAt(x, z) -> angle in radians or documented normalized slope
isInsideTerrain(x, z, margin = 0) -> boolean
worldToHeightmap(x, z) -> { u, v, px, py }
```

这些查询必须：

- 在 height data ready 后同步、确定性返回；
- 不在热循环中创建大量临时对象；
- 对地图边缘有明确一致的 clamp 或拒绝策略；
- 不返回 `undefined`、`NaN`、非归一化 normal；
- 由地形网格、玩家、相机、植被、道路和水系复用；
- 不通过 raycast 整个高密度地形来代替常量时间采样。

法线建议用中心差分或由同一高度函数采样邻点得到。边缘使用单边差分或 clamp。normal 的 Y 分量应朝上；平地应接近 `(0, 1, 0)`。

### 15.4 地形可重复性

高度图是基础地貌的唯一真源。河床、道路和编辑器造成的修改应通过一个显式 deformation/offset 层叠加，并使所有查询看到同一最终高度。不得只移动地形顶点而忘记更新角色和植被查询。

若实现 chunk cache，应明确：

- cache key；
- LOD 级别；
- 使用中的引用关系；
- 何时重建；
- 何时释放 geometry；
- deformation 后哪些 chunk 失效。

## 16. 地形几何与材质的详细验收

### 16.1 地形几何

允许 quadtree、clipmap、规则 chunk grid 或等价方案。无论采用何种实现，都必须满足：

- 近景轮廓足够细，不出现明显大三角台阶；
- 中远景几何逐级下降；
- LOD 只在必要时更新，不每帧重建所有 geometry；
- 相邻不同 LOD 边界通过共享边顶点、stitch indices、skirts 或其他可靠方案避免裂缝；
- chunk bounding box/sphere 有效，视锥裁剪不会错误剔除高山；
- 地形边缘有合理收口，不从常用机位看到悬空薄片；
- geometry index 类型与顶点数匹配，不溢出；
- 法线与位移后的几何一致；
- 不为 4096² 每个源像素直接创建一个常驻顶点。

推荐而非强制的起点：

- chunk 世界尺寸 128–256；
- 近景采样间距约 1–2；
- 中景采样间距约 4–8；
- 远景采样间距约 16–32；
- LOD 变化带有迟滞或距离缓冲，避免玩家站在阈值附近抖动。

评测看结果和成本，不按这些推荐数字机械扣分。

### 16.2 地表层权重

每个位置的地表层权重至少受以下信号中的四类影响：

- 世界高度；
- 坡度或 normal.y；
- 朝向或背风近似；
- 宏观噪声；
- 预置 splat mask；
- 距道路距离；
- 距水体/岸线距离；
- 河床 deformation mask；
- 局部湿度。

层权重必须归一化或以可解释方式组合，不能让总能量随层数无界变亮。阈值附近使用平滑过渡，并用较低频噪声打散人工等高线。

### 16.3 纹理采样

要求：

- base color 设置正确 sRGB color space；
- data texture 保持 linear/no color space；
- normal map 方向与 Three.js 约定一致；
- 所有重复纹理启用合适 wrap；
- mipmap 和 anisotropy 按 renderer 能力与画质档设置；
- 不把 AO、roughness 或 mask 当颜色读取；
- KTX2 在 loader 完成配置后才请求；
- 同一路径只加载一次，多个材质共享纹理；
- Quality 使用 2k 时，Performance 应优先 1k 或非必要纹理降级；
- shader 中的纹理数量不得无视设备限制无限增长。

陡坡岩石优先使用三平面映射或斜率感知投影。若选择普通 UV，必须避免山壁出现成倍拉伸。三平面权重应连续，normal 混合不能造成接缝发黑。

### 16.4 材质可读性

从 `spawn`、`forest` 和 `vista` 机位应能读出至少四类不同地表；从 `river` 与 `lake` 应能读出湿岸和河床。不同层不是简单换颜色，roughness、normal 细节和宏观尺度也应有可见差别。

禁止：

- 用顶点色随机噪声冒充分层 PBR；
- 用环境光全白抹平材质；
- 在 shader 中写死固定相机坐标；
- 用屏幕空间颜色覆盖掩盖地形 UV 问题；
- 以大量重复 geometry decal 替代基本地形材质。

## 17. 玩家、动画、输入与相机契约

### 17.1 输入

默认控制：

```text
W / S       前进 / 后退（相对相机水平朝向）
A / D       左移 / 右移（相对相机水平朝向）
Shift       可选加速；若实现须有合理动画和速度过渡
鼠标左拖    环绕相机
滚轮        调整相机距离
1 / 2 / 3  可选快速切换 Performance / Balanced / Quality
H           可选隐藏 HUD
```

输入系统应：

- 忽略输入框、选择框上的游戏快捷键；
- `pointerup`、窗口失焦和 `visibilitychange` 后清理卡住的按键/拖拽状态；
- 禁止页面滚动和 context menu 干扰主要控制；
- 使用 delta time，不能把移动速度绑定到刷新率；
- 对异常大的 delta 做 clamp，避免切回标签页时角色瞬移；
- 不强制 pointer lock；若使用 pointer lock，必须提供清晰进入和退出方式。

### 17.2 移动

移动速度、转向速度、重力和最大可走坡度应集中定义，不散落魔数。建议：

- 步行速度约 4–7 单位/秒；
- 转向使用阻尼或角度插值；
- 最大可走坡度约 42–50 度；
- 地面吸附容忍小台阶，但明显悬崖应阻挡或自然下落；
- 出生点周边至少有可连续移动 30 秒的安全区域。

角色位置的最终 Y 必须来自共享地形高度加脚底偏移。若水域不可进入，应在移动层明确限制；若允许涉浅水，应保持脚底和动画合理，不需要实现游泳。

### 17.3 FBX 归一化与动画

加载 `stand.fbx` 后：

1. 计算可见模型包围盒；
2. 平移局部模型使脚底为 y=0；
3. 等比缩放至约 1.8 高；
4. 保留一个稳定的玩家根节点负责世界移动；
5. 使模型前向与运动前向一致。

walk clip 若包含根骨水平位移，应对轨道做副本处理或在 mixer 根节点层隔离，不能修改共享原资产数据造成副作用。idle/walk 的 cross-fade 建议在 0.15–0.35 秒范围。停止和起步不能每帧重复调用 `reset().play()`。

如果两个 FBX 的骨架层级不完全一致，应显式验证 clip 是否能绑定；动画失败时显示角色并报告错误，不能让整个场景黑屏。

### 17.4 第三人称相机

相机至少包含：

- yaw；
- 受限 pitch，避免翻转；
- 可 clamp 的目标距离；
- 玩家目标点高度偏移；
- 位置和 look target 的平滑；
- 地形防穿透；
- 地图边缘保护。

防穿透不能只把相机 Y 抬到地面上，因为这会在山坡后产生突然俯冲。可以对目标点到期望相机位置做分段高度检查或 raycast 简化碰撞，再将相机拉近。相机调整必须有平滑但不能明显滞后到丢失玩家。

固定 `shot` 模式下应冻结玩家驱动的相机更新，避免预设机位下一帧被正常跟随逻辑覆盖；离开 shot 模式后恢复交互。

## 18. 河网、水文数据与几何契约

### 18.1 一份河网真源

用明确的数据结构描述水系，至少能表达：

- 节点 ID 和类型：source、confluence、lake-inlet、lake-outlet、waterfall-lip、pool、terminal；
- 世界 X/Z；
- 水面高度；
- 下游节点；
- 河段宽度、深度和速度范围；
- 河段采样中心线；
- 湖泊边界；
- 需要白水的事件或强度；
- 到水域、岸线和河床的查询。

数据结构不要求逐字匹配，但不能把河流、泡沫、植被排除、河床下挖和固定机位分别手写成互不相关的坐标集合。

至少提供或可推导以下纯查询：

```js
getWaterInfoAt(x, z)
distanceToWater(x, z)
distanceToRiverCenter(x, z)
isUnderWaterSurface(x, y, z)
isInWaterExclusionZone(x, z, padding)
getRiverFlowAt(x, z)
```

`getWaterInfoAt` 应能区分无水、河流、湖泊、瀑布/池等类型，并给出合理的 surfaceHeight、depth、flow direction 或岸距信息。

### 18.2 中心线与纵向剖面

中心线应沿真实低谷或经过显式地形塑形，不能在高地表面悬空穿行。每条下游序列必须满足：

```text
nextWaterLevel <= currentWaterLevel + epsilon
```

其中 epsilon 只允许处理浮点误差，不能用来允许可见的逆坡河。瀑布段应明确产生较大的负高度差；湖面在单个水体内保持平面或只有极小视觉扰动。

河段采样密度应随曲率适配或足以避免明显折线。中心线不能自相交；汇流前的支流宽度通常小于汇流后的主河。

### 18.3 河带网格

每个河带截面至少包含左岸、中心和右岸信息，或更高密度等价结构。顶点数据至少包含：

- position；
- uv；
- 沿流向的累计距离或 flow coordinate；
- 横向从左岸到右岸的归一化坐标；
- 可用于深度/岸边/泡沫的属性；
- 合法 index 和连续 winding。

要求：

- 相邻截面方向变化时使用稳定的 2D 法向，避免带宽翻转；
- 急弯处限制 miter 长度或使用 bevel/圆角策略；
- UV 的纵向值按世界距离累计，不因控制点密度变化而忽快忽慢；
- 左右岸在整段保持一致，不能随机翻面；
- 河面略低于可见岸线且高于大部分河床；
- 汇流处使用过渡 patch、共享边界或可靠重叠策略，但不能明显 z-fighting；
- 湖泊入口和出口有专门接口处理，不以两块透明 plane 生硬相交；
- geometry 的 attribute count 与 position count 一致。

### 18.4 河床和岸线

河床下挖至少受中心距、河宽、深度和纵向位置影响，横断面应平滑。河床中心低于水面，岸坡连接原地形，不能形成垂直切槽。瀑布唇部、瀑布池、湖泊入口可使用专门 profile。

岸线湿润范围应比实际水面略宽，并与地形材质、植被排除和石头布置共享距离信号。不要只在 shader 中画一条不影响生态的深色线。

### 18.5 湖泊与瀑布

高山湖和终端湖必须有非矩形自然边界，可由多边形、样条、mask 或地形等高线推导。要求：

- triangulation 不产生越过凹多边形的错误大三角；
- 湖面边缘不超出实际盆地；
- 湖底可在浅岸透过水面读到；
- 高山湖有可见入口和出口；
- 终端湖接收下游主河；
- 瀑布从出口唇部连续落入池中；
- 瀑布视觉可使用竖向 ribbon、粒子、雾沫和泡沫组合，但不能只有一张静态白矩形；
- 瀑布池的出水口必须继续连接下游主河。

## 19. 水体着色与动态细节

### 19.1 统一光学逻辑

河流、湖泊和池可以有参数差异，但应共享颜色、Fresnel、雾化、太阳高光和深度逻辑。不要为每种水体复制一套逐渐分叉的 shader。

水体颜色至少由以下信号中的三项共同决定：

- 视角/Fresnel；
- 可见或近似水深；
- 岸距；
- 水体类型；
- 天空/环境颜色；
- 河床颜色；
- 空气透视距离。

浅水应偏透明且能读到河床，深水颜色更饱和/更暗但不能变成不透明油漆。透明排序问题应通过合理 renderOrder、depthWrite、alpha 和几何分区控制，而不是全局关闭深度测试。

### 19.2 流动和波纹

至少叠加两个频率不同、方向不同的波纹信号。河流扰动应以真实 flow attribute 为主方向；湖泊可以更缓慢、各向同性。时间 uniform 每帧更新一次，并在暂停/隐藏标签页后保持数值稳定。

禁止：

- 只沿世界 X 或 Z 固定滚动所有水体；
- 用 `sin(time)` 整体上下移动整条河；
- 每个水面创建独立 animation loop；
- 将帧计数当时间造成不同刷新率速度不同。

### 19.3 泡沫和白水

泡沫必须有来源动机：

- 岸边薄弱、断续；
- 中心急流根据速度或坡度增强；
- 汇流和弯道外侧增强；
- 瀑布唇部和落点显著；
- 岩石附近局部增强；
- 湖面大部分区域保持干净。

泡沫形状由至少一个空间信号和一个时间变化信号共同控制。噪声边缘应柔和，不能形成固定屏幕空间斑点。泡沫 opacity 应受画质档控制，但不能在 Performance 完全丢失水流可读性。

### 19.4 反射与折射

最低可接受方案是环境/天空色近似 + Fresnel + 太阳高光。若实现 planar reflection：

- 必须避免递归渲染水面；
- 反射相机和 clip plane 正确；
- render target 随 resize 和画质档更新；
- Performance 可以禁用或降低分辨率；
- 每帧额外 pass 数量可在 metrics 中观察；
- render target 被替换时 dispose。

不要为每条小河创建一个全分辨率反射 target。

## 20. 植被、岩石和道路的确定性规则

### 20.1 固定随机种子

所有会影响构图、测试和实例位置的随机过程必须使用显式 seed。不得在放置逻辑中直接调用 `Math.random()`。默认 seed 应固定，也可支持 `?seed=<integer>`，但固定 shot 和默认评测必须使用一致 seed。

随机发生器应是小而可测试的纯实现。相同 seed、输入区块和画质档应产生相同候选位置；画质降低时优先取稳定子集，避免每次切档整片生态重新洗牌。

### 20.2 草

草的候选和接受过程至少考虑：

- 高度带；
- 最大坡度；
- 地表层权重；
- 水体 padding；
- 道路 padding；
- 林下或空地密度；
- chunk bounds；
- 固定 seed。

草实例应批量写 matrix 和必要 attribute，并将 `instanceMatrix.needsUpdate` 控制在实际变化时。风动可以通过 `onBeforeCompile` 或自定义 shader，但必须保持材质更新兼容 Three.js 当前版本。

LOD 应使用提供的 LOD0/1/2，或证明 billboard/密度衰减方案质量不低于它。推荐在两个阈值之间做 dither/fade 或错峰切换。不要让数千个实例同时在一条圆形边界上跳变。

### 20.3 树

树模型只加载一次后提取可复用 geometry/material。若一个 GLB 包含树干和树叶多个 primitive，应按 primitive 建立少量 `InstancedMesh`，而不是退回每棵树 clone 完整场景。

树分布至少表现出：

- 低中海拔林带；
- 林缘密度渐变；
- 道路和河岸空隙；
- 若干自然空地；
- 远近尺度变化；
- 四种普通树变体混用；
- 出生点附近构图受控，不遮挡玩家和主要视线。

叶片材质 alphaTest 应避免排序灾难；阴影材质应保留 alpha cutout，不能投射实心矩形树冠。树干和树冠的 color space、roughness 和 side 设置应分别合理。

### 20.4 岩石

相同岩石源模型应实例化。hero rocks 可以单独控制，但数量有限且构图目的明确。每个实例位置应用地形高度，必要时沿 normal 轻微倾斜，并向地面下嵌入少量以避免漂浮。

河中岩石需要与水的泡沫/障碍信息发生可观察联系。若只是视觉近似，也应来自同一 rock placement 数据，不得另写一组“假泡沫坐标”。

### 20.5 道路

道路数据至少包含中心线、宽度、边缘过渡和类型。道路贴合地形，可对横断面轻微平整，但不能破坏附近水文。道路 mask 同时用于：

- 地表材质；
- 草和树排除；
- 玩家探索引导；
- 可选的低频车辙/碎石细节。

道路曲线应避免不可行走的超陡坡、穿越湖面和无理由的死端。步道连接出生区与高山湖/瀑布附近；低地道路提供尺度感但不需要车辆。

## 21. 渲染、光照、画质档与性能预算

### 21.1 Renderer 基线

至少正确配置：

- `renderer.outputColorSpace = THREE.SRGBColorSpace`；
- ACESFilmic 或等价 tone mapping；
- 合理 exposure；
- 基于设备与画质档 clamp 的 pixel ratio；
- shadow map 类型和启用状态；
- canvas alpha/powerPreference 按实际方案选择；
- resize 时更新 camera、renderer、composer 和所有 render target；
- WebGL context lost/restored 有基本用户提示或恢复行为。

不要同时重复使用 renderer 内建抗锯齿和昂贵后处理 AA，除非有证据说明成本合理。

### 21.2 光照与阴影

方向光的 shadow camera 应围绕玩家或当前 shot 的相关区域，而不是覆盖整个 2048 世界导致近景阴影分辨率耗尽。更新 shadow camera 时应稳定 texel 对齐或使用足够迟滞，避免轻微移动造成阴影游泳。

至少保证：

- 玩家有接触阴影；
- 近景树、岩石和地形关系清楚；
- 阴影不是纯黑；
- 远景不依赖超大 shadow map；
- 透明叶片阴影不是方块；
- Performance 档阴影降级后仍保持基本空间感。

### 21.3 三档画质的最低差异

具体数值可按实测调整，但至少影响表中所有“必须变化”的类别：

| 类别 | Performance | Balanced | Quality |
| --- | --- | --- | --- |
| DPR 上限 | 约 1.0 | 约 1.25–1.5 | 约 1.5–2.0 |
| 地形细节距离 | 短 | 中 | 长 |
| 草可见距离/密度 | 低 | 中 | 高 |
| 树可见距离/远景代理 | 低 | 中 | 高 |
| 阴影尺寸/范围 | 低 | 中 | 高 |
| 水反射分辨率或模式 | 简化 | 中等 | 较高 |
| 后处理采样成本 | 最低 | 中等 | 较高 |
| 纹理档 | 优先 1k | 1k/2k 混合 | 优先 2k |

切档要求：

- 不刷新页面；
- 不重新下载已缓存的相同资产；
- 不泄漏旧 geometry、material 或 render target；
- 不导致玩家位置、seed 或水体时间重置；
- HUD 标签和真实配置一致；
- metrics 中 draw calls、triangles、pixel ratio、shadow 或实例数量至少有两项可观察变化；
- Quality 的实际成本不能低于 Performance 却只换一个名字。

### 21.4 性能目标

评测基准分辨率为 CSS 1280×720、Balanced、默认 seed、`shot=vista` 和正常玩家场景。等待加载完成并预热至少 5 秒，再采样至少 10 秒。

目标：

- 平均 FPS ≥ 45；
- 1% low 尽量 ≥ 30 FPS；
- 帧时间无持续周期性大尖峰；
- 场景稳定时不每帧分配大量对象或重建实例；
- draw calls 尽量控制在 250 以内；
- active textures 和 programs 保持有解释的有限数量；
- 画质切换五次后资源计数不持续单调增长；
- 连续游玩十分钟不出现明显内存爬升、WebGL error 或崩溃。

这些是桌面独显目标，不是所有机器上的硬失败线。若当前环境无法准确计时，仍须提供 renderer.info 和采样方法，不得编造数字。

### 21.5 热路径约束

主循环中避免：

- 每帧 `new Vector3/Matrix4/Color` 的大规模临时分配；
- 每帧遍历地图中全部植被；
- 每帧重建 shader、material、geometry 或纹理；
- 每帧更新所有实例 matrix；
- 每帧对高度图 canvas 调用 `getImageData`；
- 每帧对整个 scene 做无界递归查找；
- 在多个模块各自读取 `performance.now()` 并形成不同步时间；
- 每帧打印 console 日志。

允许复用少量临时向量、按 chunk 脏标记更新和固定频率的性能采样。

## 22. 加载、错误处理与资源生命周期

### 22.1 加载阶段

loading overlay 至少区分：

```text
初始化渲染器
读取高度图
构建出生区地形
加载玩家
加载核心材质
构建水系
加载植被
完成
```

阶段名称可调整，但不能只有一个从 0 跳到 100 的假进度条。地形和玩家可交互后，可以进入场景并在 HUD 中显示非关键植被继续加载。

### 22.2 错误分类

关键错误：

- renderer/WebGL 创建失败；
- height map 缺失或无法解码；
- 地形构建失败；
- 玩家无法提供真实模型且占位体也不可用；
- shader compile/link 失败；
- 核心模块 import 失败。

关键错误应：

- 停止假装继续加载；
- 显示用户可读错误；
- 保留原始错误到 console；
- 将自动化状态设为 `error`；
- 不产生无界重试。

非关键错误如某个树变体失败，可以降级为其他变体，但必须 `console.warn` 一次并记录 degraded 状态。不要空 `catch {}`。

### 22.3 所有权与释放

每类 GPU 资源应有明确所有者。要求：

- 共享纹理不由单个材质随意 dispose；
- 替换画质资源时只释放不再引用的对象；
- 删除 chunk 时释放其独占 geometry；
- composer/render target resize 或替换时释放旧 target；
- 事件监听器有对应移除逻辑；
- HMR 或重复初始化不会叠加多个 animation loop；
- loader 失败不留下永久 pending promise；
- 应用退出/销毁路径至少在结构上可执行和测试。

不要为了展示“资源管理”写复杂通用框架；清楚的模块级 `dispose()` 即可。

## 23. 自动化测试详细矩阵

测试应使用 Node 内建 runner，纯函数测试不创建真实 renderer。需要 Web API 的模块应把算法与浏览器适配层分离。

### 23.1 高度和坐标

至少包括：

1. 普通 RGB 像素按 luminance 解码；
2. `b=254, r<=32` 使用精确低地编码；
3. `r=33, b=254` 不错误进入低地分支；
4. 最小和最大高度边界；
5. 四角与中心世界坐标映射；
6. Z 轴翻转；
7. 双线性采样在 2×2 合成数据上的已知结果；
8. 边缘 clamp 不越界；
9. 平面高度场 normal 朝上；
10. 倾斜高度场 normal 和 slope 方向合理。

### 23.2 河网和河带

至少包括：

1. 每个 source 能沿下游到达 terminal lake；
2. 不存在循环和悬空下游 ID；
3. 所有河段水位不逆坡；
4. 至少三个独立 source；
5. 高山湖存在入口和出口；
6. 瀑布高度差为正且落点连接池；
7. 河带 position/uv/custom attribute 数量一致；
8. index 全部在顶点范围内；
9. triangle 面积不是零或 NaN；
10. 累计 flow coordinate 单调；
11. 左右岸距离中心方向一致；
12. 河湖端点距离在容差内；
13. 汇流节点至少有两个上游和一个下游；
14. 水域查询在中心、岸边和外部返回不同结果。

### 23.3 植被和道路

至少包括：

1. 相同 seed 生成相同候选和接受结果；
2. 不同 seed 至少部分结果不同；
3. 水域 padding 内拒绝树草；
4. 道路 padding 内拒绝树草；
5. 超过最大坡度拒绝；
6. 不合适高度带拒绝；
7. 可接受草地区域能实际生成实例；
8. chunk 边界不会重复生成同一稳定 ID；
9. Performance 的稳定子集包含于或可映射到更高档结果；
10. 岩石实例 matrix 全部为有限数；
11. 道路 mask 中心强、边缘平滑衰减。

### 23.4 玩家和相机

至少包括：

1. 相机相对方向移动向量去除垂直分量并归一化；
2. 对角输入不会比单轴快；
3. delta time clamp；
4. 地图边界 clamp；
5. 可走坡和不可走坡判断；
6. 无输入时速度衰减/停止符合设计；
7. yaw 插值跨越 `-π/π` 时走最短角；
8. camera pitch 和 distance clamp；
9. 地形碰撞会把相机移到安全高度或距离；
10. fixed shot 不被 follow update 覆盖。

### 23.5 画质和生命周期

至少包括：

1. 三个 preset 名称有效；
2. 未知 query 值回退 Balanced；
3. DPR、植被距离、阴影或反射成本逐档非递减；
4. preset 对象不可被运行时意外篡改；
5. URL 参数解析；
6. resize 目标尺寸计算；
7. dispose 多次调用安全；
8. loading 状态合法转换；
9. error 状态不会再被 ready 覆盖；
10. debug snapshot 不包含 NaN/Infinity。

### 23.6 测试质量禁令

不得：

- 只测试常量等于自身；
- 只搜索源码或 shader 字符串；
- 为测试复制一份与生产代码无关的算法；
- 使用过大的 epsilon 让错误实现也通过；
- 依赖测试执行顺序；
- 留下 `.only`、`.skip` 或注释掉的失败测试；
- 捕获异常后无断言地判定通过；
- 用固定产品输出反推硬编码，而不测试输入变化；
- 在 `npm test` 中启动长驻 dev server；
- 把浏览器不可用当作纯 CPU 测试失败。

测试命名应描述行为和预期，不用 `test1`、`works` 之类名称。失败信息应足以定位是数据、算法还是边界条件。

## 24. 浏览器自动化接口与验收证据

为了让不同模型的浏览器结果可统一读取，在开发模式和 production build 中都暴露只读为主的最小接口：

```js
window.__COLD_MOUNTAIN__ = {
  version: 1,
  ready: Promise,
  getState(),
  getMetrics(),
  setQuality(name),
  setShot(name),
  dispose()
}
```

允许增加字段，但以上语义必须成立：

- `ready` 在核心场景可交互后 resolve，在关键失败时 reject；
- `getState()` 返回可 JSON 序列化快照；
- `getMetrics()` 返回最近采样，不强制 renderer 同步读回 GPU；
- `setQuality()` 和 UI 使用同一实现；
- `setShot()` 和 URL 参数使用同一 shot registry；
- `dispose()` 主要用于测试重复挂载和资源释放，不要求普通用户操作。

`getState()` 至少返回：

```js
{
  status: 'loading' | 'interactive' | 'ready' | 'error',
  quality: 'performance' | 'balanced' | 'quality',
  shot: null | 'spawn' | 'lake' | 'waterfall' | 'river' | 'forest' | 'vista',
  seed: 12345,
  player: { x, y, z },
  loaded: {
    terrain: true,
    player: true,
    water: true,
    grass: true,
    trees: true
  },
  degraded: [],
  error: null
}
```

`getMetrics()` 至少返回：

```js
{
  fps,
  frameMs,
  drawCalls,
  triangles,
  geometries,
  textures,
  programs,
  pixelRatio,
  grassInstances,
  treeInstances,
  quality
}
```

所有数值必须是有限数。无信息时用 `0` 或明确的 `null`，不要返回 `undefined`。这个接口不得允许评测直接伪造内部完成状态。

### 24.1 固定机位要求

每个 shot 需要一个稳定 registry 条目，包含相机位置、look target 和必要的玩家位置。验收内容：

| Shot | 画面中必须可见 |
| --- | --- |
| spawn | 玩家全身、近景地表、可走路径、合理第三人称尺度 |
| lake | 高山湖主体、自然岸线、至少一段远山或入口/出口 |
| waterfall | 瀑布唇部、下落水体、瀑布池和继续向下游的水 |
| river | 弯曲主河、两侧岸线、流向线索、河床或岸石 |
| forest | 多树种、林缘/空地、林下草地和树冠阴影 |
| vista | 大尺度山体、天空、雾化层次和至少一个水体 |

固定机位：

- 不依赖前序移动；
- 刷新 URL 可直接到达；
- 不藏在地形或树冠内；
- 1280×720 下主题不被 HUD 遮挡；
- 相同 seed 和画质下截图可重复；
- 进入后等待 2 秒不发生明显自动漂移。

### 24.2 浏览器检查步骤

至少执行一次以下流程：

1. 用 production preview 打开默认 URL；
2. 等待 `ready`；
3. 读取 `getState()`，确认核心 loaded 标志；
4. 依次打开六个 shot；
5. 每个 shot 等待视觉稳定，检查 WebGL 和 network console；
6. 在 `vista` 依次切换三档画质并读取 metrics；
7. resize 到 800×600、1280×720、1600×900；
8. 回到正常跟随模式，控制角色移动、旋转和缩放相机；
9. 切换标签页或模拟大 delta 后继续移动；
10. 最后再次读取状态和资源计数。

若可截图，图片内容必须来自实际运行页面，不得后期修图。截图命名：

```text
artifacts/screenshots/spawn.png
artifacts/screenshots/lake.png
artifacts/screenshots/waterfall.png
artifacts/screenshots/river.png
artifacts/screenshots/forest.png
artifacts/screenshots/vista.png
```

临时截图、失败截图和调试 crop 不应放入 `public`。构建产物不引用 `artifacts`。

## 25. 建议项目结构与模块边界

文件名可调整，评测不按目录模板机械评分；以下是复杂度与清晰度参考：

```text
index.html
package.json
package-lock.json
vite.config.js
README.md
src/
  main.js
  style.css
  app/
    createApp.js
    loadingState.js
  terrain/
    heightData.js
    terrainGeometry.js
    terrainMaterial.js
  water/
    hydrology.js
    riverGeometry.js
    waterMaterial.js
    waterQueries.js
  vegetation/
    seededRandom.js
    placement.js
    grass.js
    trees.js
    rocks.js
  player/
    input.js
    player.js
    camera.js
  environment/
    lighting.js
    sky.js
    postProcessing.js
  quality/
    presets.js
    metrics.js
  debug/
    hud.js
    shots.js
tests/
  *.test.js
artifacts/
  screenshots/
```

不要求每个示例文件都存在，也不鼓励一类一个空壳。判断标准：

- 单个模块有清晰职责；
- 纯算法可在 Node 中导入；
- 浏览器副作用集中在 app/renderer 层；
- 共享数据从明确入口传递，不依赖大量可变全局变量；
- 模块依赖方向大致从 app 组合层指向领域模块；
- shader 源码和大型配置不塞进已经过长的 `main.js`；
- 资源路径集中或可搜索；
- 不以“manager/service/factory”命名掩盖职责不清。

README 至少说明：

- 项目是什么；
- 安装、测试、开发、构建和预览命令；
- 控制方式；
- URL 参数；
- 主要架构；
- 使用的预置资产；
- 已知限制；
- 如何进行六个 shot 验收。

## 26. 代码质量硬性要求

### 26.1 简单且直接

- 优先纯函数和小的组合模块；
- 只为真实复用抽象；
- 不为单一调用创建通用插件系统；
- 不实现任务外的 ECS、DI 容器、编辑器框架或状态管理库；
- 不添加敌人、战斗、背包、音频等无关功能；
- 不用几百行配置掩盖核心算法缺失；
- 不保留未调用的“未来方案”。

### 26.2 可读性

- 使用能表达领域含义的命名；
- 单位写入变量名或相邻注释，例如 `speedUnitsPerSecond`、`slopeRadians`；
- 对高度编码、河带 miter、LOD seam、根位移处理等非显然算法解释“为什么”；
- 不给显而易见代码逐行加注释；
- 避免布尔参数堆叠，必要时使用小 options object；
- 常量集中到所属模块，不建立无边界的全局 constants 文件；
- shader uniform、attribute 与 JavaScript 端命名一致。

### 26.3 正确性

- 异步初始化顺序明确；
- 所有 promise 都被 await、返回或显式处理；
- 不吞异常；
- 数学函数对空数组、退化曲线、边界坐标有合理行为；
- 所有 geometry attribute 数量一致；
- 数值进入 GPU 前无 NaN/Infinity；
- 不把 degrees 与 radians 混用；
- 不把颜色空间、normal map、ORM channel 搞反；
- 不在共享 asset scene 上做会污染其他实例的破坏性修改；
- 不依赖对象枚举顺序实现随机稳定性。

### 26.4 可维护性

- 画质参数有单一来源；
- shot 注册表有单一来源；
- 水系有单一来源；
- 高度采样有单一来源；
- 资源 URL 有明确清单或集中构造规则；
- 加载器配置只创建一次；
- dispose 路径能追踪资源所有权；
- 新增一种树、河段或画质参数时，不需要修改多个无关模块；
- 核心模块可以独立测试，不要求导入 `main.js` 启动应用。

### 26.5 版本和仓库卫生

- 提交 lockfile；
- 不提交 `node_modules`；
- 不依赖已有 `dist`；
- `.gitignore` 排除构建输出、日志、系统文件和临时截图；
- 不把预置资源重复复制到另一个目录；
- 不修改预置资源；
- 不留下 console spam、性能 profile、临时脚本或大段注释代码；
- 不以 minify/混淆源码逃避审阅；
- 最终 Git diff 中每个新增文件都有实际用途。

## 27. 工程质量子分（100 分）与总分计算

外部评测会同时阅读代码和运行项目。工程质量子分如下：

### 27.1 正确性与鲁棒性：25 分

- 0–5：主要靠硬编码和偶然运行，边界条件大量失败；
- 6–12：正常路径可运行，但异步、数学边界或资源失败处理薄弱；
- 13–19：关键算法和状态转换可靠，有针对性测试；
- 20–25：跨系统数据一致，错误降级清晰，长时间运行和切档稳定。

重点看：高度真源、水文连通、几何合法性、输入状态、异步错误、NaN 防护、resize 和重复初始化。

### 27.2 架构与职责：20 分

- 0–4：巨型单文件、循环依赖或大量可变全局；
- 5–10：有文件拆分但职责混杂，数据重复；
- 11–16：模块边界清楚，组合层与纯逻辑分离；
- 17–20：以最少抽象实现清晰数据流，所有权和依赖方向一目了然。

重点看：不是文件越多越高分；空 manager、无用 wrapper 和过度工程会扣分。

### 27.3 算法与图形工程质量：20 分

- 0–4：矩形 plane、随机散点和单纹理等占位方案；
- 5–10：核心算法存在但退化情况或性能差；
- 11–16：LOD、河带、放置、shader 和相机算法合理；
- 17–20：算法在质量、成本和稳定性之间有证据充分的取舍。

重点看：LOD 接缝、样条河带、miter、实例化、风动、透明、水深、Fresnel、阴影稳定和热路径。

### 27.4 测试质量：15 分

- 0–3：无测试、测试不运行或只测字符串；
- 4–7：覆盖少量 happy path；
- 8–12：覆盖关键纯函数、边界和失败情况；
- 13–15：测试能真实发现实现变体错误，命名和失败信息清楚，跨系统契约有覆盖。

测试数量不是唯一指标，十个有价值的边界测试高于五十个常量断言。

### 27.5 性能与资源管理：10 分

- 0–2：每对象 draw call、明显泄漏或帧循环重建；
- 3–5：基本实例化，但切档/流送/释放不完整；
- 6–8：成本随画质变化，热路径克制，资源计数稳定；
- 9–10：有可信测量、合理预算和明确所有权，长时间运行稳定。

### 27.6 可读性与交付可信度：10 分

- 0–2：命名混乱、报告与实际不符；
- 3–5：基本可读，但文档或已知限制不完整；
- 6–8：命名、注释、README 和最终报告准确；
- 9–10：代码易审阅，取舍解释简洁，证据可复现，不夸大完成度。

最终总分：

```text
总分 = 产品质量子分 × 60% + 工程质量子分 × 40%
```

若两份产出总分相同，依次比较：

1. 工程质量子分；
2. 水系和地形正确性；
3. 浏览器稳定性；
4. Balanced 性能；
5. 视觉完成度；
6. 代码量更少且职责更清楚者优先。

### 27.7 总分上限规则

以下问题触发上限，避免用大量装饰性加分掩盖基础失败：

- 无法 `npm install` 或 `npm run build`：总分最高 20；
- 页面无法进入可交互状态：总分最高 25；
- 未使用指定高度图：总分最高 35；
- 没有可控制玩家或第三人称相机：总分最高 45；
- 水系只有矩形 plane、没有完整上下游连接：总分最高 55；
- 运行时依赖外网：总分最高 50；
- 修改预置资产或读取工作区外参考答案：本次结果无效；
- 测试或最终报告伪造：工程质量“测试质量”和“交付可信度”均记 0，并由评测者决定是否判无效。

## 28. 外部评测者统一操作规程

本节供评测者使用，实施模型不得根据机器特征动态降低内容来讨好评分。

### 28.1 环境

每个模型使用：

- 相同预置资产副本；
- 相同 Node 主版本；
- 相同浏览器主版本；
- 相同窗口尺寸；
- 相同设备和电源状态；
- 新的空输出目录；
- 相同最大执行时间；
- 不共享 npm cache 之外的项目文件；
- 不共享其他模型的输出、截图或日志。

评测者记录 Node、npm、浏览器、操作系统和 GPU renderer 字符串。网络在安装依赖后可关闭，以验证运行时无外部请求。

### 28.2 命令验收

依次运行：

```bash
npm install
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

记录：

- 各命令 exit code；
- 安装和构建时长；
- 测试总数、通过数、失败数和跳过数；
- build 输出警告；
- preview 实际 URL；
- 冷启动到 interactive 和 ready 的时间。

不得手工修改源码后再评分。若模型留下一个明显的一字符启动错误，仍按原始交付评分，可在备注中单独记录“人工修复后潜力”，但不改变主分。

### 28.3 浏览器验收

使用 1280×720、设备缩放 1。清空站点缓存后首次加载一次，再热加载一次。记录：

- network 失败；
- console error/warning；
- shader compile 信息；
- `getState()`；
- 六个 shot 截图；
- Balanced 预热后 10 秒 metrics；
- 三档画质 metrics 差异；
- resize 结果；
- 角色连续操作结果；
- 是否出现黑屏、闪烁、裂缝、穿地、漂浮、z-fighting。

视觉项应由至少两名评测者盲评，隐藏模型名称。若只有一名评测者，使用同一显示器、固定顺序后再随机复看，避免第一印象偏差。

### 28.4 代码审阅

代码审阅按以下顺序：

1. `package.json`、README 和入口；
2. 高度解码与坐标映射；
3. 地形几何和材质；
4. 河网、河带和水 shader；
5. 植被放置和实例化；
6. 玩家、输入和相机；
7. 画质、metrics 和生命周期；
8. tests；
9. 搜索 `TODO|FIXME|HACK|Math.random|catch\\s*\\{\\s*\\}|console.log|/public/assets|https?://`；
10. 对照最终报告核验声明。

搜索命中不是自动判错，评测者应阅读上下文。例如 README 中出现 `http://localhost` 合理，空 catch 和运行时 CDN 则不合理。

### 28.5 变异检查

为防止只针对固定常量过拟合，评测者可进行不改资产的输入变异：

- 更改 seed；
- 在 Performance 与 Quality 间反复切换；
- 快速 resize；
- 在地图边缘移动；
- 长按对角输入；
- 切出标签页 3 秒再返回；
- 直接打开每个 shot URL；
- 模拟一个非关键树模型加载失败；
- 在纯函数测试中加入新的 2×2 高度样本；
- 对河带输入使用直线、急弯和退化短段。

变异检查用于评估鲁棒性，不要求实现生产级容错。模型不应在运行时检测“评测模式”并返回伪造 metrics。

## 29. 最终交付清单

提交最终结果前逐项自查：

### 项目与命令

- [ ] 项目根目录正确；
- [ ] `package.json` 和 lockfile 存在；
- [ ] `npm install` 成功；
- [ ] `npm test` 全部通过且无 skip；
- [ ] `npm run build` 成功；
- [ ] `npm run preview` 可交互；
- [ ] README 与实际命令一致；
- [ ] 运行时无网络依赖。

### 资源

- [ ] 未修改任何预置资源；
- [ ] 资源 URL 不含 `/public`；
- [ ] KTX2Loader 已 detectSupport；
- [ ] MeshoptDecoder 已配置；
- [ ] base color 和 data texture 色彩空间正确；
- [ ] 同一资产没有重复加载；
- [ ] enemy 目录未被加载。

### 地形与角色

- [ ] 使用真实 4096×4096 高度图；
- [ ] 特殊低地编码正确；
- [ ] 世界/图片 Z 方向正确；
- [ ] 网格、玩家、相机和生态共用高度真源；
- [ ] 地形 LOD 有真实成本差异且无明显裂缝；
- [ ] 玩家约 1.8 高、脚底贴地；
- [ ] idle/walk 平滑；
- [ ] 相机不穿地；
- [ ] 地图边界有效。

### 水系

- [ ] 至少三条高山支流；
- [ ] 支流汇入自然河谷；
- [ ] tarn、高山湖、出口、瀑布、池、主河和终端湖完整；
- [ ] 下游水位不升高；
- [ ] 河带真实弯曲且 attributes 合法；
- [ ] 河床下挖和岸线连续；
- [ ] 河湖、汇流和瀑布接口无明显空洞/叠层；
- [ ] 水深、Fresnel、高光、流动和泡沫可读；
- [ ] 泡沫有动机且不均匀铺满。

### 生态与道路

- [ ] 草使用多个提供变体；
- [ ] 草、树、岩石使用实例化或等价批处理；
- [ ] 树使用多个普通变体；
- [ ] 固定 seed；
- [ ] 草木避开水、道路和陡壁；
- [ ] 草和树有 LOD/距离衰减；
- [ ] 风动从根部固定；
- [ ] 岩石接地且水中石影响白水；
- [ ] 步道连接出生区与高山景点；
- [ ] 低地道路存在且自然。

### 视觉与性能

- [ ] 天空、云、暖阳、冷阴影和空气透视成立；
- [ ] 阴影稳定且叶片不是方块；
- [ ] 后处理克制；
- [ ] 三档画质真实改变成本；
- [ ] resize 更新所有目标；
- [ ] Balanced metrics 为真实采样；
- [ ] 热路径无明显每帧重建；
- [ ] 反复切档资源计数稳定。

### 验证与报告

- [ ] 六个 shot 可直接打开；
- [ ] `window.__COLD_MOUNTAIN__` 可用；
- [ ] 默认和六个 shot 均检查 console/network；
- [ ] 测试覆盖关键边界而非字符串；
- [ ] 无阻断 TODO；
- [ ] 最终报告列出真实限制；
- [ ] 没有声称未验证的指标；
- [ ] 代码中没有针对评分接口伪造状态。

现在开始执行。先确认当前工作区中的预置资源可用，然后按第 14 节阶段顺序直接实现、验证并交付项目。
