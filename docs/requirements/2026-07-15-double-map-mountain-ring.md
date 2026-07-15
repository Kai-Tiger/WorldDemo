# Double Map and Outer Mountain Ring / 双倍地图与外围高山环

## Requirement / 需求

**中文**

将可活动地图边长从 2048 米扩大到 4096 米，在不移动现有河湖、出生点、地标和 X/Z 坐标的前提下，将中央高山区自然化为最高约 350 米、带宽缓主脊的山体，并在旧地图外围生成可碰撞、可进入山脚且最外层不可攀越的自然高山环。

**English**

Expand the playable map edge length from 2,048 meters to 4,096 meters without moving existing rivers, lakes, spawn points, landmarks, or X/Z coordinates. Naturalize the central mountains into broader primary ridges capped at approximately 350 meters, and generate a collidable outer mountain ring with explorable foothills and an impassable outer ridge.

## Summary / 概要

**中文**

保留现有 2048 米中央高度图和 300 米源编码标尺。中央 185 米及以下地形保持原高程，高山区以约 4 米间距的坡度约束场消除高度断层，再通过斜率受限的平滑曲线映射，300 米源高程映射到 350 米世界高程；水系与低地结果保持不变。用户提供的第二张灰度高度图将被确定性处理为仓库内的派生高度资产，并以连续环向映射真实驱动旧地图边界外的树状支脉、深谷和弧形主脊；旧边界处仍通过平滑接缝连接中央地形。原始附件不提交，现有中央高度图不被替换或改写。

**English**

Keep the existing 2,048-meter central heightmap and its 300-meter source encoding scale. Terrain at or below 185 meters retains its original elevation. In the highlands, a slope-constrained field sampled at approximately four-meter spacing removes height walls before a slope-limited smooth curve maps a 300-meter source elevation to 350 world meters; water systems and lowlands remain unchanged. The second user-supplied grayscale heightmap is deterministically processed into a derived repository asset and continuously wrapped around the old map to genuinely drive the branching spurs, deep valleys, and curved primary ridgelines of the outer ring. A smooth seam still joins the ring to the central terrain. The raw attachment is not committed, and the existing central heightmap is neither replaced nor rewritten.

## User Request / 用户需求

**中文**

用户认为当前地图范围和山体高度不足，要求将地图边长与最高山体高度扩大到现有规模的两倍，在远处增加一圈更高、更自然的山系；随后明确要求第二张灰度高度图必须真实融合进扩大后的地形，而不是只作为视觉参考。

**English**

The user found the current map and mountains too small and requested doubling both the map edge length and the maximum mountain height, then adding a taller, more natural distant mountain range. The user subsequently clarified that the second grayscale heightmap must be genuinely fused into the expanded terrain rather than used only as visual reference.

## Scope / 范围

**中文**

- 将 `MAP_SIZE` 从 2048 改为 4096，使活动边界扩展到 X/Z 各 ±2048 米；现有中央内容的 X/Z 坐标不缩放、不平移。
- 明确区分 300 米的高度图源编码上限、350 米的中央峰顶上限与 600 米的外围运行时地形上限。中央高山区以约 4 米间距的约束场将源高程坡度限制为 0.55 米/米，再采用 `t = clamp((h - 185) / 115)` 与 `H = h + 50 × smoothstep(t)`；`h <= 185` 保持不变，映射局部斜率放大不超过约 1.66 倍。
- 高度合成顺序为：中央源高度图解码、中央高山增幅、外围派生高度融合、山路塑形、水系最后覆盖。现有水位编码、低地烘焙配置、河湖定义和水位保持不变。
- 外围融合源为用户第二张附件 `codex-clipboard-2178b92d-ed80-448e-bc62-8ee574032040.png`（原始临时路径 `/var/folders/89/j0tqf35x0534p7_yx9d__ddh0000gn/T/codex-clipboard-2178b92d-ed80-448e-bc62-8ee574032040.png`），尺寸为 1772×836，SHA-256 为 `6659c309365de99978a483051a39faf3cf9a49388860d74a095f8aa6fd2b7cda`。
- 原始附件不提交到仓库，也不作为运行时路径依赖；仅提交由 `tools/build-outer-mountain-height.mjs` 确定性生成的 512×242 外围派生高度资产 `public/assets/terrain/outer-mountain-height.png`（SHA-256 `44992b27a04209d6fb242dcb42fcc80fc31ce6c19c1b6c5ccc41e866205e255a`）。派生过程保留原图长宽比和灰度高度结构，并将水平方向处理为数值及一阶变化连续的周期边界，避免环向接缝。
- 运行时以旧地图外缘距离作为径向坐标、以围绕地图中心的角度作为环向坐标，对派生高度图进行连续采样。整张图只连续环绕一次，不按东南西北复制、镜像或拼成四段；派生图样真实参与外围山脚、屏障和主山脊高度计算。固定种子程序场仅作为未提供派生资产时的兼容回退。
- 旧边界外 0–192 米平滑匹配高度与法线；192–640 米形成可进入山脚；640–704 米作为山环基脚缓冲；704–864 米形成不可攀越的强制抬升带；864–1024 米形成约 520–600 米的破碎主山脊。
- 外围派生高度图提供树状支脉、深谷和弧形主脊的主要形态；采样与带状高度约束共同避免规则围墙、方向复制接缝、贯通低谷及低于几何分辨率的噪声。
- 保持 256 米地形分块，覆盖 16×16 共 256 块；动态 LOD 为 `[256, 128, 64, 32]`，水系与山路的细节下限仅作用于中央区域，首屏仍只等待出生点分块。
- 地形采样继续统一服务渲染、法线、碰撞与相机；分块包围体使用实际高度，阴影与相机范围覆盖约 600 米山体和 4096 米地图。
- 外围融合地形在地形编辑器中只读，中央高度图仍可无损编辑和保存。
- 保留现有山路的 X/Z、宽度和连接关系；调整高程后中心线坡度不超过 35°，玩家全局 50°可行走坡度限制不变，山景镜头改为相对地形高度。
- 不修改现有中央高度图、角色尺寸、移动速度、现有地标坐标或河湖布局；仓库中只新增外围派生高度资产，不提交原始用户附件。

**English**

- Change `MAP_SIZE` from 2,048 to 4,096 so the playable X/Z limits become ±2,048 meters; do not scale or translate existing central content coordinates.
- Separate the 300-meter heightmap source encoding maximum, the 350-meter central summit cap, and the 600-meter outer runtime terrain maximum. Use a constraint field sampled at approximately four-meter spacing to limit source-elevation slope to 0.55 meters per meter, then use `t = clamp((h - 185) / 115)` and `H = h + 50 × smoothstep(t)`; keep `h <= 185` unchanged and limit local slope amplification to approximately 1.66×.
- Compose terrain in this order: decode the central source heightmap, amplify central mountains, fuse the derived outer height data, shape mountain trails, then apply water systems last. Preserve exact water-level encoding, lowland bake settings, river and lake definitions, and water elevations.
- Use the user's second attachment, `codex-clipboard-2178b92d-ed80-448e-bc62-8ee574032040.png` (original temporary path `/var/folders/89/j0tqf35x0534p7_yx9d__ddh0000gn/T/codex-clipboard-2178b92d-ed80-448e-bc62-8ee574032040.png`), as the outer-ring fusion source. Its dimensions are 1772×836 and its SHA-256 is `6659c309365de99978a483051a39faf3cf9a49388860d74a095f8aa6fd2b7cda`.
- Do not commit the raw attachment or depend on its temporary path at runtime. Commit only the 512×242 outer derived-height asset generated deterministically by `tools/build-outer-mountain-height.mjs`, `public/assets/terrain/outer-mountain-height.png` (SHA-256 `44992b27a04209d6fb242dcb42fcc80fc31ce6c19c1b6c5ccc41e866205e255a`). Preserve the source aspect ratio and grayscale elevation structure during derivation, and make the horizontal boundary periodic with continuous values and first-order change so the angular wrap has no seam.
- At runtime, use distance beyond the old map edge as the radial coordinate and angle around the map center as the circumferential coordinate when sampling the derived heightmap. Wrap the complete image around the ring once, without copying, mirroring, or assembling four cardinal-direction versions. The derived pattern must genuinely participate in foothill, barrier, and primary-ridge height calculation. Retain the fixed-seed procedural field only as a compatibility fallback when no derived asset is supplied.
- Outside the old boundary, use 0–192 meters for smooth height and normal matching, 192–640 meters for explorable foothills, 640–704 meters for a ridge-base buffer, 704–864 meters for an impassable forced-rise band, and 864–1,024 meters for a broken 520–600-meter primary ridge.
- Use the derived outer heightmap as the primary source of branching spurs, deep valleys, and curved primary ridgelines. Combine its samples with the banded height constraints to avoid a regular wall, directional repetition seams, traversable through-valleys, and noise below mesh resolution.
- Retain 256-meter terrain chunks across a 16×16 grid of 256 chunks. Use dynamic LOD segments `[256, 128, 64, 32]`; central water and trail detail floors do not extend into the outer terrain, and initial loading still waits only for the spawn chunk.
- Keep terrain sampling unified for rendering, normals, collision, and cameras. Derive chunk bounds from actual elevations and extend shadow and camera ranges to cover the approximately 600-meter peaks and 4,096-meter map.
- Make the fused outer terrain read-only in the terrain editor while retaining lossless editing and saving for the central heightmap.
- Preserve mountain-trail X/Z positions, widths, and connectivity. After elevation changes, keep centerline slopes at or below 35°, retain the global 50° player walkability limit, and position mountain vista cameras relative to sampled terrain height.
- Do not modify the existing central heightmap, character dimensions, movement speed, existing landmark coordinates, or river and lake layout. Add only the derived outer height asset to the repository; do not commit the raw user attachment.

## Acceptance Criteria / 验收标准

**中文**

- 地图活动边界为 X/Z 各 ±2048 米，地形由 16×16 共 256 个 256 米分块覆盖，末分块键为 `15,15`，最远 LOD 使用 32 段。
- 中央所有源高程不高于 185 米的采样值保持不变，现有水系控制点、低地、水位和水面编码与修改前一致。
- 中央自然地形最高峰不超过 350 米，垂直高度断层和孤立针峰被展开为连续坡面，宽阔主脊保持连续；山路填高不超过自然地表 4 米，连接完整且完整塑形后的中心线坡度不超过 35°。
- 旧地图边界四边和四角的高度及法线连续，没有可见裂缝、台阶或方向复制接缝。
- 外围运行时采样可追溯到上述第二张附件的派生资产：启用与禁用该资产时外围高程结果不同，而中央旧地图范围内的采样结果完全相同。
- 派生高度图的环向首尾数值和一阶变化连续；实际地形跨越角度回绕点时高度与法线连续，四个方向的山体形态指纹不同，不出现四向复制或镜像。
- 四个方向均存在可进入的山脚地形；任何从中央通往最外边界的路线都会经过超过玩家 50°限制的不可攀坡面，外围主脊高度约为 520–600 米。
- 地形编辑器可继续无损编辑中央高度图，并明确拒绝对外围融合地形的写入。
- 出生点、山峰、水系和四方向外围镜头无埋入地形、远裁剪、明显 LOD 跳变或阴影截断；仓库和生产包只包含派生高度资产，不包含原始用户附件或对其临时路径的引用。
- Performance、Balanced 与 Quality 三档下首屏等待行为不回退，后台最终完成全部 256 个分块，稳定帧性能无明显退化。
- 相关单元测试、完整 `npm test`、`npm run check:lowlands` 与生产构建通过。

**English**

- The playable X/Z limits are ±2,048 meters, covered by a 16×16 grid of 256 terrain chunks measuring 256 meters each; the last chunk key is `15,15`, and the farthest LOD uses 32 segments.
- All central samples with source elevations at or below 185 meters remain unchanged, and existing water control points, lowlands, water levels, and water-surface encoding match the pre-change results.
- Natural central peaks do not exceed 350 meters, vertical height walls and isolated needles become continuous slopes, and broad primary ridges remain continuous. Trail fill stays within four meters above the natural surface, connectivity remains intact, and centerline slopes stay at or below 35° after the full shaping pipeline.
- Height and normals are continuous along all four sides and corners of the old map boundary, with no visible cracks, steps, or directional repetition seams.
- Runtime outer-ring samples are traceable to the derived asset from the specified second attachment: enabling and disabling that asset changes outer elevations while all samples inside the old central map remain identical.
- The first and last circumferential values and first-order changes of the derived heightmap are continuous. Terrain height and normals remain continuous across the angular wrap, and the four cardinal regions have distinct terrain fingerprints rather than copied or mirrored patterns.
- Explorable foothills exist in all four directions. Every route from the central area to the outer boundary encounters terrain steeper than the player's 50° walkability limit, and the outer primary ridge reaches approximately 520–600 meters.
- The terrain editor continues to edit and save the central heightmap losslessly and explicitly rejects writes to the fused outer terrain.
- Spawn, peak, water, and four-direction outer-ring camera views show no buried cameras, far-plane clipping, obvious LOD popping, or clipped shadows. The repository and production bundle contain only the derived height asset, with neither the raw user attachment nor any reference to its temporary path.
- Initial loading behavior does not regress in Performance, Balanced, or Quality, all 256 chunks eventually finish loading in the background, and steady-state frame performance shows no material regression.
- Focused unit tests, the complete `npm test` suite, `npm run check:lowlands`, and the production build pass.
