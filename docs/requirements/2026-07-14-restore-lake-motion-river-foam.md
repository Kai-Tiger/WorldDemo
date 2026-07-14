# Restore Lake Motion and River Foam / 恢复湖面动效与河流泡沫

## Requirement / 需求

The unified water pipeline must retain the visible lake animation and hydraulically motivated river foam that existed before water-surface unification.

统一水体管线必须保留水面统一前清晰可见的湖面动画，以及由水力条件驱动的河流泡沫。

## Summary / 概要

Restore multi-phase lake waves and visible planar-reflection distortion while keeping deterministic capture frozen. Replace direct river-mask-to-foam addition with the previous patterned, shallow/fast-water, rapid, junction, and sheltered rock-wake model.

恢复多相湖面波纹和可见的平面反射扰动，同时继续保持确定性捕获冻结。用旧版的图案化、浅水高速、急流、汇流和岩石尾迹避风模型，替换直接把河流遮罩相加为泡沫的做法。

## User Request / 用户需求

Lake surfaces became visually static, and the river foam regression remained after the previous animation fix. Use the pre-unification water appearance as the reference.

湖面变成了视觉静态，且此前的河流动效修复没有解决泡沫退化；应以水面统一前的效果为参考。

## Scope / 范围

- Restore the former two-phase lake vertex displacement and four-phase dynamic lake normal inside the unified attribute shader.
- Distort planar lake reflection by the resolved dynamic normal and restore the former micro-noise breakup for sun sparkle.
- Restore multi-scale foam breakup, shallow/fast hydraulic support, rapid and junction drivers, and sheltered rock-wake shear.
- Keep river shoreline foam disabled outside motivated hydraulic foam regions.
- Preserve unified topology, MRT layout, optical resolve ownership, hydrology, terrain, gameplay, and deterministic `capture=1` timing.

- 在统一属性 shader 内恢复原有双相湖面顶点位移和四相动态湖面法线。
- 使用最终动态法线扰动湖泊平面反射，并恢复旧版太阳闪光的微噪声打散。
- 恢复多尺度泡沫破碎、浅水高速水力支持、急流与汇流驱动，以及带避风核心的岩石尾迹剪切带。
- 在没有水力依据的河段关闭连续河岸泡沫。
- 保持统一拓扑、MRT 布局、单次光学合成所有权、水文、地形、玩法和 `capture=1` 确定性时间不变。

## Acceptance Criteria / 验收标准

- Lake Water Info normals and visible reflection/refraction cues change continuously during normal gameplay.
- Lake vertex motion uses the former `0.055m` and `0.04m` bounded wave amplitudes and remains suppressed at river mouths.
- Lake sun sparkle uses animated micro-noise coverage instead of repeating as coherent oval highlights.
- River foam is broken into moving macro, middle, and micro patterns rather than continuous white bands.
- Shallow fast water, rapids, junctions, and rock-wake shear can create foam; the sheltered wake core remains clear.
- River foam fades by `riverInfluence²`, lake shoreline foam does not become a continuous river-bank line, and coverage is unchanged.
- Runtime shaders compile without warnings or errors, and all automated verification passes.

- 正常游戏中湖泊 Water Info 法线以及可见反射、折射提示持续变化。
- 湖面顶点动画使用原有 `0.055m` 与 `0.04m` 有界波幅，并在河口受到抑制。
- 湖面太阳闪光使用动态微噪声覆盖打散，不形成规则重复的椭圆高光。
- 河流泡沫被动态宏观、中层和微观图案打散，不形成连续白色条带。
- 浅且快的水流、急流、汇流和岩石尾迹剪切带可产生泡沫，尾迹避风核心保持清洁。
- 河流泡沫按 `riverInfluence²` 衰减，湖岸泡沫不会变成连续河岸白线，coverage 保持不变。
- 运行时 shader 编译无警告或错误，且全部自动验证通过。
