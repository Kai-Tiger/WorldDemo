# Waterfall Color and Y Junctions / 瀑布颜色与 Y 形交汇

## Requirement / 需求

**中文：** 修复瀑布上游水带变成纯黑色的回归，并将 hero 河流的 J1/J2 交汇改为三条河臂直接连接的 Y 形，不再生成圆形水潭。

**English:** Fix the regression that turned the water above the waterfall solid black, and change hero-river junctions J1/J2 into direct three-arm Y connections without circular pools.

## Summary / 概要

**中文：** 为湖泊出口网格补齐共享流水材质要求的流动坐标与交汇流向属性，避免零向量归一化污染水面颜色。交汇水面以相邻河岸端点之间的直线 chord 替代固定半径圆弧，同时把河床、地形雕刻和材质遮罩限制为三条河臂的联合 Y 形范围，并在 chord 补片下局部加宽河床以避免水面穿地；中心深度和流速直接延续下游河段，砾石岸在节点收窄，不再形成静水池外观。

**English:** Supply the lake-outlet geometry with the flow coordinates and junction direction required by the shared flowing-water material so zero-vector normalization cannot corrupt its color. Replace fixed-radius junction arcs with straight bank chords, constrain riverbed, terrain carving, and material masks to the union of the three river arms, locally widen the bed beneath the chord patch to prevent terrain penetration, continue downstream depth and speed through the center, and taper gravel banks into the node instead of presenting a still-water pool.

## User Request / 用户需求

**中文：** 用户反馈瀑布已经变黑，并明确要求河流交汇处直接分叉，不要圆形水潭。

**English:** The user reported that the waterfall had turned black and explicitly requested direct river branching at confluences with no circular pool.

## Scope / 范围

**中文：** 仅修改共享出口河带的顶点属性、hero 交汇补片边界、交汇水材质表现、J1/J2 河床与地形遮罩、节点岸带收口、确定性高度图、对应视觉检查视角和针对性测试。保留真实湖泊、瀑布下方消力潭、河网路径、角色控制和植被配置。

**English:** Change only the shared outlet-strip attributes, hero junction-patch boundaries, junction water appearance, J1/J2 riverbed and terrain masks, node bank taper, deterministic heightmap, the corresponding visual-check camera, and targeted tests. Preserve real lakes, the waterfall plunge pool, river paths, player controls, and vegetation configuration.

## Acceptance Criteria / 验收标准

**中文：**

- 湖泊出口提供有限的 `flowUv` 和单位长度 `junctionFlowDirection`，与共享流水材质的完整属性契约一致；固定瀑布视角中不再出现纯黑水面。
- J1/J2 的交汇边界顶点位于相邻河岸端点的 chord 上，不存在固定半径圆弧；补片三角形保持朝上、面积守恒、三臂端面不相交，完整二维流动 Jacobian 不高于普通河段。
- 每个交汇的三条河臂遮罩保持高覆盖，最大臂间楔形保持低覆盖；地形和河床不再使用整圆 footprint，砾石岸在节点收窄。
- 交汇中心深度与流速延续下游河段；真实高度图下对每个补片三角形进行内部密采样时，所有可见样本保持至少 0.08 米净空，透明边界只允许有限的贴岸埋入。
- 真实湖泊与瀑布消力潭仍为圆形水体，不受 J1/J2 交汇改动影响。
- 全量自动化测试、确定性低地烘焙检查、生产构建和浏览器视觉复查通过。

**English:**

- The lake outlet supplies finite `flowUv` values and unit-length `junctionFlowDirection` values, satisfying the complete shared-water material contract; the fixed waterfall view contains no solid-black water.
- J1/J2 connector vertices lie on chords between adjacent bank endpoints with no fixed-radius arcs; patch triangles remain upward-facing and area-preserving, arm endpoint rows do not intersect, and the full two-dimensional flow Jacobian does not exceed ordinary strips.
- All three river arms retain high mask coverage while the largest wedge between arms stays low; terrain and riverbed no longer use a circular footprint, and gravel banks taper into each node.
- Junction-center depth and speed continue from the downstream reach; dense interior samples across every patch triangle retain at least 0.08 meters of visible clearance against the real heightmap, while transparent boundaries have only bounded bank contact.
- Real lakes and the waterfall plunge pool remain circular water bodies and are unaffected by the J1/J2 junction change.
- The complete automated test suite, deterministic lowland bake check, production build, and browser visual review pass.
