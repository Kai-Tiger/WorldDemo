# Restore Third-Person Camera Pullback / 恢复第三人称相机拉远距离

## Requirement / 需求

Restore the documented eighteen-meter maximum third-person camera pullback while preserving the existing default distance, minimum distance, and terrain-collision behavior.

恢复文档规定的第三人称相机最大十八米拉远距离，同时保持现有默认距离、最小距离和地形碰撞行为。

## Summary / 概要

Correct the camera controller's stale ten-meter maximum so its runtime clamp matches the existing eighteen-meter requirement and tests. No camera movement, pitch, zoom speed, or collision algorithm changes are included.

修正相机控制器中过期的十米上限，使运行时限制与现有十八米需求和测试一致。本次不修改相机移动、俯仰、缩放速度或碰撞算法。

## User Request / 用户需求

Fix the camera implementation after the existing verification exposed a mismatch between the ten-meter runtime maximum and the documented eighteen-meter pullback.

在现有验证发现运行时十米上限与文档规定的十八米拉远距离不一致后，修复相机实现。

## Scope / 范围

- Change only the third-person camera maximum distance from `10` to `18` meters.
- Preserve the `6`-meter default, `3`-meter minimum, input sensitivity, pitch limits, and terrain-collision sampling.
- Do not change river, terrain, player movement, render quality, or fixed-shot behavior.

- 仅将第三人称相机最大距离从 `10` 米改为 `18` 米。
- 保持 `6` 米默认距离、`3` 米最小距离、输入灵敏度、俯仰限制和地形碰撞采样不变。
- 不修改河流、地形、玩家移动、渲染质量或固定镜头行为。

## Acceptance Criteria / 验收标准

- A new controller starts at `6` meters and clamps zoom to the `3–18` meter range.
- Pulling back to `18` meters still stops safely before terrain ridges.
- Camera tests, the full automated test suite, and the production build pass.

- 新控制器以 `6` 米为默认距离，并将缩放限制在 `3–18` 米范围内。
- 拉远至 `18` 米时仍会在地形山脊前安全停止。
- 相机测试、完整自动化测试和生产构建全部通过。
