# Requirement / 需求

English: Add brighter, broken sunlight sparkle to lake water so the surface feels shimmering under the sun.

中文：为湖面增加更明亮、破碎的太阳反光，让水面呈现波光粼粼的感觉。

# Summary / 概要

English: Enhance the existing custom lake water shaders with procedural directional sun glints. The main alpine lake receives the stronger effect, while small lakes use a subtler matching version. No new textures, render passes, geometry, or water pipeline changes are introduced.

中文：在现有自定义湖面水体 shader 中增强程序化方向性太阳碎闪。主高山湖使用更明显的效果，小湖使用更轻的匹配版本。不引入新贴图、渲染 pass、几何体或水体管线改动。

# User Request / 用户需求

English: The user asked for the lake surface to have sunlight reflections similar to sparkling, shimmering water.

中文：用户希望湖面能有太阳反光，类似水面波光粼粼的感觉。

# Scope / 范围

English: Update only the lake-water sun reflection shader logic for the main lake and small lakes. Do not change lake geometry, terrain carving, water colors, foam layout, alpha/depth behavior, outlet streams, waterfall behavior, vegetation, player behavior, UI, or unrelated pending work.

中文：只更新主湖和小湖的湖面太阳反光 shader 逻辑。不修改湖面几何、地形雕刻、水体颜色、泡沫布局、透明度/深度行为、出水溪流、瀑布行为、植被、玩家行为、UI 或无关未提交改动。

# Acceptance Criteria / 验收标准

English:
- The main alpine lake has procedural broken sun glints that animate over time.
- Small lakes have a subtler matching sun sparkle.
- The sparkle uses existing shader uniforms and does not require new assets.
- Shore foam and lake transparency behavior remain unchanged.
- The production build completes successfully.

中文：
- 主高山湖具有随时间变化的程序化破碎太阳碎闪。
- 小湖具有更轻的匹配太阳碎闪。
- 碎闪使用现有 shader uniform，不需要新资产。
- 岸边泡沫和湖面透明行为保持不变。
- 生产构建成功完成。
