# Requirement / 需求

Restore reliable frame timing before measuring and optimizing the rendering pipeline.

在测量和优化渲染管线之前，恢复可信的帧时间统计。

# Summary / 概要

Start the animation loop from `requestAnimationFrame` so its first invocation receives a valid timestamp and the existing FPS HUD remains numeric.

通过 `requestAnimationFrame` 启动动画循环，使首次调用获得有效时间戳，并保证现有 FPS HUD 持续显示数值。

# User Request / 用户需求

Implement the approved performance-repair plan, beginning with a trustworthy FPS baseline and removal of the `fps: NaN` failure.

实施已批准的性能修复方案，首先建立可信的 FPS 基线并消除 `fps: NaN` 故障。

# Scope / 范围

Change only animation-loop startup and document the baseline requirement. Do not alter rendering quality, scene appearance, gameplay, or unrelated worktree changes.

仅修改动画循环的启动方式并记录基线需求。不修改渲染质量、场景外观、玩法或工作区中的无关改动。

# Acceptance Criteria / 验收标准

- The first animation callback receives a valid `requestAnimationFrame` timestamp.
- The FPS HUD no longer becomes `NaN` after startup.
- The production build succeeds.

- 首个动画回调获得有效的 `requestAnimationFrame` 时间戳。
- FPS HUD 启动后不再变为 `NaN`。
- 生产构建成功。
