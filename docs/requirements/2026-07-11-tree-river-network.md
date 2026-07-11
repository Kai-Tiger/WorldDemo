# Tree River Network / 树状河流水系

## Requirement / 需求

**中文：** 在现有地图中建立一套遵循真实高度场的树状山地水系。五条雪线源流应经过四个汇流节点和一个冰斗湖逐级汇入现有高山湖，并继续复用现有湖口、瀑布、主河和终端湖。

**English:** Build a terrain-following dendritic mountain river network. Five snowline headwaters must merge through four confluences and one cirque tarn into the existing alpine lake, while preserving the existing outlet, waterfall, trunk river, and terminal lake.

## Summary / 概要

**中文：** 用单一有向无环河网统一河线、水位、地形雕刻、地表遮罩、植被排除和水面几何。河流水位按实际谷线控制点单调下降，汇流处使用合并几何，避免透明水面重叠。

**English:** Use one directed acyclic river network as the source of truth for paths, water levels, terrain carving, terrain masks, vegetation exclusion, and visible water geometry. Water levels follow authored valley samples without rising downstream, and confluences use merged geometry to avoid overlapping transparent surfaces.

## User Request / 用户需求

**中文：** 用户要求开始实施此前规划的多河流树状地形和水系方案。

**English:** The user requested implementation of the previously planned multi-river dendritic terrain and hydrology layout.

## Scope / 范围

**中文：**

- 新增五个源头、四个汇流点、十条上游河段和一个冰斗湖。
- 使用真实高度场采样的控制水位，并保证所有河段下游不升高。
- 统一河床雕刻、湿岸/河床材质遮罩、草木排除和水体地形 LOD 范围。
- 将上游河段合并为一张流向正确的水面网格，并为汇流节点生成无重复覆盖的补片。
- 高坡段逐渐隐藏连续水面，以湿岩和断续急流表达；支流最多使用探针反射。
- 保留现有高山湖、湖口、瀑布、下游主河、终端湖及其外部接口。
- 不包含北部森林第二流域、动态天气、玩法或移动端专项优化。

**English:**

- Add five sources, four confluences, ten upstream reaches, and one cirque tarn.
- Use height-field-derived control levels and guarantee non-rising downstream water profiles.
- Unify bed carving, wet-bank/bed terrain masks, vegetation exclusion, and water-feature terrain LOD bounds.
- Merge upstream reaches into one flow-correct water mesh with non-overlapping confluence patches.
- Fade continuous water on steep slopes in favor of wet rock and broken rapids; cap tributaries at probe reflections.
- Preserve the existing alpine lake, outlet, waterfall, downstream trunk, terminal lake, and their external interfaces.
- Exclude the optional northern forest basin, dynamic weather, gameplay, and mobile-specific optimization.

## Acceptance Criteria / 验收标准

**中文：**

- 河网校验为单一无环树：五个源头、四个双入单出汇流点和一个最终高山湖出口。
- 每条可见河段的水位沿下游方向不升高，控制点附近水位与高度场规划一致。
- 多条河流影响同一点时只取最低目标河床，不按河段重复下挖。
- 四个汇流点没有互相叠加的独立透明水面，水流 UV 均沿上游到下游增长。
- 上游水面保持一个合并 draw call，三角形数量不超过 12,000。
- 草和树不会生成在河床、冰斗湖或对应岸带内。
- 新水系经过的狭窄地形块保持 256 段最低 LOD，地图空白区域仍可降至 64 段。
- 支流在 Quality 档不采样高山湖平面反射。
- `npm test` 和 `npm run build` 通过，运行时无 Shader 编译错误或缺失资源。

**English:**

- The network validates as one acyclic tree with five sources, four two-in/one-out confluences, and one alpine-lake sink.
- Every visible reach has a non-rising downstream profile and matches the planned height-field control levels near authored points.
- When reaches influence the same terrain point, carving selects one lowest target instead of subtracting per reach.
- The four confluences contain no overlapping independent transparent surfaces, and flow UVs increase from upstream to downstream.
- Upstream water uses one merged draw call and no more than 12,000 triangles.
- Grass and trees are excluded from channels, the cirque tarn, and their shoreline buffers.
- Narrow-water terrain chunks keep a 256-segment minimum LOD while empty map areas can still fall to 64 segments.
- Tributaries do not sample the alpine-lake planar reflection in the Quality preset.
- `npm test` and `npm run build` pass with no shader compilation errors or missing assets at runtime.
