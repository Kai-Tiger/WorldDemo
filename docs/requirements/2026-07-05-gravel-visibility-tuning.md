# Gravel Visibility Tuning / 碎石可见性调整

## Requirement / 需求

Make the newly added gravel terrain layer clearly visible in normal gameplay views.

让新加入的碎石地形层在正常游戏视角下清晰可见。

## Summary / 概要

The gravel layer mask now provides broader lowland flat-ground coverage instead of appearing only in sparse noise patches. Gravel color blending and normal influence were strengthened while keeping water, riverbed, wet-shore, rock, and snow material overrides intact.

碎石层 mask 现在会在低地平缓区域提供更广的覆盖，而不是只出现在稀疏噪声斑块里。碎石颜色混合和 normal 影响被增强，同时保留水体、河床、湿岸、岩石和雪地材质的现有覆盖规则。

## User Request / 用户需求

"Why didn't I see it?"

"我怎么没看到。"

## Scope / 范围

Tune only the gravel shader mask, color blend strength, and normal blend strength. Do not change texture assets, terrain geometry, height data, water systems, vegetation placement, lighting, player behavior, or camera behavior.

只调整碎石 shader mask、颜色混合强度和 normal 混合强度。不改变贴图资产、地形几何、高度数据、水系、植被放置、光照、玩家行为或相机行为。

## Acceptance Criteria / 验收标准

- Lowland flat terrain shows a more obvious gravel surface layer.
- Gravel still blends spatially instead of replacing all ground uniformly.
- Gravel normal detail is stronger on gravel-covered areas.
- Existing water, riverbed, wet-shore, rock, and snow overrides remain applied after gravel blending.
- `npm run build` completes successfully.

- 低地平缓地形会显示更明显的碎石表面层。
- 碎石仍以空间混合方式出现，而不是统一替换所有地面。
- 碎石覆盖区域的 normal 细节更强。
- 现有水体、河床、湿岸、岩石和雪地覆盖规则仍在碎石混合之后生效。
- `npm run build` 成功完成。
