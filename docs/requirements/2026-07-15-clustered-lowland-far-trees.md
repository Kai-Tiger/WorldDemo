# Clustered Lowland Far Trees / 聚拢的低地远景树

## Requirement / 需求

中文：平坦低地上的远景树应形成更明显的林团和林间空地，不应继续近似均匀地散布。

English: Distant trees on flat lowlands should form clearer groves and open gaps instead of remaining approximately evenly scattered.

## Summary / 概要

中文：为低地远景树增加连续的大尺度聚类遮罩，将候选树集中到约 250–500 米尺度的自然林团中，同时保持整体树量和单批次渲染方式基本不变。

English: Add a continuous large-scale clustering mask for lowland distant trees, concentrating candidates into natural groves at roughly 250–500 meter scales while keeping the overall count and single-batch rendering approach broadly unchanged.

## User Request / 用户需求

中文：用户希望平地上的树木分布可以再聚拢一些。

English: The user requested more clustered tree distribution on flat terrain.

## Scope / 范围

中文：只改变低地远景树的空间接受概率；保留现有远景树颜色、尺寸、河湖与山径排除、山地分布、近景高模树和渲染批次设置。

English: Change only the spatial acceptance probability of lowland distant trees. Preserve existing distant-tree colors and sizes, river/lake/trail exclusions, mountain distribution, near detailed trees, and render-batch settings.

## Acceptance Criteria / 验收标准

中文：低地远景树形成连续林团和明显空地；280 米采样区块中的林团峰值高于平均值 1.8 倍，并存在至少 20 个低于平均值 35% 的稀疏区块；总远景树数量仍保持在 20,000–32,000；相关测试、生产构建和浏览器实景检查通过。

English: Lowland distant trees form continuous groves and visible gaps; grove peaks in 280-meter sampling cells exceed 1.8 times the mean and at least 20 sparse cells remain below 35% of the mean; the total distant-tree count stays within 20,000–32,000; and relevant tests, production build, and browser visual checks pass.
