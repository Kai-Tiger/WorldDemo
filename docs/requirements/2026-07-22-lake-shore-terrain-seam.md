# Lake Shore Terrain Seam / 湖岸地形接缝

## Requirement / 需求

The alpine lake shore must not expose large terrain-chunk triangles or solid-color skirt walls when the scene first becomes visible.

高山湖岸在场景首次可见时，不得暴露巨大的地形区块三角裂缝或纯色裙边墙。

## Summary / 概要

Build the spawn neighborhood at its target terrain detail before leaving the loading screen, and stop drawing crack-hiding skirts along shared edges whose loaded chunks already use the same LOD.

在离开加载界面前，以目标地形细节构建出生点邻域；对于两侧已加载且使用相同 LOD 的共享边，不再绘制用于遮缝的地形裙边。

## User Request / 用户需求

The user supplied a lake-shore screenshot showing a large terrain seam and asked for the shore to be checked and corrected.

用户提供了湖岸出现巨大地形接缝的截图，并要求检查和修正湖岸。

## Scope / 范围

- Load the center 3 × 3 terrain chunks with their target LOD and existing feature-detail minimums.
- Hide only same-LOD internal skirt edges after both neighboring chunks are loaded.
- Retain skirts for missing neighbors, different-LOD boundaries, and world edges.
- Preserve terrain heights, lake geometry, water shading, materials, and unrelated pending work.

- 出生点中心 3 × 3 地形区块按目标 LOD 与现有地貌细节下限加载。
- 仅在相邻区块均已加载且 LOD 相同时隐藏内部共享裙边。
- 对缺失邻块、不同 LOD 边界和世界外缘继续保留裙边。
- 保持地形高度、湖面几何、水体着色、材质和无关待提交改动不变。

## Acceptance Criteria / 验收标准

- The non-center chunk containing the alpine lake's west shore starts at the water-system detail floor instead of 32 segments.
- Loaded same-LOD neighbors do not draw skirts on their shared edge.
- A missing or different-LOD neighbor keeps the existing skirt fallback.
- The fixed `shore` view no longer shows the reported large solid-color terrain seam after loading.
- Targeted terrain tests, the full test suite, and the production build pass.

- 包含高山湖西岸的非中心区块启动时遵守水系细节下限，不再使用 32 段网格。
- 已加载的同 LOD 相邻区块不在共享边绘制裙边。
- 缺失邻块或不同 LOD 邻块仍保留现有裙边兜底。
- 固定 `shore` 机位在加载后不再出现截图中的巨大纯色地形接缝。
- 地形定向测试、完整测试集和生产构建全部通过。
