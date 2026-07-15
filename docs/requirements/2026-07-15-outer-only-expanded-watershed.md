# Requirement / 需求

## Summary / 概要

Keep all newly added watershed features inside the eight expanded terrain cells and leave the original center terrain untouched.

将所有新增水系限制在八个扩展地形格内，保持原始中心地形不受影响。

## User Request / 用户需求

Do not add new rivers near the original center map. New river channels should exist only in the subsequently added terrain regions.

原有中心地图附近不要新增河道，只在后续扩展的区域内新增河道。

## Scope / 范围

- Move the eight expanded watershed sources outside the original 2048-by-2048 center cell.
- Replace center-crossing cascade paths with short outer-cell headwaters.
- Preserve the existing outer lakes, tributaries, collectors, and basin topology.
- Do not change the original center map's authored water system.

- 将八个扩展流域源头移到原始 2048×2048 中心格之外。
- 用位于外圈格内的短源头河段替换穿越中心区的瀑布河段。
- 保留现有外圈湖泊、支流、汇流主干和流域拓扑。
- 不改动原始中心地图已有的水系。

## Acceptance Criteria / 验收标准

- Every expanded-river sample and its full terrain influence radius stays outside the original center cell.
- Expanded-water terrain carving returns the input height unchanged at the center and center-cell edges.
- Eight expanded basins, sixteen outer lakes, and forty-eight outer reaches remain present.
- River terrain fitting, watershed topology tests, and the production build pass.

- 每个扩展河流采样点及其完整地形影响半径均位于原始中心格之外。
- 在中心点和中心格边缘，扩展水系开挖函数保持输入高度不变。
- 继续保留八个扩展流域、十六个外圈湖泊和四十八条外圈河段。
- 河道地形拟合、水系拓扑测试和生产构建全部通过。
