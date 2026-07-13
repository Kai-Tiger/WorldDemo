# River Confluence Grounding / 河流交汇与贴地修复

## Requirement / 需求

**中文：** 修复 hero 河流在交汇处出现的白色放射线、圆瓣和尖臂，并让河面沿真实运行时地形保持稳定、自然的岸边接触。

**English:** Fix the hero river's white radial lines, circular lobes, and stretched arms at confluences, and keep the water surface naturally grounded against the real runtime terrain.

## Summary / 概要

**中文：** 调整 J1–J2 主河段的入汇角度、限制河臂裁剪范围并消除补片跨臂属性跳变；交汇水材质使用锚定到节点和真实下游方向的单一流动域，降低整池泡沫与高光，同时保持岸线透明度。低地烘焙使用带标记的高精度 RGB 水床编码，在边界 feather 之后写入完整水床，并以宽湿岸/砾石带平滑回接普通地形，不在运行时重复塑形。河床仍使用河道局部坐标，各支流共享连续节点距离，山口路线则避开河床形变范围。

**English:** Re-angle the J1–J2 trunk approach, bound confluence arm trimming, and remove cross-arm attribute jumps in the patch; use one node-anchored flow domain aligned to the real downstream direction, reduce pool-wide foam and glare, and keep foam inside shoreline opacity. Bake complete water beds with marked high-precision RGB values after the lowland boundary feather, blend them back through the wide wet-bank/gravel corridor, and avoid repeated runtime deformation. Retain river-local bed sampling, continuous branch node distances, and a mountain-pass alignment outside the river deformation range.

## User Request / 用户需求

**中文：** 用户指出河流视觉和交汇处仍存在严重问题，河面没有贴住地面，并提示检查是否由地面上抬、河道被抹平导致；要求参考目标网页的风格继续修改本地项目。

**English:** The user reported major remaining river and confluence artifacts, including water that did not meet the ground, and asked whether raised terrain had flattened the channel; they requested continued local changes guided by the reference webpage's style.

## Scope / 范围

**中文：** 仅修改共享流动河流材质、河网交汇水面几何、hero 河流路径与烘焙剖面、高精度高度编码/解码、编辑器无损高度图保存、交汇材质遮罩、河床局部纹理坐标、确定性高度图输出、避河的 mountain-pass 对齐与对应检查视角及其针对性测试。不修改角色控制、植被配置、湖泊水面逻辑或无关场景内容。

**English:** Change only the shared flowing-river material, river-network confluence geometry, hero-river path and baked profile, high-precision height encoding/decoding, lossless editor heightmap storage, confluence material masks, river-local texture coordinates, deterministic heightmap output, the river-avoiding mountain-pass alignment and its check view, plus targeted tests. Do not change player controls, vegetation configuration, lake-surface logic, or unrelated scene content.

## Acceptance Criteria / 验收标准

**中文：**

- `hero-j1` 的三条端面不相交，交汇裁剪不超过汇流池半径，补片最大半径受汇流池与河宽共同约束，且补片三角形保持朝上、不自交。
- 交汇区不再使用退化 strip UV 直接生成水面细节；每片元只计算一套水面噪声，泡沫透明度始终受岸线覆盖约束。
- 水床高度使用厘米级高精度 RGB 编码，低地边界 feather 不再把河床压回零高度；运行时不重复应用 hero 河床变形。
- 真实 `height.webp` 下，所有有覆盖的 hero 水面顶点保持正净空；完全透明的外缘保持在 `-0.10–0.65m` 的有限接触范围，J1/J2 补片保持正净空且不超过设计池深加 `0.2m`。
- hero 高精度边界每个约 `0.5m` 像素步进的最大最终地表高差不超过 `0.75m`，J1/J2 池外每 `0.1m` 径向步进不超过 `0.2m`；源头端帽与宽岸带平滑退回原地形。
- 交汇池纳入河床和水下遮罩，山路雕刻与局部地表 relief 不会覆盖已烘焙水床或顶入水面。
- 地形编辑器以 PNG 上传并由开发服务器转存为无损 WebP，高精度 RGB 标记逐像素保持不变。
- 河床贴图继续使用河道局部坐标；任意相邻 1 米高覆盖河床样本的沿河坐标变化小于一个 12 米纹理周期。
- 全量自动化测试、低地烘焙一致性检查和生产构建通过。

**English:**

- The three `hero-j1` endpoint rows do not intersect, confluence trimming does not exceed the pool radius, the patch radius is bounded by pool size plus river width, and patch triangles remain upward-facing and non-self-intersecting.
- Junction detail no longer comes directly from degenerate strip UVs; each fragment computes only one water-noise path, and foam opacity always remains inside shoreline coverage.
- Water beds use centimeter-scale marked RGB encoding, and the lowland boundary feather no longer collapses channels toward zero; hero terrain deformation is not repeated at runtime.
- With the real `height.webp`, every covered hero-water vertex has positive clearance; fully transparent outer edges stay within a bounded `-0.10–0.65m` contact range, and J1/J2 patches remain above terrain without exceeding the authored pool depth plus `0.2m`.
- Across hero precise-height boundaries, the final surface changes by no more than `0.75m` per roughly `0.5m` pixel step, while the terrain outside J1/J2 changes by no more than `0.2m` per `0.1m` radial step; source caps and wide banks return smoothly to the original terrain.
- Confluence pools contribute to riverbed and underwater masks, and mountain-trail carving plus local terrain relief cannot replace the baked bed or rise into the water.
- The terrain editor uploads PNG and the development server stores lossless WebP, preserving every marked high-precision RGB pixel exactly.
- Riverbed textures retain river-local coordinates; adjacent one-meter high-coverage bed samples change by less than one 12-meter texture period along the channel.
- The complete automated test suite, lowland bake consistency check, and production build pass.
