# Requirement / 需求

**English:** Raise the outer mountain system by roughly 50% and increase the vertical separation between landmark peaks and the continuous ridge.

**中文：** 将外围山系整体提高约 50%，并进一步拉开地标主峰与连续山脊之间的高度差。

## Summary / 概要

**English:** Raise the continuous ridge base from 160 to 240 meters, scale the landmark summits from 225–300 meters to 337.5–450 meters, and preserve low plains by slightly narrowing the ridge footprint.

**中文：** 将连续山脊基础高度从 160 米提高到 240 米，把地标主峰从 225–300 米提高到 337.5–450 米，并通过略微收窄山脊影响范围来保留低地平原。

## User Request / 用户需求

**English:** Make the outer mountains about 50% taller overall and create a larger height difference between the high peaks and the connecting ridge.

**中文：** 外围的山总体再高约 50%，同时让高峰和连接山脊之间的高度差更明显。

## Scope / 范围

- **English:** Scale the authored landmark summit elevations by 1.5 while retaining their existing footprints and pointed profiles.
- **中文：** 将已配置的地标主峰高度按 1.5 倍缩放，同时保留现有占地范围和尖顶剖面。
- **English:** Raise the continuous ridge base to 240 meters, keep its secondary crest below 300 meters, and narrow its inner and outer falloff enough to avoid lifting outer lowland centers.
- **中文：** 将连续山脊基础高度提高到 240 米，把次级脊峰控制在 300 米以内，并适当收窄内外坡影响范围，避免抬高外围低地中心。
- **English:** Separate the 300-meter heightmap encoding range from the 450-meter runtime terrain ceiling, including chunk bounds, shadow-proxy bounds, and single-cascade shadow fitting.
- **中文：** 将 300 米高度图编码范围与 450 米运行时地形上限拆分，并同步更新区块包围体、阴影代理包围体和单级阴影拟合范围。
- **English:** Preserve the center heightmap scale, terrain brush scale, lowland water layout, rolling foothills, and existing mountain footprints.
- **中文：** 保持中央高度图比例、地形笔刷比例、低地水系布局、缓丘和现有山体占地范围不变。

## Acceptance Criteria / 验收标准

- **English:** The continuous perimeter ridge remains unbroken and reaches at least 230 meters in every sampled direction.
- **中文：** 连续外围山脊保持无断口，并在每个采样方向达到至少 230 米。
- **English:** Landmark summits range from 337.5 to 450 meters and each stands more than 75 meters above the highest of four nearby ridge samples outside its footprint.
- **中文：** 地标主峰高度位于 337.5–450 米之间，并且每座主峰都比自身占地范围外四个邻近山脊采样点中的最高值高出 75 米以上。
- **English:** Outer terrain-cell centers remain at or below 55 meters, and the original center terrain remains unchanged.
- **中文：** 外围地形区块中心保持在 55 米或以下，原始中央地形保持不变。
- **English:** Runtime terrain reaches the 450-meter summit without clipping, while heightmap decoding and editing remain capped at 300 meters; generated chunk bounds contain all raised vertices and single-cascade shadows cover the new height range.
- **中文：** 运行时地形可达到 450 米峰顶且不被裁平，同时高度图解码和编辑仍保持 300 米上限；生成的区块包围体包含全部抬高后的顶点，单级阴影覆盖新的高度范围。
- **English:** Focused tests, the full test suite, the production build, and a fixed-camera visual check pass.
- **中文：** 定向测试、完整测试套件、生产构建和固定机位实景检查全部通过。
