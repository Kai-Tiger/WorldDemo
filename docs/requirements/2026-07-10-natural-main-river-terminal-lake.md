# Natural Main River and Terminal Lake / 自然主河道与终点湖

## Requirement / 需求

Reshape the main river into a broad, natural S-curve and move its endpoint away from the mountains. Excavate a terminal lake centered at `(690, -340)` with an exact radius of `20m`, and provide a realistic, high-quality lightweight water surface with a seamless river-to-lake transition.

将主河道调整为宽缓、自然的 S 形曲线，并将终点移至避开山体的位置。在 `(690, -340)` 处开挖一个严格半径为 `20m` 的终点湖，并实现真实、高质量且轻量的水面和无缝的河湖过渡。

## Summary / 概要

The main river will follow the agreed centripetal Catmull-Rom path and terminate in a `20m`-radius lake with an approximately `3m` maximum depth and a fixed water level of `-1.28m`. The river and lake will share a continuous visible water level at the inlet. Existing procedural ripples, Fresnel response, shallow/deep water color, caustics, sun glitter, and broken shoreline foam will be reused without adding real-time refraction, planar reflection, or extra render passes.

主河道将沿约定的 centripetal Catmull-Rom 路径形成自然走势，并汇入一个半径 `20m`、最大水深约 `3m`、固定水位 `-1.28m` 的终点湖。河道与湖泊在入口处保持连续的可见水位。水面复用现有的程序波纹、Fresnel 效果、深浅水色、焦散、日光碎闪和破碎岸边泡沫，不增加实时折射、平面反射或额外渲染通道。

## User Request / 用户需求

Modify the main river so its course bends more naturally, adjust the endpoint to avoid the mountain terrain, excavate a `20m`-radius lake at the endpoint, and make the water surface as realistic as possible within the lightweight rendering approach.

修改主河道走势，使其弯曲形态更加自然；调整终点位置以避开山体；在终点开挖一个半径 `20m` 的湖泊；并在轻量渲染方案内尽可能实现真实的水面表现。

## Scope / 范围

- Replace the main river centerline with the agreed broad S-curve ending at `(690, -340)`, while preserving the waterfall outlet direction.
- Add only the terminal lake: radius `20m`, shoreline transition band `6m`, fixed water level `-1.28m`, center depth about `3m`, and shoreline depth about `0.15m`.
- Smoothly align the downstream river surface to the lake level and cross-fade river opacity, flow, and foam inside the lake inlet to prevent gaps, hard seams, and overlapping-surface artifacts.
- Generate terminal-lake depth, shoreline weighting, bed visibility, and world-space lake-bed UV data; exclude vegetation from the lake and its `6m` shoreline band.
- Reuse the existing lightweight lake-water material features and shared sun-light direction. Keep the four existing small lakes and their behavior unchanged.
- Do not add real-time refraction, planar reflections, `Water.js`, a wet-bank overlay mesh, forced water render ordering, or unrelated terrain and water features.

- 使用约定的宽缓 S 形中心线替换主河道走势，使其终止于 `(690, -340)`，同时保持瀑布出口方向。
- 仅新增终点湖：半径 `20m`、岸带 `6m`、固定水位 `-1.28m`、湖心深度约 `3m`、岸边水深约 `0.15m`。
- 平滑对齐下游河面与湖面水位，并在入湖区域交叉渐隐河流透明度、流速和泡沫，避免缝隙、硬切和水面重叠伪影。
- 为终点湖生成深度、岸边权重、湖床可见度和世界空间湖床 UV 数据；湖面及其 `6m` 岸带内不生成植被。
- 复用现有轻量湖面材质能力和共享太阳光方向；现有四座小湖及其行为保持不变。
- 不新增实时折射、平面反射、`Water.js`、湿岸覆盖网格、强制水面渲染顺序或无关的地形与水体功能。

## Acceptance Criteria / 验收标准

- The river forms a smooth, broad S-curve with no self-intersections, maintains a stable visual width, preserves the waterfall outlet direction, and reaches the lake without crossing mountain terrain.
- The terminal lake is centered at `(690, -340)`, has a visible diameter of `40m`, a `6m` terrain transition band, and approximately `3m` of water depth at its center.
- River and lake water levels, color, and transparency remain visually continuous at the inlet; no gaps, hard cuts, reverse slopes, visible z-fighting, or obvious doubled-water coloration are present.
- The lake shows shallow-water bed visibility, broken shoreline foam, multi-scale ripples, Fresnel response, caustics, and restrained sun glitter while remaining within the lightweight rendering approach.
- No trees or ground vegetation appear on the lake surface or within its shoreline exclusion band; normal foreground vegetation occlusion remains intact.
- The four existing small lakes remain visually and behaviorally unchanged.
- `npm run build` succeeds without new build errors, missing-resource `404` responses, or new runtime console errors attributable to this change.
- Under the Balanced quality setting, the change causes no obvious sustained performance regression compared with the current baseline; no absolute FPS threshold is required.

- 河道形成平滑宽缓且无自交的 S 形曲线，视觉宽度稳定，保持瀑布出口方向，并在不穿越山体的情况下汇入湖泊。
- 终点湖湖心位于 `(690, -340)`，可见直径为 `40m`，地形过渡岸带为 `6m`，湖心水深约 `3m`。
- 入湖口的河湖水位、颜色与透明度在视觉上连续，不出现缝隙、硬切、反坡、明显 Z-fighting 或重复叠色。
- 湖面具有浅水透底、破碎岸边泡沫、多尺度波纹、Fresnel、焦散和克制的日光碎闪效果，同时保持轻量渲染方案。
- 湖面及岸带排除区内不出现树木或地表植被；正常的前景植被遮挡关系保持正确。
- 现有四座小湖的视觉与行为保持不变。
- `npm run build` 成功，且不新增由本次改动导致的构建错误、资源 `404` 或运行时控制台错误。
- 在 Balanced 画质下，与当前基线相比不出现明显的持续性能退化；不要求绝对 FPS 门槛。
