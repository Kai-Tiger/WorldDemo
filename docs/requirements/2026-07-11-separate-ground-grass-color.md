# Requirement / 需求

**中文：** 在保留原森林地面贴图和现有全局光照的前提下，提高森林地面的中间调，并让地面与模型草形成明确但自然的明度和色相差异。

**English:** Improve forest-floor midtones and create a clear but natural value and hue separation between the ground and modeled grass while preserving the original forest-floor texture and existing global lighting.

## Summary / 概要

**中文：** 在现有 forest-floor 单次材质采样后应用无额外纹理读取的局部线性色彩校正：降低黄绿色饱和度、将颜色推向暖灰褐色并抬升中间调。同时收窄地表宏观暗部范围，并将近中景草和远景草轻微推向冷绿。修改覆盖 Near、Medium、Far 地形材质 LOD，但只作用于森林地面分支。

**English:** Apply a local linear color correction after the existing single forest-floor material sample without any additional texture reads: reduce yellow-green saturation, shift the surface toward a warm neutral brown, and lift its midtones. Also narrow the dark end of ground macro variation and shift near/mid and far grass slightly toward cooler greens. The correction covers Near, Medium, and Far terrain material LODs but only affects the forest-floor branch.

## User Request / 用户需求

**中文：** 用户认为当前地面颜色偏深，且与模型草颜色过于接近，要求开始编码解决该问题。

**English:** The user reported that the ground color is too dark and too similar to the modeled grass, and requested implementation of the fix.

## Scope / 范围

**中文：**

- 保留原 forest-floor 贴图资产及其现有采样数量。
- 在所有地形材质 LOD 的森林地面分支应用同一局部颜色校正。
- 将森林地面局部宏观范围调整为 `1.00–1.06`，地表全局宏观范围调整为 `0.96–1.05`。
- 将近中景和远景草的材质乘色分别调整为 `#a5c77f` 和 `#82a66a`。
- 不修改岩石、积雪、泥土、干草、砾石、水岸、水底、曝光、太阳、半球光、雾或后期处理。
- 不增加纹理采样、材质层、draw call 或后处理 pass。

**English:**

- Preserve the original forest-floor texture assets and their existing sample count.
- Apply the same local correction to the forest-floor branch in every terrain material LOD.
- Adjust local forest-floor macro variation to `1.00–1.06` and global ground macro variation to `0.96–1.05`.
- Set near/mid and far grass material tints to `#a5c77f` and `#82a66a`, respectively.
- Do not modify rock, snow, dirt, dry grass, gravel, water banks, water beds, exposure, sun, hemisphere light, fog, or post-processing.
- Do not add texture samples, material layers, draw calls, or post-processing passes.

## Acceptance Criteria / 验收标准

**中文：**

- forest-floor 色彩校正函数不包含纹理读取，并在 Near、Medium、Far 各调用一次。
- 校正后的 forest-floor 中位显示亮度约为 `68–72/255`，不产生素材阶段通道溢出。
- 地面色相从黄绿色向暖灰褐色移动，与近景和远景草保持约 30 度以上的色相差。
- 水岸和水底覆盖在地表校正之后执行，颜色不受 forest-floor 校正影响。
- 草的几何、密度、群落分布、LOD 距离和光照逻辑保持不变。
- 针对性测试、完整测试和生产构建通过，固定镜头无明显 LOD 颜色跳变、死黑地块或地面过曝。

**English:**

- The forest-floor grading function contains no texture reads and is called once by each of the Near, Medium, and Far material variants.
- Corrected forest-floor median display luminance is approximately `68–72/255` without asset-stage channel overflow.
- Ground hue moves from yellow-green toward warm neutral brown and remains separated from near and far grass by approximately 30 degrees or more.
- Water-bank and water-bed overrides execute after ground correction and remain unaffected by forest-floor grading.
- Grass geometry, density, community distribution, LOD distances, and lighting logic remain unchanged.
- Targeted tests, the full test suite, and the production build pass, with no obvious LOD color pop, crushed ground patches, or ground overexposure in fixed-camera validation.
