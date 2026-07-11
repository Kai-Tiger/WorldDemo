# Cold Mountain 完整复刻 Prompt

> 来源基线：项目 `my-example`，审计快照为 2026-07-11、Git commit `375c4a6`。
>
> 用法：把本文件整体交给实现 AI，并同时提供本 Prompt 所列的 `public/` 二进制资源包。

## 任务

你是一名资深 WebGL、Three.js、实时渲染和前端工程师。请在当前目录从零实现一个名为 **Cold Mountain** 的桌面 Web 第三人称高山探索原型。目标不是“做一个相似 demo”，而是按以下规格复刻完整的工程结构、运行时行为、视觉系统、确定性世界数据、性能分档、开发工具和测试契约。

请直接创建文件、实现代码、运行测试与构建、修复问题并完成交付；不要只输出示例代码或设计说明。除本规格明确要求的内容外，不要增加战斗、敌人、任务、背包、音频、主菜单、登录、网络、移动端摇杆等功能。

实现原则：

- 使用满足需求的最少代码，不做无需求的通用框架。
- 模块职责和公开 API 要稳定，算法须可测试、确定性可复现。
- 先保证首帧地形、玩家、相机、灯光和水体可用；草、树和英雄岩石允许后台渐进加载。
- 不允许用一个大平面冒充河网、不允许用单色透明材质冒充完整水体、不允许把所有场景代码塞进一个文件。
- 不要静默“优化”本规格中看似奇怪的现有行为；“忠实现状的遗留与已知边界”一节列出的边界必须保留。

## 0. 二进制资源前提

精确复刻必须拿到参考项目中已跟踪的 `public/` 资源包。它约 346 MB，包含 4096² 高度图、PBR 纹理、KTX2、Basis 转码器、FBX 和 GLB；这些内容无法由文本 Prompt 无损编码。

开始实现前先检查本规格“运行时资源清单”中的每个必需路径：

- 若资源齐全，原样复用，不能重命名。
- 若资源缺失，先列出缺失路径并请求资源包；不要悄悄换成 primitive 或随机素材后宣称精确复刻完成。
- 只有用户明确接受近似版时，才可生成兼容占位资产；即使如此，也要保持相同路径、坐标系、模块 API 与算法，并在交付中逐项标明近似项。
- `public/assets/enemy/`、源 FBX/4K 制作素材、历史截图、对话日志不是运行时输入，不要把它们接入产品。

## 1. 技术栈、包和命令

使用：

```json
{
  "name": "three-third-person-prototype",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "test": "node --test",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.179.1",
    "vite": "^7.0.0"
  },
  "devDependencies": {}
}
```

约束：

- 原生 JavaScript ES Modules，不使用 TypeScript、React、Vue、Angular 或游戏引擎。
- Three.js examples 模块可直接从 `three/examples/jsm/...` 导入。
- Node 版本必须满足 Vite 7：`^20.19.0 || >=22.12.0`；`package-lock.json` 使用 lockfile v3。
- 实际会用到的 examples 模块包括 FBXLoader、GLTFLoader、KTX2Loader、MeshoptDecoder、Reflector、EffectComposer、RenderPass、GTAOPass、ShaderPass、SMAAPass、FXAAPass、OutputPass 和 BufferGeometryUtils。
- 参考验证环境为 Node `24.13.1`、npm `11.8.0`、Three `0.179.1`、Vite 实际解析为 `7.3.6`。
- 必须支持 `npm install`、`npm run dev`、`npm test`、`npm run build`、`npm run preview`。
- 没有 lint 脚本，不要为了“完善工程”引入 ESLint、Prettier、框架或额外运行时依赖。

## 2. 目标目录

至少创建并保持以下模块边界：

```text
index.html
package.json
package-lock.json
vite.config.js
src/
  main.js
  style.css
  scene.js
  spawn.js
  input.js
  player.js
  thirdPersonCamera.js
  terrain.js
  terrainMaterial.js
  terrainEditor.js
  roadNetwork.js
  riverChannel.js
  smallLakes.js
  waterPalette.js
  waterContext.js
  waterSystem.js
  compressedTextureLoader.js
  vegetationConfig.js
  grassClumps.js
  grassZone.js
  grassManager.js
  treePlacements.js
  treeManager.js
  leafDecals.js
  heroRocks.js
  lighting.js
  visualEnvironment.js
  environmentLighting.js
  clouds.js
  postProcessing.js
  renderQuality.js
  performanceBenchmark.js
  goldenShots.js
  hydrology/
    riverNetwork.js
    riverNetworkWaterGeometry.js
tests/
  river-network-water.test.js
  tree-streaming.test.js
  post-processing.test.js
  river-network.test.js
  river-channel.test.js
  grass-lod.test.js
  performance-benchmark.test.js
  terrain-lod.test.js
  small-lakes.test.js
  water-system-network.test.js
  terrain-material-lod.test.js
  road-network.test.js
tools/
  optimize-terrain-textures.sh
  optimize-grass-textures.sh
  convert-grass-models.sh
  convert-grass-models.py
public/
  basis/
  assets/
```

模块间不要形成新的循环依赖。现有的 `smallLakes -> waterSystem.createLakeSurfaceMaterial` 和 `terrain -> 各地形塑形模块` 关系需要保留。

## 3. 页面、加载层、HUD 与 CSS

`index.html`：

- `<!doctype html>`，`<html lang="en">`，UTF-8，标准 viewport，favicon 为 `data:,`。
- `<title>Cold Mountain</title>`。
- 全屏加载层 `#loading-screen[aria-live=polite]`：
  - eyebrow 文案 `COLD MOUNTAIN`；
  - `#loading-status` 的 HTML 初值 `Preparing the highlands`；
  - 一条装饰扫描线。
- 调试性能菜单 `#position-hud[aria-label="Performance menu"]`，内容顺序必须是：
  - `fps`；
  - 坐标 `x`、`z`、`y`；
  - `frame`、`draws`、`tris`、`geometries`、`textures`、`programs`、`scale`；
  - 默认勾选的 `Grass`、`Trees` checkbox；
  - `Quality` select，选项 `Performance`、`Balanced`、`Quality`，默认 Balanced；
  - `Edit` 按钮。
- 地形编辑器 `#terrain-editor` 初始同时有 `hidden` 和 `aria-hidden="true"`，含 Raise、Lower、Radius、Strength、状态、Save、Close。
- `<canvas id="game">` 和 `/src/main.js` module script。

CSS 必须复刻：

- `html, body` 占满、无 margin、无滚动、背景 `#111318`。
- canvas `100vw × 100vh`，默认 `cursor:grab`，active 时 `grabbing`。
- HUD 默认 `display:none`；只有 `body.debug-mode #position-hud` 才显示。
- HUD 固定左上 `12px`，z-index 1，最小宽 112px，padding `8px 10px 9px`，1px 半透明白边、6px 圆角、`rgba(17,19,24,.72)` 背景、13px monospace。
- 地形编辑器固定顶部 12px、水平居中、z-index 4、单行 flex、gap 12px、深色 `rgba(17,19,24,.86)` 背景；不要额外加移动端换行逻辑。
- 加载层固定铺满、z-index 10、深蓝灰线性渐变叠加暖色径向光，opacity 700ms 过渡。
- `body.is-ready` 时加载层 opacity 0、pointer-events none。
- eyebrow 为小号大字距 sans-serif；状态文案为 17px Georgia；内容宽 `min(330px,72vw)`。
- mist 高光条 2.8s 往返，进度线高光 1.8s 扫过。
- `prefers-reduced-motion:reduce` 只关闭这两个循环动画，不取消 700ms 淡出。
- checkbox accent `#8fcf7a`；按钮/select 与 HUD 同风格；active 地形画笔用绿色边和半透明绿色底。

默认画面没有常驻玩法 UI、按键帮助或准星。调试 HUD 只通过 `?debug=1` 或 Backquote 键显示。

## 4. URL 参数与全局模式

解析以下参数：

```text
?debug=1
?quality=performance|balanced|quality
?capture=1
?shot=<golden-shot-key>
?benchmark=1
?benchmarkWarmupMs=<number>
?benchmarkDurationMs=<number>
?benchmarkRuns=<number>
```

行为：

- 无画质参数或非法值都回退 `balanced`；select 同步显示 Balanced。
- `debug` 只有字符串 `1` 生效。
- `capture=1` 才开启 `preserveDrawingBuffer`。
- Backquote 键切换 `body.debug-mode`，不要 `preventDefault()`。
- Golden Shot 命中时跳过普通玩家与第三人称相机更新，固定视觉时间，禁用动态分辨率。
- Benchmark 与 Golden Shot 可组合。

## 5. 启动与主循环

创建 WebGLRenderer：

```text
canvas: #game
antialias: false
preserveDrawingBuffer: capture === 1
powerPreference: high-performance
outputColorSpace: SRGBColorSpace
toneMapping: ACESFilmicToneMapping
toneMappingExposure: 1.14
shadowMap.enabled: true
shadowMap.type: PCFSoftShadowMap
renderer.info.autoReset: false
```

PerspectiveCamera 为 `fov=60`、`near=0.25`、`far=1800`。DPR 为 `min(devicePixelRatio, preset.pixelRatioCap)`。

严格按此顺序启动：

1. 解析参数、设置 `debug-mode`，把 loading status 改成 `Building the mountain terrain`。
2. 创建 renderer，配置尺寸、色彩、阴影。
3. `await createScene(renderer, quality)`：加载地形并完成出生 chunk 后才返回。
4. 找到 HemisphereLight；给太阳 shadow camera 启用地形 shadow proxy layer。
5. 创建相机；把 status 改成 `Lighting the cold morning`。
6. 生成程序化环境贴图并 PMREM，设置 IBL。
7. 创建水体反射控制器和 EffectComposer。
8. 创建 Input、Player，把玩家 x/z 设为 `(335,-358)`，y 设为脚底地面高度；应用画质并先 `terrain.update(player.position)`。
9. 把玩家 group 加入 scene，创建角色补光 SpotLight。
10. 创建 ThirdPersonCamera；若没有 Golden Shot，立即更新一次相机。
11. 创建地形编辑器、Clock、FPS/benchmark 状态。
12. `backgroundReady` 成功后给 body 加 `assets-ready` 并刷新反射 probe；失败则 status 显示 `Some scenery could not be loaded` 并 `console.error`。
13. 注册 resize、visibility、Grass/Trees、Quality、Backquote 监听，然后开始 RAF。

`createScene()` 必须先同步返回可用的场景骨架：地形、主河、水系、小湖、空的草/树 host、云、灯光。草模型、树模型、落叶纹理并行后台加载，成功后挂接实际 manager；英雄岩石单独后台加载。两者合并为 `backgroundReady`。首帧不等待这些后台资产。

场景 bundle 必须是：

```js
{
  scene,
  terrain,
  water,
  wetBanks: null,
  waterSystem,
  grassManager,
  treeManager,
  sunLight,
  clouds,
  smallLakes,
  backgroundReady
}
```

草/树 host 使用 deferred manager，提供 `group`、`attach()`、`update()`、`setQualityPreset()`；实现未挂接时 update 安全无操作，先收到的画质要缓存并在 attach 后补应用。

每帧顺序：

1. 先 `requestAnimationFrame(animate)`。
2. 更新 FPS/renderer HUD；`deltaTime=min(clock.getDelta(),0.05)`。
3. `smoothedFrameMs += (frameMs-smoothedFrameMs)*0.06`，尝试动态分辨率。
4. 普通模式更新 Player；Golden Shot 模式把动画固定在 `1.1s` 并重放固定镜头。
5. 更新 Terrain streaming。
6. Trees 开启时更新 TreeManager；其分区或 caster 变化时标记太阳阴影。
7. 普通模式更新 ThirdPersonCamera。
8. 写入 x/z/y HUD。
9. 更新主河、水系、草、云、小湖、反射控制器、太阳和角色补光。
10. 手动 `renderer.info.reset()`，再用 EffectComposer 渲染。
11. 可选采样 benchmark。
12. 第一帧成功后，在下一 RAF 给 body 加 `is-ready`，加载层淡出；不等待背景资产。

普通视觉时间为 `clock.elapsedTime`，Golden Shot 固定为 `18.5`。没有应用销毁入口。

## 6. 高度图地形、采样与流送

### 6.1 世界尺度和基础高度

固定参数：

```text
MAP_SIZE = 1536m，游戏边界 [-768,768]
HEIGHT_MAP_WORLD_SIZE = 2048m
高度图 = /assets/terrain/height.webp，4096×4096 RGBA WebP
MAX_HEIGHT = 300m
CHUNK_SIZE = 256m，共 6×6 chunks
默认几何 LOD = [256,128,64]
法线采样距离 = 1m
ground mask 采样距离 = 5m
```

高度图坐标映射：

- 世界 x/z 先按 2048m 范围映射到 `[0,1]` 并 clamp；图像 y 与世界 z 反向。
- 像素高度使用 `0.2126*r + 0.7152*g + 0.0722*b`，归一化后乘 300。
- 每个像素先经过可缓存的 5×5 二项式平滑核：

```text
1  4  6  4 1
4 16 24 16 4
6 24 36 24 6
4 16 24 16 4
1  4  6  4 1
```

- 四邻像素做双线性插值。
- 最后叠加确定性 value noise：频率 `0.65`、振幅 `0.35m`，并 clamp 到 `[0,300]`。
- 游戏地图只使用高度图中央 1536m 区域；不要把高度图本身裁成 1536 像素。

地形塑形顺序必须固定：

```text
baseHeight
→ applyRoadTerrain
→ applyWaterSystemTerrain（高山湖/出口/瀑布池 + 树状河网）
→ applySmallLakesTerrain
→ applyRiverChannel（瀑布下游主河）
```

shadow proxy 的宏观高度只走：

```text
baseHeight → applyWaterSystemMacroTerrain → applySmallLakesTerrain
```

即 shadow proxy 保留大湖/出口/瀑布池和小湖，但忽略狭窄树状河网、道路与下游主河细切口。

### 6.2 地表采样 API

`Terrain` 至少公开：

```js
Terrain.create(options)
prepareInitialChunk(centerPosition)
update(centerPosition)
setQualityPreset(preset)
setEditorMode(enabled)
beginTerrainEditStroke()
endTerrainEditStroke()
getLoadedChunkBounds()
getRaycastMeshes()
getHeightMapData()
heightMapPixelToWorld(imageX,imageY)
applyHeightBrush(worldX,worldZ,radius,strength)
sampleSurfaceAt(x,z,target?,cache?)
getHeightAt(x,z)
getBaseHeightAt(x,z)
getShadowProxyHeightAt(x,z)
getNormalAt(x,z)
getTerrainGroundMask(x,z)
getMaxHeightInRadius(x,z,radius)
dispose()
```

`sampleSurfaceAt` 一次返回 `{baseHeight,height,normalX,normalY,normalZ,groundMask}`，供草、树和 chunk builder 复用，避免重复采样。

法线用 x±1、z±1 的中心差分：`normalize(left-right, 2, down-up)`。ground mask 用 x/z±5：

```text
slopeMask = smoothstep(0.76, 0.94, coarseNormalY)
reliefRatio = (localMax-localMin)/10
smoothMask = 1-smoothstep(0.22,0.62,reliefRatio)
groundMask = clamp(slopeMask*smoothMask,0,1)
```

`getMaxHeightInRadius` 采样中心、四个轴向点和四个对角点，共 9 点。

### 6.3 Chunk streaming、LOD 与几何

- `prepareInitialChunk` 只保证出生点中心 chunk 完成；其余 chunk 在逐帧 update 中加载。
- chunk 距离使用 Chebyshev distance。
- 默认 load/unload ring 为 2/3，实际由画质覆盖。
- 初始空场景时 load radius 可用 1；有中心 chunk 后用画质 load radius。
- 每帧最多卸载 2 个远 chunk。
- 中心缺失优先级 0；中心升级 10；新可见 `20+distance`；近处升级 `40+distance`；降级 `100+distance`。
- build 采用 deadline，分 `allocate → vertices → indices → skirt → finalize → complete` 阶段；批量上限分别为 128 vertices、1024 cells、64 skirt samples。
- 每个任务携带 revision 和 sequence；过期 revision 必须取消。新几何完全完成后一次性加入并原子替换旧 surface/skirt，不能让旧 chunk 提前消失。
- 编辑 stroke 期间实时局部 patch 已加载 vertex；结束 stroke 后每个 dirty chunk 只提交一个强制 rebuild。
- chunk 边缘按完整 1m 采样并维护 `edgeMinimums`，但忠实现状中 `createSkirtGeometry` 不使用这些 minimum；每个边缘顶点只复制一份并把对应 bottom 设为该顶点 `Y-2m`。保留这个看似冗余的数据流，skirt 不可 raycast。
- 每个 surface BufferGeometry 需要这些 attributes：

```text
position vec3
normal vec3
uv vec2
groundMask float
riverMask float
riverBedMask float
riverUnderwaterMask float
riverBedCoord vec2
waterSystemMask vec4
smallLakesMask float
roadFrame vec4
```

`waterSystemMask = (lakeBed, wetShore, snowmeltWet, plunge)`；`roadFrame = (trailMask,cartMask,trailLateral,cartLateral)`。

编辑器开启时，玩家所在 chunk 的 Chebyshev distance≤1 强制 256 segments。道路或狭窄水系相交的 chunk 同样有最低 256 segments；宽湖区最低 128。即使 Performance 的常规中心 LOD 配置没有 256，窄特征仍不能被降到粗网格。

### 6.4 Shadow proxy

- 建立覆盖完整 1536m 地图的 64×64 低模网格，layer 固定为 `2`。
- MeshBasicMaterial：`colorWrite:false`、`depthWrite:false`。
- 只 castShadow，不 receiveShadow，不 raycast。
- `DirectionalLight.shadow.camera.layers` 启用该 layer。
- 编辑高度图时只更新受影响 proxy vertices。

## 7. 分层地形 PBR 材质

使用三个共享 `MeshStandardMaterial`，通过 `onBeforeCompile` 注入 attributes、uniforms、世界空间 masks、采样函数和 map fragment：

```text
Near：segments >= 256
Medium：segments >= 128
Far：其余
```

材质预算元数据：

```text
Near typical 8 / max 14 textures，receiveShadow=true
Medium typical 5 / max 8，receiveShadow=true
Far typical 3 / max 4，receiveShadow=false
```

共享纹理层：alpine rock + normal、snow、ground dirt + normal、forest floor basecolor + normal、dry grass + normal、gravel + normal、blend splat、river bank、river bed。基础 roughness `0.9`、metalness `0`；Near/Medium envMapIntensity `0.9`，Far `0.72`。

世界尺度：

```text
alpine 20m
ground dirt 16m
forest floor 2m
dry grass 20m
gravel 12m
river bank 3.8m
river bed 12m
```

四个 vertex macro noises 的世界频率为 `0.012`、`0.0065`、`0.055`、`0.003`。fragment 必须先计算所有廉价 masks，再进入纹理重分支：

```text
noisyHeight = height + (macro.x-.5)*30
flatMask = smoothstep(.56,.92,normal.y)
lowlandMask = 1-smoothstep(55,90,noisyHeight)
groundMask = smoothstep(.08,.82,vertexGroundMask)*flatMask*lowlandMask
moisture = clamp(.12 + splat*.5 + (1-smoothstep(65,175,noisyHeight))*.18
                 + wetShore*.7 + snowmeltWet*.8, 0, 1)
rockMask = max(1-smoothstep(.48,.72,normal.y),
               smoothstep(188,258,noisyHeight)*(1-smoothstep(.74,.92,normal.y)))
alpineMask = max(rockMask,smoothstep(45,80,noisyHeight))
snowLineHeight = height + (macro.x-.5)*24 + (macro.z-.5)*8
snowElevation = smoothstep(55,130,snowLineHeight)
snowSlope = smoothstep(.30,.78,normal.y)
snowCoverage = smoothstep(.12,.88,snowElevation*snowSlope+(macro.z-.5)*.22)
```

地面逻辑：

- Near 的可用 ground 直接恢复 2m baked forest-floor；对 base color 做局部 grade：按 luminance 降到 66% 饱和，乘暖土色 `(1.12,.98,.90)`，整体 `*1.24 + (0.009,.008,.005)`。
- Medium/Far 在 forest-floor、dry grass、gravel、dirt 中按 moisture、height、splat 和 macro 分支选一个，禁止把所有层无条件采样后再混合。
- Near 对重复纹理做带随机旋转的双采样 anti-tiling，并对岩石做 world-space triplanar color/normal；Medium 简化为单样本并保留法线；Far 再简化且不采样材质法线。
- ground midtone 只在非水 ground 层应用 `mix(0.96,1.05,macro.w)`，不能抬亮岩石、雪或水体覆盖。
- 雪是所有 LOD 的同一张世界空间覆盖层，位于基础地形和道路之后、水体覆盖之前。
- 道路 overlay 必须复用 dirt/gravel，先绘道路，再叠雪和水。
- 水体最后覆盖：河岸/湿岸使用 river-bank，河床/湖床使用 river-bed；主河床用沿河局部 UV，small lake 和河网床用世界 xz UV。忠实保留现状缺陷：主高山湖的 `lakeBedMask` 通常有效，但 `smallLakesMask=0` 且旧主河 coord 为 `(0,0)`，因此主湖大部分床会固定采 river-bed 的 `(0,0)`；不要在未获授权时顺手修复。水区 roughness 向 `0.36` 混合。
- Near rock normal 混合权重约 0.5；snow 将法线向 base normal 混合 0.55，roughness 到 0.94。
- custom program cache key 要区分 Near/Medium/Far；所有共享材质只 dispose 一次。

运行时加载：

- KTX2Loader 的 transcoder 路径 `/basis/`，调用 `detectSupport(renderer)`。
- texture tier 只有传入字符串严格等于 `1k` 才用 1k；其他值包括 `2k` 和 `hero-4k` 都回落到 2k。
- KTX2 用于 dirt/dry-grass/gravel/splat；rock、snow、river、forest-floor 优化 JPG 仍用普通 TextureLoader。
- albedo 设 SRGB；normal/splat 设 NoColorSpace；全部 repeat，splat 例外为 clamp。

## 8. 道路网络

使用 centripetal `CatmullRomCurve3`，按约 1m 采样，端点 fade 7m，边缘 fade 0.7m，宽度叠加最多约 8% 的两层正弦变化。三条路线数据必须原样使用：

```js
[
  {
    id: 'river-valley-carriage-road', type: 'cart', width: 5,
    points: [[430,-405],[456,-389],[485,-379],[512,-366],[539,-342],
             [573,-326],[606,-327],[635,-339],[658,-328],[674,-314],
             [697,-307],[725,-315],[755,-300]]
  },
  {
    id: 'waterfall-overlook-trail', type: 'trail', width: 2.2,
    points: [[335,-358],[339,-346],[346,-331],[360,-325],[374,-332],
             [389,-345],[401,-365],[401,-395]]
  },
  {
    id: 'mountain-access-trail', type: 'trail', width: 4.8,
    terrainProfile: {lowHeight:0, highHeight:28, innerHalfWidth:3, outerHalfWidth:18},
    points: [[444,-397],[432,-398],[427,-391],[421,-380],
             [412,-368],[401,-356],[389,-345]]
  }
]
```

`getRoadMaterialFrame(x,z,target)` 返回最强 trail/cart mask 与归一化有符号 lateral。edge mask 在 `0.7*halfWidth → halfWidth+0.7` 淡出，首尾各 7m fade。

只有 mountain-access route 塑形高度：沿路线从 0m 平滑升到 28m，核心半宽 3m，外影响半宽 18m；影响区内可抬高或降低地形，18m 外保持原高度。与完整地形塑形链组合后仍需保持≤35°可行走坡。

材质表现：

- trail 为压暗暖 dirt，中央略深。
- cart 为 dirt/gravel 混合；在 lateral `±0.45` 附近形成两条暗轮辙，中央带轻微返青。
- road mask 影响 base color、normal、roughness、AO。

草按额外 0.55m buffer 排除，树按额外 2.2m 排除。所有与道路 bounds 相交的 terrain chunk 最低 256 segments。

## 9. 水体统一上下文

固定水色：

```js
WATER_SHALLOW_COLOR = 0x527d75
WATER_DEEP_COLOR = 0x0b2a34
WATER_FOAM_COLOR = 0xddebea
WATER_REFLECTION_COLOR = 0x607c89
WATER_HORIZON_REFLECTION_COLOR = 0x91a5aa
WATER_BANK_REFLECTION_COLOR = 0x303e38
WATER_SUN_REFLECTION_COLOR = 0xffc98d
```

所有水 shader 共享 `uTime`、camera、上述颜色、太阳方向、雾、environment/probe/planar reflection samplers、planar texture matrix、reflection mode/strength、depth shoreline flag。共享两层 value noise、双正弦波法线、Fresnel、tiered reflection 和与 FogExp2 一致的水雾函数。

render order：

```text
wetBank 18
surface 20
waterfall 30
foam 32
mist 34
```

水面、瀑布和 foam 原则上使用 DoubleSide、transparent、`forceSinglePass:true`、`depthWrite:false`、`depthTest:true`；显式水根设置 `excludeFromGtao=true`。

WaterRenderController：

- 128² HalfFloat cube target；CubeCamera near/far `0.5/1200`，位置 `(300,36,-400)`。
- 132×132 Reflector 平面，位置 `(300,31.015,-400)`，绕 x `-π/2`，clipBias `0.001`，只作为不可见颜色捕获器。
- 捕获 probe/planar 时隐藏所有 water roots，完成后恢复原 visibility，避免水递归反射自己。
- Performance mode 0 使用程序化 environment，strength `0.42`。
- Balanced mode 1 使用 cube probe，strength `0.58`。
- Quality mode 2 使用 planar，strength `0.70`，每 2 帧只显示/更新一次 reflector。
- 所有反射 target 按 drawing buffer × `reflectionScale=0.5` resize。
- 具体对象可用 `userData.waterReflectionModeCap` 限制模式；上游河网和 cirque tarn cap 为 1，不能升级成 planar。
- Balanced/Quality 的 depth shoreline flag 为 1；Performance 为 0。

## 10. 上游树状河网

### 10.1 真源数据

`riverNetwork.js` 是上游路径、水位、雕刻、材质 mask、植被排除和水面几何的唯一真源。节点数据必须原样实现：

```js
[
  {id:'source-s0-northwest', type:'source', position:[-296,-312], waterLevel:182.8},
  {id:'source-s1-north', type:'source', position:[24,-192], waterLevel:181.6},
  {id:'junction-j1', type:'confluence', position:[16,-352], waterLevel:50.6},
  {id:'source-s2-southwest', type:'source', position:[-208,-556], waterLevel:181.6},
  {id:'junction-j2', type:'confluence', position:[92,-420], waterLevel:42.8},
  {id:'source-s3-cirque', type:'source', position:[40,-680], waterLevel:182.8},
  {id:'cirque-tarn', type:'lake', position:[76,-552], center:[76,-552],
   waterLevel:49.5, radius:18, shoreWidth:5, maxDepth:6, edgeDepth:.25},
  {id:'junction-j3', type:'confluence', position:[172,-444], waterLevel:39.1},
  {id:'source-s4-southeast', type:'source', position:[152,-652], waterLevel:182.8},
  {id:'junction-j4', type:'confluence', position:[272,-460], waterLevel:31.6},
  {id:'alpine-lake', type:'lake', position:[309,-448], center:[300,-400],
   waterLevel:31, radius:47, shoreWidth:9, maxDepth:6.5, edgeDepth:.25, existing:true}
]
```

十条 reaches：

```js
[
  {
    id:'s0-j1', from:'source-s0-northwest', to:'junction-j1', style:'headwater',
    points:[[-296,-312],[-264,-288],[-200,-288],[-144,-316],[-116,-339],
            [-100,-348],[-52,-344],[4,-340],[16,-352]],
    waterLevels:[182.8,159.6,107.1,106.5,83.5,79.7,53.4,50.7,50.6],
    width:[1.4,2.3], depth:[.25,.55], influence:[4,6], vegetationBuffer:[1.5,2.2]
  },
  {
    id:'s1-j1', from:'source-s1-north', to:'junction-j1', style:'headwater',
    points:[[24,-192],[52,-220],[80,-256],[68,-288],[36,-308],[16,-352]],
    waterLevels:[181.6,124.3,65.9,55.9,55.4,50.6],
    width:[1.2,1.8], depth:[.2,.45], influence:[3.5,5.5], vegetationBuffer:[1.4,2]
  },
  {
    id:'j1-j2', from:'junction-j1', to:'junction-j2', style:'collector',
    points:[[16,-352],[24,-396],[76,-416],[92,-420]],
    waterLevels:[50.6,46.8,43.5,42.8],
    width:[2.6,3], depth:[.55,.7], influence:[6.5,7.5], vegetationBuffer:[2.4,2.8]
  },
  {
    id:'s2-j2', from:'source-s2-southwest', to:'junction-j2', style:'headwater',
    points:[[-208,-556],[-160,-544],[-126,-569],[-116,-572],[-76,-548],
            [-56,-504],[-8,-488],[15,-478],[36,-464],[76,-428],[92,-420]],
    waterLevels:[181.6,140.8,138.3,138.3,104.6,72.7,58.8,47.5,44.8,43.1,42.8],
    width:[1.3,2], depth:[.22,.5], influence:[3.8,6], vegetationBuffer:[1.5,2.2]
  },
  {
    id:'j2-j3', from:'junction-j2', to:'junction-j3', style:'collector',
    points:[[92,-420],[132,-436],[152,-440],[172,-444]],
    waterLevels:[42.8,40.3,39.4,39.1],
    width:[3.2,3.8], depth:[.7,.9], influence:[7.5,8.5], vegetationBuffer:[2.8,3.2]
  },
  {
    id:'s3-tarn', from:'source-s3-cirque', to:'cirque-tarn', style:'headwater',
    points:[[40,-680],[0,-660],[-8,-612],[28,-580],[42,-573],[68,-560],[76,-552]],
    waterLevels:[182.8,154.3,102.8,73.5,59.3,50,49.5],
    width:[1.2,1.6], depth:[.2,.4], influence:[3.5,5], vegetationBuffer:[1.4,1.8]
  },
  {
    id:'tarn-j3', from:'cirque-tarn', to:'junction-j3', style:'lake-outlet',
    points:[[76,-552],[100,-524],[104,-517],[108,-510],[120,-480],[152,-452],[172,-444]],
    waterLevels:[49.5,48.8,44.7,42.2,42.2,39.3,39.1],
    width:[2,2.4], depth:[.45,.6], influence:[5.5,6.5], vegetationBuffer:[2,2.5]
  },
  {
    id:'j3-j4', from:'junction-j3', to:'junction-j4', style:'collector',
    points:[[172,-444],[196,-444],[252,-460],[272,-460]],
    waterLevels:[39.1,36.2,32,31.6],
    width:[4,4.6], depth:[.9,1.1], influence:[8.5,9.5], vegetationBuffer:[3.2,3.7]
  },
  {
    id:'s4-j4', from:'source-s4-southeast', to:'junction-j4', style:'headwater',
    points:[[152,-652],[184,-620],[208,-588],[220,-548],[220,-504],[252,-476],[272,-460]],
    waterLevels:[182.8,104.7,71.3,48.5,34,31.9,31.6],
    width:[1.3,2.1], depth:[.22,.52], influence:[3.8,6.2], vegetationBuffer:[1.5,2.3]
  },
  {
    id:'j4-alpine-lake', from:'junction-j4', to:'alpine-lake', style:'lake-inlet',
    points:[[272,-460],[286,-454],[298,-450],[309,-448]],
    waterLevels:[31.6,31.4,31.2,31],
    width:[4.8,5.2], depth:[1.1,1.25], influence:[9.5,10.5], vegetationBuffer:[3.7,4]
  }
]
```

### 10.2 编译、验证和雕刻

- 每条 reach 用 centripetal Catmull-Rom；默认按 2m 采样，空间网格 cell 64m。
- 验证 node/reach id 唯一、端点吻合、所有引用存在、水位与 node 一致、下游不升高。
- 网络必须是 DAG、恰好一个 sink；source 不得有入边；confluence 至少两条入边；任何 node 最多一条出边。
- 编译后保留 nodeById、incoming/outgoing maps、topological order、reachById、lake features、feature bounds 和空间索引。
- 最近 reach 查询在线段间投影；距离完全相等时优先更宽的 reach，确保汇流点选下游主通道。
- 河床核心把高度雕到 `waterLevel-depth`；核心 mask 到 halfWidth，岸影响到 influence，外岸 carve 权重 0.22，只允许降低地形。
- lake 内按中心深、边缘浅从 maxDepth 过渡到 edgeDepth，也只允许降低。
- 植被排除距离为 `halfWidth + vegetationBuffer + callerBuffer`；湖为 `radius+shoreWidth+buffer`。

### 10.3 合并水面几何

所有十条 reach 合并为一个 BufferGeometry 和一个 mesh `AlpineRiverNetworkSurface`，不是十个独立 mesh。固定预算与 attributes：

```text
MAX_TRIANGLES = 12000（实际必须严格小于）
UV U = 连续下游世界距离 / 24m
position vec3
uv vec2
waterFade float
waterEdge float
junctionMask float
viewDistance float
```

按 style tessellate：

```text
headwater: spacing 2.5m, lateralSegments 3, viewDistance 180m
collector: spacing 2m, lateralSegments 4, viewDistance 260m
lake-outlet: spacing 1.75m, lateralSegments 4, viewDistance 260m
lake-inlet: spacing 1.5m, lateralSegments 5, viewDistance 300m
```

- U 坐标通过逆拓扑 node flow coordinate 保持汇流前后连续且沿下游单调。
- 所有 triangles 必须检查并翻转为 +Y；退化三角形跳过。
- source、非 existing lake 的进出口做 endpoint fade。
- 局部河面坡度 18° 开始淡出，32° 完全隐藏，避免陡峭水带穿山。
- 四个 confluence 把三条相连 reach 各自按最大宽度裁一小段，再把全部边界顶点绕 node 排序，用一个中心 fan patch 补洞；patch 不可互相重叠，junctionMask=1。
- cirque tarn 另建 64 段、10 rings 的圆形湖面；水位 49.5，reflection cap=1。

上游 stream shader：flow U 方向动画；岸边慢、中心快；edge foam 两层噪声；junctionMask 产生局部汇流泡沫；按每条 reach 的 viewDistance 淡出。浅/深色、双波法线、Fresnel、bank reflection、太阳 sparkle 和水雾必须存在。

## 11. 高山湖、出口、瀑布与瀑布池

主高山湖：中心 `(300,-400)`、水位 `31`、基础半径 47、shore width 9、basin floor 24.5。湖岸不是正圆：

```js
radius = clamp(
  47 + sin(angle*3+.7)*4.4 + sin(angle*5-1.1)*3.1 + sin(angle*9+2.2)*1.8,
  39, 56
)
```

- 地形内圈从 basin floor 向水位下 1.35m 过渡；外岸在 9m 内与原高度衔接。
- 西南岸额外在以 `(289,-462)` 为中心、半轴 `(68,24)` 的椭圆局部抬高，使岸线不漏水；shore offset 约 -9 到 +24m 生效，目标从水位下 0.35 到水位上 1.15。
- 湖面 96 angular segments × 22 radial rings；中心加各环，带 `lakeDepth`、`lakeEdge`、`lakeBedVisibility` attributes；水面 y=`31.045`。

出口 curve：

```js
[[340,-410],[365,-417],[392,-419],[409,-421]]
```

宽 5.2、影响 8.5、水面高于塑形地形 0.35；strip 90 longitudinal × 10 lateral，开头在 t=.08→.24 fade。出口河床从湖底约水位下 1.7 平滑过渡到瀑布唇下 1.1。

瀑布：

```text
lip 由 outletCurve 终点和实时 terrain surface 求得（参考锚点 409,30.4,-421）
base (418,1.5,-424)
总宽 7.5
28 vertical × 7 lateral segments
```

四层 veil：

```js
[
 {name:'WaterfallMainVeil', xOffset:0, zOffset:0, width:.72, alpha:.22, speed:1.15},
 {name:'WaterfallLeftThreads', xOffset:-1.7, zOffset:-.45, width:.30, alpha:.10, speed:1.35},
 {name:'WaterfallRightThreads', xOffset:1.7, zOffset:.30, width:.32, alpha:.11, speed:1.28},
 {name:'WaterfallMistVeil', xOffset:.3, zOffset:.8, width:.82, alpha:.05, speed:.72}
]
```

- geometry 从 lip 到 base 用 smoothstep 下坠，向前形成最大约 2.8m 弧度，越下越宽，横向有细扰动；顶部 12% 贴回 outlet 水面以避免接缝。
- shader 沿 vUv.y 形成高速纵向 streak、fine threads、下部破碎和空洞；不要做不透明白布。
- lip foam 是 44 段不规则椭圆扇，长 4.2、宽 7.2，贴在出口水面上方 0.08–0.1。

瀑布池/出流：

```text
PLUNGE_CENTER = (418,-424)
radius = 10
floor = -2.2
outflow direction = normalize(.82,.57)
length = 24
width 8.5 → 4.2
```

- 地形在池中心平滑下挖至 -2.2。
- 出流 foam overlay 14×8，水面 y≈1.02，沿下游 taper，噪声破边。
- 72 个 Points mist 粒子，围绕 base 分布并用时间向上循环；点尺寸随透视，单粒 alpha 约 .012–.03，render order 34。

WaterSystem group 必须包含并返回：

```js
{
  group, lake, outletStream, tributaries,
  snowmelt: tributaries, // 兼容别名，指向同一个对象
  cirqueTarn, waterfall, waterfallLipFoam, confluence
}
```

## 12. 瀑布下游主河与终端湖

这是独立于上游 DAG 的低地 S 形主河。中心线：

```js
[[420,-423],[435,-413],[460,-398],[489,-388],[518,-374],[545,-350],
 [575,-336],[604,-337],[633,-349],[662,-351],[690,-340]]
```

固定参数：

```text
channel width 8
channel depth 3
influence radius 7
只在 base height <18 生效，10→18 渐隐
path samples 260
water width 4.8
water level above bed 1.6
longitudinal step 0.3
lateral segments 24
profile smoothing radius 10 samples
每相邻 profile height 最大变化 0.025
start taper length 10
terminal lake level blend length 18
terminal visual fade length 4
```

channel 地形核心按横向 smoothstep 下挖 3m，外岸只用 0.22 强度，起点 10m taper。river material frame 输出 channel/bed/underwater masks、沿河 distance 和有符号 lateral；bank full/fade half width 3.6/4.4，bed core/blend 0.25/0.75。

河面高度先从地形+1.6 取 raw profile，用三角权重半径 10 平滑，再前后两趟 clamp 到每 sample±0.025。靠终端湖的最后 18m 混合到湖面高度。

终端湖：

```js
{cx:690, cz:-340, radius:20, shoreWidth:6, waterLevel:-1.28,
 maxDepth:3, edgeDepth:.15, surfaceOffset:.045}
```

- 找到河中心线首次进入终端湖的 distance。
- 河水 geometry 只生成到 `entryDistance+4m`；片元 alpha 在 entry→entry+4 归零，geometry 末行必须和 alpha=0 精确一致，不把不可见河带继续铺过湖底。
- 水位在入湖前 18m 混合到 `-1.235`。
- 河水 mesh 带 `waterDepth`，用浅深混色、岸边噪声透明、caustics、Fresnel、环境/岸反射、太阳高光和两层岸泡沫。
- helper `createWetBankMesh` 仍必须存在并可生成完整长度的左右湿岸：每侧从 lateral 2.18 延伸到 4.0（约 1.82m 宽），与水下重叠 .22，地表 offset .14。常量 `WET_BANK_WIDTH=.85` 只用于旧主河草排除，不决定 helper 几何宽度。production `scene.js` 不加载该纹理、不创建 mesh，bundle 的 `wetBanks` 必须是 `null`。

终端湖作为 `smallLakes` 中的径向 surface 创建，render order 为 21，全部三角朝 +Y；地形内圈从中心 maxDepth 过渡到 edgeDepth，外 6m shore 连接原地形。

## 13. Small lakes

保留 authored 列表：

```js
[
 {cx:755,cz:-657,radius:35,maxDepth:3.5,waterDrop:1,shapeAmp:.28},
 {cx:667,cz:-605,radius:28,maxDepth:3,waterDrop:.8,shapeAmp:.20},
 {cx:859,cz:-692,radius:25,maxDepth:3,waterDrop:.8,shapeAmp:.18},
 {cx:717,cz:-751,radius:30,maxDepth:3.2,waterDrop:.9,shapeAmp:.32},
 terminalLake
]
```

在创建前按完整形状+shore 是否落在 `[-768,768]²` 内过滤。因此当前运行时只有 `(667,-605)` 的普通小湖和 `(690,-340)` 终端湖生效，其余 authored lakes 不创建、不塑形。

普通小湖半径用 3/5/7 倍正弦不规则化；shore width 6。水位为湖中心 base height 减 waterDrop。每湖 `64 angular × 12 radial`，即 769 vertices、1472 triangles；所有 faces/vertex normals 朝 +Y，attributes 与主湖 surface 兼容。

## 14. 水面 shader 视觉验收

不要逐字照搬一个通用 shader；按对象特征分别实现，但必须共享颜色、reflection、noise、fog contract：

- Lake：顶点两组低幅波（约 0.055/0.04），岸边波幅渐隐；片元有 broad/ripple/detail noise、真实 depth/edge alpha、浅深层、可见湖床 tint、沉积岸色、双波 normal、Fresnel、tiered reflection、bank reflection、浅水 caustics、风脉冲、太阳 sharp/broad glint 和破碎 shoreline foam。
- Stream/river network：U 方向流动；中心流速大、岸边慢；edge alpha；大/细两层泡沫；汇流 patch 局部 foam；view distance fade。
- Downstream river：真实 waterDepth 驱动 shallow/deep/alpha/caustics；终端接近时降低流速并向 deep color 混合；最后 alpha fade 与 geometry 一致。
- Waterfall：透明 streak curtains、细丝、下部 breakup、极低 alpha mist veil；不能是纯白硬片。
- Foam overlays：用多尺度 noise 打散，不允许连续规则白线。
- 所有 shader 在自己的 output 前应用水雾，并正确接 Three.js tonemapping/colorspace chunks（mist points 只需水雾）。
- 水体之间不能出现明显 z-fighting、反向 winding、硬矩形边或透明排序黑块。

## 15. Grass：资源、群落、LOD 与 streaming

### 15.1 配置与资产

地图/植被 zone：

```text
MAP_SIZE 1536
ZONE_SIZE 64
KEEP_ALIVE_PADDING 64
candidate density 2.5 clumps/m²
candidate jitter span 0.7 cell
river buffer config 2
ground mask threshold config 0.3
patch count 8，radius 1.5–4，gap acceptance .75
wind strength .035，direction normalize(.82,.38)
```

运行时加载 Ribbon Grass 六个变体 `VarA`–`VarF`，每个 LOD0/1/2 共 18 个 Meshopt GLB：

```text
/assets/vegetation/ribbon-grass/optimized/models/
Ribbon_Grass_tbdpec3r_High_tbdpec3r_<Var>_LOD<0|1|2>.glb
```

每个 1k/2k tier 加载九个 KTX2：BaseColor、Normal、Roughness、AO、Opacity、Translucency、Billboard_BaseColor、Billboard_Normal、Billboard_Opacity。`Billboard_Normal` 要照现状加载，但远景 Lambert 材质不绑定它。

- GLTFLoader 使用 MeshoptDecoder。
- 每个 mesh geometry 应用节点 world transform，水平居中、底部移到 y=0，再统一 scale `1.35`；补 `uv2=uv clone`。
- 归一化测试用高 `.54101` 的 BoxGeometry 后应得到高度 `0.7303635`，用于锁定转换 GLB 的 authored scale。
- LOD2 将原 geometry clone 后绕 Y 旋转 90°，二者 merge 成单个静态 Y-up 十字卡片；它不是 camera-facing billboard。
- Near：MeshStandardMaterial，base/normal/roughness/AO/opacity，DoubleSide，`alphaTest=.12`，色 `0xa5c77f`，有 sway 与 translucency。
- Mid：静态 MeshStandardMaterial，同 `alphaTest` 和 near tint。
- Far：MeshLambertMaterial，billboard base/opacity，色 `0x82a66a`。
- opacity 必须采 `.r`，transparent=false、depthWrite/depthTest=true、alphaToCoverage=false。
- 暗部 lift 色 `0x647c4a`、强度 `.24`；emissive 不超过 `.06`。Near grade brightness `.95`、saturation `.82`、highlight compression `.28`。

### 15.2 世界坐标群落和放置

active GrassZone 候选以全局网格而非每 zone 局部网格生成，使用半开范围 `[min,max)`，保证相邻 64m zones 无缝、无重复。候选 x/z 使用独立 hash 抖动。

世界群落：

```text
macro feature size 14m，rotation .39rad
micro feature size 3.2m，rotation -.58rad
gap acceptance .08
core acceptance .96
variant ratios primary .72 / secondary .20 / other .08
```

两层 rotated value noise 决定 influence；接受率由 `sqrt(influence)` 平滑到 .08–.96。macro cell 确定 primary/secondary variant，候选 hash 再按 72/20/8 选择。大样本接受率应稳定在约 55%–70%。核心草比边缘草略大：community influence 经 smoothstep 后把基础 scale 从 .82 插到 1.05，再乘个体 .92–1.12。

active placement 条件：

- `surface.normalY >= .88`。
- `surface.groundMask >= .35`。
- 排除 downstream river 与整个 WaterSystem，各额外 buffer 4m。
- 排除 active small lakes。
- 排除 road，各额外 buffer .55m。
- 复用一次 `sampleSurfaceAt`；矩阵贴合法线并绕法线随机 yaw。
- 每个 placement 存独立、确定的 `lodRoll` 和 `transitionRoll`。

保留 `isGrassArea`、`generatePlacementsInRect`、出生点附近旧 `createGrassClumps` 等 helper 以满足模块兼容；它们包含 130→185m lowland fade 和旧 patch 逻辑，但 production scene 不调用这些旧的一次性入口。生产路径是 `GrassManager → GrassZone`。

### 15.3 Sway

只有 Near material 有 uniforms `uGrassTime`、baseY/height、wind direction/strength、player xz。顶点位移只影响 blade tip：

- 实例世界位置用于玩家距离和风区。
- 玩家半径约 2m；1.75→2m smoothstep。
- 仅玩家约 20m 内有风，14→20m fade，整体 mask×.34。
- 风以 12m world regions 同相位，近 12m 内才叠 local detail，避免整片高频闪烁。
- 主波时间频率 .38，细 flutter .45；实际位移 strength 为 `.035*.32`。
- 每帧对共享 uniform set 只更新一次，不能按每个 instanced mesh 重复写。

### 15.4 GrassZone / GrassManager

`GRASS_LOD_CAPACITY_RATIOS=[1,.4,.1]`。每个 zone 为三个 LOD groups；每个 variant/LOD 预分配持久 InstancedMesh，matrix 为 `DynamicDrawUsage`。每次 LOD job：

- 按 placement 分片（默认每次 256）写 staging matrix。
- 到达 distance band 后用 transitionRoll 在 band 最后 `fadeDistance` 米做空间 dither；一株草只能进入一个相邻 LOD，不能重复。
- 最远 band 从 LOD2 dither 到 invisible。
- keepRatio 再用稳定 lodRoll 保留嵌套子集。
- 完整 job 结束后一次性提交 matrices/count/visibility；中途不能暴露半更新 mesh。

manager 参数：

```text
每帧最多增删 zones 4
单次生成步数 min(2000,256)=256
所有 zones 总生成步数 8000/frame
最多 LOD zone rebuilds 6/frame
玩家移动 >5m 才刷新 LOD queue
LOD job steps 256
```

generation 与 LOD queue 共享画质 updateBudgetMs，并每帧交替谁先拿预算。生成按离玩家最近 zone 优先；LOD queue 去重、round-robin，不可饥饿。画质 revision 改变时，进行中的旧 job 先原子完成，然后该 zone 只重排一次新 job。

zone 离开 `maxViewDistance+64` 时卸载；dispose 只释放 InstancedMesh 自己的 GPU instance buffer，不能 dispose 共享 geometry/material。

## 16. Trees、落叶与岩石

### 16.1 树资源和材质

加载：

```text
/assets/vegetation/tree_01.glb
/assets/vegetation/tree_02.glb
/assets/vegetation/tree_03.glb
/assets/vegetation/tree_04.glb
/assets/vegetation/tree_spawn.glb
```

展开每个场景 mesh，把节点 world matrix bake 到 clone geometry。材质 clone 后：transparent false、`alphaTest>=.38`、depth 读写开启、envMapIntensity `.92`；暗部 emissive 色 `0x24351f`、强度 `.12`。spawn tree 额外乘色 `0x6f8054`，emissive 强度乘 `.45`。

### 16.2 确定性放置

配置：

```text
minimum spacing 6m
candidate base density .05/m²
actual density height<=130: .017/m²
130<height<=185: .010/m²
height>185: .0017/m²
ground mask threshold .35
scale .72–1.34
tree FBM scale .015，6 octaves，influence .7，minimum factor .3
river buffer 5，WaterSystem buffer max(5,10)=10
```

以 `sqrt(1/.05)` 全局网格产生候选、独立 jitter。actual density ratio 叠加：主 FBM、4 octave biome、3 octave moisture、根据 normalY 的 ridge boost 和 forest cluster。通过后还需：ground mask、主河/水系/小湖排除、road+2.2m 排除、6m 邻域 spacing。

随机选择四个通用模型；实例 yaw、轻微 lean、独立宽/高 scale，instance tint 约绿色 `(.91,1,.86)*[.82,1.04]`。每个源 mesh 对应一个 InstancedMesh，设置 instance matrix/color、cast/receive shadow。

出生点所在 chunk 完成 placement 后，把离 `(335,-358)` 最近 10 棵改用 `tree_spawn.glb`，其矩阵 scale 再乘 `.35`。

### 16.3 Tree streaming

- TreeZone 与 `terrain.getLoadedChunkBounds()` 一一对应，不另建 64m zone。
- 新 terrain chunk 创建 TreeZone，旧 chunk 卸载即 dispose zone。
- placement 每次最多 64 candidates，按离玩家最近的可见 generating zones 处理，总耗时由画质 tree updateBudgetMs 控制。
- group 超过画质 `vegetation.treeDistance` 隐藏。
- 阴影 caster 使用画质 enable/disable 两个距离形成 hysteresis；状态变化返回 true，通知太阳 shadow 更新。
- dispose instance buffer，但保留共享 tree geometry/material；落叶使用自身资源，可单独 dispose。

保留旧 `generateAllTreePlacements` helper，但 production 不做全地图一次性生成。

### 16.4 程序化落叶

不要读取 `leaf1.png/leaf2.png`。在 64×64 canvas 程序绘两片叶：

```text
leaf1 fill #7a5a32, vein #3c2c1d, rotation .16
leaf2 fill #66502f, vein #2f271c, rotation -.22
```

每棵树确定性散布 3–5 片，半径约 .3→2.3m，尺寸 .5–.8，离地 .05；平面贴合地表法线并随机 yaw。两种贴图分别合并为 InstancedMesh PlaneGeometry；DoubleSide、transparent、alphaTest .5、depthWrite true、receiveShadow true。

### 16.5 Hero rocks

加载 `rock_01.glb` 到 `rock_09.glb`，按下表克隆布置；按目标 height/模型 bounding-box height 缩放、水平居中、底落地，roughness 最少 .72、metalness 0，cast/receive shadow：

```js
[
 {model:0,x:326,z:-351,height:2.8,yaw:.6},
 {model:1,x:345,z:-365,height:2.2,yaw:2.1},
 {model:2,x:345,z:-389,height:3.8,yaw:1.2},
 {model:3,x:334,z:-425,height:2.5,yaw:4.5},
 {model:4,x:367,z:-401,height:4.4,yaw:.25},
 {model:5,x:322,z:-381,height:2.4,yaw:1.7},
 {model:6,x:355,z:-424,height:3,yaw:3.4},
 {model:7,x:372,z:-442,height:2.6,yaw:5.1},
 {model:8,x:312,z:-444,height:2.3,yaw:2.75},
 {model:2,x:350,z:-337,height:2.1,yaw:4.2},
 {model:5,x:371,z:-348,height:3.2,yaw:.9},
 {model:0,x:316,z:-365,height:1.8,yaw:5.6}
]
```

Hero rocks 是 12 个 clone groups，不要擅自改成 InstancedMesh。

## 17. 玩家、动画和移动状态

出生点：

```js
PLAYER_SPAWN_POSITION = {x:335, z:-358}
```

模型与动画：

- `/assets/player/stand.fbx` 为模型，第一段内置 animation 是无限循环 idle。
- `/assets/player/walk.fbx` 的第一段 animation 为 walk；删除 track 名严格等于 `mixamorigHips.position` 的 root motion，再循环。
- 模型按 bounding box 统一缩到 1.8m 高，水平居中、脚底落在 local y=0。
- 所有 player meshes cast/receive shadow。
- StandardMaterial clone；非 Standard 转 MeshStandardMaterial并尽量保留 map/normal/bump/alpha/side/vertex colors。
- albedo 向 `0x68747d` lerp 48%；emissive `0x1c2630`、强度 .11；metalness≤.35；roughness≥.28；envMapIntensity 1.3。
- idle/walk 切换 reset、fadeIn .2s，旧 action fadeOut .2s。
- 模型或 walk 加载失败只 console.error；不要创建 primitive 占位角色。

控制与常量：

```text
PLAYER_HEIGHT 1.8
PLAYER_RADIUS .35
GROUND_OFFSET .03
MIN_WALKABLE_SLOPE 50°，即 normalY>=cos(50°)
GROUND_SPEED 5m/s
AIR_SPEED 60m/s
GRAVITY 30
MAX_FALL_SPEED 55
GROUND_SNAP_DISTANCE .08
LEDGE_DROP_THRESHOLD .45
LEDGE_PROBE_DISTANCE .70
map boundary ±767.65
```

- W/S 沿相机水平 forward，A/D 沿相机水平 right；对角归一化，无加速度。
- 有移动时朝向 `atan2(direction.x,direction.z)` 并切 walk；无移动 idle。
- 左/右 Alt 以 60m/s 上升，进入 hover；Alt 与 Ctrl 同时按时 Alt 优先。
- 松开 Alt 后保持当前高度，不自动下落；左/右 Ctrl 以 60m/s 下降且不低于地面，落地退出 hover。
- 正常落地高度是玩家半径内中心+八方向共 9 点最大 terrain height + .03，防止脚穿小凸起。
- 未 hover 时从边缘走出：比较当前位置中心高度与下一中心、前探点中的更低值；下降>.45 时进入 `isDroppingFromLedge`，之后用中心高度和重力积分落下。
- 空中水平移动也用 60m/s；触地时 vertical velocity 清零。
- 未悬空、未掉崖时，下一点坡度不可站立则拒绝水平移动并切回 idle。
- 无 Space jump、run、crouch、capsule collision、树/岩石碰撞和水体碰撞。

Player 状态至少包含 mixer、idleAction、walkAction、currentAction、verticalVelocity、isDroppingFromLedge、isHovering；`position` getter 返回 group.position；提供 `setAnimationTime()` 给 Golden Shot。

## 18. 输入与第三人称相机

### 18.1 Input

`new Input(canvas)`：

- window keydown/keyup 用 `Set<event.code>` 保存；不要在 blur 时额外清空。
- canvas 任意 pointer button 的 pointerdown 都开始 drag 并 pointer capture；仅 drag 时累计 `movementX/Y`。
- pointerup release capture；pointercancel 停 drag。
- wheel listener 为 `{passive:false}`，始终 preventDefault，再累计 deltaY。
- `consumePointerDelta`/`consumeWheelDelta` 读取后归零。
- `setPointerInputEnabled(false)` 清 drag/pointer/wheel，但保留 keyboard keys；编辑器用它禁相机指针输入。

### 18.2 Camera

默认：

```text
yaw 0
pitch .45rad，clamp [-.85,1.2]
distance 6，clamp [3,10]
rotateSpeed .006rad/pixel
zoomSpeed .006 world units/wheel unit
lookAtOffset (0,1.25,0)
```

拖动：`yaw -= movementX*.006`，`pitch += movementY*.006`。正 wheel delta 增大距离。无 follow smoothing，每帧直接：

```js
horizontal = cos(pitch)*distance
height = sin(pitch)*distance
desired = target+(sin(yaw)*horizontal, height, cos(yaw)*horizontal)
```

防穿地：期望点先抬到 terrain+.4；从 look target 到 desired 等分采样 16 步，第一个低于 terrain+.4 的点出现时缩回前一安全步，但至少保持 1.2m；缩回后再次 clampAboveTerrain。最后 lookAt 玩家+(0,1.25,0)。

## 19. 地形编辑器和开发写回

Editor 只能从 debug HUD 的 Edit 按钮进入，但打开后仍允许键盘移动、terrain streaming 与相机自动跟随；只禁 pointer rotate/wheel。

UI 值：

```text
Raise 默认
Lower
Radius min .5 / max 10 / step .1 / default 5
Strength min .1 / max 3 / step .1 / default .9
Save / Close
```

交互：

- Raycaster 只与 `terrain.getRaycastMeshes()` 或 `userData.isTerrainSurface` 的已加载 surfaces 相交。
- 左键 pointerdown：capture、begin stroke、立即 paint；move 时每个 pointer event 再 paint；没有 dt 归一化。
- Raise 传 `+strength`，Lower 传 `-strength`。
- pointerup/leave 结束 stroke；leave 还隐藏 cursor。
- 打开时阻止 contextmenu，但右键没有画笔功能。
- 每次 paint 后重新 `sampleSurfaceAt`，更新 cursor 高度/法线，状态为 `Unsaved`。

cursor 为 `RingGeometry(.94,1,96)`，scale=radius，沿 surface normal 定向并偏移 .16；DoubleSide、opacity .72、depthTest/depthWrite false、renderOrder 1000。Raise 色 `0x94e082`，Lower 色 `0x60b5ff`。

高度笔刷：

- world radius 转为 4096 高度图 pixel radius，最少 1px。
- strength 换算为 `(strength/300)*255`。
- 圆内 falloff=`1-smoothstep(.18,1,normalizedDistance)`。
- 写相同 RGB grayscale 和 alpha255，clamp 0–255。
- 让平滑高度 cache 在笔刷 bounds 外扩 2 像素失效。
- world dirty bounds 再外扩固定 7m；同步 patch 当前 loaded vertices、完整重算脏边 skirt minimum 和 shadow proxy。
- 一个 stroke 内收集 dirty chunks，stroke 结束每 chunk 只强制 rebuild 一次。

Save：把内存 RGBA 写入离屏 canvas，用 quality `.98` 编码 WebP，POST `/__terrain-heightmap`，状态 `Saving → Saved`；失败 `Save failed` 并 console.error，保存期间 button disabled。没有 undo/redo/smooth/material paint/close rollback。

Vite dev middleware：

- 只接受 POST；其他 method 405 `POST only`。
- body 上限 `64*1024*1024`，超过抛错。
- 若 `public/assets/terrain/height.original.webp` 不存在，首次写前从 `height.webp` copy；已有备份绝不覆盖。
- body 原样写入 `public/assets/terrain/height.webp`，返回 JSON `{ok:true,bytes}`。
- 错误 500 + message。
- 只挂 `configureServer`，生产 build/preview 没有持久化 endpoint；不要添加后端 fallback。

## 20. 冷湿清晨环境、云和灯光

统一 `VISUAL_ENVIRONMENT`：

```text
name cold-wet-mountain-morning
timeOfDay early-morning
weather cold-mist
exposure 1.14

sun direction normalize(.48,.48,.73)
sun color #ffd9aa
sun glow #f6c995
sun intensity 3.1

sky zenith #45657a
sky horizon #9eafb5
sky ground #343c35
cloud #d5dad7
cloud shadow #718087
cloud cover .5

fog #91a3aa
FogExp2 density .00135
配置中保留 near 420 / far 1700 / heightFalloff .018，
但 Exp2 模式实际不使用 near/far

hemisphere sky #91b4c3
hemisphere ground #465044
hemisphere intensity 1.32

environment map 1024×512
environment intensity .82
sun radiance 24
```

程序化 IBL：

- CPU 生成 `Uint16Array` RGBA HalfFloat DataTexture，equirectangular mapping、LinearSRGB、linear min/mag、S repeat、T clamp、无 mipmaps。
- 按 latitude 混合 horizon/zenith；地平线以下从压暗 horizon 过渡到 ground；加 `exp(-abs(directionY)*8.5)` haze。
- 太阳 glow 包含 `pow(sunDot,72)*1.7 + pow(sunDot,640)*5.5`，再叠约 1.25°→0.38° 的太阳 disc × radiance 24。
- PMREMGenerator 转成 scene.environment；scene.environmentIntensity=.82。提供 dispose，释放 source 和 render target。
- 不请求外部 HDR、天空图或网络资源。

Cloud dome：

- SphereGeometry radius 240、48×24、BackSide，名称 `SkyCloudDome`，renderOrder 900，frustumCulled false、depthWrite false、depthTest true、fog false。
- 每帧把 dome 放到 camera position；顶点 shader 强制 `clip.z=clip.w`。
- fragment 用 4-octave FBM；wind `(time*.005,time*.0018)`；broad cloud 与 2.3× detail 混合；cover `.5→.66`；地平线 fade、Mie glow、太阳盘。
- Performance detail weight 0，Balanced .28，Quality .32。

Lights：

- HemisphereLight 使用环境 sky/ground/intensity。
- DirectionalLight 初建 map 2048²、shadow camera ±120、near .5、far 700、bias `-.0003`、normalBias `.04`。
- 应用画质后 mapSize/cameraSize 用 preset，范围为 `±cameraSize/2`，far=`max(500,cameraSize+320)`；更新 map 时 dispose 旧 shadow map。
- 若 `updateHz>0`，shadow.autoUpdate=false 并按频率 `needsUpdate`；否则 autoUpdate=true。
- target 跟随玩家，x/z 按 `cameraSize/mapSize` texel 取整，y=玩家 y；light position=`target+sunDirection*320`，减少 shadow swimming。
- 角色 SpotLight：色 `0xb7d3df`、强度 120、distance 14、angle 25°、penumbra .82、decay 2；target 为 player child `(0,1,0)`。灯位在玩家→相机方向 4.2m 再向上 2.4m，不 cast shadow。

## 21. 后处理和动态分辨率

Renderer 已禁内建 antialias。EffectComposer pass 顺序严格是：

```text
Performance: RenderPass → ColorGradePass → OutputPass → FXAAPass
Balanced:    RenderPass → GTAOPass → ColorGradePass → SMAAPass → OutputPass
Quality:     RenderPass → GTAOPass → ColorGradePass → SMAAPass → OutputPass
```

不要加 TAA。Quality 改变时 dispose 旧 passes 并重建。

ColorGrade shader：

```text
contrast 1.0
saturation 1.02
shadowTint #f3f7ff
highlightTint #fff1d4
shadowLift .015
vignette .08
```

取中心上下左右 4 tap 的平均 blur；`center+(center-blur)*sharpen`，再加 `max(blur-threshold,0)*bloomStrength`，之后做 saturation、contrast、shadow/highlight tint、shadow lift、vignette。这个 pass 在 OutputPass 前，需保持阴影中性，不要恢复旧版强对比蓝阴影。

GTAO：

```text
radius 2.6
distanceExponent 1.6
thickness 1.1
scale .38
samples 来自画质
denoise radius 4
denoise radiusExponent 1.8
denoise samples 来自画质
resolutionScale .5 或 1
blendIntensity 来自画质
```

遍历 scene 收集 `userData.excludeFromGtao===true` 的显式 roots。GTAO render 用 try/finally 暂时隐藏并恢复它们；不能按 material.transparent 广泛排除，也不能改变 root 原始 visibility。

动态分辨率只改 composer 的有效 pixel ratio，不得把 renderer 基础 DPR 再乘 scale：

```text
target 33.3ms
initial smoothed frame 16.7ms
warmup 2000ms
resize warmup 1000ms
interval 750ms
step .05
down if smoothed > target*1.08
up if smoothed < target*.85
```

scale clamp 到画质 min/max，初始=max。Golden Shot、document.hidden、warmup 内暂停。visibility 恢复时重置 smoothed=16.7 并再 warmup。物理 render size 为 `floor(cssSize*baseDPR*scale)`；AA pass、GTAO 和 texel size 必须同步。

## 22. 三档画质

默认 Balanced。保留整个对象结构，即使部分字段目前只是 metadata：

### Performance

```text
pixelRatioCap 1
resolution .70–1，target 33.3ms
shaderQuality low
anisotropy 2
textureTier 1k
streaming total 3ms
shadow map1024, cameraSize160, distance180, cascade1, updateHz30,
  caster enable/disable100/120
terrain configured radii2/3, segments[128,64], budget1.5ms, shadowProxy true
terrain effective segments[256,128,64]，因为 normalizer 自动补256
vegetation grassDistance90, treeDistance260, impostorStart150, fade6
grass distances[16,40,90], ratios[.6,.18,.03], fade6, budget.75ms
tree budget .75ms
water environment, scale.5, updateFrames0, depthShoreline false
FXAA, GTAO off, samples0, gtaoScale.5, intensity0
bloom0 threshold1.1, sharpen0
```

### Balanced

```text
pixelRatioCap 1.25
resolution .75–1
shaderQuality medium
anisotropy 4
textureTier 2k
streaming total 4ms
shadow map2048, cameraSize200, distance260, cascade1, updateHz0,
  caster160/190
terrain radii3/4, segments[256,128,64], budget2ms
vegetation grass110, tree380, impostor220, fade8
grass [28,72,150], ratios[1,.25,.06], fade8, budget1ms
tree budget1ms
water probe, scale.5, updateFrames0, depthShoreline true
SMAA, GTAO6/denoise6, gtaoScale.5, intensity.28
bloom.06 threshold1.05, sharpen.08
```

### Quality

```text
pixelRatioCap 1.5
resolution .85–1
shaderQuality high
anisotropy 8
textureTier hero-4k（实际 loader 归一到2k）
streaming total 5ms
shadow map2048, cameraSize250, distance420, cascade2, updateHz0,
  caster240/280
terrain radii4/5, segments[256,128,64], budget2.5ms
vegetation grass180, tree520, impostor320, fade10
grass [36,100,220], ratios[1,.4,.1], fade10, budget1.25ms
tree budget1.25ms
water planar, scale.5, updateFrames2, depthShoreline true
SMAA, GTAO12/denoise12, gtaoScale1, intensity.32
bloom.1 threshold1, sharpen.12
```

画质切换时更新 renderer DPR/size、composer、terrain、grass、trees、water、clouds、shadow 和已可见 material textures 的 anisotropy；跳过 render-target texture。忠实保留两个现状：

- `shadow.distance`、`cascadeCount`、`streamingBudgets.totalMs`、`vegetation.impostorStart/fadeDistance` 目前主要是配置 metadata，不要伪造未实现的 cascades/impostors。
- Grass loader 先把纹理 anisotropy 固定为 8，而首次全场材质遍历常发生在 deferred vegetation attach 前；因此 Performance/Balanced 的草纹理可能仍是 8。不要在无授权情况下改变此时序。

## 23. Debug HUD、开关与响应式行为

- HUD 每至少 500ms 更新一次 FPS：`frames*1000/elapsed` 四舍五入。
- 坐标每帧更新，显示顺序 x、z、y，各两位小数。
- frame time 一位；resolution scale 两位；renderer counters 用 locale string。
- 统计项来自手动 reset 后这一帧的 renderer.info。
- Grass/Tree checkbox 初值 checked。关闭时隐藏 host group 且停止对应 manager update；切换时标记太阳 shadow needsUpdate。
- Quality 下拉不改 URL、不 localStorage 持久化。
- resize 更新 camera aspect、renderer DPR/size、composer DPR/size、water reflector size，并让动态分辨率暂停 1s。
- 页面 hidden 时动态分辨率暂停；恢复时 warmup 2s。
- 没有移动端 breakpoint、触控移动控件或编辑器换行；窄屏工具条可以溢出。
- DOM selector 被视为一定存在，不要增加一套 null-safe fallback UI。

错误边界：

- terrain/IBL 等顶层 await 失败时初始化中止，loading 保持当前文案，没有错误页/重试。
- background vegetation/rocks 失败时 console.error 并改 status；首帧仍可能已淡出，空 host 保持运行。
- player model/animation 失败只 console.error。
- 无 WebGL context-loss 恢复、离线 fallback、按键 blur 清理。

## 24. Golden Shots

`?shot=<key>` 命中时，每帧都固定 player/camera。player y=对应 terrain height+.03；camera/target 若有 `heightOffset` 则用其 x/z terrain height+offset，若有固定 y 则直接用 y。

```js
{
  spawn: {
    player:{x:335,z:-358}, camera:{x:340,z:-351,heightOffset:3.4},
    target:{x:335,z:-358,heightOffset:1.25}
  },
  shore: {
    player:{x:342,z:-390}, camera:{x:351,z:-375,heightOffset:5.8},
    target:{x:310,z:-405,heightOffset:2.2}
  },
  waterfall: {
    player:{x:397,z:-405}, camera:{x:450,z:-398,y:30},
    target:{x:413,z:-423,y:7}
  },
  forest: {
    player:{x:356,z:-332}, camera:{x:349,z:-322,heightOffset:4.8},
    target:{x:358,z:-342,heightOffset:2.2}
  },
  vista: {
    player:{x:347,z:-350}, camera:{x:365,z:-322,y:88},
    target:{x:300,z:-400,y:38}
  },
  'carriage-road': {
    player:{x:545,z:-339}, camera:{x:535,z:-370,heightOffset:9},
    target:{x:580,z:-326,heightOffset:1.3}
  },
  'mountain-access': {
    player:{x:444,z:-397}, camera:{x:454,z:-407,heightOffset:6},
    target:{x:414,z:-372,y:14}
  },
  'river-tree-j1': {
    player:{x:45,z:-370}, camera:{x:55,z:-390,y:68},
    target:{x:16,z:-352,y:50.6}
  },
  'river-tree-tarn': {
    player:{x:108,z:-535}, camera:{x:132,z:-505,y:91},
    target:{x:76,z:-552,y:49.5}
  },
  'river-tree-inlet': {
    player:{x:310,z:-472}, camera:{x:310,z:-500,y:52},
    target:{x:278,z:-458,y:31.6}
  },
  'terminal-lake-overhead': {
    player:{x:720,z:-340}, camera:{x:690,z:-340,y:55},
    target:{x:690,z:-340,y:-1.235}
  }
}
```

Golden Shot 中 player mixer 固定 1.1s，visual time 固定 18.5s，普通 input/camera update 跳过，dynamic resolution 暂停。非法 key 按普通模式运行。

## 25. Benchmark

`FrameBenchmark` 默认 warmup 20000ms、每轮 30000ms、3 轮。采样正 frame delta 和有限 renderer metrics。每轮输出：

```js
{
  run, durationMs,
  averageFps: 1000/meanFrameMs,
  p95FrameMs,
  onePercentLowFps: 1000/p99FrameMs,
  framesOver33Ms,
  framesOver50Ms,
  frameCount,
  metrics: {drawCalls,triangles,geometries,textures,programs}
}
```

每轮 console.info，完成后暴露：

```text
window.__renderBenchmarkResults
window.__renderBenchmarkEnvironment
```

environment 包含 userAgent、select quality、shot key 或 `moving`、CSS viewport、devicePixelRatio、rendererPixelRatio、drawingBuffer 尺寸、grass/trees checked。

## 26. 运行时资源清单

必须原路径提供：

```text
public/basis/basis_transcoder.js
public/basis/basis_transcoder.wasm

public/assets/player/stand.fbx
public/assets/player/walk.fbx

public/assets/terrain/height.webp
public/assets/terrain/rock-alpine.webp
public/assets/terrain/rock-alpine-normal.png
public/assets/terrain/snow-alpine.webp
public/assets/terrain/river-bank-rock-wet-light-alt.webp
public/assets/terrain/river-bed.webp

public/assets/terrain/forest-floor/optimized/
  forest_floor_basecolor_1k.jpg
  forest_floor_basecolor_2k.jpg
  forest_floor_normal_1k.jpg
  forest_floor_normal_2k.jpg

public/assets/terrain/materials/optimized/
  ground_dirt_albedo_{1k,2k}.ktx2
  ground_dirt_normal_{1k,2k}.ktx2
  dry_grass_albedo_{1k,2k}.ktx2
  dry_grass_normal_{1k,2k}.ktx2
  gravel_albedo_{1k,2k}.ktx2
  gravel_normal_{1k,2k}.ktx2
  blend_mask_splat_{1k,2k}.ktx2

public/assets/vegetation/ribbon-grass/optimized/ktx2/
  Ribbon_Grass_{BaseColor,Normal,Roughness,AO,Opacity,Translucency}_{1k,2k}.ktx2
  Ribbon_Grass_{Billboard_BaseColor,Billboard_Normal,Billboard_Opacity}_{1k,2k}.ktx2

public/assets/vegetation/ribbon-grass/optimized/models/
  Ribbon_Grass_tbdpec3r_High_tbdpec3r_{VarA..VarF}_LOD{0,1,2}.glb

public/assets/vegetation/tree_01.glb ... tree_04.glb
public/assets/vegetation/tree_spawn.glb
public/assets/vegetation/rock_01.glb ... rock_09.glb
```

为了保留无 KTX2 loader 的函数级 fallback，还应保留源 PNG：ground_dirt_albedo/normal、dry_grass_albedo/normal、gravel_albedo/normal、blend_mask_splat。正常 `scene.js` 总会创建 KTX2Loader，因此生产请求优化版。

不要接入：

- `public/assets/enemy/*.fbx`。
- 旧 `grass-clumps.glb/.blend`。
- Ribbon Grass 原始 FBX、4K JPG、JSON 和 `optimized/*.jpg`；它们只是离线制作源。
- forest-floor 原始 4K AO/BaseColor/Displacement/Normal/Roughness；运行时只用优化 basecolor/normal。
- 旧 terrain `dirt-frozen`、`grass-alpine`、`ground-*`、`scree-alpine`。
- 旧 river bank 两个非 alt 版本。
- moss textures/KTX2、ground_dirt_roughness；当前 shader 不用。
- gravel patch models；系统已删除。
- `height.original.webp` 只作一次性备份，不用于显示。
- 根目录视觉截图、conversation logs、skills 资料。
- 未跟踪的 `Untitled-1.svg`、`public/assets/terrain/leaf1.png`、`leaf2.png`。

Vite 会完整复制 `public/`，所以参考 production dist 约 347MB；即便未引用素材也会被复制。不要在本任务中另做 public 白名单或资源裁剪。

## 27. 离线资产工具

保留但不放进 npm build：

- `convert-grass-models.py`：Blender `bpy` 逐个导入 `*_LOD*.fbx`，导出 GLB，apply transform、Y-up、无材质、无动画。
- `convert-grass-models.sh`：用 `${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}` 跑脚本，再调用未锁定依赖的 `npx --yes @gltf-transform/cli optimize`，Meshopt 压缩，不 simplify、不压纹理，最后删除临时 models-raw。
- `optimize-grass-textures.sh`：依赖 `TOKTX` 或 PATH 中 `toktx`；生成 1k/2k。BaseColor/Translucency/Billboard BaseColor 用 SRGB ETC1S；Roughness/AO/Opacity 用 linear ETC1S；Normal/Billboard Normal 用 linear UASTC。
- `optimize-terrain-textures.sh`：同样生成 terrain 1k/2k KTX2，并从 installed Three.js 复制 Basis transcoder；也会生成当前未用 moss KTX2。

Blender、toktx、`@gltf-transform/cli` 不加入 package dependencies；生成物已经作为输入提交。

## 28. 必须保留的公开 API

名称和返回结构至少保持：

```text
scene.js
  createScene(renderer,quality)

terrain.js
  Terrain.create(options)
  new Terrain(heightData,width,height,textures,options)
  prepareInitialChunk / update / setQualityPreset / setEditorMode
  sampleSurfaceAt / getBaseHeightAt / getHeightAt / getNormalAt
  getTerrainGroundMask / getMaxHeightInRadius
  getLoadedChunkBounds / getRaycastMeshes
  beginTerrainEditStroke / endTerrainEditStroke / applyHeightBrush
  getHeightMapData / dispose

terrainMaterial.js
  TERRAIN_MATERIAL_LOD
  createTerrainMaterials(textures,options)
  getTerrainMaterialForSegments(materials,segments)

terrainEditor.js
  createTerrainEditor(terrain,camera,scene,canvas,input) => {isOpen()}

roadNetwork.js
  ROAD_ROUTES
  getRoadMaterialFrame / isInRoadVegetationExclusion
  applyRoadTerrain / getRoadMinimumSegmentsForBounds

hydrology/riverNetwork.js
  RIVER_NETWORK_DEFINITION / RIVER_NETWORK
  validateRiverNetworkDefinition / compileRiverNetwork
  getNearestRiverReach / getRiverNetworkTerrainTarget
  applyRiverNetworkTerrain / isInRiverNetworkVegetationExclusion
  getRiverNetworkFeatureBounds

hydrology/riverNetworkWaterGeometry.js
  createRiverNetworkWaterGeometry(network?) => {geometry,stats}

riverChannel.js
  RIVER_TERMINAL_LAKE
  RIVER_BED_TEXTURE_PATH / WORLD_SIZE
  RIVER_BANK_TEXTURE_PATH / WORLD_SIZE
  loadRiverTextures / applyRiverChannel
  getRiverMaterialMask / getRiverBedMaterialMask / getRiverMaterialFrame
  createRiverWaterMesh / getRiverWaterGeometryMaxDistance
  createWetBankMesh / updateRiverVisuals / isInRiverGrassExclusion

waterSystem.js
  LAKE_CENTER / LAKE_WATER_LEVEL
  applyWaterSystemTerrain / applyWaterSystemMacroTerrain
  getWaterSystemMaterialFrame / isInWaterSystemVegetationExclusion
  getWaterSystemMinimumSegmentsForBounds
  createWaterSystem / updateWaterSystemVisuals / createLakeSurfaceMaterial

smallLakes.js
  applySmallLakesTerrain / isInSmallLakeExclusion
  getSmallLakesMaterialMask / createSmallLakes / updateSmallLakes

waterContext.js
  WATER_RENDER_ORDER / WATER_RENDER_CONTEXT
  createWaterUniforms / createWaterRenderController
  shared reflection/noise/wave/fog GLSL exports

grassClumps.js
  loadGrassModel / createGrassVariants / normalizeRibbonGrassGeometry
  createGrassSwayMaterial / isGrassArea / generatePlacementsInRect
  buildInstancedMeshes / hash2 / sampleGrassCommunity
  createPlacement / sampleTerrainSurface
  createGrassClumps / updateGrassClumps / LOD_DENSITIES / ZONE_SIZE

grassZone.js
  GRASS_LOD_CAPACITY_RATIOS / GrassZone

grassManager.js
  DEFAULT_GRASS_PRESET / GrassManager / normalizeGrassPreset

treePlacements.js
  loadTreeModels / getTreeDensity / isTreeArea
  createTreePlacementIterator / buildTreeInstancedMeshes
  generateAllTreePlacements / replaceSpawnAreaTrees

treeManager.js
  TreeManager / TreeZone / distanceToChunkBounds

leafDecals.js
  createLeafDecals / loadLeafDecalTextures / buildLeafDecals

heroRocks.js
  createHeroRocks

player.js / input.js / thirdPersonCamera.js
  Player / Input / ThirdPersonCamera

visualEnvironment.js / environmentLighting.js / clouds.js
  VISUAL_ENVIRONMENT / createProceduralEnvironmentTexture
  applyEnvironmentLighting
  Clouds

postProcessing.js
  configureRenderer / createPostProcessing
  getPostProcessingPassOrder / getPhysicalTexelSize / getPhysicalRenderSize
  getGtaoExcludedRoots / renderWithGtaoExclusions

renderQuality.js
  RENDER_QUALITY_PRESETS / DEFAULT_RENDER_QUALITY / getRenderQualityPreset

performanceBenchmark.js
  FrameBenchmark / summarizeFrameTimes

goldenShots.js
  getGoldenShotFromLocation / applyGoldenShot / listGoldenShotNames

compressedTextureLoader.js
  createCompressedTextureLoader(renderer)

spawn.js / lighting.js / waterPalette.js
  PLAYER_SPAWN_POSITION / SUN_LIGHT_DIRECTION / all WATER_* colors
```

## 29. 自动化测试契约

用 Node 内建 `node:test` + `node:assert/strict` 创建 12 个 test files，共 79 tests。不要把 WebGL/browser 作为 Node 单元测试前提；用最小 terrain/material stubs 检验 CPU 算法和 shader source contract。

| 文件 | 数量 | 必须锁定 |
|---|---:|---|
| `grass-lod.test.js` | 21 | 稳定 roll 与质量嵌套子集、2.5候选/㎡、群落接受率、半开 chunk、72/20/8、LOD dither/最终消隐/6-8-10m、模型 scale、持久 DynamicDraw buffer、分片原子提交、队列公平/revision、资源释放、最近区优先、Near sway only、LOD2 十字卡、KTX2+Meshopt 路径 |
| `performance-benchmark.test.js` | 2 | average FPS、p95、1% low、长帧计数、warmup 与多轮输出 |
| `post-processing.test.js` | 6 | pass 顺序、无 TAA、scaled physical size、neutral grading、GTAO exclusion try/finally、三档预算、capture gate 和只缩 composer |
| `river-channel.test.js` | 2 | 主河在 terminal alpha=0 处精确截止、row step、水位/depth attribute；wet-bank helper 保持完整长度 |
| `river-network-water.test.js` | 5 | 单一有界网格、attributes、全部 +Y、spacing/width/UV/水位、source/lake/slope fade、四个不重叠 junction patches、<12k |
| `river-network.test.js` | 5 | 5 sources、4 confluences、单 sink、DAG/cycle rejection、下游不升高、汇流水位、tie-break、空间查询/排除/bounds |
| `road-network.test.js` | 8 | 三条 route、cart/trail frame、exclusion buffer、0→28m 接驳坡≤35°、完整塑形链仍可走、road chunk=256、固定镜头 |
| `small-lakes.test.js` | 2 | 769 vertices/1472 triangles、faces/normals +Y、terminal overhead shot |
| `terrain-lod.test.js` | 12 | 高度 cache/brush invalidation、shadow proxy、effective center256、feature floors/优先级/editor promote、atomic swap、deadline/revision/stale rejection、7m halo、stroke 单重建、edge minimum 更新 |
| `terrain-material-lod.test.js` | 11 | Near/Medium/Far 和 metadata budgets、shadow、mask-before-branch、road 顺序、forest-floor、snow、midtone、segment→material、dispose once |
| `tree-streaming.test.js` | 2 | quality budget/shadow hysteresis；instance buffer 只释放一次且共享资产不释放 |
| `water-system-network.test.js` | 3 | merged tributary + snowmelt alias、cirque tarn +Y/reflection cap、河网 Golden Shots |

参考基线结果：

```text
tests 79
pass 79
fail 0
```

可锁定当前河网几何统计为约 3381 vertices、5181 triangles（strip 5124、junction 57），但更重要的是上述结构与预算不变量。

## 30. 自动测试没有覆盖的人工验收

Node tests 和 Vite build 不会加载真实 FBX/GLB/KTX2、执行 Basis 转码、真实编译 GPU shader、验证透明排序、截图或实际 FPS。因此完成后必须启动浏览器并检查：

1. 默认 Balanced 首帧：loading 淡出后看到出生点角色、高山湖、水面、树、岩石和地形；默认 HUD 不可见。
2. console/network 无运行时 error、shader compile error 和必需资源 404。
3. WASD、拖拽、滚轮、Alt hover、Ctrl descent、坡度阻挡、掉崖和边界符合规格。
4. Backquote 和 `?debug=1` 显示完整 HUD；Grass/Trees 开关与三档 Quality 生效。
5. Edit 打开顶部工具条；Raise/Lower、slider、cursor、实时 chunk patch 正常；在 dev server 保存后确实写回并只创建一次 backup。
6. 逐个查看 11 个 Golden Shots，确认河网、水面、瀑布、道路、终端湖没有反向面、黑片、硬边、LOD 裂缝或明显 pop。
7. Quality planar、Balanced probe、Performance environment 反射路径都可运行；水根不受 GTAO 直接压黑。
8. 移动并等待 streaming 稳定后，geometry/texture/program 数不持续无界增长。
9. 窗口 resize 后相机、composer、reflector 和动态分辨率同步。

## 31. 忠实现状的遗留与已知边界

以下不是待办，除非用户另行要求修复：

1. production `wetBanks:null`；`createWetBankMesh` 只保留 helper/test contract。
2. `createGrassClumps`、patch grass、`generatePlacementsInRect`、`generateAllTreePlacements` 是未接入遗留路径。
3. `createLeafDecals` wrapper 未用于 production；production 预加载 Canvas textures 后调用 `buildLeafDecals`。
4. `createLakeOutline` 未使用。
5. `getWaterSystemMaterialFrame` 返回的 `outletMask`、`lakeDistance` 不写进 terrain attributes。
6. `smallLakes.VEG_BUFFER=10` 未使用；普通小湖只按真实 radius 排除植被，不按 shore。
7. terrain 维护 edgeMinimums，但 skirt bottom 仍只是每个 edge vertex 的 Y-2。
8. terrain texture budget 是 userData metadata，不是真正 sampler 限制；Far shader 仍可能引用多张共享纹理。
9. Quality 名为 `hero-4k`，实际加载 2k。
10. 主高山湖河床大部分固定采 river-bed `(0,0)`；不要默默修复。
11. 普通 small lake 地形相对各点原高度下挖，但水面按中心固定高度。
12. active GrassZone 不使用配置中的 130–185m lowland fade；高海拔草由坡度/ground mask 控制。
13. TreeZone occupancy 为每个 256m chunk 私有，跨 chunk 边界可能小于 6m。
14. Hero rocks 无 LOD/streaming，始终驻留。
15. deferred vegetation attach 后不重新跑全场景 anisotropy traversal。
16. 两类 leaf InstancedMesh 共享一个 PlaneGeometry，但 zone dispose 会从两个 mesh 各调用一次 geometry.dispose，没有去重。
17. `Billboard_Normal` 被请求但未绑定远景 Lambert。
18. 旧 HUD Prompt 中的 Water Debug、Foam Debug、Low Quality Water 当前不存在，不要添加。

其中旧 `createGrassClumps()` 无参数调用 `loadGrassModel()`，而当前 loader 路径需要传入 KTX2 loader；单独调用可能失败，production 不依赖它。

同样不要实现敌人、战斗、任务、背包、音频、联网、生产高度图后端、移动端 UI、外部 HDR、真正 cascaded shadows/tree impostor 或 camera-facing grass billboard。

发生资料冲突时按此优先级：

```text
本 Prompt 中的现状/测试契约
> 当前 src 和 tests
> 最新 requirement
> 旧 requirements
> 旧 2026-07-06 水体初始化 Prompt
```

## 32. 构建、Git 与最终交付

实现完成后：

1. 运行 `npm test`，必须 79/79 通过。
2. 运行 `npm run build`，必须成功。
3. 启动 `npm run dev` 做上述浏览器人工验收。
4. 检查 `git status`，只 stage 本任务文件，不包含用户无关修改、构建产物、截图或临时文件。
5. 为代码实现创建 `docs/requirements/YYYY-MM-DD-short-topic.md`，包含中英双语的 `Requirement / 需求`、`Summary / 概要`、`User Request / 用户需求`、`Scope / 范围`、`Acceptance Criteria / 验收标准`。
6. 创建一个简洁 commit。

参考生产构建约 68 modules、主 JS 约 1.04MB（gzip≈314KB）、CSS≈3.6KB。Vite 的 `chunk >500kB` 警告是已知非失败项；不要仅为消除它擅自重构 dynamic imports。完整 public copy 使 dist 约 347MB。

最终回复必须说明：

- 已实现的模块和关键视觉系统。
- 运行命令。
- test/build 的实际结果。
- 浏览器验收检查了哪些入口。
- 缺失资源、近似素材或仍未完成项；不得把近似说成精确完成。

## 33. 最终验收定义

只有同时满足以下条件才算完成：

- 工程从空目录可安装、开发运行、测试、构建。
- 二进制资源齐全时默认画面与 Cold Mountain 的冷湿清晨高山湖出生区一致。
- 所有确定性坐标、河网、道路、湖泊、出生点和 Golden Shots 一致。
- 地形 streaming/LOD/editor、草树 streaming/LOD、玩家状态、相机碰撞、三档后处理和水体 reflection 全部工作。
- 79 个 Node tests 全通过，build 成功，浏览器无关键 console/network/shader 错误。
- 没有实现本规格之外的系统，也没有偷偷修复“忠实现状”列表中的行为差异。
