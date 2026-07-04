# Requirement / 需求

Improve tree and grass readability in backlit or shadowed views.

改善逆光或阴影视角下树木和草地的可读性。

# Summary / 概要

This change lowers the visual harshness of vegetation shadows by keeping tree exposure compensation and adding a grass-only dark-side lift without increasing global scene lighting.

本次变更通过保留树木曝光补偿，并为草地增加专用暗部提亮，降低植被阴影过黑的问题，同时不提高全局场景光照。

# User Request / 用户需求

The user reported that trees and grass are too dark in backlit conditions and chose a shadow-reduction approach.

用户反馈逆光情况下树木和草地都太暗，并选择了降低阴影影响的处理方向。

# Scope / 范围

Update vegetation material readability only. Do not change sun direction, hemisphere light strength, terrain lighting, water lighting, sky, leaf decals, enemy assets, or unrelated scene setup.

仅更新植被材质可读性。不修改太阳方向、半球光强、地形光照、水体光照、天空、落叶贴花、敌人资源或无关场景设置。

# Acceptance Criteria / 验收标准

- Trees retain shadow readability compensation through tree exposure.
- Grass materials receive dark-side lift in both animated and simple LOD materials.
- Vegetation remains directionally shaded and does not become flat.
- Global scene lighting is not increased.
- Build verification passes.
- Screenshot review confirms backlit trees and grass no longer collapse into black.

- 树木通过树木曝光补偿保留阴影可读性。
- 草地动画材质和简化 LOD 材质都获得暗部提亮。
- 植被仍保留方向性明暗，不变成平面色。
- 不提高全局场景光照。
- 构建验证通过。
- 截图复查确认逆光树木和草地不再黑成一片。
