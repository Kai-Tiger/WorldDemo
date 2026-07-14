# Cold Mountain 从零构建 One-shot Benchmark Prompt

## 使用方式

这是用于比较不同模型或 coding harness 一次性交付能力的黑盒 Prompt。它描述最终体验、现有资源和可观察验收，不提供当前项目的源码结构、精确河道坐标或现成算法。

为避免模型从现有实现中抄答案，推荐让 harness 在空工作目录执行，只把 `public/assets/` 和 `public/basis/` 复制或只读挂载进去。若直接使用本机资源，资源源目录为：

```text
/Users/likai.lear/Desktop/my-example
```

复制下面整个代码块作为任务 Prompt。

````text
你是一名资深实时图形工程师、Three.js 游戏原型工程师和技术美术。请直接在当前输出工作区从零实现一个完整、可运行、可验收的 Web 3D 项目：`Cold Mountain`。

不要只写方案、伪代码或 TODO。不要等待追问；遇到未明确的细节请做合理的、最简单的工程判断并继续，直到项目可以安装、测试、构建和在浏览器中游玩。

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

本机只读资源源根目录：

```text
/Users/likai.lear/Desktop/my-example
```

如果当前工作目录是空目录，直接在其中创建项目。如果当前目录就是上述资源源仓库，或其中已有其他项目文件，不得覆盖它；请在当前目录下创建独立的 `cold-mountain-one-shot-output/` 作为输出项目。

允许读取或复制的源内容只有：

```text
/Users/likai.lear/Desktop/my-example/public/assets/
/Users/likai.lear/Desktop/my-example/public/basis/
```

禁止读取、复制或参考资源源仓库中的 `src/`、`tests/`、`docs/`、Git 历史、构建产物和对话日志。这是一次从零构建评测，不允许从现有实现抄答案。

输出项目内资源应位于：

```text
public/assets/
public/basis/
```

`public` 是文件系统前缀，不属于浏览器 URL。例如：

```text
文件路径：public/assets/terrain/height.webp
浏览器 URL：/assets/terrain/height.webp
```

不得修改源资源字节。可以复制、只读挂载或建立由 harness 管理的链接，但最终运行时不能依赖网络资源。

## 3. 技术栈与命令

使用以下最小技术栈：

- Vite；
- 原生 JavaScript ES Modules；
- Three.js；
- HTML 和 CSS；
- 自定义 GLSL / `THREE.ShaderMaterial`，仅用于确实需要的地形、水体、风动或后处理；
- Node 内建 `node:test` 做不依赖浏览器/WebGL 的 CPU 逻辑测试。

不要使用 React、Vue、Angular、Babylon.js、PlayCanvas 或其他游戏引擎。不要加入后端服务、数据库、账号、战斗、NPC、任务系统、联网或音频。不要下载、生成或引用任何外部素材。

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
public/assets/terrain/materials/optimized/dry_grass_albedo_1k.ktx2
public/assets/terrain/materials/optimized/dry_grass_albedo_2k.ktx2
public/assets/terrain/materials/optimized/dry_grass_normal_1k.ktx2
public/assets/terrain/materials/optimized/dry_grass_normal_2k.ktx2
public/assets/terrain/materials/optimized/moss_albedo_1k.ktx2
public/assets/terrain/materials/optimized/moss_albedo_2k.ktx2
public/assets/terrain/materials/optimized/moss_normal_1k.ktx2
public/assets/terrain/materials/optimized/moss_normal_2k.ktx2
public/assets/terrain/materials/optimized/blend_mask_splat_1k.ktx2
public/assets/terrain/materials/optimized/blend_mask_splat_2k.ktx2
```

水岸和河床：

```text
public/assets/terrain/river-bed.webp
public/assets/terrain/river-bank-rock-wet-light-alt.webp
```

可选落叶 decal：

```text
public/assets/terrain/leaf1.png
public/assets/terrain/leaf2.png
```

Albedo/base-color 使用 sRGB；normal、ORM、opacity、AO、roughness、height 和 mask 使用线性色彩空间。地形材质默认 `metalness = 0`，干土、岩石和碎石整体偏高 roughness。不要把所有地表元素烘成一张嘈杂贴图。

以下旧纹理存在，但不是首选；只有推荐资源确实无法满足需求时才使用：

```text
public/assets/terrain/dirt-frozen.webp
public/assets/terrain/grass-alpine.webp
public/assets/terrain/ground-dirt.webp
public/assets/terrain/ground-dry-grass.webp
public/assets/terrain/ground-grass.webp
public/assets/terrain/river-bank-rock-wet.webp
public/assets/terrain/river-bank-rock-wet-light.webp
```

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
- Save 可以通过 Vite dev middleware 写回输出项目自己的 `public/assets/terrain/height.webp`；
- 首次保存前生成备份；
- 不需要 undo、redo、材质绘制或生产级权限系统。

此功能不得修改只读源仓库中的原始资源。

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
- 读取或复制源仓库现有实现。

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

## 13. 统一评分参考（100 分）

不要为了自评分篡改实现；此表供外部评测使用：

- 15 分：安装、测试、构建、启动、无资源错误；
- 15 分：角色、移动、动画、相机和探索体验；
- 15 分：高度图地形、LOD、道路和地表 PBR；
- 20 分：连通水系几何、岸线、流向、泡沫、河湖瀑布接口；
- 15 分：草、树、岩石的生态分布、风动、实例化和 LOD；
- 10 分：天空、灯光、阴影、空气透视和后处理；
- 5 分：HUD、画质档、固定机位和调试工具；
- 5 分：代码简洁度、测试质量、资源生命周期和最终报告可信度。

现在开始执行。先确认输出目录和只读资源可用，然后直接实现、验证并交付项目。
````
