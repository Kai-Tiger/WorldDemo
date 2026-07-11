# Requirement / 需求

Increase the existing near-grass sway amplitude so the motion is visible from the normal third-person camera without making distant grass move.

提高现有近景草地的摆动幅度，使其在正常第三人称视角下清晰可见，同时不让远景草参与摆动。

# Summary / 概要

Raise the close-range grass motion scale and the weaker near-field wind contribution while preserving the existing frequency, coherent wind direction, and 20-meter cutoff.

提高近身草地的运动倍率和普通近景的弱风贡献，同时保留现有频率、统一风向和 20 米截止范围。

# User Request / 用户需求

The user reported that the grass movement was imperceptible and asked for a larger sway amplitude.

用户反馈完全感觉不到草地晃动，并要求增大摆动幅度。

# Scope / 范围

Update only grass sway amplitude multipliers and their focused tests. Do not change grass density, placement, animation frequency, wind direction, LOD distances, models, textures, trees, terrain, water, lighting, or post-processing.

仅更新草地摆动幅度倍率及其针对性测试。不修改草地密度、分布、动画频率、风向、LOD 距离、模型、贴图、树木、地形、水体、光照或后处理。

# Acceptance Criteria / 验收标准

- Grass tips within two meters can move by approximately 2.8 centimeters at peak sway.
- Grass from two to fourteen meters receives approximately 1.5 centimeters of peak regional movement.
- Sway still fades from fourteen to twenty meters and remains disabled on mid/far LODs.
- Existing wind timing, direction coherence, placement, and appearance remain unchanged.
- `npm test` and `npm run build` pass with no browser shader errors.

- 两米内草尖的峰值摆幅约为 2.8 厘米。
- 两米到十四米的草获得约 1.5 厘米的区域峰值摆幅。
- 摆动仍在十四到二十米之间淡出，并继续禁用于中远景 LOD。
- 现有风动节奏、统一风向、分布和外观保持不变。
- `npm test` 和 `npm run build` 通过，浏览器无 Shader 错误。
