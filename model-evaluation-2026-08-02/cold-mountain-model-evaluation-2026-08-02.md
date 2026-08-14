# Cold Mountain 多模型实现评测报告（全量复核 + DeepSeek 0814 Codex 增补版）

> 评测日期：2026-08-02
> 增补复测：2026-08-13（DeepSeek V4 pro 0813，`pro-0813@b920c68`）
> 最新增补：2026-08-14（DeepSeek V4 Pro 0814 + Codex，`/Users/likai.lear/Desktop/my-example-codex-ds`）
> 目标规范：`project-prompt.md`
> 统一运行参数：`?shot=vista&quality=balanced&seed=12345&capture=0&debug=1`
> 统一视口：1280 × 720 CSS
> 评测环境：Node.js 24.13.1、npm 11.8.0

## 结论摘要

本报告在既有全量复核基础上新增 **DeepSeek V4 Pro 0814 + Codex**。精确依据为 `/Users/likai.lear/Desktop/my-example-codex-ds` 当前未提交目录，源码指纹为 `a95d58d7442dca11d1f2344ba8d25f5502596f8828f009441e7e659543c72251`。本轮重新执行干净依赖安装、36 项测试和生产构建，并以 1280×720、Balanced、固定 `vista`、`spawn`、`waterfall`、`forest` 机位核对浏览器画面、WASD 输入和 15 次连续 HUD 性能窗口。评分仍为四个一级维度完全等权：**指令遵循度 25、代码逻辑 25、视觉效果 25、性能帧率 25**。

`main` 只作为最佳视觉效果标杆，用于帮助判断其他实现与目标成片效果的距离；它不参与排名，不计算总分，也不进入任何评分明细。

计分候选排名为：

1. **GPT 5.6 Sol xhigh（78.0）**：冻结布局、水文、固定机位、第三人称和 metrics 交付完整，约 307.9 万三角形下仍保持 66.8 FPS；主要扣分是项目 grass GLB 虽加载却没有用于绘制，最终以程序化锥体草替代，水系也偏直、偏亮。
2. **GPT 5.6 Luna Max（69.0）**：指定资产、冻结布局、水文和第三人称框架覆盖较全，宏观画面可读；湖河边界、瀑布和 T-pose 仍未过产品门槛，renderer 统计也失真。
3. **DeepSeek V4 Flash max（62.25）**：系统拆分和水文代码较强，约 2154 万三角形的可见负载为所有候选中最高，性能负载分据此上调；但实际 `spawn` 仍是第一人称、看不到角色，大量树木横倒或悬浮，第三人称子项记 0 分。
4. **GPT 5.5 xhigh（59.0）**：实际绘制了项目树木、全部草模型与草贴图，5173 实测裸 FPS 很高；但最终画面没有形成地形层级，水体又出现过曝、同心层叠、深度遮挡错误。核心场景交付与测试防线同时失败，地形和水系均记 0 分，代码从严扣分。
5. **DeepSeek V4 Pro High + DeepSeek Harness（55.75）**：冻结布局、水文和工程拆分较完整，角色正常显示，稳定 `vista` HUD 为 180 FPS；但画布没有可聚焦入口，WASD 完全不移动，草和树始终没有进入最终帧，v2 API 在超过 145 秒后仍未挂载，湖河与瀑布也保留明显占位几何感。高帧率建立在约 19.6 万三角形、无植被的低负载画面上。
6. **DeepSeek V4 Pro 0814 + Codex（53.25）**：冻结布局、双高度图、水文、指定资产路径和工程拆分完整，36/36 测试与生产构建均通过；但运行时把 `probe.material.dominantLayer` 错读成 `probe.dominantLayer`，草和树候选因此全部被拒绝。canvas 没有 `tabindex`，WASD 无位移；角色保持 T-pose，湖泊、河带和瀑布仍是明显占位几何。稳定 `vista` 的 75 FPS 只对应缺植被画面。
7. **GPT 5.6 Luna Medium（52.0）**：第三人称与基本固定机位可运行，帧率高；代码和画面仍是强简化原型，等价可见负载很低。
8. **GLM 5.2 xhigh（48.75）**：表面 FPS 很高，但水体 shader、ready 初始化和地形孔洞均有运行时错误，角色也是 T-pose；高帧率主要建立在缺失负载上。
9. **DeepSeek V4 pro 0813（47.0）**：冻结布局和固定镜头覆盖较全，静态 `vista` 窗口为 98.9 FPS；但 WASD 无法移动角色，画质明显模糊，转动视角后才逐块补渲染，水体几何持续 `NaN`，植被最终帧完全缺失。静态高 FPS 不能代表探索态性能，指令、代码、视觉和性能均进一步扣分。

9 个计分候选均未通过题面规定的产品等价门槛。该排名只评价列出的具体快照，不代表模型品牌的一般能力。`ds-harness@3763882` 对应 **DeepSeek V4 Pro High + DeepSeek Harness**；新目录对应 **DeepSeek V4 Pro 0814 + Codex**。

## 1. 模型与证据来源

| 评测项 | 对应模型 | 精确依据 |
| --- | --- | --- |
| 视觉标杆 | GPT 5.6 Sol ultra + 手动调试 | `main`，实现基线 `3c5b2ba` |
| GPT 5.5 | GPT 5.5 xhigh | `/Users/likai.lear/Desktop/5.5` 当前目录；`:5173` Vite dev 服务，构建另行通过 |
| Luna Max | GPT 5.6 Luna Max | `luna-max@ced157a` |
| Luna Medium | GPT 5.6 Luna Medium | `gpt-luna@632e8da` |
| DeepSeek | DeepSeek V4 Flash max | `codex-ds-flash@cc12c0a` |
| Sol | GPT 5.6 Sol xhigh | `/Users/likai.lear/Desktop/5.6` 当前目录；`:4174` production preview |
| DeepSeek Pro | DeepSeek V4 pro 0813 | `pro-0813@b920c68`；隔离 production preview `:4191` |
| DS Harness | DeepSeek V4 Pro High + DeepSeek Harness | `ds-harness@3763882`；production preview `:4192` |
| DeepSeek Codex 0814 | DeepSeek V4 Pro 0814 + Codex | `/Users/likai.lear/Desktop/my-example-codex-ds` 当前未提交目录；源码指纹 `a95d58d…c72251`；production preview `:4193` |
| GLM | GLM 5.2 xhigh | `feat/GLM-5-2@51c3480` |

`~/Desktop/5.5` 与 `~/Desktop/5.6` 都不是 Git 仓库，因此报告记录当前目录、运行进程与复测时间，不虚构提交号。Luna Medium 与 Luna Max 均作为独立候选保留；本报告不设置两者之间的专项演进评分。

`main` 仅保留来源信息和视觉截图，不进入后续九个候选的指令、代码、视觉、性能评分。新增目录的实现文件全部处于未提交状态，因此报告不把当前分支指针 `8dc1057` 误写成实现提交，而以绝对路径、复测日期和源码指纹锁定证据。

## 2. 评分方法

九个计分候选总分 100，四个一级维度各 25 分：

| 一级维度 | 分值 | 二级维度 | 评分原则 |
| --- | ---: | --- | --- |
| 指令遵循度 | 25 | 指定资产 7、冻结布局/水文 6、第三人称 4、固定机位/API/metrics 5、禁止项 3 | 看源码路径与最终运行结果；只写 URL 不等于成功交付 |
| 代码逻辑 | 25 | 架构职责 7、数据/算法 7、运行正确性 6、测试/可观测性 5 | 构建和单测是证据，但不能抵消浏览器 shader、ready 或资产方向错误 |
| 视觉效果 | 25 | 地形 5、水系 4.5、植被 4.5、构图/完整性 4.5、材质/光照 3.75、稳定性 2.75 | 以指定服务最终帧为主，分别观察贴图、树木、草地、河流、湖泊、瀑布和角色 |
| 性能帧率 | 25 | 稳态 FPS 10、等价可见负载 8、帧稳定性 4、指标可信度 3 | 高 FPS 不能补偿未绘制的草、水体或地形；renderer 统计失真会单独扣分 |

### 不可补偿原则

- 指令缺失在“指令遵循度”扣分；它造成的真实画面缺失可在“视觉效果”再次体现，但两处使用不同证据，不机械重复扣同一事实。
- shader 编译失败、1 call / 0 triangle 或大片黑洞意味着性能负载不等价，高 FPS 必须折价。
- 第三人称以 `spawn` 最终帧中“角色可见、跟随构图成立”为准；源码存在 `ThirdPersonCamera` 类不能替代运行结果。
- 启动或进入稳定状态的等待时间只做诊断，**完全不参与评分**；`main` 本身也约需 60 秒。
- 截图上的 HUD 是某一瞬时值；性能表使用同一连续浏览器会话中的 15 次读数均值，不从截图挑最高数字。

## 3. 总体排名

| 名次 | 对应模型 | 指令 /25 | 代码 /25 | 视觉 /25 | 性能 /25 | 总分 /100 | 产品门槛 |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | GPT 5.6 Sol xhigh | 20.5 | 20.0 | 15.5 | 22.0 | **78.0** | 未通过：指定 grass GLB 加载但未绘制，程序化锥体草替代 |
| 2 | GPT 5.6 Luna Max | 19.5 | 19.5 | 13.0 | 17.0 | **69.0** | 未通过：水体/瀑布几何化、玩家 T-pose |
| 3 | DeepSeek V4 Flash max | 15.5 | 19.0 | 11.25 | 16.5 | **62.25** | 未通过：第一人称替代第三人称、树木方向错误 |
| 4 | GPT 5.5 xhigh | 18.0 | 14.5 | 5.5 | 21.0 | **59.0** | 未通过：无有效地形层级，水面严重渲染/遮挡错误，fallback ready、T-pose |
| 5 | DeepSeek V4 Pro High + DeepSeek Harness | 15.5 | 15.5 | 8.75 | 16.0 | **55.75** | 未通过：WASD 不移动、植被未交付、v2 API 未挂载、水体占位感强 |
| 6 | DeepSeek V4 Pro 0814 + Codex | 17.0 | 16.0 | 4.75 | 15.5 | **53.25** | 未通过：WASD 不移动、T-pose、植被为 0、地形材质层级弱、水体占位化 |
| 7 | GPT 5.6 Luna Medium | 16.5 | 11.0 | 6.5 | 18.0 | **52.0** | 未通过：强简化原型、等价负载低 |
| 8 | GLM 5.2 xhigh | 15.0 | 14.5 | 5.25 | 14.0 | **48.75** | 未通过：地形黑洞、水体 shader/ready 错误、玩家 T-pose |
| 9 | DeepSeek V4 pro 0813 | 17.5 | 14.0 | 4.0 | 11.5 | **47.0** | 未通过：WASD 不移动、转向后补渲染、画面模糊、水体 NaN、植被缺失 |

## 4. 指令遵循度

### 评分明细

| 对应模型 | 指定资产 /7 | 冻结布局/水文 /6 | 第三人称 /4 | 固定机位/API/metrics /5 | 禁止项 /3 | 指令总分 /25 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| GPT 5.6 Sol xhigh | 4.5 | 5.0 | 3.5 | 4.5 | 3.0 | **20.5** |
| GPT 5.6 Luna Max | 6.0 | 4.5 | 2.5 | 3.5 | 3.0 | **19.5** |
| GPT 5.5 xhigh | 5.5 | 4.5 | 1.5 | 3.5 | 3.0 | **18.0** |
| DeepSeek V4 pro 0813 | 4.0 | 5.5 | 1.5 | 3.5 | 3.0 | **17.5** |
| DeepSeek V4 Pro 0814 + Codex | 4.0 | 5.5 | 1.0 | 3.5 | 3.0 | **17.0** |
| GPT 5.6 Luna Medium | 4.0 | 3.5 | 3.5 | 2.5 | 3.0 | **16.5** |
| DeepSeek V4 Flash max | 5.0 | 4.5 | 0.0 | 3.0 | 3.0 | **15.5** |
| DeepSeek V4 Pro High + DeepSeek Harness | 4.0 | 5.0 | 1.5 | 2.0 | 3.0 | **15.5** |
| GLM 5.2 xhigh | 4.0 | 3.5 | 2.5 | 2.0 | 3.0 | **15.0** |

### 关键核实

- **GPT 5.6 Sol xhigh 的指定草资产只做到“加载”，没有做到“用于最终渲染”。** `/Users/likai.lear/Desktop/5.6/src/scene/ColdMountainApp.js` 生成 VarA–VarF × LOD0–2 的 18 个 grass GLB URL，也加载项目 KTX2 草贴图；但 `grassRenderAssets` 随后统一改用 `THREE.ConeGeometry`，运行摘要更明确报告 `grassGeometryMode: "procedural-fallback"`。因此指定资产不能给满分，画面中密集亮绿色锥体草也与源码相互印证。
- **DeepSeek V4 Pro High + DeepSeek Harness 的冻结真源和资源路径覆盖完整，但没有完成运行交付。** `SCENE_LAYOUT`、双高度图、中心/外围水文、六个固定机位、玩家 FBX、`tree_01`–`tree_04`、`tree_spawn` 与 VarA–VarF × LOD0–2 grass GLB 均存在。实际 `forest`、`spawn`、`vista` 稳定帧却没有任何树或草；`createApp()` 在安装 `window.__COLD_MOUNTAIN__` 之前无超时地等待 `vegLoadPromise`，本轮超过 145 秒仍无 v2 API。输入又只监听不可聚焦且没有 `tabindex`/`focus()` 的 canvas，连续 12 次 `W` 后 HUD 仍为 `x 335.0 / z -358.0`。因此指定资产、第三人称交互和 API 子项均从最终行为扣分。
- **DeepSeek V4 Pro 0814 + Codex 的冻结真源覆盖强，但运行交付存在确定性断链。** `SCENE_LAYOUT`、双高度图、中心/低地/外围水文、六个固定机位、玩家 FBX、五个树 GLB、VarA–VarF × LOD0–2 grass GLB 和项目贴图路径均存在。可是 `VegetationSystem.makeCtx()` 返回 `probe.dominantLayer`，而 `probeAt()` 实际把字段放在 `probe.material.dominantLayer`；草和树的接受条件因此永远失败。HTML canvas 又没有 `tabindex`，一次性 `canvas.focus()` 不能建立焦点，点击后 `activeElement` 仍为 `BODY`，连续 12 次 `W` 坐标保持 `x 335.0 / z -358.0`。角色可见但为 T-pose，所以指定资产与第三人称只能给部分分。
- **DeepSeek V4 pro 0813（`pro-0813`）的冻结真源覆盖较强，但交互和指定资产没有完成交付。** `SCENE_LAYOUT`、双高度图、中心/外围水文、六个固定机位、玩家 FBX、tree_01–04 以及 VarA–F × LOD0–2 grass 路径均存在；不过没有引用 `tree_spawn.glb`，植被加载又被 15 秒 `Promise.race` 提前放行，后台完成后没有触发 `rebuild()`，所以三张稳定截图都没有草和树。角色虽然可见，但用户手动操作与无固定镜头的浏览器复测均未产生 WASD 位移，HUD 在按 `W` 前后保持 `x 335.0 / z -358.0`，第三人称子项从 4.0 降至 1.5。v2 metrics 还报告 `1 call / 1 triangle`，与画面矛盾，固定机位/API/metrics 不能给满分。
- **GPT 5.5 并非完全没有使用项目草/树模型。** `src/vegetation/vegetationSystem.js` 明确列出 `tree_01.glb`–`tree_04.glb`、`tree_spawn.glb`，生成 VarA–VarF × LOD0–2 的 18 个 grass GLB URL，并使用项目 KTX2 草贴图、`GLTFLoader` 与 `MeshoptDecoder`，最终实例化几何确实来自这些资产。扣分点是交付语义：构造时先创建 fallback，延迟后才加载真实资产；应用没有等待 `vegetation.ready` 就把 grass/trees 标为 loaded，`ready` 因而不能保证最终植被已 settled。`spawn` 固定机位又被关闭深度测试的湖面严重遮挡，第三人称最终画面不完整。
- **Luna Max** 同样引用全部树和草模型，并在初始化中等待植被资产；但玩家为 T-pose，固定水体仍呈占位几何，API 中的 renderer 统计与画面矛盾。
- **DeepSeek** 的源码包含第三人称类、玩家 FBX 和冻结机位，但 live `spawn` 没有可见角色，实际体验是第一人称。因此第三人称 `/4` 记 0，而不是因源码命名给部分通过。
- **GLM** 的树/草路径和冻结布局存在；水体 attribute 缺失、ready 初始化 TDZ 及大片地形孔洞使运行契约失效。

## 5. 固定远景截图对比

下图均来自列出的精确实现，使用 `vista / Balanced / seed=12345 / capture=0`、1280×720。替换项中 4174 是 production preview，5173 是用户指定的 Vite dev 服务；其余截图沿用本轮全量复核的精确实现。截图 HUD 是截图时刻的瞬时值，性能均值见第 8 节。

![十实现 vista 对比（含 main 标杆）](comparison-vista.png)

### 直接观察

- **main**：山体、湖泊、岩石、草地、树群、湿岸和远景层次最完整；仍是实际画面的明确标杆。
- **Luna Max**：宏观山谷、树群和湖泊可读；湖岸呈折线/矩形，河流像亮青色带，水体与地形融合不足。
- **GPT 5.5**：湖泊已进入远景构图，不再是“水系缺失”；但水面过亮且环状边界明显，谷底大面积为空，树木稀疏并夹杂直立矩形块，右侧河道像笔直发光带。
- **DeepSeek**：湖泊与地形存在，但大量树木横倒、悬浮并遮挡相机；世界轴归一化失败非常明显。
- **GPT 5.6 Sol xhigh**：山谷、湖泊、瀑布、河网与树群均可读，宏观完整性明显强于先前误映射样本；湖岸仍偏多边形，河道过直、过亮，山坡水源像白线，程序化锥体草非常醒目。
- **DeepSeek V4 Pro High + DeepSeek Harness**：山体层级和岩土地表比最低分候选更可读，天空与远山也能形成基本纵深；但 `vista` 中所有树和草均缺失，湖面出现巨大的扇形硬切和矩形缺口，远处河流仍像蓝色贴片，角色在画面底部小到近乎不可读。
- **DeepSeek V4 Pro 0814 + Codex**：远山和雪线存在，但前景几乎退化成灰绿色平面；高山湖是规则圆盘，河流是细直色带，稳定帧没有任何草或树，只有零散、尺度异常的资产碎片。与源码中的完整水文和材质系统相比，最终画面完成度明显失配。
- **DeepSeek V4 pro 0813**：宏观山盆、湖泊和第三人称角色可辨识，但整体画质明显模糊，地表出现大片不连续黑斑，所有树和草都没有进入最终帧；高山支流像悬空发光细管，湖面过曝。交互转动视角时，新方向的地形还会逐块补渲染，没有达到题面的成片稳定性。
- **GLM**：大面积黑色地形孔洞，水体缺失，只剩零散植被与岩石。
- **Luna Medium**：地面极暗，河湖和道路近似平面色带，植被很少，整体是最小原型级画面。

原始截图：[`main`](screenshots/main-vista.png) · [`GPT 5.6 Sol`](screenshots/gpt-5-6-sol-vista.png) · [`Luna Max`](screenshots/gpt-5-6-luna-max-vista.png) · [`DeepSeek Flash`](screenshots/deepseek-v4-flash-vista.png) · [`GPT 5.5`](screenshots/gpt-5-5-vista.png) · [`DeepSeek Harness`](screenshots/ds-harness-vista.png) · [`DeepSeek 0814 + Codex`](screenshots/deepseek-v4-pro-0814-codex-vista.png) · [`Luna Medium`](screenshots/gpt-5-6-luna-medium-vista.png) · [`GLM`](screenshots/glm-5-2-vista.png) · [`DeepSeek Pro`](screenshots/pro-0813-vista.png)

## 6. 第三人称核验

9 个计分候选均使用冻结 `spawn` 机位截图：

![九个候选 spawn 对比](comparison-third-person.png)

- **Luna Max、GLM**：角色可见、相机属于第三人称，但角色停在 T-pose，动画交付失败。
- **GPT 5.5**：代码与相机属于第三人称，但固定 `spawn` 中过大的湖面关闭了深度测试，水面遮住角色主体，只剩 T-pose 腿部可见；按最终画面从严扣分。
- **GPT 5.6 Sol xhigh、Luna Medium**：角色可见且不是 T-pose，第三人称基本成立。
- **DeepSeek V4 Pro High + DeepSeek Harness**：角色清晰可见且不是 T-pose，固定 `spawn` 构图属于第三人称；但 canvas 没有键盘焦点入口，连续 12 次 `W` 后角色坐标完全不变，因此第三人称交互未通过。
- **DeepSeek V4 Pro 0814 + Codex**：固定 `spawn` 中角色清晰可见，镜头属于第三人称，但 `stand.fbx` 的动画没有播放，角色保持 T-pose。点击 canvas 后焦点仍在 `BODY`，连续 12 次 `W` 前后 HUD 均为 `x 335.0 / z -358.0`，因此交互同样未通过。
- **DeepSeek V4 pro 0813**：角色清晰可见且为正常站姿，固定 `spawn` 画面属于第三人称；但正常探索模式下 WASD 无法推动角色，不能判定第三人称交互通过。周围植被缺失和地表黑斑另在视觉完整性中扣分。
- **DeepSeek**：画面中没有角色，镜头是第一人称；该问题在指令遵循度和第三人称构图分别使用运行证据扣分。

原始截图：[`GPT 5.6 Sol`](screenshots/gpt-5-6-sol-spawn.png) · [`Luna Max`](screenshots/gpt-5-6-luna-max-spawn.png) · [`DeepSeek Flash`](screenshots/deepseek-v4-flash-spawn.png) · [`GPT 5.5`](screenshots/gpt-5-5-spawn.png) · [`DeepSeek Harness`](screenshots/ds-harness-spawn.png) · [`DeepSeek 0814 + Codex`](screenshots/deepseek-v4-pro-0814-codex-spawn.png) · [`Luna Medium`](screenshots/gpt-5-6-luna-medium-spawn.png) · [`GLM`](screenshots/glm-5-2-spawn.png) · [`DeepSeek Pro`](screenshots/pro-0813-spawn.png)

## 7. 视觉效果

### 视觉评分明细

| 对应模型 | 地形 /5 | 水系 /4.5 | 植被 /4.5 | 构图/完整性 /4.5 | 材质/光照 /3.75 | 稳定性 /2.75 | 视觉总分 /25 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| GPT 5.6 Sol xhigh | 4.0 | 2.5 | 1.75 | 3.0 | 2.25 | 2.0 | **15.5** |
| GPT 5.6 Luna Max | 3.5 | 2.25 | 1.75 | 2.25 | 2.0 | 1.25 | **13.0** |
| DeepSeek V4 Flash max | 3.75 | 2.75 | 1.5 | 0.0 | 2.5 | 0.75 | **11.25** |
| DeepSeek V4 Pro High + DeepSeek Harness | 3.0 | 1.0 | 0.0 | 2.25 | 1.75 | 0.75 | **8.75** |
| GPT 5.6 Luna Medium | 1.75 | 1.25 | 1.0 | 0.75 | 1.0 | 0.75 | **6.5** |
| GPT 5.5 xhigh | 0.0 | 0.0 | 1.25 | 1.0 | 2.0 | 1.25 | **5.5** |
| GLM 5.2 xhigh | 1.75 | 0.75 | 0.25 | 1.0 | 1.0 | 0.5 | **5.25** |
| DeepSeek V4 Pro 0814 + Codex | 1.5 | 0.5 | 0.0 | 1.0 | 0.75 | 1.0 | **4.75** |
| DeepSeek V4 pro 0813 | 1.5 | 0.75 | 0.0 | 1.25 | 0.5 | 0.0 | **4.0** |

### 瀑布补充证据

瀑布图用于观察落差、水幕、白水、落水潭与岩壁融合，不单独计算 FPS。

![九个候选瀑布对比](comparison-waterfall.png)

- **GPT 5.6 Sol xhigh** 能形成瀑布、落水潭、出水河道与岩壁上下文，但瀑布仍像白色平面，水面与岸线融合生硬。
- Luna Max 的瀑布近似白色竖直平面；GPT 5.5 已能拍到白色水幕、圆形落水潭和笔直出水道，但比例与材质仍像占位几何；DeepSeek V4 Flash 能看到落水结构但横倒树木严重干扰；DeepSeek V4 Pro High + DeepSeek Harness 的瀑布是单层平面水帘，落水潭与出水河呈折线多边形；DeepSeek V4 Pro 0814 + Codex 虽在源码中生成四层水帘，最终却合并成巨大的浅色平面，池面是白色圆盘、出水河是矩形色带，仍没有白水、雾沫和岸线融合；DeepSeek V4 pro 0813 的瀑布是过曝白色粗管，落水潭出现硬圆盘边界，水体几何 `NaN` 与最终画面一致；GLM 未形成有效水体主体；Luna Medium 是青色平面占位。

DeepSeek V4 Pro High + DeepSeek Harness 的冻结 `forest` 机位也未出现任何树或草，见 [`forest` 原始截图](screenshots/ds-harness-forest.png)。

DeepSeek V4 Pro 0814 + Codex 在 `forest` 机位等待约 55 秒后同样没有任何草或树，且角色仍为 T-pose，见 [`forest` 原始截图](screenshots/deepseek-v4-pro-0814-codex-forest.png)。等待时间没有扣分；稳定结果和源码字段路径错误才是扣分依据。

## 8. 性能与帧率

### 统一实测结果

每项均使用 1280×720、Balanced、固定 `vista`。达到可采样状态后在同一连续浏览器会话内读取 15 次 HUD，间隔约 1 秒。替换项严格测试用户指定服务：4174 为 production preview，5173 为 Vite dev；服务模式差异在指标可信度中披露并扣分。启动等待完全不计分。

| 对应模型 | 15 次 FPS 均值（范围） | 近似帧时间 | 可见负载/统计 | 应用错误 | 性能判断 |
| --- | ---: | ---: | --- | --- | --- |
| DeepSeek V4 Pro High + DeepSeek Harness | **180.0**（180–180） | 5.56 ms | 11 calls / 196,454 tris；无可见草和树；`:4192` preview | 控制台 0 error；v2 API 超过 145 秒仍缺失 | 裸 FPS 最高，但由约 19.6 万三角形的未完成画面取得 |
| GPT 5.5 xhigh | **141.4**（140.0–142.7） | 7.1 ms | 119 calls / 1.125M tris；场景较稀疏；`:5173` dev | 0 | 裸 FPS 很高，但不是 production preview，且可见负载较轻 |
| GLM 5.2 xhigh | **116.7**（111–125） | 8.6 ms | 水体缺失、大片地形孔洞；p95/1% low 硬编码为 0 | 水 shader + ready ReferenceError | 表面很快，但负载和指标均不完整 |
| DeepSeek V4 pro 0813 | **98.9**（98–100，仅静态 vista） | 10.24 ms | HUD 报 1 call / 1 triangle；无可见植被；视角转动后才补建地形 chunk；`:4191` preview | 重复水体几何 NaN；交互 FPS 低 | 静态窗口不能代表探索态，负载、尾稳定与统计均不合格 |
| GPT 5.6 Luna Medium | **97.8**（92–102） | 10.2 ms | 约 215 calls；场景强简化 | 0 | 原始帧率可信，等价负载低 |
| GPT 5.6 Luna Max | **85.7**（78–87） | 11.7 ms | 画面有山/水/树；HUD 报 1 call / 1 triangle | 0 | FPS 窗口可读，renderer 统计不可信 |
| DeepSeek V4 Pro 0814 + Codex | **75.0**（75–75） | 13.33 ms | 无可见草和树；地形/水体明显简化；`:4193` preview | 0 error；多 KTX2Loader warning；debug HUD 因 canvas 不可聚焦而无法切换 | 窗口稳定，但属于低等价负载，renderer 负载不可见 |
| GPT 5.6 Sol xhigh | **66.8**（66.4–67.2） | 15.0 ms | 479 calls / 3.079M tris；16,037 草实例、671 树实例；`:4174` preview | 0 | 在显著更重且较完整的可见负载下稳定运行 |
| DeepSeek V4 Flash max | **27.9**（27–28） | 35.9 ms | 精确提交验收约 470 calls / 21.54M tris | 0 | 当前最慢，且历史尾延迟较差 |

### 性能评分明细

| 对应模型 | 稳态 FPS /10 | 等价可见负载 /8 | 帧稳定性 /4 | 指标可信度 /3 | 性能总分 /25 |
| --- | ---: | ---: | ---: | ---: | ---: |
| GPT 5.6 Sol xhigh | 8.0 | 7.0 | 4.0 | 3.0 | **22.0** |
| GPT 5.5 xhigh | 10.0 | 5.0 | 4.0 | 2.0 | **21.0** |
| GPT 5.6 Luna Medium | 10.0 | 2.5 | 3.5 | 2.0 | **18.0** |
| GPT 5.6 Luna Max | 9.0 | 4.0 | 3.0 | 1.0 | **17.0** |
| DeepSeek V4 Flash max | 4.0 | 8.0 | 2.0 | 2.5 | **16.5** |
| DeepSeek V4 Pro High + DeepSeek Harness | 10.0 | 1.5 | 3.5 | 1.0 | **16.0** |
| DeepSeek V4 Pro 0814 + Codex | 8.5 | 1.5 | 4.0 | 1.5 | **15.5** |
| GLM 5.2 xhigh | 10.0 | 0.5 | 3.0 | 0.5 | **14.0** |
| DeepSeek V4 pro 0813 | 10.0 | 0.5 | 0.5 | 0.5 | **11.5** |

DeepSeek V4 pro 0813（`pro-0813`）的 15 次统一静态 `vista` 读数均值为 98.9 FPS，范围为 98–100，因此只在“静态稳态 FPS”保留 10 分；这不是完整探索态结论。用户实际转动视角时观察到明显低 FPS 和“转过去才渲染”，源码也显示 `TerrainManager` 只把当前 frustum 中的 chunk 放入 `needed`，把视野外 chunk 卸载；焦点不动时每 45 帧才重新计算一次可见集合，且每帧只构建 1 个 chunk。新视角因此必然发生延迟补建和负载突发。结合无植被、水系错误与 `1 call / 1 triangle` 失真统计，等价可见负载降至 0.5，帧稳定性降至 0.5，指标可信度降至 0.5。该项总分为 11.5，而不是把静态 98.9 FPS 当成高性能交付。

DeepSeek V4 Pro High + DeepSeek Harness（`ds-harness`）的 15 次统一 `vista` 读数全部为 180 FPS，因此稳态和窗口稳定性分别保留 10.0 与 3.5 分；但 HUD 同时只报告 `11 calls / 196,454 triangles`，最终帧完全没有草和树，负载远低于完成度较高的候选。更关键的是 `window.__COLD_MOUNTAIN__` 在超过 145 秒后仍未安装，无法读取同一实现已经编写的 p95、1% low 和实例计数。等待时间本身不扣分；扣分依据是稳定后仍缺失的植被负载与验收接口。因此等价可见负载为 1.5，指标可信度为 1.0，性能总分为 16.0，而不是按 180 FPS 直接判为第一。

DeepSeek V4 Pro 0814 + Codex 的 15 次统一 `vista` HUD 全部为 75 FPS，稳态 FPS 和窗口稳定性分别记 8.5 与 4.0；但画面在长时间稳定后依然没有草和树，湖河瀑布又是低复杂度几何，等价可见负载只能记 1.5。源码定义了 RAF metrics 和 renderer 统计，但可见 debug HUD 必须按 `H` 切换，而键盘焦点缺陷使它无法打开；本轮只能独立读取 HUD FPS，指标可信度记 1.5。性能总分为 15.5，不能把稳定 75 FPS 等同于完整场景性能。

DeepSeek 的性能分较上一版增加 2 分：其精确提交验收记录约 `21.54M triangles / 470 calls`，明显高于其他候选，因此等价可见负载由 6.5 提至满分 8.0；同一提交的 acceptance 证据可与当前 HUD 互相补充，指标可信度由 2.0 提至 2.5。由于本轮均值仍只有 27.9 FPS，且历史尾延迟较差，稳态 FPS 与帧稳定性不加分。

### 为什么 GPT 5.5 裸 FPS 更高，但性能分低于 GPT 5.6 Sol

该结果来自本轮对用户指定的两个真实服务复测：

1. GPT 5.5 的均值为 **141.4 FPS**，GPT 5.6 Sol 为 **66.8 FPS**，所以稳态 FPS 子项确实是 5.5 更高（10 对 8）。
2. GPT 5.6 Sol 同时绘制约 **3.079M triangles / 479 calls**，GPT 5.5 是 **1.125M / 119 calls**；前者三角形约 2.74 倍、calls 约 4.03 倍，而且湖、瀑布、河网、密集植被主体更完整。因此等价可见负载是 7 对 5。
3. 4174 是 production preview；5173 是 Vite dev。虽然 dev 不必然自动更快，但这意味着两项不是完全相同的服务模式，5.5 的指标可信度从 3 扣到 2，不能把 141.4 当成严格生产对照结论。
4. 两者连续 15 次读数都很稳定且无应用 error；GPT 5.6 Sol 还给出 p95 17.1 ms、1% low 45.16 FPS 和 0/50 个超过 33 ms 的帧，尾部证据更完整。

所以本报告不把“裸 FPS”与“性能实现质量”混为一谈：GPT 5.5 为 **21.0/25**，GPT 5.6 Sol 为 **22.0/25**。若要做完全同模式的绝对帧率对照，应另起 GPT 5.5 production preview 后再测；本次按用户指定的 5173 服务保留实测事实并明确边界。

## 9. 代码逻辑与工程质量

### 构建、测试和规模

九个计分候选都重新确认生产构建通过；分支测试均通过。`main` 的生产预览只用于标杆截图，不纳入本表。

| 对应模型 | src 文件 / LOC | test 文件 / LOC | 测试 | 生产 JS | 备注 |
| --- | ---: | ---: | ---: | ---: | --- |
| GPT 5.6 Sol xhigh | 25 / 1,222 | 5 / 58 | 32/32 | 910.69 kB | 构建通过；源码高度压缩，测试偏数据/纯逻辑 |
| GPT 5.5 xhigh | 28 / 4,413 | 6 / 279 | 23/23 | 914.82 kB | 构建通过，存在大 chunk 警告 |
| GPT 5.6 Luna Max | 28 / 3,108 | 4 / 150 | 15/15 | 901.16 kB | 构建通过；`npm ci` 报 1 个 high severity 漏洞 |
| GPT 5.6 Luna Medium | 11 / 566 | 3 / 68 | 8/8 | 770.73 kB | 轻量原型 |
| DeepSeek V4 Flash max | 36 / 6,529 | 7 / 564 | 41/41 | 976.88 kB | 模块边界清楚，运行结果存在 P0 偏差 |
| DeepSeek V4 Pro High + DeepSeek Harness | 29 / 4,587 | 4 / 465 | 40/40 | 792.47 kB | 构建通过；纯逻辑测试未发现 canvas 焦点、ready/API 和植被交付失败 |
| DeepSeek V4 Pro 0814 + Codex | 30 / 5,471 | 4 / 405 | 36/36 | 931.53 kB | 构建通过；测试 mock 掩盖运行时 `dominantLayer` 路径错误，也未覆盖焦点、T-pose 和最终帧 |
| DeepSeek V4 pro 0813 | 30 / 4,519 | 6 / 540 | 59/59 | 899.53 kB | 构建通过；测试过程直接输出 3 次水体几何 NaN；`npm ci` 报 1 个 high severity 漏洞 |
| GLM 5.2 xhigh | 17 / 4,193 | 8 / 917 | 74/74 | 250.62 kB | 测试最多，但遗漏浏览器 shader/TDZ 错误 |

### 代码评分明细

| 对应模型 | 架构职责 /7 | 数据/算法 /7 | 运行正确性 /6 | 测试/可观测性 /5 | 代码总分 /25 |
| --- | ---: | ---: | ---: | ---: | ---: |
| GPT 5.6 Sol xhigh | 5.5 | 5.5 | 4.5 | 4.5 | **20.0** |
| GPT 5.6 Luna Max | 6.5 | 5.5 | 4.0 | 3.5 | **19.5** |
| DeepSeek V4 Flash max | 6.5 | 6.0 | 2.5 | 4.0 | **19.0** |
| DeepSeek V4 Pro 0814 + Codex | 6.5 | 6.0 | 0.5 | 3.0 | **16.0** |
| DeepSeek V4 Pro High + DeepSeek Harness | 6.5 | 5.5 | 0.5 | 3.0 | **15.5** |
| GPT 5.5 xhigh | 6.5 | 4.0 | 1.5 | 2.5 | **14.5** |
| GLM 5.2 xhigh | 5.5 | 4.5 | 1.0 | 3.5 | **14.5** |
| DeepSeek V4 pro 0813 | 6.5 | 4.5 | 0.5 | 2.5 | **14.0** |
| GPT 5.6 Luna Medium | 3.0 | 2.5 | 3.0 | 2.5 | **11.0** |

### 主要代码判断

- **GPT 5.6 Sol xhigh**：`SCENE_LAYOUT`、双高度图、中心与外圈水文、第三人称、固定机位和 v2 API 覆盖完整，32/32 测试及实时 metrics 较强；但 1,222 行源码大量压成单行，降低可维护性，且 grass GLB“加载后不用”的语义错误没有被测试发现。
- **GPT 5.5**：模块命名和职责拆分表面完整，`SCENE_LAYOUT`、双高度图采样、terrain/hydrology/water/vegetation/third-person/quality/metrics 均有对应代码，KTX2Loader 也调用了 `detectSupport(renderer)`；但最终画面没有形成题面要求的地形层级，湖面出现严重过曝与同心层叠，`depthTest: false` 又破坏玩家和地形的遮挡关系，ready 还没有等待真实植被。23 个测试未拦住这些核心浏览器交付错误，因此数据/算法、运行正确性、测试/可观测性分别从严记 4.0、1.5、2.5。
- **Luna Max**：模块规模适中，水文、水体、瀑布、后处理和 v2 API 覆盖较全；湖岸几何、T-pose 与 `renderer.info` 采样边界说明复杂度没有完全转成运行正确性。
- **DeepSeek**：terrain/water/vegetation/debug/metrics 的职责拆分强；第三人称运行行为和树资产主轴归一化是 P0 失败。
- **DeepSeek V4 Pro 0814 + Codex**：30 个源码文件把冻结布局、高度采样、中心/低地/外围水文、地形 LOD、九层材质、植被、玩家、质量档、后处理和 RAF metrics 分开，36 个测试也覆盖高度解码、水文拓扑、河带 index、材质权重、植被密度和质量档。扣分来自四个 P0 运行缺口：`makeCtx()` 读取不存在的 `probe.dominantLayer`，使草和树接受率为零；canvas 没有 `tabindex`，`canvas.focus()` 无效，WASD 和 `H` 均无法进入输入系统；角色只加载 stand 网格却不播放 stand clip，固定画面保持 T-pose；瀑布四层源码仍输出一张巨大平面和圆盘池。测试用 mock 直接返回 `forestFloor`，恰好绕开真实 probe 数据结构，也没有浏览器级焦点、角色姿态或 settled 截图断言。架构与数据覆盖不能抵消运行正确性仅 0.5 分。
- **DeepSeek V4 Pro High + DeepSeek Harness**：29 个源码文件把冻结数据、高度采样、完整水文、地形 LOD、材质、植被、玩家、质量档和 metrics 分开，水文重采样和 40 个纯逻辑测试也比最小原型扎实；但运行链路存在两个 P0 设计错误。其一，键盘事件只绑定到既无 `tabindex` 也没有主动 `focus()` 的 canvas，源码中的移动算法因此无法从真实页面收到输入。其二，`createApp()` 先 `await vegLoadPromise`，之后才安装 `window.__COLD_MOUNTAIN__`；本轮资源请求已发出，但最终画面始终没有植被，API 超过 145 秒仍不存在。40/40 测试没有浏览器层输入、ready 超时或 settled 植被断言，水体也虽拓扑完整却仍输出硬切湖面和平面瀑布。架构不能抵消运行正确性仅 0.5 分。
- **DeepSeek V4 pro 0813**：30 个源码文件把高度场、地形 LOD、水文、材质、植被、玩家、质量档和 metrics 分开，`SCENE_LAYOUT` 也确实是唯一冻结真源；但低地 connector 把仅有两个端点水位传给多控制点重采样，后续控制点读到 `undefined`，直接生成 `NaN` 顶点。测试只断言 attribute 数量和 index 范围，没有检查 position 是否有限，因而在控制台已经报错时仍显示 59/59 通过。植被在 15 秒超时后不重建；TerrainManager 又把 frustum 直接当作常驻集合、每 45 帧更新一次且每帧只补 1 个 chunk，造成转向后补渲染。WASD 无位移也没有浏览器级输入测试。renderer 统计采样点最后只报 `1 call / 1 triangle`。这些都是核心算法、运行正确性和可观测性缺口，不能被模块数量抵消。
- **GLM**：74 个测试不能抵消 water attribute 缺失、ready Promise TDZ 和硬编码 p95/1% low；浏览器验收覆盖不足。
- **Luna Medium**：体量小、可运行，但冻结世界、水系、材质和可观测性实现均明显简化。

## 10. 分支级建议

| 目标 | 对应模型 | 原因 | 首要修复 |
| --- | --- | --- | --- |
| 纯模型结果继续迭代 | GPT 5.6 Sol xhigh | 当前指令、代码、宏观画面和重负载性能最均衡 | 真正绘制指定 grass GLB、自然化河道/湖岸、改善瀑布与水源材质 |
| 复用工程拆分思路 | GPT 5.5 xhigh | 模块边界尚可参考，但地形与水系算法不能直接复用 | 重做地形层级、水体几何/材质/深度关系，等待真实植被 ready，增加浏览器视觉回归 |
| 复用系统架构 | DeepSeek V4 Flash max | 模块边界与水文覆盖较强 | 第三人称运行行为、树/草离线主轴归一化、尾延迟 |
| 修复运行链后再评 | DeepSeek V4 Pro High + DeepSeek Harness | 冻结数据、水文与模块拆分扎实，但浏览器交付被输入焦点和植被 ready 阻断 | 为 canvas 建立焦点；API 先安装再异步 settled；为植被加载设置可观测超时/错误；重做湖岸、瀑布和河道融合 |
| 修复运行链后再评 | DeepSeek V4 Pro 0814 + Codex | 冻结数据、水文、材质和模块拆分完整，但运行时数据路径、输入与角色动画阻断交付 | 改为 `probe.material.dominantLayer` 并增加真实上下文测试；给 canvas `tabindex` 并验证 WASD/H；播放 stand/walk 骨骼动画；把瀑布和湖岸做成最终成片几何 |
| 修复后再评 | DeepSeek V4 pro 0813 | 冻结数据和模块覆盖扎实，但交互与最终画面当前不可交付 | 先修 WASD；为 connector 逐控制点插值水位并增加 finite 顶点断言；保留视野外邻近 chunk 并消除转向补渲染；植被 load 完成后重建；修正 renderer 统计采样 |
| 视觉效果标杆 | GPT 5.6 Sol ultra + 手动调试 | 当前实际画面显著领先 | 不参与计分，仅供画面对照 |

## 11. 复现过程与限制

1. 对 10 个精确来源（含不计分的 `main` 标杆）分别确认隔离目录、依赖、测试和 production build；最新增补项为 `/Users/likai.lear/Desktop/my-example-codex-ds` 当前目录。
2. 对替换项使用用户指定的运行服务：`http://127.0.0.1:4174` 对应 `/Users/likai.lear/Desktop/5.6` 的 production preview；`http://127.0.0.1:5173` 对应 `/Users/likai.lear/Desktop/5.5` 的 Vite dev。`pro-0813` 使用 `:4191` production preview，`ds-harness` 使用 `:4192` production preview，DeepSeek V4 Pro 0814 + Codex 使用 `:4193` production preview。
3. 统一打开 `vista / balanced / seed=12345 / capture=0`，视口 1280×720；达到可采样状态后，在同一浏览器会话中为每项连续读取 15 次 HUD。
4. 记录浏览器 error，并用实际画面核对 shader、draw calls、triangles 与 FPS 是否自洽。
5. 对 `pro-0813` 额外回到无固定机位的正常探索模式，核对 `W` 输入前后 HUD 坐标，并转动相机观察 chunk 补渲染和交互帧率；对 `ds-harness` 与 DeepSeek V4 Pro 0814 + Codex 点击 canvas 后连续发送 12 次 `W`，两者坐标都完全不变；新增项的 `activeElement` 明确仍为 `BODY`。
6. 打开 9 个计分候选的 `spawn` 机位，保存角色/第三人称截图；`ds-harness` 与 DeepSeek V4 Pro 0814 + Codex 另存 `forest` 机位核对植被。
7. 对照 `project-prompt.md` 与源码核查指定资产、`SCENE_LAYOUT`、双高度图、水文、固定机位、v2 API、metrics 和禁止项。

限制：

- 各实现 HUD/metrics 的内部实现不同，本报告没有把它们假设为同一个独立 RAF evaluator；因此同时保留了画面负载和指标可信度评分。
- 截图与 15 次性能窗口不是同一帧，截图 HUD 的瞬时数字可能高于或低于表中均值；分数只用连续窗口，不挑截图数字。
- DeepSeek 当前 HUD 不暴露 draw/triangle，本报告引用其同一精确提交的 acceptance 负载作为补充，并明确与本轮 FPS 分开。
- 瀑布补图用于视觉定位；本轮全量性能重测统一使用 `vista`，没有混用瀑布机位 FPS。
- 启动/稳定等待时间不评分；只有稳定后仍缺有效负载或 metrics 失真才会扣性能分。
- DeepSeek V4 Pro High + DeepSeek Harness（`ds-harness`）的等待时间没有扣分；扣分依据是超过 145 秒后仍无植被、无 v2 API，以及由 `11 calls / 196,454 triangles` 明确证实的非等价稳定负载。
- DeepSeek V4 Pro 0814 + Codex 的等待时间同样没有扣分；扣分依据是 `forest` 稳定约 55 秒后仍无草树、真实源码把 `dominantLayer` 读错层级、WASD 无位移、T-pose 和占位水体。该目录实现未提交，当前分支指针不代表本次源码，报告以目录、日期和源码指纹锁定快照。
- 5173 是 dev 而 4174 是 production preview，因此二者裸 FPS 不是严格的同服务模式 benchmark；本报告没有掩盖这一差异，而是在性能“指标可信度”中扣分，并同时比较可见负载。
- `pro-0813` 自带 `artifacts/acceptance.json` 明确说明其截图环境发生 KTX2 fallback 和植被超时；本报告没有直接采信其中“环境限制、不是运行错误”的归因，而是在当前 production preview 中重新观察最终帧与浏览器控制台。稳定后仍无植被、重复 `NaN` 和 renderer 统计失真均按交付结果扣分。

## 12. 最终结论

替换错误映射后，**真正的 GPT 5.6 Sol xhigh 以 78.0 分成为纯模型中最均衡的实现**：它在约 307.9 万三角形、479 calls 的较完整画面下稳定达到 66.8 FPS，第三人称与水文主体也成立；但 grass GLB 只加载不绘制、改用锥体草是明确的指令违背，不能因总分第一而忽略。

**GPT 5.5 xhigh 为 59.0 分，列第四**：它确实使用指定草/树资产，5173 裸 FPS 达 141.4，但场景负载明显更轻、服务还是 Vite dev；更重要的是最终地形没有可辨识层级，水面过曝、同心层叠并遮挡玩家。地形 `0/5`、水系 `0/4.5`，代码因核心算法、运行结果和测试防线同时失效降至 `14.5/25`。Luna Max 以 69.0 分居第二；DeepSeek 因 2154 万三角形的重负载证据将性能上调至 `16.5/25`，总分 `62.25`，位居第三。

**DeepSeek V4 Pro High + DeepSeek Harness 为 55.75 分，列第五**：它的冻结布局、水文和代码拆分较完整，角色模型与固定镜头也能正常显示；但 WASD 在真实页面完全失效，植被和 v2 API 均未交付，水体仍是明显占位几何。`vista` 的 180 FPS 是稳定事实，但只对应约 19.6 万三角形、11 calls 且无草无树的画面，因此性能只记 `16.0/25`，不能超过负载更完整的 GPT 5.5 或 GPT 5.6 Sol。

**DeepSeek V4 Pro 0814 + Codex 为 53.25 分，列第六**：它在冻结数据、水文拓扑、模块拆分和纯逻辑测试方面强于轻量原型，但最终产品画面没有把这些代码兑现出来。`dominantLayer` 字段路径错误直接令草和树为零，canvas 焦点缺陷令 WASD/H 失效，角色为 T-pose，湖泊与瀑布仍是圆盘和平面。15 次 `vista` 均为 75 FPS 是稳定事实，但只对应缺植被、低视觉完成度负载，因此性能记 `15.5/25`，总分仅略高于 Luna Medium。

**DeepSeek V4 pro 0813 最终为 47.0 分，列第九**：角色能显示不等于第三人称交互通过，WASD 无法移动后，第三人称指令分从 4.0 降至 1.5；转动视角才补渲染、交互 FPS 低、整体模糊，使视觉降至 `4.0/25`，性能降至 `11.5/25`。静态 `vista` 的 98.9 FPS 仍作为原始事实保留，但它建立在植被缺失、错误水系和视角外 chunk 被卸载的非等价负载上，不能补偿探索体验失败。

**DeepSeek 因第一人称替代第三人称被明确扣分**，第三人称子项为 0；GLM 的高 FPS 仍因 shader 与地形负载缺失而折价。Luna Medium 保留为独立候选，但其高 FPS 主要来自简化场景。

`main` 继续只作为最佳视觉效果标杆，不与九个候选计算分数。若后续希望形成严格的性能第二轮，应把 GPT 5.5 也启动为 production preview，再由统一外部 RAF evaluator 在等价画面下复测；DeepSeek V4 Pro 0814 + Codex 必须先修复 `dominantLayer` 数据路径、canvas 焦点、角色动画和水体成片质量；`ds-harness` 必须修复 canvas 焦点、API 安装顺序和植被 settled；DeepSeek V4 pro 0813（`pro-0813`）则必须修复 WASD、视角转向补渲染、connector 水位插值、植被 settled/rebuild 和 renderer 统计。完整可交互画面出现前，不应把这些实现的静态 FPS 与其他实现直接比较。

---

机器可读评分数据见 [`data/results.json`](data/results.json)，对比图生成脚本见 [`data/build_comparisons.py`](data/build_comparisons.py)。
