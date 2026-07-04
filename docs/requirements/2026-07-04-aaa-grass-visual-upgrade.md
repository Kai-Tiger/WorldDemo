# Requirement / 需求

Upgrade the grass visuals in one pass so the field looks closer to a high-end game scene, with less shimmer, less overexposure, richer blade shapes, and better near/mid/far distance stability.

一次性升级草地视觉，让草地更接近高质量游戏场景，减少闪烁和过曝，增加草叶形体层次，并提升近景、中景、远景的稳定性。

# Summary / 概要

The grass system now adds wider procedural grass clump variants, stronger root and tip color shaping, calmer far-distance presentation, and a heavier anti-aliasing render pass. Far grass remains static while grass within the player interaction radius can still sway.

草地系统现在增加了更宽的程序化草丛变体、更明显的根部和叶尖颜色塑形、更稳定的远景表现，以及更重的抗锯齿渲染路径。远处草保持静止，玩家交互半径内的草仍可摆动。

# User Request / 用户需求

The user asked to implement the full grass quality plan at once, without considering performance, after noting that the current grass lacked AAA quality and distant grass had visible noise.

用户指出当前草地缺少 3A 质感、远处草有明显噪点，并要求不考虑性能，一次性实施完整草地质量升级方案。

# Scope / 范围

In scope: grass clump geometry, grass material grading, near/far grass stability, grass LOD retention, and post-processing anti-aliasing.

范围内：草丛几何、草材质调色、近远景草稳定性、草地 LOD 保留量，以及后处理抗锯齿。

Out of scope: tree visuals, enemy assets, leaf decal systems, water, terrain sculpting, and unrelated existing dirty files.

范围外：树木视觉、敌人资源、落叶贴花系统、水体、地形雕刻，以及已有的无关未提交文件。

# Acceptance Criteria / 验收标准

- The project builds successfully with `npm run build`.
- Near grass uses richer clump silhouettes instead of only thin bright lines.
- Far grass has lower contrast and remains static outside the player sway radius.
- The post-processing chain includes a heavier jittered anti-aliasing pass to reduce grass edge shimmer.
- The commit includes only files related to the grass visual upgrade and this requirement document.

- 项目可以通过 `npm run build` 构建。
- 近景草使用更丰富的草丛轮廓，而不是只有细亮线条。
- 远景草对比度更低，并在玩家摆动半径外保持静止。
- 后处理链路包含更重的抖动采样抗锯齿，以降低草边缘闪烁。
- 提交只包含草地视觉升级相关文件和本需求文档。
