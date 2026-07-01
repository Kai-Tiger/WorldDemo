# Requirement / 需求

Improve the river water surface so it remains transparent while looking more like water, with visible reflection and lightweight reflection-like detail.

改善河流水面效果，让水体保持透明的同时更像真实水面，并具备明显反光和轻量倒影感。

# Summary / 概要

The river water shader should keep showing the riverbed, but the surface needs stronger water presence through clearer blue-green color, higher angle-aware opacity, Fresnel sky reflection, subtle bank reflection, and brighter moving sun highlights.

河流水面 shader 应继续显示河床，但需要通过更清透的蓝绿色、更合理的角度相关透明度、Fresnel 天空反射、轻微岸边倒影和更明显的动态太阳高光来增强水面存在感。

# User Request / 用户需求

The user said the river now has transparency but no longer looks like water, and requested reflection and reflections on the water surface.

用户反馈当前河水已经有透明度，但看起来不像水，并希望水面加上反光和倒影。

# Scope / 范围

This change updates only the existing custom river water material. It does not introduce Three.js `Water.js`, planar reflection rendering, new assets, river geometry changes, terrain carving changes, player logic changes, or screenshot automation.

本次只修改现有自定义河流水面材质。不引入 Three.js `Water.js`、平面反射渲染、新资产、河道几何变化、地形雕刻变化、玩家逻辑变化或自动截图流程。

# Acceptance Criteria / 验收标准

- The riverbed remains visible through the water.
- The water surface has stronger blue-green water color and no longer reads as a pale transparent haze.
- Fresnel reflection makes glancing angles more reflective.
- The water includes subtle sky, bank, and sun highlight reflection cues.
- Shoreline transparency remains soft and broken up.
- Build verification passes.

- 透过水面仍能看到河床。
- 水面具备更明显的蓝绿色水体质感，不再像发白的透明雾层。
- Fresnel 反射让掠射角更有反光。
- 水面包含轻微天空、岸边和太阳高光反射线索。
- 岸边透明过渡仍然柔和且有破碎感。
- 构建验证通过。
