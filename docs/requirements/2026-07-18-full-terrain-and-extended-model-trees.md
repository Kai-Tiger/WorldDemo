# Full Terrain and Extended Model Trees / 全地形与扩大模型树范围

## Requirement / 需求

中文：进入场景前加载完整地形，并让中远景继续使用真实树模型，避免明显的地形分块补载和过早出现简化树木轮廓。

English: Load the complete terrain before entering the scene and retain real tree models farther into the mid and far distance, avoiding visible terrain chunk pop-in and premature simplified tree silhouettes.

## Summary / 概要

中文：启动就绪条件从“出生点地形块完成”改为“全部 576 个地形块都有表面”，加载页阶段使用独立的 12 毫秒地形构建预算：出生区块保持完整细节，其余区块先创建 32 段常驻表面，并让首轮裙边按同一 8 米顶点步长采样；进入场景后再通过现有原子替换机制提升所需细节与 1 米裙边精度。同时扩大三个质量档的模型树可见距离。全图模型树会带来不可接受的实例与顶点成本，因此世界最远处继续使用现有的单批次树木轮廓。

English: Change startup readiness from “the spawn terrain chunk is complete” to “all 576 terrain chunks have a surface,” using a dedicated 12 ms terrain-build budget while the loading screen is active: the spawn chunk keeps full detail, while all other chunks first receive a resident 32-segment surface whose initial skirt uses the matching 8-meter vertex step. Those chunks refine through the existing atomic replacement path, including one-meter skirt sampling, after entering the scene. Also extend the model-tree visibility distance for all three quality tiers. Full-world model trees would impose an unacceptable instance and vertex cost, so the existing single-batch tree silhouettes remain as the world-edge fallback.

## User Request / 用户需求

中文：用户希望所有地形全部加载出来，并希望远处树木不要过早降级成不真实的 LOD；可以全部使用模型树，或者扩大 LOD 降级范围。

English: The user requested that all terrain be fully loaded and that distant trees not degrade into unrealistic LODs too early, either by using model trees everywhere or by extending the LOD degradation range.

## Scope / 范围

中文：仅修改地形启动就绪条件、首个常驻表面的构建细节及加载阶段预算、树木模型可见距离、对应自动化测试和本需求文档。不修改最终地形细节规则、树木模型资产、树木密度、放置规则、远景轮廓形状、草地、水体或无关工作区改动。

English: Change only the terrain startup readiness condition, initial resident-surface detail and loading-phase budget, model-tree visibility distances, corresponding automated tests, and this requirement document. Do not change final terrain detail rules, tree model assets, tree density, placement rules, far-tree silhouette shapes, grass, water, or unrelated workspace changes.

## Acceptance Criteria / 验收标准

中文：

- 场景初始化 Promise 只在全部 576 个地形块都有常驻表面后解决。
- 加载页阶段每帧最多使用 12 毫秒构建地形，进入场景后恢复质量档预算。
- 出生区块首次构建为 256 段，其余区块首次构建为 32 段并使用 8 米裙边采样；后续高细节与 1 米裙边替换完成前旧表面持续可见。
- 地形加载完成后没有待构建区块，且完整地图覆盖保持常驻。
- 性能、平衡和质量档的模型树距离分别扩大到 420、760 和 1040 米。
- 超出模型树范围后仍由现有远景树木批次覆盖至地图边缘。
- 相关测试和生产构建通过。

English:

- The scene initialization promise resolves only after all 576 terrain chunks have a resident surface.
- Terrain construction may use up to 12 ms per loading-screen frame and returns to the quality-tier budget after entering the scene.
- The spawn chunk initially builds at 256 segments and every other chunk at 32 segments with eight-meter skirt sampling; old surfaces remain visible until later high-detail, one-meter-skirt replacements complete.
- No terrain build tasks remain after readiness, and full-map coverage stays resident.
- Model-tree distances increase to 420, 760, and 1040 meters for performance, balanced, and quality tiers respectively.
- The existing far-tree batch continues coverage from beyond the model-tree range to the map edge.
- Relevant tests and the production build pass.
