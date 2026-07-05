# Requirement / 需求

Improve the main lake shoreline foam so it no longer looks like a uniform white ring, and add occasional wind-ruffled motion to the lake surface.

优化主湖岸边泡沫，让它不再像一圈均匀的白色边框，并为湖面增加偶尔被风吹皱的动态感觉。

# Summary / 概要

The main lake shader now uses a more selective shoreline foam mask based on edge position, water depth, and low-frequency breakup noise. The lake surface also gains lightweight wind pulses that briefly strengthen fine ripples, reflections, and sun sparkle without changing the lake geometry.

主湖 shader 现在使用更有选择性的岸线泡沫遮罩，由边缘位置、水深和低频破碎噪声共同控制。湖面也加入了轻量阵风脉冲，会短暂增强细碎水纹、反射和阳光闪烁，但不改变湖面几何。

# User Request / 用户需求

The user said the foam around the lake edge looks fake and asked for the lake surface to occasionally feel ruffled by wind.

用户反馈湖水边缘的泡沫太假，并希望湖面偶尔有被风吹皱的感觉。

# Scope / 范围

Update only the main lake surface shader visual behavior. Do not change lake geometry, terrain carving, water level, player logic, outlet stream, waterfall, snowmelt runoff, small lakes, or unrelated pending user changes.

仅更新主湖水面 shader 的视觉表现。不修改湖面几何、地形雕刻、水位、玩家逻辑、出口溪流、瀑布、雪融水、小湖或无关的用户未提交改动。

# Acceptance Criteria / 验收标准

`npm run build` passes. The main lake shoreline foam appears thinner, more broken, and less uniformly circular from the overview camera angle. The lake surface keeps its calm base state while occasionally showing subtle wind-ruffled fine ripples and highlights. Outlet stream, waterfall, snowmelt runoff, and small lakes are not intentionally changed.

`npm run build` 通过。从俯视视角看，主湖岸边泡沫更薄、更破碎，不再形成均匀圆环。湖面保持平静基调，同时偶尔出现细微的阵风皱纹和高光变化。出口溪流、瀑布、雪融水和小湖不被有意改变。
