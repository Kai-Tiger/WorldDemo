# Requirement / 需求

Soften the waterfall base transition so the plunge area no longer reads as a horizontal white slab or round mist ball, while keeping the current river and waterfall alignment intact.

柔化瀑布底部过渡，让冲潭区域不再呈现水平白色平板或球形雾团，同时保持当前河流与瀑布口的对齐结果不变。

# Summary / 概要

The waterfall confluence foam should become a narrower downstream foam tongue with broken edges and softer alpha. Mist should stay close to the falling water line and support the vertical waterfall instead of covering it. The downstream river entrance should fade in along its length to hide the hard blue rectangular edge.

瀑布汇流泡沫应改为更窄的顺流泡沫拖尾，带破碎边缘和更柔和的透明度。水雾应贴近落水线，只作为竖向瀑布的辅助层，而不是遮住瀑布。下游河道入口需要沿纵向淡入，以弱化蓝色矩形硬边。

# User Request / 用户需求

The user reported that the lower river edge was not adjusted and the waterfall shape looked like a ball. They asked for a more natural waterfall base and softer transition between the waterfall and downstream river.

用户反馈瀑布下方河道边缘没有调整，而且瀑布形状像个球，希望瀑布底部更自然，并让瀑布与下游河道之间的衔接更柔和。

# Scope / 范围

Update the existing waterfall confluence foam material and mist particle settings in `src/waterSystem.js`. Add a start fade and subtle foam tint to the existing `RiverWater` shader in `src/riverChannel.js`. Do not move the river path, waterfall lip, terrain carving, or water levels, and do not add new textures or particle systems.

更新 `src/waterSystem.js` 中现有的瀑布汇流泡沫材质和水雾粒子参数。在 `src/riverChannel.js` 的现有 `RiverWater` shader 中加入起点淡入和轻微泡沫混色。不移动河道路径、瀑布口、地形雕刻或水位，也不新增贴图或粒子系统。

# Acceptance Criteria / 验收标准

`npm run build` passes. The waterfall base no longer shows a horizontal white slab. The mist no longer forms a round ball and the vertical falling water remains visible. The downstream river entrance fades in with a softer foam transition instead of a hard blue rectangular edge. The waterfall lip remains aligned with the upstream river.

`npm run build` 通过。瀑布底部不再出现水平白色平板。水雾不再形成圆球，竖向落水仍清晰可见。下游河道入口通过更柔和的泡沫过渡淡入，不再出现蓝色矩形硬边。瀑布口与上游河流保持对齐。
