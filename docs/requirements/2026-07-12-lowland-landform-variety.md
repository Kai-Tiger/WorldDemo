# Lowland Landform Variety / 低地地貌丰富化

## Requirement / 需求

**中文：** 丰富现有空旷平地区域，在不修改高度图资产和既有山地、水系、六峰徒步网络的前提下，加入具有自然水文关系的浅塘、缓流溪和分散的宽缓低丘。

**English:** Enrich the existing open lowlands with a hydrologically coherent shallow pond, slow creek, and dispersed rolling hills without editing the height-map asset or disturbing the established mountains, water system, and six-peak trail network.

## Summary / 概要

**中文：** 在东侧平原开挖一座不规则浅塘，并让其沿真实平坦走廊缓慢汇入现有终端湖；在近出生区、北部平原和东南湖群外缘布置不同尺度、方向和重叠关系的低丘组。所有新增地貌使用静态世界坐标定义，水体复用现有河网几何和湖面材质，地形、材质、植被排除、阴影代理与固定 LOD 查询保持一致。

**English:** Excavate an irregular shallow pond on the eastern plain and drain it through the verified flat corridor into the existing terminal lake. Place varied groups of low hills near the spawn-side meadow, northern plains, and outside the southeastern lake cluster. All features use static world-space definitions, reuse the existing river geometry and lake material, and share consistent terrain, material, vegetation-exclusion, shadow-proxy, and fixed-LOD queries.

## User Request / 用户需求

**中文：** 用户认为项目中的平地区域过于单调，希望增加河流、湖泊以及小型山坡丘陵来提升地貌丰富度，同时保持自然、不过度刻意的外观。

**English:** The user found the flat regions too monotonous and requested rivers, lakes, and small hills to improve landform variety while retaining a natural, unforced appearance.

## Scope / 范围

**中文：**

- 在约 `(820,-260)` 的东侧平原增加一座旋转椭圆、边缘轻微扰动的浅塘。
- 以低坡度蜿蜒溪流连接新浅塘和现有 `(690,-340)` 终端湖，水位沿下游单调下降。
- 低丘采用多个宽缓、旋转、轻微不对称的椭圆隆起组合，分布在已验证的空旷平原；影响边界外地形严格不变。
- 新水体接入现有河床/湿岸材质遮罩、草木排除、水面更新和反射质量控制，不新增 Water.js、桥梁、玩法或水体贴图。
- 新浅塘及溪流相交块使用局部 `128 segments` 精度下限，禁止用整片平原包围盒提升 LOD；宽缓丘陵继续使用普通地形精度。
- 新增固定机位，分别检查浅塘、溪流和北部丘陵轮廓。

**English:**

- Add a rotated, subtly irregular shallow pond near `(820,-260)` on the eastern plain.
- Connect the pond to the existing terminal lake at `(690,-340)` with a gently meandering creek whose water level never rises downstream.
- Build hills from overlapping broad, rotated, mildly asymmetric elliptical rises across verified open plains; terrain outside each influence boundary must remain unchanged.
- Integrate the new water with existing bed/wet-bank material masks, vegetation exclusion, water updates, and reflection-quality controls; add no Water.js surface, bridges, gameplay, or water textures.
- Apply a local `128 segments` terrain floor only to chunks intersecting the new pond and creek; do not promote the full lowland bounding rectangle. Broad hills retain ordinary terrain precision.
- Add deterministic cameras for the pond, creek, and northern hill silhouette.

## Acceptance Criteria / 验收标准

**中文：**

- 新浅塘边界不是圆形或矩形，湖盆、水面、材质遮罩和植被排除使用同一边界函数，岸边没有硬切或悬浮水面。
- 溪流控制点与编译采样水位从浅塘到终端湖单调下降，水面沿中心线连续且河床始终低于水面。
- 新溪流正确渐隐并进入终端湖，无反坡、明显缝隙、透明面硬叠色或错误流向。
- 低丘组具有不同长宽比、方向、高度与重叠关系；边缘平滑归零，采样最大坡度保持可步行，出生点及既有山路不受影响。
- 新水体内部不生成草或树，岸缘外植被仍可自然生成；河床和湿岸保持现有材质覆盖顺序。
- 只有实际与浅塘/溪流相交的块获得 `128 segments` 下限，空白块保持原 LOD。
- 新增水面仍使用有界几何预算和现有共享水材质能力，运行时无 shader 或资源错误。
- 固定机位视觉检查、完整 `npm test` 和 `npm run build` 均通过。

**English:**

- The new pond boundary is neither circular nor rectangular, and its basin, surface, material mask, and vegetation exclusion use the same boundary function without hard shore cuts or floating water.
- Authored and compiled creek levels descend monotonically from the pond to the terminal lake; the centerline surface remains continuous and the bed stays below the water.
- The creek fades into the terminal lake with no reverse slope, obvious gap, hard transparent overlap, or incorrect flow direction.
- Hill groups vary in aspect ratio, direction, height, and overlap; their edges return smoothly to zero, sampled maximum slopes remain walkable, and the spawn and existing trails are unaffected.
- Grass and trees are excluded from new water while vegetation remains available beyond the shoreline; bed and wet-bank material ordering remains consistent.
- Only chunks that actually intersect the pond or creek receive the `128 segments` floor, while empty chunks retain their original LOD.
- New water stays within bounded geometry budgets and reuses the existing shared water-material capabilities with no runtime shader or asset errors.
- Deterministic visual checks, the full `npm test` suite, and `npm run build` pass.
