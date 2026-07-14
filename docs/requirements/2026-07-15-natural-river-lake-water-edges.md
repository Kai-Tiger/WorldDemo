# Requirement / 需求

- English: River-to-lake junctions must read as continuous water-to-water surfaces. A lake's white water-to-land edge must not cross an inlet, and no regular stripe, compressed flow phase, or camera-dependent seam may appear at any junction.
- 中文：河湖交界必须表现为连续的水水表面。湖泊的白色水陆边缘不得横穿入湖口，任何接口都不得出现规则条纹、被压缩的流动相位或随视角变化的接缝。

## Summary / 概要

- English: Give the unified surface an explicit shoreline-foam ownership attribute, disabled only on the five rows of each river-to-lake transition. Keep lake animation in world space and river animation in a metric river-flow domain, sample the two domains independently, and blend their results with `riverInfluence`.
- 中文：为统一水面增加明确的岸线泡沫归属属性，并仅在每个河湖接口的五排过渡面上关闭。湖泊动画保持世界坐标域，河流动画保持米制河流坐标域；两者分别采样，再通过 `riverInfluence` 混合结果。

- English: Rebuild the river `flowUv` values from the adjacent source-row centerline through all five transition rows using actual world-space centerline distance. Every transition cross-section shares one longitudinal coordinate while retaining monotonic metric lateral coordinates. This prevents a long flow phase from being compressed into a very short edge or fanned across one row after shoreline projection.
- 中文：依据真实世界中心线距离，重建从相邻源河道排中心到全部五排过渡面的 `flowUv`。每个过渡横断面共享同一个纵向坐标，同时保留单调的米制横向坐标，避免湖岸投影后把较长流动相位压进极短边或在单排内扇形展开。

## User Request / 用户需求

- English: Remove the white lake-edge foam from river/lake intersections and fix the striped artifacts visible at some connections, while retaining natural foam on real lake shores and ordinary river banks.
- 中文：移除河湖交界处的白色湖岸泡沫，修复部分连接处可见的条纹，同时保留真实湖岸和普通河岸上的自然泡沫。

## Scope / 范围

- English: Extend the shared water attribute contract with `shoreFoamMask`. It is `0` on the `+L`, `+L/2`, shoreline, `-L/2`, and `-L` rows of all fifteen interfaces and `1` on every other river and lake vertex. It multiplies only the lake shoreline-foam term; it does not affect coverage, depth, wave displacement, `riverInfluence`, or hydraulic river foam.
- 中文：在共享水体属性契约中增加 `shoreFoamMask`。全部十五个接口的 `+L`、`+L/2`、湖岸、`-L/2` 与 `-L` 五排均为 `0`，其余全部河流与湖泊顶点均为 `1`。该属性只乘到湖岸泡沫项，不影响 coverage、深度、波浪位移、`riverInfluence` 或河流水力泡沫。

- English: Lake height and lake detail normals use world-space XZ coordinates. River height, slope, and directional detail use continuous river `flowUv`. The shader must never interpolate lake-local and river-local coordinate domains before sampling.
- 中文：湖面高度与湖面细节法线使用世界空间 XZ 坐标；河面高度、坡度和方向性细节使用连续的河流 `flowUv`。Shader 不得在采样前插值湖泊局部坐标域与河流局部坐标域。

- English: Keep the adjacent source row and transition centerline metric, keep every transition-row U constant across its cross-section, and preserve monotonic V column identity. The five-row patch must have one consistent UV orientation. The `-L` row retains neutral lake values for flow directions, flow speed, rapid, junction, disturbance, and river influence. Do not change topology, coverage, MRT layout, terrain carving, gameplay hydrology, or deterministic terrain assets.
- 中文：相邻源河道排与过渡面中心线保持米制连续；每个过渡横断面的 U 必须一致，V 的列身份保持单调；五排过渡面的 UV 朝向必须统一。`-L` 行的流向、流速、急流、汇流、扰动和河流影响保持湖泊中性值。不修改拓扑、coverage、MRT 布局、地形雕刻、玩法水文或确定性地形资源。

## Acceptance Criteria / 验收标准

- English: Automated checks cover all fifteen interfaces and verify that every transition vertex has `shoreFoamMask = 0`, every non-transition surface vertex has `shoreFoamMask = 1`, and the material's missing-attribute default is `1`.
- 中文：自动化检查覆盖全部十五个接口，确认所有过渡顶点的 `shoreFoamMask = 0`、所有非过渡水面顶点的 `shoreFoamMask = 1`，且材质缺省属性值为 `1`。

- English: The adjacent source row to `+L` matches world-space centerline distance within `1mm`; each of the five rows has less than `0.5mm` longitudinal spread, monotonic lateral coordinates, consistent UV orientation, and metric adjacent-row spacing. The `-L` row has neutral river attributes.
- 中文：相邻源河道排到 `+L` 的距离与世界空间中心线距离误差不超过 `1mm`；五排中每排纵向坐标离散小于 `0.5mm`，横向坐标单调、UV 朝向一致且相邻排距保持米制；`-L` 行的河流属性为中性值。

- English: Fixed terminal-lake and lowland/alpine regression views show no white foam sealing an inlet, no static transverse stripe, no moire, and no angle-dependent seam. True water-to-land shore foam, ordinary river-bank foam, continuous lake motion, and moving hydraulic river foam remain visible.
- 中文：终点湖以及低地/高山固定回归视角中，不得出现封住入湖口的白色泡沫、静态横向条纹、摩尔纹或随视角变化的接缝。真实水陆岸泡沫、普通河岸泡沫、连续湖面动效和移动的河流水力泡沫必须继续可见。
