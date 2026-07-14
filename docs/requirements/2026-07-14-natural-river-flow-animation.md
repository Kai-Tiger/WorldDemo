# Natural River Flow Animation / 自然河流流动动画

## Requirement / 需求

The unified water pipeline must render natural directional river motion without regular transverse bright-and-dark bands or triangular artifacts at confluences.

统一水体管线必须呈现自然、具有方向性的河流动画，不得出现规则的横向明暗条纹或汇流区三角形伪影。

## Summary / 概要

Advance animation along the river's longitudinal flow coordinate and replace periodic sine-wave normals with bounded multi-scale, domain-warped noise normals. Preserve the unified Water Info and optical resolve architecture.

沿河道纵向流动坐标推进动画，并使用有界的多尺度域扰动噪声法线替换周期正弦波法线。保留统一 Water Info 与光学合成架构。

## User Request / 用户需求

The river animation became visually poor after the unified-water change and must be repaired.

统一水体改动后河流动效明显变差，需要修复。

## Scope / 范围

- Update only the unified water attribute shader's flow-coordinate animation and dynamic-normal generation.
- Preserve river geometry, hydrology, terrain carving, lake transitions, Water Info encoding, and optical resolve behavior.
- Add shader-contract regression checks for longitudinal advection and non-periodic procedural normals.

- 仅修改统一水体属性 shader 的流动坐标动画与动态法线生成。
- 保持河流几何、水文、地形雕刻、湖泊过渡、Water Info 编码和光学合成行为不变。
- 为纵向推进和非周期程序化法线新增 shader 契约回归检查。

## Acceptance Criteria / 验收标准

- Flow UVs are not translated by world-space direction in the vertex stage.
- River animation advances along `flowUv.x` and remains aligned through bends and confluences.
- Multi-scale warped noise breaks up repeating transverse bands while retaining bounded normal slopes.
- Lake-to-river influence blending and the previous lake-center fan fix remain intact.
- Runtime shader compilation has no warnings or errors, animation changes over time, and all automated verification passes.

- 顶点阶段不得使用世界空间流向平移 Flow UV。
- 河流动画沿 `flowUv.x` 推进，并在弯道与汇流处保持方向连续。
- 多尺度域扰动噪声消除重复横纹，同时保证法线坡度有界。
- 河湖影响混合和此前的湖心扇形修复保持有效。
- 运行时 shader 编译无警告或错误，动画随时间变化，且全部自动验证通过。
