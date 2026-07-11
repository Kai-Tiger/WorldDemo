# Requirement / 需求

Centralize the grass wind-sway tuning values so they can be adjusted without editing shader implementation code.

集中管理草地风摆调节参数，使其无需修改 Shader 实现代码即可调整。

# Summary / 概要

Move the user-facing grass sway amplitude, radii, distance fades, regional coherence, detail fade, frequencies, flutter strength, and wind direction into the shared vegetation configuration. Keep shader-specific phase formulas internal.

将用户常用的草地摆幅、半径、距离淡出、区域同步、细节淡出、频率、颤动强度和风向集中到共享植被配置中，同时保留 Shader 内部的相位计算细节。

# User Request / 用户需求

The user asked for configurable grass sway parameters that are convenient to modify.

用户希望草地摆动参数可配置化，方便自行修改。

# Scope / 范围

Update the grass wind configuration exports, consume them in the existing sway shader, include shader-affecting values in the program cache key, and update focused tests. Do not change the current visual defaults, animation range, grass placement, LOD behavior, models, textures, trees, terrain, water, lighting, or post-processing.

更新草地风动配置导出，在现有摆动 Shader 中读取这些参数，将影响 Shader 的数值加入程序缓存键，并更新针对性测试。不改变当前视觉默认值、动画范围、草地分布、LOD 行为、模型、贴图、树木、地形、水体、光照或后处理。

# Acceptance Criteria / 验收标准

- All common grass sway controls are documented together in `vegetationConfig.js`.
- `GRASS_SWAY_STRENGTH` directly represents maximum close-range tip displacement in meters.
- Editing fade, regional, frequency, or flutter configuration changes generated shader source and its cache key.
- Current defaults remain approximately 2.8 centimeters close to the player and 1.5 centimeters across the near field.
- `npm test` and `npm run build` pass.

- 常用草地摆动控制项均集中并记录在 `vegetationConfig.js` 中。
- `GRASS_SWAY_STRENGTH` 直接表示近身草尖最大位移，单位为米。
- 修改淡出、区域、频率或颤动配置会改变生成的 Shader 源码和缓存键。
- 当前默认值仍保持玩家近身约 2.8 厘米、普通近景约 1.5 厘米。
- `npm test` 和 `npm run build` 通过。
