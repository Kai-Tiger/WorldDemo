# Gravel Terrain Layer / 碎石地形层

## Requirement / 需求

Add a visible gravel terrain layer to the existing terrain material by using the project's gravel texture assets.

使用项目已有的碎石贴图资产，为现有地形材质添加可见的碎石地形层。

## Summary / 概要

The terrain shader now loads and samples the gravel albedo and normal maps as a separate lowland ground layer. Gravel appears in masked flat-ground patches, with river, lake, wet-shore, alpine rock, and snow materials remaining controlled by the existing terrain rules.

地形 shader 现在会加载并采样碎石 albedo 和 normal 贴图，作为独立的低地地面层。碎石会出现在经过 mask 控制的平缓地面斑块中，河流、湖泊、湿岸、高山岩石和雪地材质仍由现有规则控制。

## User Request / 用户需求

"Use this skill to add a set of gravel terrain to the project."

"你用这个skill给项目添加一套碎石地形。"

## Scope / 范围

Update the terrain material texture loading, shader uniforms, color blending, and detail normal blending for gravel terrain. Do not change terrain geometry, height data, water systems, vegetation placement, player behavior, lighting, or camera behavior.

更新地形材质的贴图加载、shader uniform、颜色混合和碎石细节 normal 混合。不改变地形几何、高度数据、水系、植被放置、玩家行为、光照或相机行为。

## Acceptance Criteria / 验收标准

- The terrain material loads `gravel_albedo.png` and `gravel_normal.png`.
- Lowland flat-ground patches visibly blend in the gravel albedo layer.
- Gravel normal detail affects only the masked gravel patches and fades out around water materials.
- Existing riverbed, wet-shore, lake, alpine rock, and snow material overrides still render after the gravel base layer.
- `npm run build` completes successfully.

- 地形材质会加载 `gravel_albedo.png` 和 `gravel_normal.png`。
- 低地平缓地面斑块会可见地混入碎石 albedo 层。
- 碎石 normal 细节只影响经过 mask 控制的碎石斑块，并在水体材质附近淡出。
- 现有河床、湿岸、湖泊、高山岩石和雪地材质覆盖规则仍在碎石基础层之后生效。
- `npm run build` 成功完成。
