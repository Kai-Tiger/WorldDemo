# Natural River Foam Coverage / 自然河流泡沫覆盖率

## Requirement / 需求

Increase visible foam coverage across all flowing rivers to resemble the supplied reference while keeping the foam broken, flow-driven, and natural rather than uniformly white or deliberately painted.

提高所有流动河流中的可见泡沫覆盖率，使其接近用户提供的参考图，同时保持泡沫破碎、顺流且自然，避免均匀发白或刻意涂抹感。

## Summary / 概要

Expand the accepted range of the existing macro, middle, and micro foam-noise layers and redistribute foam weight from sparse bright cores into the broken base pattern. Preserve the existing hydraulic drivers, clear-water gaps, sheltered rock-wake cores, river-mouth fade, peak foam cap, and final foam color. This requirement replaces only the previous constraint that foam coverage remain unchanged; the existing hydraulic and multi-scale breakup constraints continue to apply.

扩大现有宏观、中层和微观泡沫噪声的通过范围，并将部分权重从稀疏亮核重新分配到破碎的基础图案，同时保留水力驱动、清水间隙、岩石尾迹避风核心、河口衰减、泡沫峰值上限和最终泡沫颜色。本需求仅替代此前“泡沫覆盖率不变”的约束，原有水力动机与多尺度破碎约束继续适用。

## User Request / 用户需求

Increase the proportion of flowing foam in all rivers to look more like Image 1, but do not make it artificial or forced; retain the texture of real moving water.

希望所有河流里水流泡沫的比例高一点，类似于图 1，但不能过于虚假和刻意，要有真实水流的质感。

## Scope / 范围

- Apply the shared foam-pattern change to the unified flowing-water path used by the main river, tributaries, mountain streams, lowland creeks, expanded watershed, and lake outlets.
- Keep foam animated downstream and broken by the existing macro, middle, and micro noise layers.
- Preserve rapid, shallow-fast-water, junction, and rock-wake hydraulic gating, including the sheltered wake core and `riverInfluence²` fade.
- Do not change lake-shore foam, waterfall effects, water geometry, hydrology, terrain, collision, gameplay sampling, optical composition, draw calls, or texture resources.

- 将共享泡沫图案调整应用于主河、支流、山地溪流、低地溪流、外围流域和湖泊出口共同使用的统一流动水路径。
- 保持泡沫顺流运动，并继续由现有宏观、中层和微观噪声打散。
- 保留急流、浅水高速、汇流和岩石尾迹的水力门控，包括尾迹避风核心与 `riverInfluence²` 衰减。
- 不修改湖岸泡沫、瀑布特效、水体几何、水文、地形、碰撞、玩法采样、光学合成、绘制调用或纹理资源。

## Acceptance Criteria / 验收标准

- Hydraulically eligible portions of every flowing-river system show a clearly higher proportion of foam than the previous baseline.
- Foam remains discontinuous, multi-scale, and aligned with downstream motion, with visible clear-water gaps between clusters.
- Rapids, shallow fast water, junctions, and rock-wake shear remain stronger than calm water, while sheltered wake cores stay clear.
- No continuous river-bank white line, whole-river white film, static repeating pattern, or brighter final foam color is introduced.
- Lake and waterfall appearance, river geometry, water coverage, gameplay behavior, resource count, and draw-call count remain unchanged.
- The focused foam test, relevant water tests, production build, and runtime shader compilation complete without new failures.

- 每套流动河流水系中具备水力条件的河段，其泡沫比例相较旧基线均有明显提高。
- 泡沫保持非连续、多尺度并沿下游运动，泡沫团块之间始终可见清水间隙。
- 急流、浅水高速、汇流和岩石尾迹剪切仍强于平缓水面，尾迹避风核心保持清洁。
- 不出现连续河岸白线、整河白膜、静态重复图案，也不提高最终泡沫颜色亮度。
- 湖泊与瀑布外观、河流几何、水体覆盖、玩法行为、资源数量和绘制调用数量保持不变。
- 泡沫定向测试、相关水体测试、生产构建和运行时 Shader 编译不出现新的失败。
