# Requirement / 需求

- English: End both terminal-lake inlets exactly at the circular shoreline, with every river contribution fading out over the final four meters outside the lake.
- 中文：让两个入湖河道精确终止于圆形湖岸线，所有河流影响均在湖外最后四米内渐隐结束。

## Summary / 概要

- English: The east lowland stream and west Hero river share one signed-distance transition: full strength four meters outside shore, about half strength two meters outside, and strictly zero at the shoreline and everywhere inside the terminal lake. The lake surface and circular basin exclusively own the lake interior.
- 中文：东侧低地溪流和西侧 Hero 主河共用同一套有符号距离过渡：岸外四米为完整强度、岸外两米约为半强度、湖岸及湖内所有位置严格为零。湖内完全由湖面和圆形湖盆接管。

## User Request / 用户需求

- English: Remove the river-shaped strips that still extend from both inlets into the terminal lake; reaching the lake edge must mean zero river influence, not the beginning of an overlap toward the lake center.
- 中文：移除两个入口仍伸入终点湖的河道形条带；到达湖边时河流影响必须已经为零，而不是从湖边开始继续向湖心重叠。

## Scope / 范围

- English: Apply the shared outside-shore fade to water geometry, flowing-water coverage, riverbed, wet-bank, gravel, underwater, disturbance, vegetation, and terrain-channel masks, including every Hero reach whose wide bank corridor touches the lake. Trim both terminal water meshes at the circular shoreline, discard zero-coverage flowing-water fragments, align the Hero surface to the 1.6-meter lake level before shore, and blend each channel bed into the lake-edge basin height over the same four meters. Re-bake the deterministic lowland heightmap. Preserve the authored river paths, non-terminal reaches outside the lake transition, lake mesh, lake shader, and unrelated terrain behavior.
- 中文：将统一的岸外渐隐应用到水面几何、流水覆盖率、河床、湿岸、砾石、水下、扰动、植被及地形河槽遮罩，并覆盖所有宽岸带可能触及湖面的 Hero 河段。两条末段水面网格均在圆形湖岸结束，零覆盖率的流水片元直接丢弃，Hero 水面在岸前对齐到 1.6 米湖水位，并让两条河槽在同一四米范围内抬升并融合到湖岸湖盆高度。重新确定性烘焙低地高度图。保留既有河流路径、湖泊过渡区外的非末端河段、湖泊网格、湖泊 Shader 及无关地形行为。

## Acceptance Criteria / 验收标准

- English: For both inlets, river fade is 1.0 four meters outside shore, approximately 0.5 two meters outside, and exactly 0 at shore, inside shore, and at lake center. Terminal geometry has no vertices inside the circular boundary and its final row has zero fade. A full-circle scan confirms that every river material and terrain mask is zero throughout the lake interior, including adjacent non-terminal bank corridors. Longitudinal and lateral terrain samples rise smoothly toward shore, match the circular lake basin at the boundary, and contain no rectangular deep channel inside the lake. Targeted and full tests, deterministic lowland bake verification, production build, diff validation, and fresh-scene overhead/opposing-oblique visual checks pass.
- 中文：两个入口的河流渐隐均在岸外四米为 1.0、岸外两米约为 0.5，并在湖岸、岸内及湖心精确为 0。末段几何没有顶点进入圆形边界，最终行渐隐为零。整圆扫描确认湖内所有河流材质与地形遮罩均为零，包括相邻非末端河段的宽岸带。纵向和横向地形采样在岸外平滑变浅，在边界与圆形湖盆一致，且湖内不存在矩形深槽。定向与完整测试、确定性低地烘焙校验、生产构建、差异检查以及全新场景的俯视和相反斜俯视视觉检查全部通过。
