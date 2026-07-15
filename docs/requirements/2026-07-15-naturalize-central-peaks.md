# Naturalize Central Peaks / 中央山峰自然化

## Requirement / 需求

**中文**

降低中央山区过高、过密的锐利峰，并让保留下来的高峰呈现更宽的峰顶和更连贯的主山脊，不改变现有河湖、低地或外围山环。

**English**

Reduce the overly tall, dense sharp peaks in the central mountains and make the remaining high summits broader with more continuous primary ridges, without changing existing rivers, lakes, lowlands, or the outer mountain ring.

## Summary / 概要

**中文**

保留 185 米及以下中央地形原高程。高山区先由约 4 米采样间距的约束场限制高度断层和窄峰坡度，再通过斜率受限的平滑曲线映射，最高为 350 米；山路和峰顶平台最多填高 4 米。这样可保留宽主脊，同时避免高度反转、竖直岩板和绝对高度平台形成的石柱。

**English**

Preserve original central elevations at or below 185 meters. First constrain highland height walls and narrow-peak slopes with a field sampled at approximately four-meter spacing, then apply a slope-limited smooth uplift capped at 350 meters. Trail and summit platforms may fill at most four meters. This preserves broad primary ridges while preventing height inversions, vertical rock fins, and pillars created by absolute-height platforms.

## User Request / 用户需求

**中文**

用户指出锐利峰高度过高，要求砍掉一部分尖峰，并将剩余山体改成更自然的宽峰顶、连续主脊和有层级的沟谷。

**English**

The user found the sharp peaks too tall and requested cutting back some spikes while changing the remaining mountains into more natural broad summits, continuous primary ridges, and layered valleys.

## Scope / 范围

**中文**

- 修改中央高度映射、山路填高限制及其测试，不修改中央高度图资产。
- `h <= 185` 时保持 `H = h`。
- 对 185 米以上区域使用约 4 米间距的低分辨率山体场，将源高程最大坡度限制为 0.55 米/米，并以双线性结果约束全分辨率高度。
- `h > 185` 时采用 `t = clamp((h - 185) / 115)` 和 `H = h + 50 × smoothstep(t)`，局部斜率放大不超过约 1.66 倍。
- 山路和峰顶平台最多填高到自然地表以上 4 米，仍允许向下切削以保持路线可用。
- 保持外围山环 600 米运行时上限以及现有河湖、低地、水位和 X/Z 坐标不变。

**English**

- Change the central height mapping, trail-fill limit, and their tests; do not modify the central heightmap asset.
- Preserve `H = h` when `h <= 185`.
- Above 185 meters, use a low-resolution mountain field sampled at approximately four-meter spacing, limit source-elevation slope to 0.55 meters per meter, and constrain full-resolution height with the bilinear field result.
- When `h > 185`, use `t = clamp((h - 185) / 115)` and `H = h + 50 × smoothstep(t)`, limiting local slope amplification to approximately 1.66×.
- Allow trails and summit platforms to cut downward to keep routes usable, but limit fill to four meters above the natural surface.
- Keep the outer-ring 600-meter runtime limit and all existing rivers, lakes, lowlands, water levels, and X/Z coordinates unchanged.

## Acceptance Criteria / 验收标准

**中文**

- 中央源高程不高于 185 米的结果完全不变。
- 窄峰和垂直源高度断层被展开为连续坡面，而宽阔峰体保持原源高程。
- 中央峰顶不超过 350 米，300 米源高程映射到 350 米。
- 280–300 米的源峰顶连续映射到约 326–350 米，不出现硬截顶或高度反转。
- 240 米源高程映射到约 263 米，整段映射的局部斜率放大低于 1.66 倍。
- 地形扩展测试、完整测试、低地一致性检查和生产构建通过。

**English**

- Central source elevations at or below 185 meters remain exactly unchanged.
- Narrow peaks and vertical source-height walls become continuous slopes, while broad summits preserve their source height.
- Central summits do not exceed 350 meters, and a 300-meter source elevation maps to 350 meters.
- Source summits from 280–300 meters map continuously to approximately 326–350 meters without a hard cap or height inversion.
- A 240-meter source elevation maps to approximately 263 meters, and local slope amplification remains below 1.66× across the curve.
- Terrain-expansion tests, the complete test suite, the lowland consistency check, and the production build pass.
