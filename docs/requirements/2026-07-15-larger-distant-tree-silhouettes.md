# Larger Distant Tree Silhouettes / 放大远景树木轮廓

## Requirement / 需求

Enlarge the low-detail distant tree silhouettes so their visible volume better matches the detailed nearby trees.

放大低细节远景树木轮廓，使其可见体积与近处的高细节树木更一致。

## Summary / 概要

Increase distant-tree height by roughly one third and crown width by roughly one half, while preserving the existing colors, placement density, grove clustering, and single-batch rendering.

将远景树木高度提高约三分之一、树冠宽度提高约二分之一，同时保持现有颜色、分布密度、林团聚类和单批次渲染方式不变。

## User Request / 用户需求

The small color-block trees in the distance look undersized compared with the real volume of the detailed trees and should be enlarged.

远处的小色块树木相对于高细节树木的真实体积显得偏小，需要放大。

## Scope / 范围

- Adjust only the width and height range of the distant tree silhouettes.
- Add a regression check for the resulting instance-size range.
- Do not change tree count, colors, clustering, near-tree models, shadows, or render batching.

- 仅调整远景树木轮廓的宽度和高度范围。
- 为生成后的实例尺寸范围增加回归检查。
- 不修改树木数量、颜色、聚类、近景树模型、阴影或渲染批次。

## Acceptance Criteria / 验收标准

- Distant silhouettes have visibly fuller crowns and greater height.
- Generated widths stay within approximately 4.91–11.81 world units after scale variation.
- Generated heights stay within approximately 11.47–28.33 world units after scale variation.
- Existing density, color, clustering, and one-batch behavior remain unchanged.

- 远景轮廓的树冠明显更饱满，高度明显增加。
- 经过随机缩放后，生成宽度保持在约 4.91–11.81 个世界单位内。
- 经过随机缩放后，生成高度保持在约 11.47–28.33 个世界单位内。
- 现有密度、颜色、聚类和单批次行为保持不变。
