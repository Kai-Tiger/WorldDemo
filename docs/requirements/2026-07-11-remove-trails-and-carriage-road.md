# Remove Trails and Carriage Road / 移除人行小道和马车道路

## Requirement / 需求

**English:** Remove every authored pedestrian trail and carriage road from the terrain while preserving the mountain ascent as an unmarked, naturally surfaced, walkable pass.

**中文：** 从地形中移除所有人工规划的人行小道和马车道路，同时将登山通道保留为没有道路标记、使用自然地表且可步行的山口缓坡。

## Summary / 概要

**English:** Delete the three authored road routes, their gravel material overlay, road geometry attributes, vegetation-clearance bands, and road-specific texture assets and loading. Extract only the existing mountain-access height grade and chunk-detail floor into a road-independent natural mountain-pass module. The retained pass continues from 0 to 28 meters and is rendered entirely by the normal grass/rock terrain blend.

**中文：** 删除三条人工道路路线及其碎石材质覆盖、道路几何属性、植被清空带，以及道路专用纹理资源和加载逻辑。仅将现有登山通道的高度塑形和区块细节下限提取为与道路无关的自然山口模块。保留的山口继续从 0 米上升至 28 米，并完全使用普通的草地/岩石地形混合材质渲染。

## User Request / 用户需求

**English:** The user chose Option A: remove pedestrian trails and carriage roads completely, including their textures, gravel resources, vegetation exclusion, and road logic, but keep the mountain approach as a natural grass-and-rock slope so the player can still walk uphill.

**中文：** 用户选择方案 A：完全移除人行小道和马车道路，包括道路贴图、碎石资源、植被排除和道路逻辑，但保留自然的草岩登山缓坡，使玩家仍可步行上山。

## Scope / 范围

**English:**

- Remove the forest trail, river-valley carriage road, and the visible road identity of the former mountain-access trail.
- Remove road route masks, lateral coordinates, terrain `roadFrame` attributes, shader overlay code, road vegetation exclusions, and road-specific LOD helpers.
- Stop exposing, loading, optimizing, or sampling the now-unused gravel albedo and normal textures, and delete those road-only assets.
- Add a minimal natural mountain-pass terrain helper that preserves the existing frozen centerline, 0-to-28-meter profile, 3-meter inner half-width, 18-meter outer blend, and 256-segment intersecting-chunk floor.
- Rename the deterministic visual check from `mountain-access` to `mountain-pass`; remove the `carriage-road` camera.
- Preserve historical requirement documents and unrelated terrain, snow, water, vegetation placement rules, lighting, player controls, and camera behavior.

**中文：**

- 移除森林人行小道、河谷马车道路，以及原登山道路的可见道路属性。
- 移除道路路线遮罩、横向坐标、地形 `roadFrame` 属性、shader 道路覆盖代码、道路植被排除和道路专用 LOD 辅助逻辑。
- 停止暴露、加载、优化或采样不再使用的碎石颜色与法线纹理，并删除这些道路专用资源。
- 新增最小化的自然山口地形辅助模块，保留现有冻结中心线、0 至 28 米高度剖面、3 米内部半宽、18 米外部混合范围，以及相交区块 256 分段的细节下限。
- 将固定视觉检查由 `mountain-access` 重命名为 `mountain-pass`，并移除 `carriage-road` 镜头。
- 保留历史需求文档，以及无关的地形、积雪、水体、植被放置规则、光照、玩家控制和相机行为。

## Acceptance Criteria / 验收标准

**English:**

- No pedestrian trail, carriage road, wheel rut, gravel strip, or road-edge transition remains visible.
- Former road areas render with the ordinary grass/rock base material and no longer suppress grass or trees through road-specific exclusion rules.
- Runtime code has no road network, authored road masks, `roadFrame` geometry/shader contract, or gravel terrain inputs, uniforms, loading, optimization entries, or texture assets.
- The natural mountain pass remains monotonic from 0 to 28 meters, keeps a sampled maximum grade of 35 degrees or less, leaves distant terrain unchanged, and retains one-meter vertices in its intersecting terrain chunk.
- The `mountain-pass` Golden Shot uses the former access-slope camera; `carriage-road` and `mountain-access` are no longer valid shot keys.
- Snow, rivers, lakes, shores, riverbeds, terrain editing, player movement, lighting, and unrelated camera shots remain unchanged.
- Targeted tests, the complete test suite, and the production build pass without shader, WebGL, or missing-resource errors.

**中文：**

- 场景中不再显示人行小道、马车道路、车辙、碎石带或道路边缘过渡。
- 原道路区域使用普通草地/岩石基础材质渲染，并且不再通过道路专用排除规则阻止草和树木生成。
- 运行时代码中不再存在道路网络、人工道路遮罩、`roadFrame` 几何/shader 接口，也不再存在碎石地形输入、uniform、加载、优化配置或纹理资源。
- 自然山口保持从 0 米到 28 米单调上升，采样最大坡度不超过 35 度，不改变远处地形，并在相交地形区块中保持一米顶点间距。
- `mountain-pass` Golden Shot 使用原登山缓坡镜头；`carriage-road` 和 `mountain-access` 不再是有效镜头键。
- 积雪、河流、湖泊、岸边、河床、地形编辑、玩家移动、光照和无关相机镜头保持不变。
- 定向测试、完整测试套件和生产构建全部通过，不出现 shader、WebGL 或资源缺失错误。
