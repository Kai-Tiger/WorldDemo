# Requirement / 需求

- English: Deepen the entire main river downstream of the waterfall through the terminal lake approach.
- 中文：加深瀑布出口至终点湖前的整条下游主河。

## Summary / 概要

- English: Set all three main-river reaches to a 1.5–1.6 meter authored depth and reduce main-river riffle shallowing so the active channel remains at least about 1.4 meters deep.
- 中文：将三段主河的设定深度统一到 1.5–1.6 米，并减弱主河急流的变浅效果，使活动河槽水深维持在约 1.4 米以上。

## User Request / 用户需求

- English: Apply the deeper channel to the full downstream river, not only the short reach immediately below the waterfall.
- 中文：加深范围应覆盖整条下游河道，而不只是瀑布出口紧邻的一小段。

## Scope / 范围

- English: Change `hero-main-upper` to `[1.6, 1.6]`, `hero-main-middle` to `[1.6, 1.6]`, and `hero-main-lower` to `[1.6, 1.5]`; reduce riffle depth loss to 10% for main reaches while retaining 40% for tributaries; rebake the deterministic terrain heightmap and update direct regression coverage. Preserve water levels, widths, the plunge pool, terminal lake, and the existing middle/lower bank profiles. Keep the previously steepened banks only on the upper reach. No public API or data structure changes.
- 中文：将 `hero-main-upper` 调整为 `[1.6, 1.6]`、`hero-main-middle` 调整为 `[1.6, 1.6]`、`hero-main-lower` 调整为 `[1.6, 1.5]`；主河急流深度削减改为 10%，支流保持 40%；重新确定性烘焙地形高度图并更新直接相关的回归覆盖。水位、河宽、瀑布潭、终点湖以及中下游现有岸坡参数保持不变，先前加陡的河岸只保留在上游段。无公共 API 或数据结构变更。

## Acceptance Criteria / 验收标准

- English: Calm water, riffles, and representative points across all three main reaches retain at least 1.4 meters of actual thalweg depth and no more than 1.6 meters; fastest main-river riffles remain about 1.46 meters deep; confluence endpoint depths are continuous; beds remain non-negative and below water surfaces; rock placement, visible gravel banks, deterministic baking, full tests, production build, and waterfall/main-river visual regression all pass.
- 中文：三段主河的平缓区、急流区及代表性位置的实际深泓水深均不低于 1.4 米且不高于 1.6 米；最快主河急流约 1.46 米深；汇流端点深度连续；河床高度非负且低于水面；岩石摆放、可见砾石岸、确定性烘焙、全量测试、生产构建以及瀑布与主河视觉回归全部通过。
