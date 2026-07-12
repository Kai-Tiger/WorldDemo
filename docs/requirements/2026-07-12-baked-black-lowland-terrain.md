# Baked Black Lowland Terrain / 烘焙高度图黑色低地区域

## Requirement / 需求

**English:** Bake the terrain authored for the heightmap's original pure-black (`RGB 0,0,0`) non-mountain regions into `public/assets/terrain/height.webp`. Raise the lowland core to approximately `4.7m`, add subtle broad undulation, preserve the ten existing lowland hills, add eighteen deterministic broad hills, and extend the connected lowland water system. Pixels that were not pure black in the immutable bake source must retain exactly the same decoded RGB values.

**中文：** 将高度图原始纯黑（`RGB 0,0,0`）非山地区域内规划的地形烘焙进 `public/assets/terrain/height.webp`。低地核心抬升至约 `4.7m`，增加宽缓微起伏，保留现有十座低丘，新增十八座确定性宽缓低丘，并扩展相互连通的低地水系。不可变烘焙源中并非纯黑的像素，其解码后的 RGB 值必须完全不变。

## Summary / 概要

**English:** Add deterministic `bake:lowlands` and read-only `check:lowlands` workflows backed by an immutable copy of the current heightmap. Blend inward for `24m` from each pure-black-region boundary, apply a roughly `4.7m` base plus `0–2.4m` of two-scale low-frequency relief, and keep the baked lowland maximum near or below `18m`. Bake the existing and new hills only through the original pure-black mask, then apply lakes and channels last so every baked basin and bed remains at or above `0m` and below its water surface. Runtime code continues to provide water surfaces, material masks, vegetation exclusion, and local terrain LOD, but must no longer repeat height deformation already baked into the black lowlands.

**中文：** 基于当前高度图的不可变副本，新增确定性的 `bake:lowlands` 与只读的 `check:lowlands` 流程。纯黑区域从边界向内 `24m` 平滑过渡，核心采用约 `4.7m` 基础高度并叠加 `0–2.4m` 的两级低频起伏，烘焙后低地最高点保持在约 `18m` 或以下。现有与新增低丘均通过原始纯黑遮罩裁切，湖盆与河床最后覆盖地形起伏，确保所有已烘焙盆地和河床不低于 `0m` 且低于对应水面。运行时代码继续负责水面、材质遮罩、植被排除和局部地形 LOD，但不得再次施加已经烘焙到黑色低地的高度变形。

## User Request / 用户需求

**English:** The user clarified that “flat terrain” means every area represented by pure black in the source heightmap, not a small collection of fixed world-space points. They requested that the complete black lowland regions be updated and verified rather than leaving most of those regions unchanged.

**中文：** 用户澄清“平地地形”是指源高度图里所有由纯黑表示的非山地区域，而不是少量固定世界坐标点。用户要求完整更新并验证这些黑色低地区域，不能继续让其中大部分区域保持未处理状态。

## Scope / 范围

**English:**

- Classify lowlands strictly from the immutable source image: only pixels whose original RGB channels are all zero may be changed. Dark-gray plateaus, mountains, material rules, vegetation rules, and unrelated authored terrain remain unchanged.
- Preserve the ten existing lowland hills and add eighteen deterministic broad hills, distributed as ten in the north, two in the east, and six in the south. New hills are approximately `3.5–7m` high with `35–80m` radii and must avoid water features.
- Retain the eastern pond near `(820,-260)` and its creek to the terminal lake, using water levels `3.2m` and `1.6m`. Add irregular northern lakes near `(-520,720)` and `(-120,800)` connected by a meandering, monotonically descending stream from `3.5m` to `2.0m`.
- Retain the four southern lakes with water levels `3.5m`, `3.2m`, `2.8m`, and `1.8m`, and add three tributary streams that converge toward the southern lake. Bake the pure-black portions of the main river, terminal lake, southern lakes, waterfall plunge pool, and new lowland water system.
- Remove runtime hill, basin, and channel deformation only where the same black-lowland terrain is now baked. Preserve runtime shaping for mountain lakes, the mountain river network, and mountain trails, along with water rendering, masks, vegetation exclusion, and local LOD behavior.
- Encode the result as lossless WebP. Provide synthetic-image regression coverage, real-source/output validation, and deterministic north/east/south overview cameras. Do not change terrain materials, vegetation zoning, gameplay, or unrelated assets.
- This requirement supersedes the “do not modify the height-map asset” constraint in `2026-07-12-lowland-landform-variety.md` and the equivalent asset-preservation constraint in `2026-07-11-restore-full-heightmap-terrain.md`, but only for the pure-black lowland pixels and the bake workflow defined here. All unrelated constraints in those requirements remain in force.

**中文：**

- 严格依据不可变源图识别低地：只有原始三个 RGB 通道均为零的像素可以修改。深灰台地、山体、材质规则、植被规则及无关人工地形保持不变。
- 保留现有十座低丘并新增十八座确定性宽缓低丘，其中北部十座、东部两座、南部六座。新增低丘高度约 `3.5–7m`、半径 `35–80m`，并避开水体。
- 保留 `(820,-260)` 附近东部池塘及其通往终端湖的溪流，水位分别为 `3.2m` 和 `1.6m`。在 `(-520,720)` 与 `(-120,800)` 附近新增两座不规则北部浅湖，并以水位从 `3.5m` 单调下降至 `2.0m` 的蜿蜒溪流连接。
- 保留南部四座湖泊，水位依次为 `3.5m`、`3.2m`、`2.8m`、`1.8m`，并新增三条汇向南部湖泊的支流。烘焙主河道、终端湖、南部湖群、瀑布潭和新增低地水系中属于原始纯黑遮罩的部分。
- 仅移除已由本次烘焙替代的黑色低地丘陵、湖盆和河床运行时变形。山地湖泊、山地河网和山路仍保留运行时塑形；水面渲染、遮罩、植被排除和局部 LOD 行为也继续保留。
- 结果使用无损 WebP 编码。增加合成图回归测试、真实源图/输出验证，以及北、东、南三个确定性全景检查机位。不修改地形材质、植被分区、玩法或无关资源。
- 本需求在本次纯黑低地像素与烘焙流程范围内，明确取代 `2026-07-12-lowland-landform-variety.md` 中“不修改高度图资产”的约束，以及 `2026-07-11-restore-full-heightmap-terrain.md` 中同类的高度图资产保留约束；上述旧需求的其他无关约束继续有效。

## Acceptance Criteria / 验收标准

**English:**

- `bake:lowlands` always starts from the immutable source, produces byte-stable decoded pixel output across repeated runs, writes lossless `height.webp`, and does not progressively rebake a previous output.
- Synthetic and real-heightmap checks prove that every source pixel not equal to `RGB 0,0,0` is decoded identically in the output. Deep-gray pixels are explicitly covered by the regression test.
- The `24m` inward boundary transition is smooth, while nearly all pure-black core pixels at least `24m` inside a region differ from the source and receive the intended base relief.
- All ten retained hills and all eighteen new hills are present, masked to original pure-black pixels, remain within the approximately `18m` lowland ceiling, and do not intrude into defined water features.
- Every baked lake basin and channel bed is at least `0m` and strictly below its water surface. Authored control-point levels and compiled samples for every new or retained lowland stream never rise downstream.
- The east, north, and south water systems have continuous terrain and water transitions. Water surfaces, material masks, vegetation exclusion, and local LOD still operate at runtime without duplicate height displacement.
- Targeted tests prove that baked black-lowland hills, basins, and beds are not applied a second time at runtime, while mountain lakes, the mountain river network, and mountain-trail shaping retain their existing behavior.
- North, east, and south fixed-camera checks show broad lowland coverage and smooth mountain-foot boundaries. `npm test`, `npm run check:lowlands`, and `npm run build` all pass.

**中文：**

- `bake:lowlands` 每次都从不可变源图开始；重复执行所得解码像素稳定一致；输出无损 `height.webp`，且不会在上一次输出上继续累积烘焙。
- 合成图与真实高度图检查证明：源图中所有不等于 `RGB 0,0,0` 的像素在输出中解码值完全相同；回归测试必须显式覆盖深灰像素。
- 从边界向内 `24m` 的过渡平滑；距区域边界至少 `24m` 的纯黑核心像素几乎全部与源图不同，并获得预期基础地貌。
- 保留的十座低丘与新增十八座低丘全部存在，均受原始纯黑遮罩限制，保持在约 `18m` 的低地高度上限内，且不侵入已定义水体。
- 每个已烘焙湖盆和河床均不低于 `0m`，并严格低于对应水面。所有新增或保留低地溪流的人工控制点水位与编译采样水位沿下游均不得上升。
- 东、北、南三套水系具有连续的地形与水面衔接。水面、材质遮罩、植被排除和局部 LOD 仍在运行时正常工作，且不会产生重复高度位移。
- 定向测试证明黑色低地中已烘焙的丘陵、湖盆和河床不会在运行时再次应用；山地湖泊、山地河网和山路塑形维持既有行为。
- 北、东、南固定机位检查可见完整宽广的低地覆盖与平滑山脚边界。`npm test`、`npm run check:lowlands` 和 `npm run build` 全部通过。
