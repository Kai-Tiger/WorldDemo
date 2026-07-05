# Rock Normal Map / 岩石法线贴图

## Requirement / 需求

Add a normal map for `rock-alpine.webp` and use it to strengthen terrain surface normals where the rock material mask is high.

为 `rock-alpine.webp` 增加一张法线贴图，并在岩石材质遮罩较高的地形区域增强表面法线。

## Summary / 概要

The rock normal map is derived from the existing rock texture, loaded as a non-color texture, sampled with the same triplanar projection as the rock color texture, and blended into the final terrain normal only through the high `rockMask` range.

岩石法线贴图由现有岩石贴图派生，按非颜色贴图加载，使用与岩石颜色贴图一致的三平面投影采样，并只通过较高的 `rockMask` 区间混入最终地形法线。

## User Request / 用户需求

The user asked to add a normal map for `rock-alpine.webp` and enhance normals where the rock mask is high.

用户要求给 `rock-alpine.webp` 配一张 normal map，并在岩石 mask 高的地方增强法线。

## Scope / 范围

- Add a generated rock normal map asset under `public/assets/terrain/`.
- Load the rock normal map in the terrain texture pipeline.
- Apply the rock normal map only to terrain shader lighting normals in high rock-mask areas.
- Do not change terrain geometry, height data, river materials, or the base rock color texture.

- 在 `public/assets/terrain/` 下新增生成的岩石法线贴图资源。
- 在地形贴图加载流程中加载岩石法线贴图。
- 只在高岩石遮罩区域将岩石法线贴图应用到地形 shader 的光照法线。
- 不修改地形几何、高度数据、河流材质或基础岩石颜色贴图。

## Acceptance Criteria / 验收标准

- `rock-alpine-normal.png` exists and matches the rock texture dimensions.
- The terrain shader samples the rock normal map with triplanar projection.
- The normal map influence is gated by `rockMask` rather than affecting all terrain materials.
- The project builds successfully.

- `rock-alpine-normal.png` 存在，并与岩石贴图尺寸一致。
- 地形 shader 使用三平面投影采样岩石法线贴图。
- 法线贴图影响由 `rockMask` 控制，而不是影响所有地形材质。
- 项目可以成功构建。
