# Naturalize Central Peaks / 中央山峰自然化

## Requirement / 需求

**中文**

降低中央山区过高、过密的锐利峰，并让保留下来的高峰呈现更宽的峰顶和更连贯的主山脊，不改变现有河湖、低地或外围山环。

**English**

Reduce the overly tall, dense sharp peaks in the central mountains and make the remaining high summits broader with more continuous primary ridges, without changing existing rivers, lakes, lowlands, or the outer mountain ring.

## Summary / 概要

**中文**

保留 185 米及以下中央地形原高程。高山区先以约 24 米半径的宽尺度采样压掉孤立针峰，再通过带顶部压缩的平滑曲线映射，最高为 350 米。宽尺度采样保留大于该尺度的主山脊并平滑高频沟壑，顶部压缩进一步削弱极端高值，从而形成更宽的峰顶和更清晰的山脊—沟谷层级。

**English**

Preserve original central elevations at or below 185 meters. First apply a broad sample over an approximately 24-meter radius in the highlands to remove isolated needles, then map the result through a smooth summit-compressing curve capped at 350 meters. The broad sample preserves primary ridges larger than that scale while smoothing high-frequency gullies, and the summit curve further compresses extreme values to create broader summits and a clearer ridge-to-valley hierarchy.

## User Request / 用户需求

**中文**

用户指出锐利峰高度过高，要求砍掉一部分尖峰，并将剩余山体改成更自然的宽峰顶、连续主脊和有层级的沟谷。

**English**

The user found the sharp peaks too tall and requested cutting back some spikes while changing the remaining mountains into more natural broad summits, continuous primary ridges, and layered valleys.

## Scope / 范围

**中文**

- 仅修改中央高度映射函数及其测试，不修改中央高度图资产。
- `h <= 185` 时保持 `H = h`。
- 对 185 米以上区域使用 12 米间距的 5×5 高斯权重采样（约 24 米半径），从 185–240 米平滑混入，压低孤立尖峰并保留宽主脊。
- `h > 185` 时采用 `t = clamp((h - 185) / 115)`、`s = smootherstep(t)` 和 `H = lerp(h, 350, s³)`。
- 保持外围山环 600 米运行时上限以及现有河湖、低地、水位和 X/Z 坐标不变。

**English**

- Change only the central height-mapping function and its tests; do not modify the central heightmap asset.
- Preserve `H = h` when `h <= 185`.
- Above 185 meters, smoothly blend in a 5×5 Gaussian-weighted sample at 12-meter spacing (approximately a 24-meter radius) over the 185–240-meter band, suppressing isolated needles while retaining broad primary ridges.
- When `h > 185`, use `t = clamp((h - 185) / 115)`, `s = smootherstep(t)`, and `H = lerp(h, 350, s³)`.
- Keep the outer-ring 600-meter runtime limit and all existing rivers, lakes, lowlands, water levels, and X/Z coordinates unchanged.

## Acceptance Criteria / 验收标准

**中文**

- 中央源高程不高于 185 米的结果完全不变。
- 约 24 米尺度内的孤立高值显著降低，而同高度的宽阔峰体保持原源高程。
- 中央峰顶不超过 350 米，300 米源高程映射到 350 米。
- 280–300 米的极端源峰顶被连续压缩到约 343–350 米，不出现硬截顶或高度反转。
- 240 米源高程保持在 240–260 米之间，避免整片高山区被整体抬成高墙。
- 地形扩展测试、完整测试、低地一致性检查和生产构建通过。

**English**

- Central source elevations at or below 185 meters remain exactly unchanged.
- Isolated high values within the approximately 24-meter smoothing scale are substantially reduced, while broad summits at the same elevation preserve their source height.
- Central summits do not exceed 350 meters, and a 300-meter source elevation maps to 350 meters.
- Extreme source summits from 280–300 meters are continuously compressed to approximately 343–350 meters without a hard cap or height inversion.
- A 240-meter source elevation remains between 240 and 260 meters so the entire highland region is not lifted into a wall.
- Terrain-expansion tests, the complete test suite, the lowland consistency check, and the production build pass.
