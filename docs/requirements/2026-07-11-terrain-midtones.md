# Requirement / 需求

**中文：** 在不修改地表贴图、后期处理或全局环境光的前提下，提高森林、泥土、干草和砾石地表的中间调可读性，并保持岩石、积雪、水岸和水底颜色不变。

**English:** Improve midtone readability for forest floor, dirt, dry grass, and gravel without changing terrain textures, post-processing, or global environment lighting, while preserving rock, snow, water-bank, and water-bed colors.

## Summary / 概要

**中文：** 收窄四类地表的低频宏观乘色范围，将森林局部变化统一为 `0.98–1.08`、地表全局变化调整为 `0.90–1.06`。通过地表权重只对目标材质应用该变化，并在水岸和水底覆盖之前完成乘色。

**English:** Narrow low-frequency macro color multiplication for the four supported ground layers, standardizing local forest variation to `0.98–1.08` and global ground variation to `0.90–1.06`. Apply it only to targeted materials through a ground weight, before water-bank and water-bed overrides.

## User Request / 用户需求

**中文：** 用户认为当前基础画面偏暗，可能来自草地地面颜色过深；要求综合校准地表中间调，同时避免通过提高全局光照造成天空、水面或其他材质过曝。

**English:** The user reported that the base image appears too dark, potentially because the grass ground color is too deep, and requested a ground-midtone calibration that does not rely on raising global lighting and overexpose the sky, water, or unrelated materials.

## Scope / 范围

**中文：**

- 调整 Near、Medium、Far 地形材质中森林地表的局部宏观乘色范围。
- 仅对森林、泥土、干草和砾石应用新的全局地表宏观乘色。
- 岩石和积雪不应用地表中间调提升。
- 河岸、湖岸、河床和湖床采样不应用地表中间调提升。
- 不修改任何贴图资产、后期处理、曝光、太阳、环境光或雾参数。

**English:**

- Adjust local forest macro-color ranges in Near, Medium, and Far terrain materials.
- Apply the new global ground macro color only to forest floor, dirt, dry grass, and gravel.
- Do not apply the ground midtone lift to rock or snow.
- Do not apply the ground midtone lift to river/lake banks or river/lake beds.
- Do not modify texture assets, post-processing, exposure, sun, ambient light, or fog parameters.

## Acceptance Criteria / 验收标准

**中文：**

- 所有地形 LOD 的森林局部宏观范围为 `0.98–1.08`。
- 四类目标地表的全局宏观范围为 `0.90–1.06`，不再使用原有的 `0.78–1.02` 强压暗范围。
- 岩石和积雪分支不启用地表宏观权重。
- 水岸和水底覆盖在地表宏观乘色之后执行，完整覆盖时保持其原始采样颜色。
- 地形材质回归测试和生产构建通过。

**English:**

- Local forest macro variation is `0.98–1.08` in every terrain material LOD.
- Global macro variation for the four targeted ground layers is `0.90–1.06`, replacing the former strongly darkening `0.78–1.02` range.
- Rock and snow branches do not enable the ground macro weight.
- Water-bank and water-bed overrides execute after ground macro multiplication, preserving their sampled color at full coverage.
- Terrain material regression tests and the production build pass.
