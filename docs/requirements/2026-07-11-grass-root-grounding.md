# Requirement / 需求

Ground every grass clump reliably so authored roots sit slightly below the visible terrain and remain fixed while the blades sway.

让每丛草可靠贴地，使作者设定的根部略微进入可见地形，并在草叶摆动时保持固定。

# Summary / 概要

Preserve the ribbon-grass assets' authored `Y=0` root plane instead of lifting their lowest drooping leaf tip to zero, and add a configurable embed depth that keeps roots below the terrain.

保留 Ribbon Grass 资源原有的 `Y=0` 根面，不再把最低的下垂叶尖抬到零点，并增加可配置的埋入深度，使根部保持在地表以下。

# User Request / 用户需求

The user reported that many grass roots did not enter the ground and that some clumps visibly floated above the terrain, then asked to implement the proposed correction.

用户反馈许多草根没有进入地面，部分草丛明显悬空，并要求开始实施修复方案。

# Scope / 范围

Update grass geometry normalization, root-height sway weighting, focused tests, and configuration. Keep terrain sampling, grass density, distribution, random scale, LOD distances, materials, draw calls, tree placement, leaf decals, and terrain mesh generation unchanged. Rendered-triangle matching, multi-point footprint correction, and terrain/LOD re-projection are excluded for a separate lifecycle-aware change.

更新草模型归一化、根部摆动高度权重、针对性测试及配置。保持地形采样、草地密度、分布、随机缩放、LOD 距离、材质、Draw Call、树木放置、落叶贴花和地形网格生成不变。渲染三角面匹配、草丛足迹多点修正及地形或 LOD 变化后的重新投影留待具备完整生命周期处理的独立改动。

# Acceptance Criteria / 验收标准

- All grass LODs preserve the authored root plane and apply the shared configurable embed depth.
- Drooping geometry below the root plane does not lift a clump, and every vertex at or below the terrain has zero sway weight.
- Grass placement keeps the existing single analytic terrain sample and normal-alignment behavior.
- Existing grass density, distribution, visual materials, LOD behavior, and draw-call count remain unchanged.
- Focused tests, the full test suite, and the production build pass.

- 所有草地 LOD 都保留作者根面，并使用同一项可配置埋入深度。
- 根面以下的下垂几何不会再抬高整丛草，所有位于地表或地表以下的顶点摆动权重均为零。
- 草地放置保持现有的单次解析地形采样和法线对齐行为。
- 现有草地密度、分布、视觉材质、LOD 行为和 Draw Call 数量保持不变。
- 针对性测试、完整测试套件和生产构建全部通过。
