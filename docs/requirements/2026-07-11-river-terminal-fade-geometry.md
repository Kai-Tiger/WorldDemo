# Requirement / 需求

Stop generating river-water geometry after its terminal-lake visual fade has become fully transparent, while preserving the authored river path and all visible water behavior.

在河道水面进入终点湖的视觉渐隐完全透明后停止生成几何，同时保留既定河道路径和所有可见水体行为。

# Summary / 概要

Add an internal maximum-distance boundary to channel-strip generation. Apply it only to the river-water mesh at the terminal-lake entry distance plus the existing four-meter alpha fade. Continue deriving curve positions and longitudinal UVs from true path distance, and leave wet-bank geometry at full channel length.

为河道条带几何生成增加内部最大距离边界。该边界仅用于河道水面，位于终点湖入口距离加现有四米 alpha 渐隐之后。曲线位置和纵向 UV 继续由真实路径距离派生，湿岸几何仍保留完整河道长度。

# User Request / 用户需求

Remove the invisible river-water tail that continues under the newly added circular terminal lake after the shader fade, without changing flow, water level, foam, shoreline, or the main river route.

移除新增圆形终点湖下方在 Shader 渐隐后仍继续延伸的不可见河道水面尾部，且不改变流向、水位、泡沫、岸线或主河道路径。

# Scope / 范围

- Add an optional internal `maxDistance` to channel-strip geometry sampling, defaulting to the full channel length.
- Limit only the river-water mesh to `terminalLakeEntryDistance + TERMINAL_LAKE_VISUAL_FADE_LENGTH`.
- Place the final geometry row exactly at the zero-alpha boundary and retain the existing maximum longitudinal sampling interval.
- Keep longitudinal UVs proportional to actual path distance so shader flow and fade calculations remain unchanged.
- Preserve the complete wet-bank strip and do not change river control points, terrain carving, material masks, water shaders, foam, lighting, or shoreline parameters.

- 为河道条带几何采样增加可选内部 `maxDistance`，默认使用完整河道长度。
- 仅将河道水面限制到 `terminalLakeEntryDistance + TERMINAL_LAKE_VISUAL_FADE_LENGTH`。
- 最后一行几何精确位于 alpha 归零边界，并保持现有纵向最大采样间隔。
- 纵向 UV 继续与真实路径距离成比，因此 Shader 流向和渐隐计算保持不变。
- 保留完整湿岸条带，不修改河道控制点、地形挖掘、材质遮罩、水体 Shader、泡沫、光照或岸线参数。

# Acceptance Criteria / 验收标准

- The final river-water row is located at the terminal-lake entry distance plus the existing visual-fade length.
- The final row evaluates to zero terminal alpha in the unchanged shader formula.
- Longitudinal UV distance increases monotonically, remains proportional to world-path distance, and retains a maximum row interval of approximately `0.3m`.
- The final water row has already blended to the terminal-lake surface height.
- Wet-bank meshes still reach the original channel endpoint.
- Targeted automated tests and the production build pass.

- 河道水面最后一行位于终点湖入口距离加现有视觉渐隐长度。
- 最后一行使用未改变的 Shader 公式计算时，终点 alpha 为零。
- 纵向 UV 距离单调增加，继续与世界路径距离成比，且行间隔最大仍约为 `0.3m`。
- 最后一行水面已混合到终点湖水面高度。
- 湿岸网格仍到达原始河道终点。
- 针对性自动化测试与生产构建通过。
