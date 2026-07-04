# Requirement / 需求

Make backlit trees easier to tune when they still appear too dark.

让逆光下仍然过暗的树木可以通过明确参数调节。

# Summary / 概要

Expose tree shadow lift color and intensity as vegetation configuration values instead of keeping the effective emissive settings hidden inside tree placement code.

将树木暗部补光颜色和强度暴露为植被配置项，不再把实际 emissive 设置隐藏在树木放置代码里。

# User Request / 用户需求

The user reported that trees are still too dark when viewed against the light and asked whether there are parameters that can be configured.

用户反馈树木逆光时仍然太黑，并询问是否有参数可以配置。

# Scope / 范围

Only tree material readability is changed. Global lighting, grass, terrain, water, and tree placement behavior are out of scope.

本次只调整树木材质可读性配置。全局光照、草地、地形、水体和树木放置逻辑不在范围内。

# Acceptance Criteria / 验收标准

- Tree backlight readability is controlled by named configuration values.
- Increasing or decreasing the tree shadow lift does not require editing tree placement implementation code.
- The project build succeeds.

- 树木逆光可读性由具名配置项控制。
- 调高或调低树木暗部补光不需要修改树木放置实现代码。
- 项目构建成功。
