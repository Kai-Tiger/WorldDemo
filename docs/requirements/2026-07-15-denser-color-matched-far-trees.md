# Denser Color-Matched Far Trees / 更密集且颜色匹配的远景树

## Requirement / 需求

中文：远景树不能因降级而变成浅白色尖刺，颜色应与近景森林保持一致，并适当增加全图远景树数量。

English: Distant trees must not degrade into pale white spikes. Their colors should remain consistent with the near forest, and the full-world distant tree count should be moderately increased.

## Summary / 概要

中文：将远景树线性色值改为深绿、蓝绿和少量橄榄色调，并把全图采样间距从 36 米缩小到 28 米。远景树仍由一个无阴影的实例批次绘制。

English: Replace the distant-tree linear colors with dark evergreen, blue-green, and a small olive accent palette, and reduce full-world sampling spacing from 36 meters to 28 meters. Distant trees remain in one shadow-free instanced batch.

## User Request / 用户需求

中文：用户认为远景质量下降过度，要求至少保持树木颜色，并增加一些树木数量。

English: The user found the distant quality reduction excessive and requested color continuity plus a higher tree count.

## Scope / 范围

中文：只调整远景树的颜色分布、亮度和采样密度；不改变近景树模型、近景树密度、地形 LOD、河湖排除、山径排除或阴影设置。

English: Adjust only distant-tree color distribution, brightness, and sampling density. Do not change near-tree models, near-tree density, terrain LOD, river and lake exclusions, trail exclusions, or shadow settings.

## Acceptance Criteria / 验收标准

中文：远景树使用与近景森林一致的深色自然色系；平坦测试地形生成 20,000–32,000 棵远景树；全部远景树仍为单批次、每棵两个三角形且不投射阴影；相关测试、生产构建和浏览器实景检查通过。

English: Distant trees use a dark natural palette consistent with the near forest; a flat test terrain produces 20,000–32,000 distant trees; all distant trees remain in one batch with two triangles per tree and no shadows; and relevant tests, production build, and browser visual checks pass.
