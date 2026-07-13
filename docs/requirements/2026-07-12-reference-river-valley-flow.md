# Reference Forest Confluence River Valley / 参考图式森林汇流河谷

## Requirement / 需求

**English:** Rebuild the waterfall-downstream hero river as a terrain-integrated forest confluence valley matching the supplied reference: two narrow tributaries join a broader trunk through scour pools, while the corridor transitions from submerged bed to wet gravel, dry pale scree, and vegetation. Flow appearance must be driven by real depth, metric shoreline distance, authored velocity, riffles, junctions, and rock disturbance rather than a uniform animated strip.

**中文：** 将瀑布下游英雄河段重建为与用户参考图一致、和地形一体化的森林汇流河谷：两条窄支流通过冲刷潭汇入较宽主槽，横断面从浸水河床依次过渡到湿砾岸、浅色干砾坡和植被。水流表现必须由真实水深、米制岸距、人工流速、浅滩、汇流和岸石扰流驱动，不能继续表现为统一动画水带。

## Summary / 概要

**English:** Represent the hero trunk and its two tributaries as one compiled DAG with seamless confluence patches. Bake its asymmetric, layered corridor only into source pixels that were originally pure black, preserve every non-black decoded value, and keep mountain river carving at runtime. Use one shared flowing-river shader for the hero river, alpine network, lowland networks, and lake outlet while retaining the separate lake shader. Add deterministic sparse rock instances and a dry-gravel terrain layer only inside the authored hero corridor.

**中文：** 将英雄主槽和两条支流表示为一张编译后的 DAG 河网，并用无缝汇流补片连接。只在烘焙源原始纯黑像素内烘焙不对称分层河谷，所有非黑像素解码值保持一致，山地河网继续运行时塑形。英雄河流、山地河网、低地河网和湖口共用一套流动河流 shader，湖面仍使用独立 shader。只在英雄河谷内增加确定性的稀疏岸石实例和干砾石地形层。

## User Request / 用户需求

**English:** The user supplied an aerial reference showing a wide eroded corridor, multiple tributary confluences, dark pools, visible shallow gravel, restrained white water, irregular banks, and dense forest outside the wash zone. They requested implementation of that combined channel, terrain, and water-flow effect rather than a simple wider water surface.

**中文：** 用户提供了一张俯视参考图，其中包含宽阔冲刷走廊、多支流汇流、深色水潭、可见浅砾河床、克制白水、不规则岸线，以及位于冲刷带外的密集森林。用户要求实现这套河道、地形和水流的组合效果，而不是简单加宽水面。

## Scope / 范围

**English:**

- Keep the existing waterfall-to-terminal-lake trunk, split it at confluences near `(575,-336)` and `(633,-349)`, and add the approved western and eastern pure-black tributary routes.
- Extend the existing river-network compiler with optional wet-bank, gravel-bank, terrain-blend, flow-speed, riffle, pool, and disturbance metadata while preserving legacy definitions.
- Generate metric downstream UVs plus depth, shore-distance, flow-speed, rapid, direction, junction, fade, distance-LOD, and disturbance attributes for all flowing river meshes.
- Bake the hero river corridor from the immutable source; do not change dark-gray plateaus, mountains, unrelated lowlands, lake topology, mountain trails, gameplay water physics, or vegetation-density configuration.
- Layer `river-bed.webp`, `river-bank-rock-wet-light-alt.webp`, and `scree-alpine.webp` through separate masks. Reuse the existing rock normal only for near gravel micro-detail and use sparse `rock_02`, `rock_05`, and `rock_08` instances for silhouette detail.
- Use planar reflection only for lake surfaces. Do not add depth-texture shoreline rendering, screen-space refraction, flow-map textures, dynamic ripples, new reeds, logs, or particle systems.
- This requirement supersedes the previous prohibition on gravel sampling only inside the dedicated hero-river gravel mask. Natural ground, mountain trails, and every unrelated terrain region remain gravel-free under the prior rule.

**中文：**

- 保留现有瀑布至终端湖主槽，在 `(575,-336)` 与 `(633,-349)` 附近拆分汇流节点，并加入已批准、完全位于纯黑区域的西侧和东侧支流路线。
- 为现有河网编译器增加可选的湿岸、干砾岸、地形过渡、流速、浅滩、冲刷潭和扰流元数据，同时保持旧定义兼容。
- 为所有流动河流网格生成米制下游 UV，以及水深、岸距、流速、急流、流向、汇流、渐隐、距离 LOD 和扰流属性。
- 从不可变烘焙源生成英雄河谷；不得修改深灰台地、山体、无关低地、湖泊拓扑、山路、游戏水体物理或植被密度配置。
- 通过独立遮罩分层使用 `river-bed.webp`、`river-bank-rock-wet-light-alt.webp` 和 `scree-alpine.webp`。Near LOD 只复用现有岩石法线提供砾石微细节，并用少量 `rock_02`、`rock_05`、`rock_08` 实例提供真实轮廓。
- 平面反射只用于湖面。不增加深度纹理岸线、屏幕空间折射、flow-map 贴图、动态涟漪、新芦苇、倒木或粒子系统。
- 本需求仅在英雄河流专用干砾石遮罩内取代旧需求中禁止 gravel 采样的限制。自然地面、山路和所有无关地形仍继续遵守原有限制。

## Acceptance Criteria / 验收标准

**English:**

- The hero definition has one terminal sink, two three-way confluences, monotonically descending water levels, five reaches, and the approved corridor dimensions and riffle ranges.
- Baking is deterministic, modifies only source-black pixels, keeps every non-black decoded pixel identical, keeps beds at or above `0m`, and keeps the baked lowland maximum at or below `18m`.
- The shared cross-section produces a submerged bed, wet bank, dry gravel bank, vegetation exclusion, asymmetric bend response, low-frequency bank breakup, and smooth return to the original terrain from one query.
- Every flowing mesh exposes the complete geometry-attribute contract; downstream meters increase continuously, flow vectors are normalized, junction patches have no holes or reversed triangles, and visible water remains above the rendered terrain.
- Pools are darker and slower; riffles are shallower, faster, and show broken downstream white water; static shore foam is faint; obstacle wakes follow the downstream direction; river reflections never select planar mode.
- Dry gravel is sampled only through the hero gravel mask. Near terrain receives micro-normal detail, while medium and far variants retain color and masks without extra normal work.
- River water stays below `40k` triangles with no more than five flowing-water draw calls and two shared flowing-water materials; river dressing uses no more than three instanced-rock draw calls.
- The three reference cameras verify the overhead confluence, close bank transition, and downstream flow. `npm test`, `npm run check:lowlands`, and `npm run build` pass, and Balanced visual performance does not regress by more than ten percent against the existing benchmark.

**中文：**

- 英雄河网只有一个终端汇点、两个三向汇流节点、水位沿下游单调下降，共五条河段，并采用已批准的河谷尺寸和浅滩区间。
- 烘焙具有确定性，只修改源图纯黑像素，所有非黑像素解码值一致，河床不低于 `0m`，烘焙后低地最高不超过 `18m`。
- 同一横断面查询同时产生浸水河床、湿岸、干砾岸、植被排除、弯道不对称、低频岸线扰动，以及平滑回到原地形的过渡。
- 每张流动河流网格都提供完整几何属性；下游米制坐标连续增加、流向为单位向量、汇流补片无孔洞和反面，所有可见水面高于渲染地形。
- 深潭更暗更慢；浅滩更浅更快，并显示断续的顺流白水；静态岸泡克制；石后尾流沿下游方向；河流反射永不使用 planar 模式。
- 干砾石只通过英雄河谷遮罩采样。Near 地形具有微法线细节，Medium 与 Far 只保留颜色和遮罩，不增加法线开销。
- 河流水面低于 `40k` 三角形，流动河流 draw call 不超过五个、共享流动材质不超过两个；岸石摆件不超过三个实例化 draw call。
- 三个参考机位分别验证俯视汇流、近景岸带和下游流向。`npm test`、`npm run check:lowlands`、`npm run build` 全部通过，Balanced 视觉性能相对现有基准退化不超过百分之十。
