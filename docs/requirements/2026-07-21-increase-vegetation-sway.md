# Requirement / 需求

Increase the random sway amplitude of grass and trees by 50%.

将草和树木的随机摆动幅度增大 50%。

# Summary / 概要

Raise the shared grass sway strength from `0.06` to `0.09` and the tree canopy sway strength from `0.006` to `0.009`, while preserving the existing frequencies, wind direction, random phases, and distance fades.

将草的统一摆动强度从 `0.06` 提高到 `0.09`，将树冠摆动强度从 `0.006` 提高到 `0.009`，同时保持现有频率、风向、随机相位和距离淡出不变。

# User Request / 用户需求

The user said the current random movement of grass and trees was not strong enough and requested another 50% increase.

用户认为当前草和树木的随机摆动幅度不够大，要求再增大 50%。

# Scope / 范围

Adjust only the grass and tree sway amplitude constants and their targeted assertions. Do not change animation speed, vegetation placement, rendering distance, wind direction, or water and terrain systems.

仅调整草和树木的摆动幅度常量及其针对性断言。不修改动画速度、植被放置、渲染距离、风向或水体与地形系统。

# Acceptance Criteria / 验收标准

- Grass sway strength is exactly 1.5 times its previous value: `0.09`.
- Tree canopy sway strength is exactly 1.5 times its previous value: `0.009`.
- Existing sway frequencies, wind direction, random phases, and distance fades remain unchanged.
- Targeted vegetation tests and the production build pass.

- 草的摆动强度精确为原值的 1.5 倍：`0.09`。
- 树冠摆动强度精确为原值的 1.5 倍：`0.009`。
- 现有摆动频率、风向、随机相位和距离淡出保持不变。
- 针对性植被测试和生产构建通过。
