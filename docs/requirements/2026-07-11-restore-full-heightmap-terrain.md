# Requirement / 需求

Restore the active world to the full 2048 by 2048 meter heightmap terrain.

将实际运行世界恢复为完整的 2048 x 2048 米高度图地形。

# Summary / 概要

The terrain, vegetation, player boundary, and small-lake filtering use the full heightmap extent again instead of retaining only the centered 1536m region. Existing terrain chunk streaming and world coordinates remain unchanged.

地形、植被、玩家边界和小湖过滤重新使用完整高度图范围，不再只保留中心 1536 米区域。现有地形分块流式加载和世界坐标保持不变。

# User Request / 用户需求

The user requested that the project display the complete heightmap terrain and stop keeping only its center region.

用户要求项目展示完整的高度图地形，不再只保留中心区域。

# Scope / 范围

Restore the shared active map size from 1536m to the heightmap's original 2048m world extent. Do not modify or resample the heightmap asset, change terrain resolution, move authored landmarks, or replace the existing chunk streaming system.

将共享的实际地图尺寸从 1536 米恢复为高度图原始的 2048 米世界范围。不修改或重采样高度图资源，不改变地形精度，不移动既有地标，也不替换现有分块流式加载系统。

# Acceptance Criteria / 验收标准

- Active terrain generation covers the complete 2048m heightmap world extent.
- Terrain remains divided into 256m chunks and streams dynamically.
- Grass, trees, player movement bounds, terrain effects, and small-lake filtering use the restored full-map bounds.
- Heightmap sampling coordinates and existing authored feature positions remain unchanged.
- Automated tests and the production build succeed.

- 实际地形生成覆盖完整的 2048 米高度图世界范围。
- 地形继续按 256 米分块并动态流式加载。
- 草、树、玩家移动边界、地形效果和小湖过滤使用恢复后的完整地图边界。
- 高度图采样坐标和现有人工布置内容的位置保持不变。
- 自动化测试和生产构建成功。
