# Requirement / 需求

## Summary / 概要

**中文：** 在不扩大 `2048m × 2048m` 地图的前提下，通过更远的可控镜头、远景树木替身、大气透视、连贯山径、观景走廊和自然岩石地标，强化世界的宏大感与玩家的渺小感。

**English:** Strengthen the world's sense of scale and the player's smallness without enlarging the `2048m × 2048m` map, using a farther player-controlled camera, distant tree impostors, atmospheric perspective, a continuous mountain route, vista corridors, and natural rock landmarks.

## User Request / 用户需求

**中文：** 用户要求实施既定方案：保持地图和玩法尺度不变，改善拉远镜头及其地形碰撞，让远程固定机位优先获得完整地形，启用分质量档的远景森林，补齐东峰登山连接线，建立三条自然观景走廊与三组巨型岩石地标，并增加三个用于视觉验收的固定机位。

**English:** The user requested implementation of the agreed plan: preserve the map and gameplay scale, improve the zoomed-out camera and terrain collision, prioritize complete terrain around remote fixed shots, enable quality-tiered distant forests, complete the east-peak trail connection, establish three natural vista corridors and three groups of giant rock landmarks, and add three fixed shots for visual acceptance.

## Scope / 范围

**中文：** 将第三人称最大距离调整为 18 米、远裁剪面调整为 2400 米并提高碰撞采样；让地形 LOD 与构建队列跟随玩家或固定机位焦点；从四个现有树模型运行时生成透明图集，并按同一放置数据确定性抽取约 35% 的远景 billboard；调整雾和大气层次；添加东峰连接路线、树木排除走廊、七处大型岩石布置和 `scale-spawn`、`scale-east`、`scale-south` 三个机位。地图边界、角色尺寸、移动速度、河湖网络、存档格式和玩家镜头控制权保持不变。

**English:** Set the third-person maximum distance to 18 meters, the far clipping plane to 2400 meters, and increase collision sampling; make terrain LOD and build priority follow the player or fixed-shot focus; generate a transparent runtime atlas from the four existing tree models and deterministically select about 35% of the same placement data for distant billboards; tune fog and atmospheric layering; add the east-peak route connection, tree-exclusion corridors, seven large-rock placements, and the `scale-spawn`, `scale-east`, and `scale-south` shots. Preserve map bounds, character size, movement speed, river and lake networks, save compatibility, and player camera control.

## Acceptance Criteria / 验收标准

**中文：** 默认、最近和最远镜头距离分别保持 6 米、3 米和 18 米，拉远时不会穿入山坡；跨越 256 米区块后地形焦点及构建优先级正确更新，远程固定机位不会出现地形缺口；树木图集索引、确定性抽样、质量档距离及近远景过渡通过单元测试；新路线连续且排除植被，岩石地标距离山径核心线至少 5 米；三个固定机位均可解析，玩家高度不超过画面约 8%，画面具备近、中、远层次且无天空裂缝、漂浮地形、黑块或明显树木跳变；Balanced 中位帧耗时满足 33.3ms 预算且相对基线回退不超过 10%；`npm test` 与 `npm run build` 通过。

**English:** Default, minimum, and maximum camera distances remain 6, 3, and 18 meters, with no hillside penetration when zoomed out; terrain focus and build priority update correctly after crossing a 256-meter chunk, and remote fixed shots show no terrain gaps; unit tests cover atlas indexing, deterministic sampling, quality-tier distances, and near/far tree transitions; the new route is continuous and excludes vegetation, while landmarks remain at least 5 meters from trail centerlines; all three fixed shots resolve, keep the player at no more than about 8% of frame height, contain foreground, midground, and background layers, and show no sky cracks, floating terrain, black blocks, or obvious tree popping; Balanced median frame time stays within the 33.3ms budget and regresses by no more than 10% from baseline; `npm test` and `npm run build` pass.
