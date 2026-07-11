# Requirement / 需求

English: Correct the lake's oversized continuous sunlight reflection and make the surface show natural, broken shimmering highlights.

中文：修正湖面面积过大且连续的太阳反光，让水面呈现自然、破碎的波光粼粼效果。

# Summary / 概要

English: Replace the stacked broad sun-glint lobes with one bounded procedural microfacet highlight, constrain the HDR environment sun peak, and attenuate bright lake-bed visibility according to water depth. The existing low-frequency wave normal continues to drive the general water reflection while a separate animated micro normal creates sparse sun flecks.

中文：将多层叠加的宽太阳高光替换为单层、有上限的程序化微表面高光，约束 HDR 环境太阳峰值，并按水深衰减明亮湖床的可见度。现有低频波浪法线继续控制整体水面反射，独立的动态微法线负责生成稀疏太阳碎闪。

# User Request / 用户需求

English: The user reported that the water reflection looked unreasonable and lacked a sparkling, shimmering quality.

中文：用户反馈水面的反射光不合理，没有波光粼粼的感觉。

# Scope / 范围

English: Update only the shared lake surface shader and its focused regression test. Keep lake geometry, shoreline foam, water colors, river and waterfall shaders, terrain carving, vegetation, player behavior, and unrelated pending work unchanged.

中文：仅更新共享湖面 shader 及其针对性回归测试。保持湖面几何、岸边泡沫、水体配色、河流与瀑布 shader、地形雕刻、植被、玩家行为及无关在途改动不变。

# Acceptance Criteria / 验收标准

English:
- The previous broad, overexposed sunlight patch no longer dominates the lake surface.
- Sunlight appears as sparse, bounded highlights that move with the procedural micro waves.
- HDR environment reflection does not double-count the sun with the explicit sparkle term.
- Deep water suppresses brightly lit lake-bed artifacts while shallow shoreline water remains translucent.
- The lake shader compiles in WebGL without warnings, the focused regression test passes, and the production build succeeds.

中文：
- 原先大面积、过曝的太阳亮斑不再主导湖面。
- 太阳光以稀疏、有上限的碎亮点呈现，并随程序化微波动态移动。
- HDR 环境反射不再与显式碎闪项重复计算太阳能量。
- 深水区抑制被直射光照亮的湖床伪影，岸边浅水仍保持半透明。
- 湖面 shader 在 WebGL 中无警告编译，针对性回归测试通过，生产构建成功。
