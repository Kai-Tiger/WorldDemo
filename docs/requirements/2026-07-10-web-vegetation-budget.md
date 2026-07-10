# Requirement / 需求

## Summary / 概要

**中文：** 降低草木资源和每帧更新成本，同时增加生态聚类、轮廓变化和远景 LOD。

**English:** Reduce vegetation asset and per-frame update costs while improving ecological clustering, silhouette variation, and distant LOD.

## User Request / 用户需求

**中文：** 用户要求解决十余张 4K 草材质、程序撒点、远景闪烁、树木重复和长期运行资源增长的问题。

**English:** The user requested fixes for the many 4K grass maps, uniform procedural scattering, distant shimmer, repeated trees, and resource growth during long sessions.

## Scope / 范围

**中文：** 生成并使用 2K 必需草地贴图；移除未使用材质通道；远景使用 billboard；草 LOD 使用持久实例缓冲和分帧更新；树木加入生态遮罩、非均匀尺度、轻微倾斜、实例色差、按距离阴影和正确释放。

**English:** Generate and use essential 2K grass maps; remove unused material channels; use billboards at distance; update persistent grass instance buffers incrementally; add ecological masks, nonuniform scale, subtle lean, per-instance color, distance-based tree shadows, and correct disposal.

## Acceptance Criteria / 验收标准

**中文：** 构建通过；首屏不再加载未使用的 grass cavity/gloss/specular/displacement 通道；远景草使用 billboard；质量档控制草距离与保留率；连续移动后实例缓冲数量稳定；树木暗部不依赖高 emissive 发亮。

**English:** The build passes; startup no longer loads unused grass cavity, gloss, specular, or displacement channels; distant grass uses billboards; quality tiers control grass distance and retention; instance buffer counts stabilize during continuous movement; tree shadows remain readable without strong emissive glow.
