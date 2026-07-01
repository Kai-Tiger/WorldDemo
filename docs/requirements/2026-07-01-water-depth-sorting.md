# Requirement / 需求

Fix water surfaces rendering through foreground trees and grass.

修复水面透过前景树木和草显示的问题。

# Summary / 概要

Vegetation that uses cutout textures must write to the depth buffer so transparent water behind it is occluded correctly. Main water surfaces should use normal transparent sorting instead of forced high render order.

使用裁剪贴图的植被必须写入深度缓冲，让后方透明水体被正确遮挡。主体水面应使用正常透明排序，而不是强制高渲染顺序。

# User Request / 用户需求

The user reported that trees should occlude lake water, but water currently shows through trees like a z-index problem, and suspected all water surfaces have the same issue.

用户反馈树木应该遮挡湖水，但当前湖水会透过树木显示，类似 z-index 问题，并怀疑所有水面都有类似问题。

# Scope / 范围

Update tree and grass materials to alpha-test cutout rendering with depth writes enabled. Remove forced render order from main river, lake, snowmelt, and small-lake water surfaces while keeping overlay effects such as waterfall foam and mist layered.

将树木和草材质改为启用深度写入的 alpha-test 裁剪渲染。移除主河流、湖泊、融雪水流和小湖主体水面的强制渲染顺序，同时保留瀑布泡沫和水雾等叠加效果的层级。

# Acceptance Criteria / 验收标准

- Foreground trees and grass occlude water surfaces behind them.
- River water, lake water, small lakes, and snowmelt streams no longer draw over vegetation solely because of render order.
- Vegetation texture cutouts still render without rectangular leaf or grass cards.
- The production build completes successfully.

- 前景树木和草能够遮挡后方水面。
- 河水、湖水、小湖和融雪水流不会仅因渲染顺序覆盖植被。
- 植被贴图裁剪仍然正常，不出现矩形树叶或草片。
- 生产构建能够成功完成。
