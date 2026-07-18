你是一名资深实时图形工程师、Three.js 游戏原型工程师和技术美术。请直接在当前输出工作区从零实现一个完整、可运行、可验收的 Web 3D 项目：`Cold Mountain`。

不要只写方案、伪代码或 TODO。不要等待追问；遇到未明确的细节请做合理的、最简单的工程判断并继续，直到项目可以安装、测试、构建和在浏览器中游玩。

这同时是一项代码质量基准测试。你的产出会与其他模型在完全相同的输入资产、机器环境、时间窗口和验收流程下进行横向比较。不要针对评分表写“看起来存在”的空壳实现；评测会阅读源代码、运行测试、检查浏览器、改变输入、切换画质并观察真实渲染指标。所有功能声明都必须能从代码、测试或浏览器行为中得到证实。

本任务中的关键词按以下方式解释：

- **必须 / 不得**：硬性要求；违反会扣除对应项，严重时触发总分上限；
- **应 / 应当**：默认要求；只有存在明确工程理由时才可偏离，并须在最终报告解释；
- **建议 / 可以 / 可选**：不会单独导致失败，但实现质量可作为同分比较依据；
- **等价方案**：只有在最终可观察行为、性能成本和可测试性不低于原要求时才算等价；
- **完成**：不是“代码已写”，而是对应功能已运行、已验证、无已知阻断问题。

若前文与后文存在歧义，以更具体、可验证的条款为准；若仍有冲突，优先级依次为：第 0 节参考一致性锁 > 资源和安全边界 > 可运行性 > P0 > P1 > 外部自动化验收契约 > P2 > 自写测试和自述报告。

## 0. 最高优先级：参考一致性锁

### 0.1 这不是自由设计任务

本任务不是“根据主题自由设计另一座高山”，而是对一个已经冻结的 `Cold Mountain` 目标场景进行独立重实现。允许自由选择代码架构和具体算法，不允许自由改变宏观世界、主要地貌关系、视觉气候、固定机位或主体尺度。

以下情况即使功能名称齐全，也不算参考一致：

- 把 6144 世界缩成只有中心高度图的 2048 世界；
- 把出生点、湖泊、瀑布、主河或终端湖移动到另一片区域；
- 用另一条河网讲述“类似”的水文故事；
- 把冷湿绿色高山做成金黄、干旱或沙漠化山地；
- 用巨大半透明太阳/月亮圆盘占据天空；
- 让 `vista` 变成与目标构图不同的超远全图鸟瞰；
- 用稀疏微型树、地表烘焙草色或少量随机实例冒充生态密度；
- 用四顶点水帘、矩形水面、圆环贴片或图标式白水冒充目标瀑布和急流；
- 让道路穿过水面、瀑布池或河道却没有桥、浅滩或地形解释；
- 用较高 FPS 或较少 draw calls 抵消明显的视觉内容缺失。

实现开始时，把本节全部冻结布局（JSON 与锚点表格）转写为项目内唯一一份只读 `SCENE_LAYOUT` 数据模块或 JSON。地形塑形、水文、植被排除、玩家出生点、固定机位、测试和 debug probe 必须引用这一真源，不得各自复制并逐渐漂移。

### 0.2 冻结的场景布局

下列数据是硬性输入。X/Z 锚点允许误差 `±0.25`，水位允许误差 `±0.05`，固定相机绝对 Y 允许误差 `±0.1`。不得镜像、旋转、整体平移或重新设计。

```json
{
  "version": 2,
  "world": {
    "size": 6144,
    "minX": -3072,
    "maxX": 3072,
    "minZ": -3072,
    "maxZ": 3072,
    "centerHeightmapSize": 2048,
    "centerMin": -1024,
    "centerMax": 1024,
    "cellSize": 2048
  },
  "playerSpawn": { "x": 335, "z": -358 },
  "alpineLake": {
    "center": [300, -400],
    "waterLevel": 31,
    "baseRadius": 47,
    "shoreWidth": 9,
    "maxDepth": 6.5,
    "edgeDepth": 1.35
  },
  "lakeOutlet": {
    "points": [[365, -417], [392, -419], [409, -421]],
    "width": 5.2
  },
  "waterfall": {
    "lip": [409, 30.4, -421],
    "base": [418, 1.5, -424],
    "width": 7.5
  },
  "plungePool": {
    "center": [418, -424],
    "waterLevel": 3.2,
    "radius": 10,
    "maxDepth": 1.7
  },
  "mainRiver": {
    "points": [
      [420, -423],
      [435, -413],
      [460, -398],
      [489, -388],
      [518, -374],
      [545, -350],
      [575, -336],
      [602, -352],
      [633, -349],
      [662, -351],
      [690, -340]
    ],
    "waterLevels": [3.2, 3.05, 2.9, 2.72, 2.55, 2.38, 2.2, 2.05, 1.88, 1.72, 1.6],
    "confluences": [
      { "id": "hero-j1", "position": [575, -336], "waterLevel": 2.2 },
      { "id": "hero-j2", "position": [633, -349], "waterLevel": 1.88 }
    ],
    "tributaries": [
      {
        "id": "hero-west-tributary",
        "points": [[635, -300], [625, -315], [610, -326], [592, -334], [575, -336]],
        "waterLevels": [3.15, 2.95, 2.68, 2.38, 2.2]
      },
      {
        "id": "hero-east-tributary",
        "points": [[700, -270], [690, -292], [675, -315], [655, -337], [633, -349]],
        "waterLevels": [3.4, 3.1, 2.68, 2.18, 1.88]
      }
    ]
  },
  "terminalLake": {
    "center": [690, -340],
    "waterLevel": 1.6,
    "radius": 20,
    "maxDepth": 1.6
  },
  "shots": {
    "spawn": {
      "player": [335, -358],
      "camera": { "x": 340, "z": -351, "heightMode": "terrain", "heightOffset": 3.4 },
      "target": { "x": 335, "z": -358, "heightMode": "terrain", "heightOffset": 1.25 }
    },
    "lake": {
      "player": [342, -390],
      "camera": { "x": 351, "z": -375, "heightMode": "terrain", "heightOffset": 5.8 },
      "target": { "x": 310, "z": -405, "heightMode": "terrain", "heightOffset": 2.2 }
    },
    "waterfall": {
      "player": [397, -405],
      "camera": { "x": 450, "y": 30, "z": -398 },
      "target": { "x": 413, "y": 7, "z": -423 }
    },
    "river": {
      "player": [610, -360],
      "camera": { "x": 600, "y": 12, "z": -375 },
      "target": { "x": 620, "y": 2.5, "z": -345 }
    },
    "forest": {
      "player": [356, -332],
      "camera": { "x": 349, "z": -322, "heightMode": "terrain", "heightOffset": 4.8 },
      "target": { "x": 358, "z": -342, "heightMode": "terrain", "heightOffset": 2.2 }
    },
    "vista": {
      "player": [347, -350],
      "camera": { "x": 365, "y": 88, "z": -322 },
      "target": { "x": 300, "y": 38, "z": -400 }
    }
  },
  "diagnosticShots": {
    "check-tarn": {
      "player": [108, -535],
      "camera": { "x": 132, "y": 91, "z": -505 },
      "target": { "x": 76, "y": 49.5, "z": -552 }
    },
    "check-lowland-north": {
      "player": [-520, 660],
      "camera": { "x": -320, "y": 92, "z": 650 },
      "target": { "x": -320, "y": 4, "z": 760 }
    },
    "check-lowland-east": {
      "player": [850, -200],
      "camera": { "x": 930, "y": 100, "z": -90 },
      "target": { "x": 755, "y": 3, "z": -310 }
    },
    "check-lowland-south": {
      "player": [900, -620],
      "camera": { "x": 955, "y": 110, "z": -500 },
      "target": { "x": 750, "y": 3, "z": -680 }
    },
    "check-outer-northwest": {
      "player": [-1650, 1450],
      "camera": { "x": -1450, "y": 180, "z": 1250 },
      "target": { "x": -1650, "y": 8, "z": 1450 }
    },
    "check-outer-southeast": {
      "player": [1500, -1500],
      "camera": { "x": 1700, "y": 180, "z": -1300 },
      "target": { "x": 1500, "y": 8, "z": -1500 }
    }
  }
}
```

中心高山水系在进入高山湖前必须保留以下拓扑和锚点：

| 节点 | 类型 | X/Z | 水位 |
| --- | --- | --- | --- |
| source-s0-northwest | source | `(-296, -312)` | 182.8 |
| source-s1-north | source | `(24, -192)` | 181.6 |
| junction-j1 | confluence | `(16, -352)` | 50.6 |
| source-s2-southwest | source | `(-208, -556)` | 181.6 |
| junction-j2 | confluence | `(92, -420)` | 42.8 |
| source-s3-cirque | source | `(40, -680)` | 182.8 |
| cirque-tarn | lake | `(76, -552)` | 49.5 |
| junction-j3 | confluence | `(172, -444)` | 39.1 |
| source-s4-southeast | source | `(152, -652)` | 182.8 |
| junction-j4 | confluence | `(272, -460)` | 31.6 |
| alpine-lake | lake-inlet node; boundary center is `(300,-400)` | `(300, -436)` | 31.0 |

十条入湖 reach 也属于冻结布局；`points` 与 `levels` 一一对应，`width` 是首尾宽度：

| ID | from → to | points | levels | width |
| --- | --- | --- | --- | --- |
| s0-j1 | source-s0-northwest → junction-j1 | `(-296,-312) (-264,-288) (-200,-288) (-144,-316) (-116,-339) (-100,-348) (-52,-344) (4,-340) (16,-352)` | `182.8 159.6 107.1 106.5 83.5 79.7 53.4 50.7 50.6` | `1.4→2.3` |
| s1-j1 | source-s1-north → junction-j1 | `(24,-192) (52,-220) (80,-256) (68,-288) (36,-308) (16,-352)` | `181.6 124.3 65.9 55.9 55.4 50.6` | `1.2→1.8` |
| j1-j2 | junction-j1 → junction-j2 | `(16,-352) (24,-396) (76,-416) (92,-420)` | `50.6 46.8 43.5 42.8` | `2.6→3.0` |
| s2-j2 | source-s2-southwest → junction-j2 | `(-208,-556) (-160,-544) (-126,-569) (-116,-572) (-76,-548) (-56,-504) (-8,-488) (15,-478) (36,-464) (76,-428) (92,-420)` | `181.6 140.8 138.3 138.3 104.6 72.7 58.8 47.5 44.8 43.1 42.8` | `1.3→2.0` |
| j2-j3 | junction-j2 → junction-j3 | `(92,-420) (132,-436) (152,-440) (172,-444)` | `42.8 40.3 39.4 39.1` | `3.2→3.8` |
| s3-tarn | source-s3-cirque → cirque-tarn | `(40,-680) (0,-660) (-8,-612) (28,-580) (42,-573) (68,-560) (76,-552)` | `182.8 154.3 102.8 73.5 59.3 50.0 49.5` | `1.2→1.6` |
| tarn-j3 | cirque-tarn → junction-j3 | `(76,-552) (100,-524) (104,-517) (108,-510) (120,-480) (152,-452) (172,-444)` | `49.5 48.8 44.7 42.2 42.2 39.3 39.1` | `2.0→2.4` |
| j3-j4 | junction-j3 → junction-j4 | `(172,-444) (196,-444) (252,-460) (272,-460)` | `39.1 36.2 32.0 31.6` | `4.0→4.6` |
| s4-j4 | source-s4-southeast → junction-j4 | `(152,-652) (184,-620) (208,-588) (220,-548) (220,-504) (252,-476) (272,-460)` | `182.8 104.7 71.3 48.5 34.0 31.9 31.6` | `1.3→2.1` |
| j4-alpine-lake | junction-j4 → alpine-lake | `(272,-460) (286,-454) (298,-450) (302,-444) (300,-436)` | `31.6 31.4 31.2 31.1 31.0` | `4.8→5.2` |

这部分必须形成五个源头、四个 Y 形汇流、一个 cirque tarn、十条非上升河段和高山湖入口。高山湖出口再连接瀑布、池、下游主河及终端湖，不能把两套水系换成一条新的简化链。

中心低地的三个 basin 同样冻结，不能换位置或省略：

| Basin | 湖泊/水位 | 冻结连接 |
| --- | --- | --- |
| east | east-meadow-pond `(820,-260) @ 3.2`；terminal-lake `(690,-340) @ 1.6` | `(820,-260) → (805,-270) → (780,-278) → (758,-296) → (735,-308) → (710,-326) → (690,-340)` |
| north | northwest-shallow-lake `(-520,720) @ 3.5`；northeast-shallow-lake `(-120,800) @ 2.0` | `(-520,720) → (-465,742) → (-408,730) → (-350,765) → (-290,750) → (-230,786) → (-175,778) → (-120,800)` |
| south | northwest `(667,-605) @ 3.5`；east `(859,-692) @ 3.2`；central `(755,-657) @ 2.8`；terminal `(717,-751) @ 1.8` | 两条支流分别汇入 central，再沿 `(755,-657) → (760,-680) → (748,-705) → (735,-730) → (717,-751)` 流入 terminal |

东、北 basin 各含一条 lake connector；南 basin 含两条入湖支流和一条 outlet。各控制点的中间水位可由端点单调插值并贴合最终地形，但不得改变上述拓扑和 X/Z 路径。

### 0.3 九宫格大世界

中心 `2048×2048` 单元使用 `height.webp` 的完整精度。外围八个 `2048×2048` 单元组成总边长 6144 的连续世界：

| 单元 | 中心 | source C | foothill lake | source A / B | upper junction | lower junction | terminal lake |
| --- | --- | --- | --- | --- | --- | --- | --- |
| northwest | `(-2048,2048)` | `(-1056,1056)` | `(-860,1500)` | `(-2780,2720)` / `(-1450,2680)` | `(-1749.6,1913.9)` | `(-2130,2180)` | `(-1650,1450)` |
| north | `(0,2048)` | `(0,1056)` | `(-57.2,1180)` | `(-720,2780)` / `(690,2700)` | `(-17.7,1874.8)` | `(-80,2200)` | `(360,1450)` |
| northeast | `(2048,2048)` | `(1056,1056)` | `(860,1500)` | `(1450,2720)` / `(2780,2600)` | `(1656.2,2003.7)` | `(2070,2170)` | `(1550,1450)` |
| west | `(-2048,0)` | `(-1056,0)` | `(-1180,-41.6)` | `(-2800,720)` / `(-2750,-650)` | `(-1867.1,95.7)` | `(-2200,80)` | `(-1450,-360)` |
| east | `(2048,0)` | `(1056,0)` | `(1180,52)` | `(2800,680)` / `(2740,-700)` | `(1878.5,44.2)` | `(2200,-40)` | `(1450,380)` |
| southwest | `(-2048,-2048)` | `(-1056,-1056)` | `(-1500,-860)` | `(-2780,-1500)` / `(-1550,-2780)` | `(-2024.4,-1717.9)` | `(-2200,-2160)` | `(-1450,-1600)` |
| south | `(0,-2048)` | `(0,-1056)` | `(41.6,-1180)` | `(-700,-2780)` / `(720,-2700)` | `(122.7,-1871.5)` | `(80,-2200)` | `(-360,-1450)` |
| southeast | `(2048,-2048)` | `(1056,-1056)` | `(860,-1500)` | `(1500,-2780)` / `(2780,-1580)` | `(1732.4,-2011.3)` | `(2180,-2180)` | `(1500,-1500)` |

每个外围单元必须包含：

- 与中心无裂缝连接的低地平原；
- 两组宽缓 rolling hills，而不是复制中心高山；
- 三个源头、两个汇流点和六条河段；
- 一个半径约 `76×52` 的 foothill lake；
- 一个半径约 `118×82` 的 terminal lake；
- 河床塑形、湿岸、植被排除和统一水面；
- 至少 384 单位宽的中心过渡带和 256 单位宽的世界边缘收口。

每套网络的固定拓扑是 `source C → foothill lake → upper junction`，source A 同时汇入 upper junction，随后 `upper junction → lower junction`，source B 汇入 lower junction，最后 `lower junction → terminal lake`，恰好六条 reach。名义水位依次为 source C/A `14`、source B `13.5`、foothill lake `12.5`、upper junction `11.1`、lower junction `10.5`、terminal lake `8`；可整体贴合外围地形，但必须保持该拓扑和下游非上升。

外围总计必须有 8 套河网、16 个湖泊和 48 条河段。`nine-grid-height.png` 是 6144 世界的冻结宏观高度真源，不只是“看一眼”的参考：运行时必须直接采样它，或使用从该文件预烘焙且逐样本在容差内等价的数据。不得用另一套程序化噪声地貌替换它。中心单元在宏观高度上叠加/替换为 `height.webp` 的高精度采样，并在过渡带连续融合。

### 0.4 Balanced 冻结视觉基线

Balanced 默认画面使用：

- `PerspectiveCamera` FOV 60；
- camera near `0.25`、far `9216`；
- sRGB 输出；
- ACES Filmic tone mapping；
- exposure `1.14`；
- 天空顶色 `#236fc4`；
- 天空地平线色 `#67a9d6`；
- 下半球/地面环境色 `#6b776b`；
- 雾色 `#719bb7`；
- 太阳色 `#ffe4bd`、强度约 `3.25`、仰角 `48°`；水平朝向由 X/Z 向量 `(0.48, 0.73)` 归一化得到；
- HemisphereLight 天空色 `#9bbdca`、地面色 `#687568`、强度约 `2.05`；
- fog near `420`、far `1700`、density `0.00030`、height falloff `0.018`；
- 空气透视 density `0.00048`、height falloff `0.004`、minimum height density `0.18`、near-clear distance `180`、full-density distance `900`、max opacity `0.32`；
- Rayleigh 色 `#73a3c5`、Mie 色 `#e6c38f`、sun scatter `0.20`；
- 云色 `#e8eef2`、云影色 `#7890a0`、cloud cover `0.48`；
- 环境贴图强度 `1.20`、sun radiance `24`；
- 清晰、偏冷、湿润的岩石和绿色中间调；雪只覆盖高海拔缓坡和峰顶；
- SMAA 或质量不低于 SMAA 的抗锯齿；
- 半分辨率、低强度 GTAO；
- 基于深度的空气透视；
- 很弱 bloom 与 sharpen；
- 统一的水体 attribute/resolve 路径。

太阳盘的角直径不得超过约 2.5°；没有必要时可以不直接显示太阳盘。禁止占据画面宽度 20% 以上的半透明圆形天体。地面整体不能呈黄褐色滤镜，雪、岩石、森林地表和湿岸必须保持可区分的冷暖与 roughness 层次。

### 0.5 Balanced 可见实现下限

这些是可观察的硬下限，不是“建议”：

- 逻辑地形覆盖为 `24×24` 个 256 单位 chunk 或等价 576 单元覆盖；
- 中心单元近景采样间距不大于 1，次近景不大于 2，随后才允许降到 4/8；
- LOD 焦点必须随玩家或 fixed shot 更新，不能永久围绕启动坐标；
- 中心水系和外围水系附近必须有局部地形细节 floor，不能让细河落在低密度大三角上；
- 河流中心线采样间距不大于 2，每个横截面至少 5 个横向样本；
- 高山湖至少 96 个岸线角向段和 8 个以上径向环，不能用十几个点的中心 triangle fan；
- 瀑布至少有主水帘、左右细流、雾幕四层，以及独立唇部泡沫、池面和雾沫；
- forest floor 的 base color、normal、ORM 都必须真实参与 shader；
- rock base color 与 rock normal 必须真实参与 shader；
- scree、snow、river-bed、wet-bank 必须分别影响实际输出，不能只加载不用；
- 草必须使用 VarA–VarF 和 LOD0–LOD2，不得只取 A/B/C；
- 草候选密度约 `40/7 clumps/m²`，适宜近景草地接受密度不得低于 `1.5 clumps/m²`；
- 低地/中地/高地树目标密度分别约 `0.051 / 0.030 / 0.0051 trees/m²`，最小间距约 3.5；
- 植被候选和远景代理必须覆盖完整 6144 世界，不得只覆盖一个手写局部矩形；
- 远树代理或等价轮廓系统应在详细模型淡出后继续到世界边缘；
- hero rocks 必须来自 9 个岩石变体中的多个变体，水中岩石与白水共用 placement 真源；
- 六个 fixed shot 中不得出现穿水道路、悬浮石头、圆环白水图标、断流或明显地形裂缝。

#### 0.5.1 Balanced 地面材质冻结契约

本节用于消除“同一高度图、另一套地面美术”的自由度。允许使用 `ShaderMaterial`、`MeshStandardMaterial.onBeforeCompile`、节点材质或等价架构，但 active shader 的输入、世界尺度、层权重、PBR 响应和最终可见结果必须满足以下契约。

基础层与覆盖层：

- 基础自然地表只有 `forest-floor ↔ rock`；
- snow 覆盖基础层；
- mountain trail 覆盖 snow 之后的结果；
- river gravel、wet bank、water bed 依次覆盖 trail；
- snowmelt wet darkening 最后应用；
- 固定顺序为：`forest/rock → snow → trail → gravel → wet-bank → water-bed → snowmelt-darkening`；
- dry-grass、moss 和 splat 不参与冻结主地面的基础混合；
- scree 仅用于 river-gravel 覆盖，不得作为普通山坡的全局底色。

冻结纹理世界周期：

| 层 | 映射 | 世界周期/尺度 |
| --- | --- | --- |
| forest-floor base/normal/ORM | world XZ，四邻 cell 随机四分之一圈旋转并平滑 texture-bombing | `2.0` |
| rock base/normal | world-space triplanar，权重 `pow(abs(worldNormal), 4)` 后归一化 | `20 / 0.62 ≈ 32.258` |
| snow | world XZ | `27.0`，UV offset `(6.4,-3.7)` |
| river-bank | world XZ | `3.8` |
| river-bed 普通河段 | 沿河累计距离 / 横向坐标 | `distance / 12`、`lateral / 3.6` |
| river-bed 汇流 | world XZ 旋转 `0.61` radians | `12.0` |
| river-bed 小湖 | world XZ | `12.0` |
| scree/gravel | world XZ | `5.5` |

forest-floor 的 base、normal、ORM 必须共享同一 cell rotation、offset、四邻权重和显式 gradient；不能让颜色、法线和 roughness 的纹理格子彼此错位。允许使用不同的等价 anti-tiling 算法，但 evaluator probe 与截图中的周期、方向和过渡不得产生可见差异。

世界空间法线是硬要求：

```glsl
worldNormal = normalize(inverseTransformDirection(transformedNormal, viewMatrix));
```

或使用数学上等价的 normal-matrix 变换。高度坡度、forest/rock 权重、snow slope、rock triplanar color 和 rock triplanar normal 都只能读取 `worldNormal`。最终进入 Three.js 光照前，才把混合完成的 surface normal 变换到 view space。禁止直接用 `vNormal` 决定地层；相机绕地面旋转时，同一世界点的所有 layer weight 变化不得超过 `1e-4`。

宏观信号使用固定 seed 的 world-XZ value noise，不能依赖相机、chunk 局部 UV 或加载顺序：

```glsl
macroX = noise(worldXZ * 0.012  + vec2( 2.8, -7.1));
macroY = noise(worldXZ * 0.0065 + vec2(-8.0,  4.0));
macroZ = noise(worldXZ * 0.055  + vec2(-3.0, 12.0));
macroW = noise(worldXZ * 0.003  + vec2(17.0,-11.0));
```

`noise` 可采用 `hash = fract(sin(dot(cell, vec2(127.1,311.7))) * 43758.5453123)`、四角采样与 smooth interpolation 的 value noise，或数值等价实现。相邻 chunk 在相同世界点必须得到相同 macro。

`groundMask` 从最终 deformation 后地形采样，不从 base height 或颜色贴图猜测：

```text
sampleDistance = 5
slopeMask  = smoothstep(0.76, 0.94, sampledNormalY)
relief     = (max(center,left,right,down,up) - min(...)) / 10
smoothMask = 1 - smoothstep(0.22, 0.62, relief)
groundMask = clamp(slopeMask * smoothMask, 0, 1)
```

基础 forest/rock 权重使用以下冻结 profile；若改用等价函数，外部固定 probe 的绝对权重误差不得超过 `0.03`：

```glsl
noisyHeight = worldY + (macroX - 0.5) * 30.0;
flatMask = smoothstep(0.56, 0.92, worldNormal.y);
lowlandMask = 1.0 - smoothstep(55.0, 90.0, noisyHeight);
ground = smoothstep(0.08, 0.82, groundMask) * flatMask * lowlandMask;
forestRockSignal = clamp(ground + (macroZ - 0.5) * 0.10, 0.0, 1.0);
forestWeight = smoothstep(0.10, 0.74, forestRockSignal);
rockWeight = 1.0 - forestWeight;
```

`forestRockSignal >= 0.74` 时使用完整 forest-floor；`<= 0.10` 时使用完整 rock；中间平滑混合颜色、world-space normal、roughness 和 AO。不得只对 base color 混合而让所有层共用一张 dry-grass normal。

forest-floor 在线性空间采用冻结色调：

```glsl
luma = dot(forestColor, vec3(0.2126, 0.7152, 0.0722));
forestColor = mix(vec3(luma), forestColor, 0.70);
forestColor *= vec3(0.96, 1.04, 0.86);
forestColor = forestColor * 1.16 + vec3(0.006, 0.010, 0.003);
forestColor *= mix(1.0, 1.06, macroX);
```

地面整体的更低频亮度只允许在约 `0.96–1.05` 内变化，不能叠加黄褐色全局 tint。forest normal 与 world base normal 的混合强度为 `0.55`；ORM.G 映射 roughness `0.55–0.92`，ORM.R 映射 AO `0.75–1.0`。

rock 使用三平面 base color 与三平面 rock normal；颜色乘 `vec3(0.80,0.79,0.76)`，roughness `0.80`、AO `0.96`、normal 混合强度约 `0.50`。Balanced 不得只加载 `rockNormal` 而不绑定，也不得让 rock 层继续使用 forest 或 dry-grass normal。

snow profile 冻结为：

```glsl
snowLine = worldY + (macroX - 0.5) * 24.0 + (macroZ - 0.5) * 8.0;
snowElevation = smoothstep(55.0, 130.0, snowLine);
snowSlope = smoothstep(0.30, 0.78, worldNormal.y);
snowCoverage = smoothstep(
  0.12,
  0.88,
  snowElevation * snowSlope + (macroZ - 0.5) * 0.22
);
```

snow color 乘 `vec3(0.90,0.94,1.0)`，roughness 向 `0.94`、AO 向 `1.0` 混合，并按 `coverage * 0.55` 将细节 normal 拉回地形 base normal。固定验证点统一取 `macroX=macroZ=0.5`：`height=35, normalY=.9 → 0`；`height=90, normalY=.9 → 0.40–0.55`；`height=140, normalY=.9 → 1`；`height=140, normalY=.25 → 0`；`height=140, normalY=.5 → 0.20–0.35`。

覆盖层使用来自真实 terrain/water/trail 查询的独立字段，而不是一张手绘低分辨率 RGBA world mask：

```text
riverMask, riverBedMask, riverUnderwaterMask, riverGravelMask,
riverConfluenceMask, riverBedCoord,
lakeBedMask, wetShoreMask, snowmeltWetMask, plungeMask,
smallLakeMask, mountainTrailMask
```

中心河湖与 fixed-shot ROI 的 mask 采样间距不得大于 `1`，其余可见区域不得大于 `4`；mask、植被排除和水体几何必须来自同一查询真源。

覆盖 PBR 参数冻结为：

- trail：保留 `72%` 原色、混入 `28%` luminance，再乘 `vec3(.91,.89,.85)`；以 `mask × .62` 覆盖，normal flatten `0.26`，roughness 在原值上增加约 `.04`，AO 向 `.98`；
- gravel：保留 `52%` 原色、混入 `48%` luminance，乘 `vec3(.86,.84,.79)`，再以 `.58` 混回 base；roughness `.72`，packed B/A scree normal 的最大混合强度约 `.38`；
- wet-bank：保留 `62%` 原色、混入 `38%` luminance，乘 `vec3(.82,.87,.86)`，再以 `.86` 混回 base；hero wet 区再乘 `vec3(.82,.84,.74)`，roughness 随湿度约从 `.55` 降至 `.26`；
- water-bed：最后覆盖 bank，roughness `.42`；
- snowmelt wet：最后按 `mask × .34` 向 `vec3(.62,.70,.74)` 压暗；
- 所有 roughness 最终 clamp 到 `[0.18,1.0]`；AO 乘 indirect diffuse，indirect specular 只接受约 `35%` 的 AO 抑制。

Balanced 的所有地形几何 LOD 至少保持相同的 Medium 等价层权重、forest normal/ORM、rock triplanar normal 和水岸覆盖。允许远景减少采样次数，但相邻材质 LOD 在同一世界点的 base color 线性 RGB 差异不得超过 `0.04`、roughness/AO 差异不得超过 `0.05`，不能在 LOD 切换时整片变色。

若性能不足，先降低内部 resolution scale、远景代理复杂度、阴影更新率和远处密度；不得先删除中心湖、瀑布、河网、近景地形细节或 shot 内生态层次。

### 0.6 输入文件不可变

以下输入属于评测题面，不是需要“整理”的项目源码：

- `project-prompt.md`；
- `AGENTS.md`（若存在）；
- `public/assets/`；
- `public/basis/`；
- 评测者提供的 reference、layout 或 harness 文件。

不得删除、改名、格式化或重写这些文件，不得让 Prettier/formatter 修改 Markdown 代码示例。生成代码和文档只能写到允许的输出文件。`.gitignore` 不得忽略 `artifacts/screenshots/` 和评测 summary；验收证据必须可被评测者读取。

### 0.7 两阶段评测

第一阶段是不可补偿的产品等价门槛：

- 冻结布局与六个 shot 坐标通过外部检查；
- 六个 shot 均达到主题、主体尺度、生态密度和视觉基线；
- 中心与外围世界、水文连接、角色控制、真实画质切换通过外部检查；
- 任一关键 shot 只剩占位几何或宏观布局错误时，结果标记为“产品未完成”。

只有通过第一阶段的实现才进入第二阶段代码质量比较。工程整洁、测试数量、较少 draw calls 或较高 FPS 不能补偿第一阶段失败。

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

优先级顺序是：正确可运行 > 冻结布局与参考视觉一致 > 核心体验完整 > 工程质量 > 工具和额外润色。先完成第 0 节、P0 和 P1 的可验收垂直切片，再做 P2。不要以架构整洁、较少 draw calls 或较高 FPS 换取产品内容缺失。

## 2. 干净评测与目录边界

当前工作目录就是输出项目根目录。评测开始时除不可修改的题面/控制文件外，只预置以下运行时资源目录；应用源码、配置、测试和 README 都必须由你从零创建：

```text
project-prompt.md
AGENTS.md                 # 若评测环境提供
public/assets/
public/basis/
reference/                # 若以文件形式提供，只读
harness/                  # 若以文件形式提供，只读
```

基准组织者必须为所有模型提供相同的 production-preview 浏览器控制与截图能力；它可以是工作区外的统一工具，也可以是只读 `harness/`，因此目录本身不一定出现。若提供 reference PNG，它们只帮助理解外观，不改变第 0 节数值真源。若环境完全没有浏览器截图能力，实施者应明确报告评测环境阻断，不能用 dev 截图、旧图或伪造的 `acceptance.json` 代替。

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
public/assets/terrain/nine-grid-height.png
```

- 4096×4096 RGB WebP；
- `height.webp` 代表中心约 2048×2048 世界单位的高精度地形；
- `nine-grid-height.png` 是 1024×1024 RGB 的 6144 九宫格宏观高度真源；
- 建议最高高度约 300 世界单位；
- 普通像素高度值为 `0.2126*r + 0.7152*g + 0.0722*b`；
- 为保留低地水系精度，若 `b === 254 && r <= 32`，高度码应读取为 `r + g / 255`；
- 最终世界高度为 `heightCode / 255 * 300`；
- 世界 z 与图片 y 方向相反；
- 不得把高度图当颜色贴图贴在地面上。

中心单元必须以 `height.webp` 为高精度真源；外围单元必须使用 `nine-grid-height.png` 或从其逐样本等价预烘焙的数据。二者必须由同一套世界地形查询层提供 `getHeightAt(x,z)` 和 `getNormalAt(x,z)`，供网格、角色、相机、植被和水系共同使用，避免视觉与碰撞高度不一致。

### 4.3 冻结地表与水岸纹理

Balanced 地形 shader 必须实际绑定下列九类 sampler；forest-floor 的 1k/2k 是画质档备选，同一档只绑定对应的一组，其他路径不得换成替代素材：

```text
public/assets/terrain/rock-alpine.webp
public/assets/terrain/rock-alpine-normal.png
public/assets/terrain/snow-alpine.webp
public/assets/terrain/scree-alpine.webp
public/assets/terrain/forest-floor/optimized/forest_floor_basecolor_1k.jpg
public/assets/terrain/forest-floor/optimized/forest_floor_basecolor_2k.jpg
public/assets/terrain/forest-floor/optimized/forest_floor_normal_1k.jpg
public/assets/terrain/forest-floor/optimized/forest_floor_normal_2k.jpg
public/assets/terrain/forest-floor/optimized/forest_floor_orm_1k.ktx2
public/assets/terrain/forest-floor/optimized/forest_floor_orm_2k.ktx2
public/assets/terrain/river-bed.webp
public/assets/terrain/river-bank-rock-wet-light-alt.webp
```

九个 sampler 的语义是：

1. rock base color；
2. rock normal；
3. snow base color；
4. forest-floor base color；
5. forest-floor normal；
6. forest-floor packed ORM；
7. wet river-bank base color；
8. river-bed base color；
9. scree/gravel base color。

Performance 使用 forest-floor `1k` 三件套；Balanced 和 Quality 使用现有最高档 `2k` 三件套。画质切换必须改变实际绑定 URL/纹理对象，不能只修改 `textureSize` 常量。

颜色空间与 packed channel 冻结为：

- rock、snow、forest-floor base color、river-bank、river-bed、scree：RepeatWrapping + sRGB；
- rock normal、forest-floor normal、forest-floor ORM：RepeatWrapping + NoColorSpace；
- ORM 的 R 为 forest AO，G 为 forest roughness；B/A 可作为 scree tangent-normal X/Y；
- 地形 `metalness = 0`。

以下文件虽然存在，但不属于冻结主地面的基础层：

```text
public/assets/terrain/materials/dry_grass_albedo.png
public/assets/terrain/materials/dry_grass_normal.png
public/assets/terrain/materials/moss_albedo.png
public/assets/terrain/materials/moss_normal.png
public/assets/terrain/materials/blend_mask_splat.png
public/assets/terrain/forest-floor/optimized/scree_alpine_normal_1k.ktx2
public/assets/terrain/forest-floor/optimized/scree_alpine_normal_2k.ktx2
```

不得把 dry-grass、moss 或 splat 当作全局基础地面，也不得用 dry-grass normal 作为所有地层共享 normal。若把这些文件用于局部 decal、编辑器预览或不改变冻结外观的次要 breakup，必须保持可禁用且不能取代九个必需 sampler。只加载纹理、保存在 JavaScript 对象或写进未执行 shader 分支不算“使用”；评测会检查 active program 的真实 uniform/texture binding。

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

- 必须使用提供的 `height.webp` 作为中心单元，不能用程序化噪声替代；
- 世界必须覆盖 6144×6144，中心 2048 高山单元和外围八单元按第 0.3 节连续连接；
- `nine-grid-height.png` 必须真实参与外围基础高度，或先被预烘焙为逐样本等价数据；只做一次“验证”后改用另一套噪声不合格，也不得把它当颜色贴图；
- 网格法线正确，不能出现整块黑面、反面或明显接缝；
- 必须按 chunk 构建并围绕玩家或 fixed shot 流送，不能一次创建全世界最高密度网格；
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

- 平缓、低起伏的低地：forest-floor PBR；
- 陡坡、山脊和不适合 forest-floor 的区域：rock PBR；
- 高海拔和背风凹地：自然的积雪；
- 河床和湖床：river-bed；
- 水边过渡：较暗、较湿的 river-bank；
- 河岸碎石带：scree/gravel；scree 不得铺成全世界的基础层；
- 道路：压实土、碎石或裸岩，与周围自然融合。

冻结基础地层只有 `forest-floor ↔ rock`；snow、trail、river gravel、wet bank 和 water bed 按第 0.5.1 节的顺序覆盖。不得把 dry-grass/moss 重新加入主基础混合，避免地面整体变成黄褐色。

必须做到：

- albedo 不承担假阴影；
- normal 强度可信，不把细碎石做成巨石；
- 所有坡度、三平面权重和层权重只使用世界空间法线，不得使用 Three.js 视空间 `vNormal`；
- 多尺度宏观色差打散平铺重复；
- layer 之间用平滑或 height-aware 混合，不能出现硬直线；
- 大石头、草丛和落叶用实例或 decal 提供轮廓细节，不要全塞进地表贴图；
- 近景有细节，远景不过度闪烁或摩尔纹。

### 6.2 连通水系

按第 0 节的冻结布局创建从高山读到低地、再扩展到外围八单元的完整水系：

1. 中心高山网络固定为五个源头、四个汇流、一个 cirque tarn 和十条入湖河段；
2. 高山湖固定在 `(300,-400)`，有冻结的入口和出口；
3. 出口沿固定路径形成约 29 米垂直落差的瀑布和瀑布池；
4. 瀑布池继续形成固定中心线的下游主河；
5. 主河有两个 Y 形支流汇入，并最终进入 `(690,-340)` 终端湖；
6. 中心低地另有三套湖泊/溪流 basin，形成更丰富的低地水文；
7. 外围八单元各有三源头、两湖、两汇流、六河段；
8. 全世界水体统一接入地形、材质、植被排除和渲染管线。

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
?shot=check-tarn|check-lowland-north|check-lowland-east|check-lowland-south
?shot=check-outer-northwest|check-outer-southeast
?capture=1
?time=4
?seed=12345
```

`shot` 必须使用第 0.2 节冻结的角色、相机和 target 坐标；不得自行选择、平移或重新构图。`capture=1` 时必须使用固定 seed、固定 simulation time、关闭动态分辨率并隐藏非必要 HUD，便于外部截图对比。

debug HUD 可额外显示：frame ms、draw calls、triangles、geometries、textures、programs 和当前 resolution scale。

## 8. 架构要求

你可以自由设计源码文件结构，评测不要求匹配某套目录模板；这项自由不包括第 0 节冻结的产品布局和画面。源码必须保持职责清楚，至少在概念上分开：

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

必须使用浏览器 harness 从 production preview 为六个 `shot` 各保存一张 1280×720 PNG 到输出项目的 `artifacts/screenshots/`，并生成第 24.2 节规定的 `acceptance.json`。截图是验收证据，不得用开发过程中的临时图、后期修图或非当前 build 的截图代替。

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
- 第 0 节的冻结布局、视觉基线和可见实现下限全部满足；
- P0 全部完成；
- P1 各系统是完整、互相连通且达到固定 shot 验收尺度的实现，不是占位几何；
- 已通过 production preview 完成上述浏览器验收并保存第 24.2 节规定的六张固定截图和 `acceptance.json`；
- `window.__COLD_MOUNTAIN__` v2 的状态、probe、scene summary 和 metrics 均来自 live runtime；
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

不要为了自评分篡改实现；此表供外部评测使用。产品分先用于判定能否进入代码质量比较，不能与工程分相互补偿。

- 10 分：安装、测试、构建、启动、无资源错误；
- 10 分：角色、移动、动画、相机和探索体验；
- 15 分：6144 九宫格地形、LOD、道路和地表 PBR；
- 20 分：连通水系几何、岸线、流向、泡沫、河湖瀑布接口；
- 15 分：草、树、岩石的生态分布、风动、实例化和 LOD；
- 15 分：六个冻结 shot 的布局、构图、尺度、色调和参考视觉一致性；
- 10 分：性能、画质档、流送和稳定性；
- 5 分：HUD、固定机位、调试工具和验收证据。

产品等价门槛：

- 第 0.2 节关键世界锚点全部通过；
- 六个 shot 的单项视觉验收均通过，不能用平均分掩盖一个空场景；
- 产品质量子分至少 75；
- 不能触发第 27.7 节中的布局、地形、水系或运行时上限规则。

未过门槛的结果仍可给出诊断分，但标记为“产品未完成”，不能在代码质量排名中胜过任何已过门槛结果。

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
- 建立完整 6144 九宫格高度查询，并先显示包含出生区的中心高精度区域；
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
- 第 0 节冻结的五源中心河网、湖泊出口、瀑布、下游主河、终端湖和八套外围河网；
- 河床塑形；
- 河、湖、瀑布和池的几何连接；
- 统一水体视觉；
- 水域查询和植被排除共用数据真源；
- `lake`、`waterfall`、`river` 三个固定机位可观察。

阶段出口：

- 冻结水文锚点、水位单调性、水面贴地误差、河带几何和接口连续性测试通过；
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
- 完整地形 X/Z 范围均为 `[-3072, +3072]`；
- 完整地形总边长为 6144；
- 中心高度图区域 X/Z 范围均为 `[-1024, +1024]`；
- `height.webp` 图片左到右对应中心区域世界 `-X` 到 `+X`；
- `height.webp` 图片上到下对应中心区域世界 `+Z` 到 `-Z`；
- 所有距离、速度、半径和高度均使用同一世界单位；
- 角色约 1.8 单位高，可近似理解为 1 世界单位约等于 1 米。

中心区域世界坐标到 `height.webp` UV 的标准映射为：

```text
u = (x + 1024) / 2048
v = 1 - (z + 1024) / 2048
```

只有中心区域使用这套映射。外围坐标不得 clamp 到中心高度图边缘造成八个拉伸平面，必须路由到九宫格外围高度源。中心采样时将 `u`、`v` clamp 到 `[0, 1]`；像素坐标使用完整的 `[0, width - 1]` 与 `[0, height - 1]` 范围，不能使用 `width` 或 `height` 作为最后一个有效索引。

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
isInsideCenterHeightmap(x, z) -> boolean
worldToTerrainCell(x, z) -> { row, column, id, localX, localZ }
worldToHeightmap(x, z) -> { u, v, px, py } or null outside center
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

世界地形查询层是基础地貌的唯一真源：中心单元读取 `height.webp`，外围单元读取九宫格宏观高度或确定性外围计划。河床、道路和编辑器造成的修改应通过显式 deformation/offset 层叠加，并使所有查询看到同一最终高度。不得只移动地形顶点而忘记更新角色和植被查询。

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

冻结的几何下限：

- chunk 世界尺寸为 256，或使用能严格映射为同等覆盖与密度的方案；
- Balanced 近景 256 segments，采样间距约 1；
- Balanced 次近景 128 segments，采样间距约 2；
- 中景 64 segments，采样间距约 4；
- 远景 32 segments，采样间距约 8；
- Performance 可从 128/64/32 起步；
- 中心水系、外围河湖和 fixed shot ROI 需要局部 minimum-detail floor；
- LOD 变化必须有迟滞、距离缓冲或时间切片，避免阈值抖动和同步卡顿。

### 16.2 地表层权重

第 0.5.1 节是地表权重和 PBR 输出的冻结真源。本节补充实现约束。

所有自然基础层必须同时使用：

- 世界高度；
- 世界空间几何 normal/slope；
- 宏观噪声；
- deformation 后的 `groundMask`。

覆盖层按职责额外使用：

- 距道路距离；
- 距水体/岸线距离；
- 河床 deformation mask；
- 局部湿度。

forest/rock 基础权重必须有限、位于 `[0,1]` 且和约为 1。snow、trail、gravel、wet-bank、water-bed 是有明确顺序的覆盖，不得让总能量随层数无界变亮。阈值附近使用冻结 smoothstep 和 world-space macro 打散人工等高线。

道路必须读取真实道路 mask；river-bed、wet-bank 和 gravel 必须读取真实水系/岸距/河床字段。禁止用只覆盖中心 2048 的静态低分辨率 texture 代替完整 6144 世界查询。

`getProbe(x,z)` 返回的 layer weights、roughness、AO 和 dominant layer 必须来自渲染实际使用的同一数据/公式。不得为 probe 复制一套只服务验收、与 shader 输出不同的 CPU 近似。

### 16.3 纹理采样

要求：

- 第 4.3 节九个必需 sampler 在 Balanced 的 active WebGL program 中存在且未被编译器优化掉；
- base color 设置正确 sRGB color space；
- data texture 保持 linear/no color space；
- ORM 严格使用 R=AO、G=roughness，不能让 B channel 把地形变成金属；
- normal map 方向与 Three.js 约定一致；
- forest base/normal/ORM 使用相同 world-XZ anti-tiling 变换；
- rock base/normal 使用相同 world-space triplanar 尺度和权重；
- 所有重复纹理启用合适 wrap；
- mipmap 和 anisotropy 按 renderer 能力与画质档设置；
- 不把 AO、roughness 或 mask 当颜色读取；
- KTX2 在 loader 完成配置后才请求；
- 同一路径只加载一次，多个材质共享纹理；
- Balanced/Quality 使用 2k 时，Performance 使用对应 1k 纹理；
- shader 中的纹理数量不得无视设备限制无限增长。

必须使用第 0.5.1 节的冻结世界周期。相机移动不能改变纹理投影；chunk 原点、LOD 或浮点精度不能造成 UV 接缝。三平面权重应连续，normal 混合不能造成接缝发黑或 NaN。

只满足以下任一情况均判定贴图“未使用”：

- 只被 loader 下载但没有绑定到 active material；
- 只存在于 JavaScript 配置、测试常量或未执行分支；
- uniform 被绑定但 shader 编译后未采样；
- normal/ORM 被另一张全局 dry-grass normal 或固定 roughness 完全覆盖；
- 画质档只修改 URL 字符串但实际 GPU texture 对象不变。

### 16.4 材质可读性

从 `spawn`、`forest` 和 `vista` 机位应能读出至少四类不同地表；从 `river` 与 `lake` 应能读出湿岸和河床。不同层不是简单换颜色，roughness、normal 细节和宏观尺度也应有可见差别。

固定 ROI 要求：

- `spawn`：近景以冷湿绿色 forest-floor 为主，2 米级细节可读，无黄褐全局底色；
- `forest`：forest-floor base/normal/ORM、anti-tiling 和树冠阴影同时可读；
- `river`：dry ground → gravel → wet-bank → river-bed 连续过渡，湿岸高光强于周围干地；
- `lake`：浅岸、湿岸和湖床材质与水体透明度共同可读；
- `vista`：rock/snow 分层稳定，远景不因材质 LOD 整片跳色。

同一地面 patch 从两个相机方位观察时，dominant layer、层覆盖面积和纹理世界朝向必须保持稳定。

禁止：

- 用顶点色随机噪声冒充分层 PBR；
- 用环境光全白抹平材质；
- 在 shader 中写死固定相机坐标；
- 使用视空间 `vNormal` 决定坡度、雪、forest/rock 权重或 triplanar 权重；
- 给所有地层共享一张 dry-grass normal；
- 让 dry-grass/moss/splat 把四个近地固定 ROI 改成黄褐、干旱主题；
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

所有会影响构图、测试和实例位置的随机过程必须使用显式 seed。不得在放置逻辑中直接调用 `Math.random()`。默认 seed 固定为 `12345`，可支持 `?seed=<integer>`，但 fixed shot 和默认评测必须使用一致 seed。

随机发生器应是小而可测试的纯实现。相同 seed、世界 cell、chunk 和画质档应产生相同候选位置；画质降低时优先取稳定子集，避免每次切档整片生态重新洗牌。候选 key 必须包含世界 chunk 坐标，使 6144 全图可按需生成而不依赖生成顺序。

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

候选区域必须来自当前可见/保活世界 chunk，不得硬编码为 `x=某个局部范围,z=某个局部范围`。草实例应批量写 matrix 和必要 attribute，并将 `instanceMatrix.needsUpdate` 控制在实际变化时。风动可以通过 `onBeforeCompile` 或自定义 shader，但必须保持材质更新兼容 Three.js 当前版本。

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

方向光的 shadow camera 应围绕玩家或当前 shot 的相关区域，而不是覆盖整个 6144 世界导致近景阴影分辨率耗尽。更新 shadow camera 时应稳定 texel 对齐或使用足够迟滞，避免轻微移动造成阴影游泳。

至少保证：

- 玩家有接触阴影；
- 近景树、岩石和地形关系清楚；
- 阴影不是纯黑；
- 远景不依赖超大 shadow map；
- 透明叶片阴影不是方块；
- Performance 档阴影降级后仍保持基本空间感。

### 21.3 三档画质的最低差异

关键数值以以下冻结基线实现；允许在不降低对应档视觉和真实成本差异的前提下小幅调优：

| 类别 | Performance | Balanced | Quality |
| --- | --- | --- | --- |
| DPR 上限 | 1.0 | 1.25 | 1.5 |
| 内部分辨率范围 | 0.70–1.00 | 0.75–1.00 | 0.85–1.00 |
| 地形 segments | 128/64/32 | 256/128/64/32 | 256/128/64/32 |
| 草总可见距离 | 90 | 150 | 220 |
| 草 LOD 距离 | 16/40/90 | 28/72/150 | 36/100/220 |
| 树模型距离 | 420 | 760 | 1040 |
| 树 impostor 起点 | 150 | 220 | 320 |
| 阴影尺寸 | 1024 | 2048 | 2048 |
| 阴影作用距离 | 180 | 260 | 420 |
| 水反射 | environment | probe | planar |
| 水反射 scale | 0.5 | 0.5 | 0.5 |
| 抗锯齿 | FXAA | SMAA | SMAA |
| GTAO | 关闭 | 半分辨率 6 samples | 全分辨率 12 samples |
| 空气透视 | 关闭或简化雾 | 开启 | 开启 |
| 纹理档 | 1k | 2k | 2k |

切档要求：

- 不刷新页面；
- 不重新下载已缓存的相同资产；
- 不泄漏旧 geometry、material 或 render target；
- 不导致玩家位置、seed 或水体时间重置；
- HUD 标签和真实配置一致；
- `getMetrics()` / `getSceneSummary()` 中的 drawing buffer、terrain LOD histogram、active grass/tree LOD、shadow、water mode、post passes 和 texture tier 能观察真实变化；
- Quality 的实际成本不能低于 Performance 却只换一个名字。

每个 preset 字段必须有真实运行时消费者。只在配置和单元测试中出现、运行时从不读取的 `grassDistance`、`treeDistance`、texture tier、water quality、reflection 或 post-processing 字段均视为未实现。只改变水纹速度不算提高水体渲染成本。

### 21.4 性能目标

评测基准固定为 CSS 1280×720、Balanced、默认 seed 和：

```text
?shot=vista&quality=balanced&seed=12345&capture=0
```

等待 `ready` 后预热 5 秒，再让候选 metrics 与 evaluator RAF 在同一个连续 10 秒窗口同步采样。性能采样使用正常推进的 simulation time，不能使用冻结动画的 capture 模式。

目标：

- 在满足第 0.5 节视觉下限后，平均 FPS ≥ 35，争取 ≥ 45；
- 1% low 尽量 ≥ 24 FPS；
- 帧时间无持续周期性大尖峰；
- 场景稳定时不每帧分配大量对象或重建实例；
- draw calls、triangles 和 active instances 与可见内容相符，不为追求低数值删除场景层次；
- active textures 和 programs 保持有解释的有限数量；
- 画质切换五次后资源计数不持续单调增长；
- 连续游玩十分钟不出现明显内存爬升、WebGL error 或崩溃。

这些是桌面独显目标，不是所有机器上的硬失败线。视觉等价门槛先于性能排名；通过视觉门槛后，相同画质下更低的 draw calls 和 frame time 才构成优势。若当前环境无法准确计时，仍须提供 renderer.info 和采样方法，不得编造数字。

移动和物理可以使用 clamp 后的 simulation delta；FPS、p95、1% low 和长帧统计必须使用原始 RAF timestamp。不得先把真实帧间隔 clamp 到 50ms 再计算 FPS，否则会系统性高估慢帧性能。

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
10. 倾斜高度场 normal 和 slope 方向合理；
11. 完整世界边界为 `±3072`；
12. 中心外坐标不会被 clamp 到 `height.webp` 边缘；
13. 九个 terrain cell 的 row/column/id 映射正确；
14. 中心与外围过渡带高度连续；
15. `nine-grid-height.png` 的尺寸和宏观九宫格关系正确。

### 23.2 河网和河带

至少包括：

1. 每个 source 能沿下游到达 terminal lake；
2. 不存在循环和悬空下游 ID；
3. 所有河段水位不逆坡；
4. 中心网络恰有五个冻结 source、四个 confluence 和十条入湖 reaches；
5. 高山湖的入口和出口属于同一个冻结 lake，并落在岸线容差内；
6. 瀑布高度差为正且落点连接池；
7. 河带 position/uv/custom attribute 数量一致；
8. index 全部在顶点范围内；
9. triangle 面积不是零或 NaN；
10. 累计 flow coordinate 单调；
11. 左右岸距离中心方向一致；
12. 河湖端点距离在容差内；
13. 汇流节点至少有两个上游和一个下游；
14. 水域查询在中心、岸边和外部返回不同结果；
15. validator 分别拒绝 missing ID、cycle、逆坡和无法到达 terminal 的网络；
16. 河带分别覆盖直线、急弯、重复点和接近反向折返；
17. 对所有实际河段而非一个合成样例检查 attribute 和 index；
18. 每个可见水面中心与最终地形的垂直距离在设计深度范围内，水源、tarn 和湖面不得悬在地形上方数十米；
19. 瀑布 lip、四层水帘、pool 和下游主河在几何 bounds 与水位上连续；
20. 外围八套网络各自具有三源、两汇流、两湖和六河段。

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
11. 道路 mask 中心强、边缘平滑衰减；
12. 6144 世界的多个相隔单元都能生成生态，不存在只覆盖中心局部矩形的 bounds；
13. 适宜近景草地和三个树木高度带达到第 0.5 节密度下限；
14. 实际 grass manager 会按距离切换 LOD，而不是整个世界统一切档；
15. 详细树模型淡出后，远树代理仍覆盖到世界边缘。

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
3. 配置的 DPR cap、植被距离、阴影、反射和后处理实际成本逐档非递减；当设备 DPR 大于 1 时实际 drawing buffer 也能反映 cap 差异；
4. preset 对象不可被运行时意外篡改；
5. URL 参数解析；
6. resize 目标尺寸计算；
7. dispose 多次调用安全；
8. loading 状态合法转换；
9. error 状态不会再被 ready 覆盖；
10. debug snapshot 不包含 NaN/Infinity；
11. 每个 preset 字段都被真实 subsystem 消费，可用 spy/adapter 证明切档后的 live state 变化；
12. texture tier 切换会改变实际纹理 URL 或已绑定纹理档；
13. water quality 会改变反射模式、target 或 shader 采样档，不能只改变速度；
14. mount → dispose → mount 不会叠加 listener、animation loop 或 GPU 资源；
15. fixed shot/capture mode 会冻结统一 simulation time；
16. metrics 使用原始 RAF delta，100ms 慢帧不能被报告成 50ms；
17. preset 的嵌套数组和对象也不可被意外修改。

### 23.6 地表材质

Node 纯函数/adapter 测试至少包括：

1. forest/rock 基础权重有限、位于 `[0,1]` 且和约为 1；
2. 同一世界点在不同 camera/view matrix 下得到相同 layer weights、dominant layer、roughness 和 AO；
3. 平缓低地以 forest-floor 为主，陡坡以 rock 为主；
4. 第 0.5.1 节五个 snow 固定验证点全部通过；
5. road、river-bed、wet-bank、gravel mask 分别只改变对应覆盖层，mask 外不污染；
6. gravel → wet-bank → water-bed → snowmelt 的覆盖顺序不可交换；
7. forest base 为 sRGB；forest normal、ORM 和所有 mask 为 NoColorSpace；
8. 合成 ORM 像素证明 R 只影响 AO、G 只影响 roughness，metalness 始终为 0；
9. 改变 forest normal 的测试输入会改变最终 normal；改变 ORM.R/G 会分别改变 AO/roughness，证明不是 unused load；
10. rock base 与 rock normal 使用相同 world-space triplanar 权重；
11. 不存在所有层共享 dry-grass normal 的 fallback；
12. forest、rock、snow、bank、bed、gravel 的冻结 world size 均生效；
13. Performance 与 Balanced 切换后实际 binding 从 1k 变为 2k；
14. 相邻 chunk 和相邻材质 LOD 的同点权重一致，颜色/roughness 差值处于第 0.5.1 节容差；
15. 所有混合 normal 都归一化且无 NaN/Infinity。

需要 renderer 的项目由第 28 节外部 harness 验证：九个 sampler 在 active program 中存在、绑定到正确 texture/colorSpace，且实际改变 shader 输出。Node 测试不得只搜索 shader 字符串或断言 URL 常量存在。

### 23.7 测试质量禁令

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

模型自写测试不能替代评测者的独立外部测试。只断言 preset 常量递增、函数存在或 `loaded=true`，不能证明真实 renderer、terrain、vegetation、water 和 post-processing 已接线。

## 24. 浏览器自动化接口与验收证据

为了让不同模型的浏览器结果可统一读取，在开发模式和 production build 中都暴露只读为主的最小接口：

```js
window.__COLD_MOUNTAIN__ = {
  version: 2,
  ready: Promise,
  getState(),
  getMetrics(),
  getSceneSummary(),
  getProbe(x, z),
  getRuntimeHandles(),
  setQuality(name),
  setShot(name),
  setTime(seconds),
  dispose()
}
```

允许增加字段，但以上语义必须成立：

- `interactive` 只表示角色和出生区已经可操作；`ready` 必须等初始 shot/出生区的核心资产、可见 chunk、材质、当前 ROI 植被和 shader warm-up 全部 settled 后才 resolve，在关键失败时 reject；
- `getState()` 返回可 JSON 序列化快照；
- `getMetrics()` 返回最近采样，不强制 renderer 同步读回 GPU；
- `getSceneSummary()` 从真实 scene、renderer、composer、manager 和资源绑定派生，不能复制 preset 常量；
- `getProbe(x,z)` 返回该点实际最终高度、normal、材质权重、水体、道路和植被排除信息；
- `getRuntimeHandles()` 在 production 中始终返回当前渲染循环实际使用的 `{ renderer, scene, camera, composer }` 对象引用；不得因 query、机器或 evaluator 身份切换到另一套对象。该接口仅供评测者只读检查；
- `setQuality()` 和 UI 使用同一实现；Promise 只能在当前 ROI 的 terrain/vegetation queue 清空、纹理与 shader ready、scene summary 已反映新档，并再渲染至少两个完整帧后 resolve；
- `setShot()` 和 URL 参数使用同一 shot registry，并返回当前 ROI 的地形、shader 和可见植被 settled 后的 Promise；
- `setTime()` 设置水、云、草、树和动画共用的 simulation time；
- `dispose()` 主要用于测试重复挂载和资源释放，不要求普通用户操作。

`getState()` 至少返回：

```js
{
  status: 'loading' | 'interactive' | 'ready' | 'error',
  quality: 'performance' | 'balanced' | 'quality',
  shot: null | '<SCENE_LAYOUT.shots 或 diagnosticShots 中的 key>',
  seed: 12345,
  player: { x, y, z },
  camera: {
    position: { x, y, z },
    target: { x, y, z },
    fov: 60
  },
  loaded: {
    terrain: true,
    player: true,
    water: true,
    grass: true,
    trees: true
  },
  settled: true,
  simulationTime: 4,
  degraded: [],
  error: null
}
```

`loaded` 和 `settled` 必须从真实资源、可见 chunk、manager queue 和 shader/render readiness 派生，不能在创建一个 group 后直接手写为 `true`。

`getMetrics()` 至少返回：

```js
{
  fps,
  frameMs,
  p95FrameMs,
  onePercentLowFps,
  framesOver33Ms,
  framesOver50Ms,
  drawCalls,
  triangles,
  geometries,
  textures,
  programs,
  pixelRatio,
  grassInstances,
  treeInstances,
  quality,
  sampleFrames,
  sampleWindowMs
}
```

metrics 使用最近 10 秒原始 RAF frame duration，未满 10 秒时使用 ready 后已有样本且至少积累 120 帧：`fps = 1000 / mean(frameMs)`，`p95FrameMs` 是升序帧时长的 95 百分位，`onePercentLowFps` 是最慢 `ceil(sampleFrames × 1%)` 帧平均时长的倒数。长帧计数与这些值必须来自同一个窗口。shot、quality、viewport 或 `visibilitychange` 改变时清空窗口，不能把旧档、后台标签页或 resize 前后的样本混在一起。

所有数值必须是有限数。ready 后 draw calls、triangles、textures、programs 和 `sampleFrames` 不得全部为 0。无信息时用明确的 `null`，不要用静默转成 0 的 helper 掩盖内部 NaN。这个接口不得允许评测直接伪造内部完成状态。

`getSceneSummary()` 至少返回：

```js
{
  drawingBuffer: {
    width,
    height,
    devicePixelRatio,
    pixelRatioCap,
    pixelRatio,
    resolutionScale
  },
  renderer: { drawCalls, triangles, geometries, textures, programs },
  terrain: {
    worldSize,
    loadedChunks,
    lodHistogram,
    nearVertexSpacing,
    triangles,
    material: {
      projectionSpace: 'world',
      materialLods: ['medium'],
      worldSizes: {
        forestFloor: 2,
        rock: 32.258,
        snow: 27,
        riverBank: 3.8,
        riverBedLongitudinal: 12,
        riverBedTransverse: 3.6,
        gravel: 5.5
      },
      boundTextures: {
        forestBase: '/assets/...',
        forestNormal: '/assets/...',
        forestOrm: '/assets/...',
        rockBase: '/assets/...',
        rockNormal: '/assets/...',
        snow: '/assets/...',
        riverBed: '/assets/...',
        wetBank: '/assets/...',
        gravel: '/assets/...'
      },
      activeSamplers: [],
      ormChannels: { ao: 'r', roughness: 'g', metalness: 0 }
    }
  },
  vegetation: {
    grassDistance,
    treeDistance,
    grassInstances,
    treeInstances,
    activeGrassLods,
    farTreeInstances
  },
  shadow: { mapSize, range, cascadeCount },
  water: { surfaceCount, reflectionMode, targetScale, sampleTier },
  post: { aaMode, aoEnabled, aoSamples, aerialPerspective, bloom, sharpen },
  textures: { terrainTier, loadedCount }
}
```

`materialLods` 返回当前可见地形真实使用的材质档集合；示例中的 `['medium']` 表示 Balanced 可以让所有几何 LOD 保持 Medium 等价材质，不要求模型机械创建三个 shader。`activeSamplers` 和 `boundTextures` 必须从 active material/program 与当前 texture 对象派生，不能复制资源清单。

`getProbe(x,z)` 至少返回以下地面材质真值：

```js
{
  worldNormal: { x, y, z },
  macro: { x, y, z, w },
  groundMask,
  material: {
    weights: {
      forestFloor,
      rock,
      snow,
      trail, // mountain road/trail
      gravel,
      wetBank,
      riverBed
    },
    dominantLayer,
    roughness,
    ao,
    metalness: 0
  }
}
```

这些结果必须来自渲染所用的相同 layer-weight 真源；若 CPU 与 GLSL 分别实现，必须通过固定 probe 交叉测试证明误差在第 0.5.1 节容差内。

### 24.1 固定机位要求

每个 product shot 与 diagnostic shot 都必须直接引用第 0.2 节冻结 registry，包含相机位置、look target 和玩家位置，不得另建一套坐标。六个 product shot 的验收内容：

| Shot | 画面中必须可见 |
| --- | --- |
| spawn | 玩家全身、近景地表、可走路径、合理第三人称尺度 |
| lake | 高山湖主体、自然岸线、湿岸、浅水湖床和入口/出口线索 |
| waterfall | 约 29 米落差、主水帘、左右细流、雾幕、瀑布池和继续向下游的水 |
| river | 冻结主河中心线、两次 Y 汇流、两侧岸线、河床、湿/碎石岸和 hero rocks |
| forest | 多树种、林缘/空地、林下草地和树冠阴影 |
| vista | 大尺度山体、天空、雾化层次和至少一个水体 |

六个 `check-*` 只供 evaluator 检查，不进入产品截图 artifact：

- `check-tarn` 必须看到 cirque tarn、上下游和高山河谷；
- 三个 `check-lowland-*` 必须分别看到对应 basin 的湖、连接河段和低地生态；
- 两个 `check-outer-*` 必须看到外围 rolling hills、foothill lake、terminal lake、河网和延续到世界边缘的植被；
- diagnostic shot 不是低配 debug scene，必须使用与正常游玩相同的 terrain、water、vegetation 和 post-processing。

固定机位：

- 不依赖前序移动；
- 刷新 URL 可直接到达；
- 不藏在地形或树冠内；
- 1280×720 下主题不被 HUD 遮挡；
- 相同 seed 和画质下截图可重复；
- `capture=1` 时相机、动画和 simulation time 完全固定；
- `setShot()` resolve 前完成该 ROI 的 LOD、植被和 shader warm-up；
- 连续两次相同 capture 的差异只允许来自 GPU 浮点和抗锯齿微小波动。

### 24.2 浏览器检查步骤

至少执行一次以下流程：

1. 用 production preview 打开默认 URL；
2. 等待 `ready`；
3. 读取 `getState()`，确认核心 loaded 标志；
4. 依次打开六个 `?shot=<name>&quality=balanced&seed=12345&capture=1&time=4`；
5. 每个 shot 等待视觉稳定，检查 WebGL 和 network console；
6. 在 `vista` 依次切换三档画质并读取 metrics；
7. resize 到 800×600、1280×720、1600×900；
8. 回到正常跟随模式，控制角色移动、旋转和缩放相机；
9. 切换标签页或模拟大 delta 后继续移动；
10. 最后再次读取状态和资源计数。

必须通过浏览器 harness 生成截图；图片内容必须来自实际 production preview，不得后期修图。截图命名：

```text
artifacts/screenshots/spawn.png
artifacts/screenshots/lake.png
artifacts/screenshots/waterfall.png
artifacts/screenshots/river.png
artifacts/screenshots/forest.png
artifacts/screenshots/vista.png
artifacts/acceptance.json
```

`acceptance.json` 至少记录 commit、浏览器尺寸、DPR、seed、time、六个 shot 状态、console/network 错误、三档 live scene summary 和真实性能采样。临时截图、失败截图和调试 crop 不应放入 `public`。构建产物不引用 `artifacts`，但 `.gitignore` 不得隐藏上述七个验收文件。

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

## 27. 工程质量子分（100 分）与通过门槛后的排名

外部评测会同时阅读代码和运行项目。只有通过第 13 节产品等价门槛的实现才进入工程质量排名。

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

对已通过产品门槛的结果，如必须显示单一数值：

```text
通过后总分 = 产品质量子分 × 30% + 工程质量子分 × 70%
```

排名先比较“是否通过产品门槛”，再比较通过后总分。若两份通过结果总分相同，依次比较：

1. 工程质量子分；
2. 正确性与跨系统数据一致性；
3. 外部变异测试；
4. Balanced 性能；
5. 产品质量最低 shot 得分；
6. 代码量更少且职责更清楚者优先。

### 27.7 总分上限规则

以下问题触发上限，避免用大量装饰性加分掩盖基础失败：

- 无法 `npm install` 或 `npm run build`：总分最高 20；
- 页面无法进入可交互状态：总分最高 25；
- 未使用指定高度图：总分最高 35；
- 世界只有 2048、缺少冻结的外围八单元：产品门槛失败；
- 冻结出生点、湖泊、瀑布、主河或终端湖任一宏观锚点错误：产品门槛失败；
- 没有可控制玩家或第三人称相机：总分最高 45；
- 水系只有矩形 plane、没有完整上下游连接：总分最高 55；
- 水体与真实地形高差明显失配、出现大面积悬浮：产品门槛失败；
- forest base/normal/ORM 或 rock base/normal 任一未进入 active terrain shader：产品门槛失败；
- 使用视空间法线决定地层、所有层共用 dry-grass normal，或 dry-grass/moss 令近地 shot 变为黄褐干旱主题：产品门槛失败；
- wet-bank、river-bed、snow、rock 仅加载但没有可观察输出：对应产品材质项记 0，若影响四个近地 shot 则产品门槛失败；
- Balanced 仍绑定 forest-floor 1k，或 texture tier 只有配置字符串没有真实 binding 变化：对应画质与材质项记 0；
- 六个 shot 任一个只显示占位几何、错误主题或严重断裂：产品门槛失败；
- 画质字段存在但无运行时消费者：对应画质项记 0；
- 运行时依赖外网：总分最高 50；
- 修改题面、AGENTS、预置资产或 evaluator 文件，或读取工作区外参考答案：本次结果无效；
- 测试或最终报告伪造：工程质量“测试质量”和“交付可信度”均记 0，并由评测者决定是否判无效。

## 28. 外部评测者统一操作规程

本节供评测者使用，实施模型不得根据机器特征动态降低内容来讨好评分。

### 28.1 环境

每个模型使用：

- 相同预置资产副本；
- 相同只读题面、冻结布局和 evaluator harness；
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

### 28.3 产品等价与浏览器验收

golden capture 使用 CSS 1280×720、设备缩放 1。清空站点缓存后首次加载一次，再热加载一次。三档 DPR/drawing-buffer 检查另开同尺寸、`deviceScaleFactor=2` 的独立页面，避免 1.0/1.25/1.5 cap 在设备 DPR 1 上都退化成相同实际值。记录：

- network 失败；
- console error/warning；
- shader compile 信息；
- `getState()`、`getSceneSummary()` 和冻结锚点的 `getProbe()`；
- 使用固定 URL、seed、time 和 production build 重新生成六个 shot 截图，不直接信任提交的截图；
- 从 production 截图额外保存 evaluator-only 材质 ROI：`spawn-ground`、`forest-ground`、`river-bank-bed`、`lake-shore-bed`、`vista-rock-snow`；
- 以同一参数打开六个 `check-*`，记录外围/低地诊断截图；这些图由 evaluator 保存，不要求候选提交 artifact；
- Balanced 预热后 10 秒 metrics；
- 三档画质 metrics 差异；
- resize 结果；
- 角色连续操作结果；
- 是否出现黑屏、闪烁、裂缝、穿地、漂浮、z-fighting。

评测者必须持有由冻结参考版本、同一浏览器配置和同一 URL 生成的六张 golden capture，以及对应的锚点/主体 ROI 清单。先逐 shot 判断：

1. 相机、玩家和关键地标是否位于冻结坐标；
2. 湖、瀑布、河、森林、远景主体是否占据与 golden 相近的画面区域和尺度；
3. 是否保留冷湿高山色调、生态密度和规定的可见层次；
4. 是否出现第 0.1、0.5 或 11 节的拒绝项。

材质 ROI 逐项对比 golden 的主色调、层覆盖面积、细节世界尺度、normal 响应和 roughness 高光；特别检查 forest-floor 是否绿色湿润、rock/snow 分层是否稳定，以及 river 的 dry ground → gravel → wet-bank → bed 是否连续。ROI 感知差异和盲评共同使用，不以单一逐像素阈值决定通过。

不得只用整图像素差决定视觉通过，因为 GPU、抗锯齿和透明排序会产生合理差异；也不得只凭“同属高山主题”判定通过。自动图像指标用于发现构图、主体面积、色调和空场景的明显偏差，最终由至少两名隐藏模型名称的评测者盲评。若只有一名评测者，使用同一显示器、随机顺序至少复看两轮。

任一 product shot 的宏观锚点错误、主题主体缺失或仅为占位几何时，先判产品门槛失败，再继续记录诊断信息；不要让其他 shot、性能或代码质量平均掉该失败。diagnostic shot 若证明中心五源网络、低地 basin 或外围世界实际缺失，同样触发布局/世界完整性门槛失败。

### 28.4 独立运行时真实性检查

评测 harness 不导入实现者的测试 helper，并独立执行：

1. 读取第 0.2 节锚点处的 `getProbe()`，将最终 terrain height、水面高度、道路和植被排除与实际截图/scene 交叉检查；
2. 在 `deviceScaleFactor=2` 页面依次切换 Performance、Balanced、Quality，等待 Promise settled，核对 drawing buffer、LOD histogram、植被距离/数量、阴影、反射、后处理和纹理档确实变化；
3. 从 `getRuntimeHandles()` 读取实际 `renderer.info`、camera matrix 和 scene，并与 `getState()`、`getMetrics()`、`getSceneSummary()` 及 canvas drawing buffer 对照；
4. 在 `?shot=vista&quality=balanced&seed=12345&capture=0` 预热 5 秒后，用独立 RAF 与候选 metrics 同步采样同一个连续 10 秒窗口；报告 FPS 与独立值偏差应不超过 10%，p95/1% low 不得使用 clamp 后的 simulation delta；
5. 连续两次打开相同 capture URL，确认状态、相机、simulation time 和 placement 可重复；
6. 检查 `setShot()` resolve 时该 ROI 已 settled，而不是随后仍大批加载或跳变；
7. 检查所有 preset 字段都有 live consumer；未接线字段按第 27.7 节处理。
8. 从 live terrain material 与 compiled WebGL program 核对九个必需 sampler、实际 texture 对象、URL、colorSpace、ORM channel 和 world-size uniform；不只信任 summary；
9. 在同一 patch 固定世界坐标、改变 camera yaw/pitch，确认 `getProbe()` 权重和画面 dominant layer 不变；
10. 在 Performance/Balanced 间切换，确认 forest 三件套的实际 GPU texture 从 1k/对应对象变为 2k/对应对象；
11. 结合 active sampler、shader source、`getProbe()` 与材质 ROI，确认 forest normal/ORM 和 rock normal 分别真实影响 normal、AO、roughness，而不是被优化掉或被固定值覆盖；
12. 检查相邻 chunk 与 LOD 边界没有材质颜色、roughness、normal 或 UV 跳变。

实现者自写的测试通过、`loaded: true`、preset 常量递增或提交的 `acceptance.json` 都只是证据来源，不能替代上述独立检查。

### 28.5 代码审阅

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

### 28.6 变异检查

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
- [ ] 使用 `nine-grid-height.png` 或等价确定性计划形成完整 6144×6144 九宫格；
- [ ] 中心单元、外围八单元、384 过渡带和 256 世界边缘均存在且连续；
- [ ] 特殊低地编码正确；
- [ ] 世界/图片 Z 方向正确；
- [ ] 网格、玩家、相机和生态共用高度真源；
- [ ] Balanced 近景 1/2/4/8 米 LOD、河湖 ROI detail floor 和动态焦点真实生效；
- [ ] 地形 LOD 有真实成本差异且无明显裂缝或外围拉伸；
- [ ] 冻结出生点和六个 shot 的角色/相机/target 坐标来自同一 registry；
- [ ] 玩家约 1.8 高、脚底贴地；
- [ ] idle/walk 平滑；
- [ ] 相机不穿地；
- [ ] 地图边界有效。

### 水系

- [ ] 中心水系是冻结的五源头、四个 Y 汇流、cirque tarn 和十条入湖河段；
- [ ] 八个外围单元各有三源、两汇流、六河段和两湖；
- [ ] tarn、高山湖、出口、瀑布、池、主河和终端湖完整；
- [ ] 湖、瀑布、池、主河和终端湖使用第 0.2 节冻结锚点、水位和尺度；
- [ ] 下游水位不升高；
- [ ] 所有水面与最终地形的垂直误差处于设计深度范围，不存在数十米悬浮；
- [ ] 河带真实弯曲且 attributes 合法；
- [ ] 河床下挖和岸线连续；
- [ ] 河湖、汇流和瀑布接口无明显空洞/叠层；
- [ ] 瀑布具备主帘、左右细流、雾幕、唇部泡沫、池面和雾沫，不是四顶点 plane；
- [ ] 水深、Fresnel、高光、流动和泡沫可读；
- [ ] 泡沫有动机且不均匀铺满。

### 生态与道路

- [ ] 草真实使用 VarA–VarF 与 LOD0–LOD2；
- [ ] 草、树、岩石使用实例化或等价批处理；
- [ ] 树使用多个普通变体；
- [ ] 固定 seed；
- [ ] 草木避开水、道路和陡壁；
- [ ] 草/树候选覆盖完整 6144 世界，fixed shot 内密度达到第 0.5 节下限；
- [ ] 草和树有随玩家/shot 更新的 LOD、距离衰减和远树轮廓；
- [ ] 风动从根部固定；
- [ ] 岩石接地且水中石影响白水；
- [ ] 步道连接出生区与高山景点；
- [ ] 低地道路存在且自然。

### 地面材质

- [ ] 冻结九个 sampler 均为 active shader input，不是只加载不用；
- [ ] forest base/normal/ORM 使用同一 world-XZ anti-tiling 和正确 1k/2k 档；
- [ ] rock base/normal 使用相同 world-space triplanar 投影；
- [ ] ORM 使用 R=AO、G=roughness，地形 metalness 始终为 0；
- [ ] layer selection、snow slope 和 triplanar 权重只使用世界空间 normal；
- [ ] 不同 layer 没有共用一张全局 dry-grass normal；
- [ ] forest `2`、rock `32.258`、snow `27`、bank `3.8`、bed `12/3.6`、gravel `5.5` 世界尺度生效；
- [ ] 基础层只有 forest-floor ↔ rock，dry-grass/moss/splat 未改变冻结主地面；
- [ ] snow、trail、gravel、wet-bank、water-bed、snowmelt 以冻结顺序覆盖；
- [ ] `spawn`、`forest`、`lake`、`river` 地面保持冷湿绿色，不呈黄褐干旱主题；
- [ ] wet-bank roughness 低于周围干地，river-bed、gravel、snow 的 normal/roughness 差异可读；
- [ ] 相机旋转、chunk 边界和材质 LOD 切换不会改变 dominant layer 或产生色跳。

### 视觉与性能

- [ ] Balanced 相机、曝光、天空、雾、太阳和半球光使用第 0.4 节冻结基线；
- [ ] 天空、云、暖阳、冷阴影和空气透视成立，无巨大半透明天体；
- [ ] 阴影稳定且叶片不是方块；
- [ ] 后处理克制；
- [ ] 三档画质真实改变成本；
- [ ] resize 更新所有目标；
- [ ] Balanced metrics 为真实采样；
- [ ] 热路径无明显每帧重建；
- [ ] 反复切档资源计数稳定。

### 验证与报告

- [ ] 六个冻结 shot 可用固定 seed/time/capture URL 直接打开；
- [ ] 六个 `check-*` diagnostic shot 可直接打开并显示真实中心/低地/外围系统；
- [ ] 六张 1280×720 production 截图和 `artifacts/acceptance.json` 存在；
- [ ] `window.__COLD_MOUNTAIN__` v2 的 state、metrics、scene summary、probe、runtime handles、quality、shot 和 time 接口可用；
- [ ] 默认和六个 shot 均检查 console/network；
- [ ] `setQuality()` 和 `setShot()` 在 live runtime settled 后才 resolve；
- [ ] 外部采样确认 metrics 使用原始 RAF，而非 simulation delta；
- [ ] 测试覆盖关键边界而非字符串；
- [ ] 无阻断 TODO；
- [ ] 最终报告列出真实限制；
- [ ] 没有声称未验证的指标；
- [ ] 代码中没有针对评分接口伪造状态。

现在开始执行。先确认当前工作区中的预置资源可用，然后按第 14 节阶段顺序直接实现、验证并交付项目。
