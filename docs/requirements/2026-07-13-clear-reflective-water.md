# Clear Reflective Water / 清澈反光水体

## Requirement / 需求

**English:** Restore clear lake and river water with physically bounded reflection and refraction, while preventing shallow rivers from becoming a uniformly bright cyan strip and preserving the existing water geometry, Fresnel model, quality modes, and gameplay behavior.

**中文：** 恢复清澈的湖泊与河流水体及物理受限的反射、折射，同时避免浅河变成整片亮青蓝，并保留现有水体几何、菲涅耳模型、质量档位和玩法行为。

## Summary / 概要

**English:** Lakes retain a clear blue-green palette, while rivers use a quieter gray-green palette. Beer-Lambert volume scattering is reduced, and the river's HDR sky contribution is capped separately from the existing environment, probe, and planar tiers. Water keeps `F0 = 0.0204`, so head-on views retain underwater detail while grazing views still show localized sky reflection.

**中文：** 湖泊保持清澈蓝绿色，河流则使用更克制的灰绿色。Beer-Lambert 体散射被降低，并在现有环境、探针和平面反射档位之外单独限制河流的 HDR 天空贡献。水体继续使用 `F0 = 0.0204`，因此正视时保留水下细节，掠射角仍呈现局部天空反射。

## User Request / 用户需求

**English:** The user first requested clear reflective water, then reported from an in-engine waterfall view that the river had become too blue and the environment too saturated. The final calibration must keep reflection readable without tinting the whole channel cyan.

**中文：** 用户先要求清澈反光的水体，随后通过引擎内瀑布镜头反馈河流过蓝、环境饱和度偏高。最终校准需保留可读反射，但不能把整条河道染成青蓝色。

## Scope / 范围

- **English:** Update lake shallow, deep, and reflection colors and river shallow, deep, and foam colors. / **中文：** 更新湖泊浅水、深水和反射颜色，以及河流浅水、深水和泡沫颜色。
- **English:** Share lower absorption and scattering coefficients between lake and river Single Layer Water composition. / **中文：** 在湖泊与河流的 Single Layer Water 合成中共享更低的吸收和散射系数。
- **English:** Keep river Fresnel reflection and restrained direct sunlight, cap their river contributions independently, and use `0.46 / 0.64 / 0.74` reflection-source strengths for environment, probe, and planar modes. / **中文：** 保留河流菲涅耳反射与克制的太阳直射高光，单独限制其河流贡献，并将环境、探针和平面模式的反射源强度设为 `0.46 / 0.64 / 0.74`。
- **English:** Preserve water `F0`, refraction pixel counts, quality-mode caps, water geometry, foam structure, flow, collision, and gameplay logic. / **中文：** 保留水体 `F0`、折射像素数、质量模式上限、水体几何、泡沫结构、流动、碰撞和玩法逻辑。

## Acceptance Criteria / 验收标准

- **English:** Lakes use `#2f8588 / #073c52 / #3f7899` for shallow, deep, and reflected color; rivers use restrained `#4b756b / #123945 / #d5e7e7` shallow, deep, and foam colors. / **中文：** 湖泊浅水、深水和反射颜色使用 `#2f8588 / #073c52 / #3f7899`；河流使用更克制的 `#4b756b / #123945 / #d5e7e7` 浅水、深水和泡沫颜色。
- **English:** Lake and river shaders share absorption `(0.28, 0.11, 0.055)`, scattering `(0.014, 0.028, 0.040)`, and a `0.50` shallow-color scattering mix. / **中文：** 湖泊与河流 shader 共享吸收 `(0.28, 0.11, 0.055)`、散射 `(0.014, 0.028, 0.040)`，以及 `0.50` 的浅水散射颜色混合。
- **English:** River HDR reflection energy is capped at `0.26`, direct sun specular at `0.40`, and `F0 = 0.0204` remains unchanged; this keeps localized reflection without a full-channel cyan cast. / **中文：** 河流 HDR 反射能量限制为 `0.26`、太阳直射高光限制为 `0.40`，并保持 `F0 = 0.0204` 不变，从而保留局部反光而不让整条河道泛青。
- **English:** Head-on water remains transparent enough to read underwater detail, grazing angles show a clear sky reflection, and foreground or screen-edge refraction artifacts do not increase. / **中文：** 正视水面仍可阅读水下细节，掠射角具有清晰天空反射，并且前景拖拽或屏幕边缘折射瑕疵不增加。
- **English:** Focused tests, the full test suite, production build, lowland check, and `git diff --check` pass without staging unrelated lowland, river-channel, or whitewater work. / **中文：** 定向测试、完整测试、生产构建、低地检查和 `git diff --check` 通过，且不暂存无关的低地、河道或白水工作。
