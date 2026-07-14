# All Lake River Boundaries / 全部湖泊河流边界

## Requirement / 需求

All rivers connected to a static lake must stop exactly at that lake's authored shoreline. River surfaces, beds, channels, wet banks, gravel, underwater masks, and flow masks must have no footprint inside the lake.

所有连接静态湖泊的河流都必须精确终止于该湖泊的实际岸线。河面、河床、河槽、湿岸、砾石、水下遮罩及流动遮罩不得在湖内留下任何河流足迹。

## Summary / 概要

Use one shared analytic lake-boundary model for lake geometry, river geometry, terrain carving, material masks, and the flowing-water shader. Each connected river remains at full strength four metres outside the shore, fades to approximately half strength two metres outside, reaches zero on the shoreline, and stays zero everywhere inside the lake. River water levels and channel beds transition smoothly to the receiving lake before the shore.

湖泊几何、河流几何、地形切槽、材质遮罩和流水着色器统一使用同一套解析湖岸边界。所有连接河流在岸外四米保持满强度、岸外两米约为半强度、岸线处归零，并在湖内始终为零；河流水位与河床在抵达岸线之前平滑衔接至湖泊。

## User Request / 用户需求

Inspect every lake in the scene and batch-fix the angle-dependent dark river strips and channel seams caused by river geometry or materials extending into lake water.

检查场景中的全部湖泊，批量修复因河道几何或材质伸入湖水而产生的、随观察角度出现或消失的深色条带与河槽接缝。

## Scope / 范围

- Cover all ten static lake surfaces: Alpine Lake, Cirque Tarn, the Terminal Lake, three northern/eastern lowland lakes, and four southern lakes.
- Apply the same shoreline rule to all fourteen river-network lake endpoints and the independent Alpine Lake outlet.
- Align lake outer rings, river terminal rows, flowing-water clipping, terrain beds, wet/gravel/underwater masks, and vegetation exclusions to the shared boundary.
- Preserve the waterfall plunge pool as a flowing-river feature because it does not have an independent static lake surface.
- Re-bake the deterministic lowland heightmap after the terrain transition changes.

- 覆盖全部十个静态湖面：高山湖、冰斗湖、终点湖、北部/东部三个低地湖及南部四个湖。
- 对十四个河网湖泊端点及高山湖独立出口应用相同的岸线规则。
- 将湖面外环、河流末端行、流水裁剪、河床地形、湿岸/砾石/水下遮罩及植被排除统一到共享边界。
- 瀑布冲潭没有独立静态湖面，继续作为流水河道功能保留。
- 地形过渡修改后重新确定性烘焙低地高度图。

## Acceptance Criteria / 验收标准

- For every static lake and connected river, river influence is `1` at four metres outside, approximately `0.5` at two metres outside, and `0` on the shore and everywhere inside.
- Every lake-connected river mesh terminates on the analytic shoreline with a fully transparent terminal row and no visible triangle crossing into the lake.
- River water meets the lake surface at the same elevation, and the last twelve metres blend smoothly to that elevation where required.
- River beds rise smoothly to the lake edge bed during the last four metres; the lake owns all terrain at and inside the shore, with no rectangular trench or height discontinuity.
- River-only material masks are zero on and inside every lake boundary.
- The deterministic heightmap, automated tests, lowland validation, production build, and whitespace validation all pass.
- Visual checks from overhead and oblique angles show no dark strip, straight cutoff, z-fighting, or river outline inside any static lake.

- 对每个静态湖及其连接河流，河流影响在岸外四米为 `1`、岸外两米约为 `0.5`、岸线及湖内任意位置为 `0`。
- 所有连接湖泊的河面网格都在解析岸线上结束，末端行完全透明，且没有可见三角形跨入湖内。
- 河面在岸线处与湖面等高；需要调平的末段在最后十二米内平滑过渡到湖面高度。
- 河床在岸外最后四米平滑抬升到湖岸床；岸线及湖内地形完全由湖盆接管，不出现矩形深槽或高度断层。
- 所有仅属于河流的材质遮罩在每个湖泊岸线及湖内均为零。
- 确定性高度图、自动化测试、低地校验、生产构建及空白检查全部通过。
- 从俯视与斜视角观察时，任何静态湖内都不得出现深色条带、直线断口、深度闪烁或河道轮廓。
