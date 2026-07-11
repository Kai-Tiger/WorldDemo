# Requirement / 需求

**中文：** 使用项目现有积雪贴图替换山脉中缺乏层次的高海拔棕色地表，形成连续、自然破碎的雪线，同时保留低地土色和陡峭裸岩。

**English:** Replace the unattractive high-altitude brown terrain on the mountains with the project's existing snow texture, creating a continuous but naturally broken snowline while preserving lowland soil and steep exposed rock.

## Summary / 概要

**中文：** 接入现有 `snow-alpine.webp` 作为真实积雪 albedo。将低地材质结束高度调整到符合当前压缩地形尺度的林线附近，高处未积雪区域使用高山灰岩承底，再按海拔、坡度和世界空间宏观噪声混入积雪。Near、Medium、Far 使用同一雪线公式和同相位世界坐标 UV，避免 LOD 切换时雪线移动。

**English:** Integrate the existing `snow-alpine.webp` as the real snow albedo. Move the end of lowland materials to the treeline appropriate for the map's compressed vertical scale, use alpine gray rock beneath uncovered high terrain, and blend snow by elevation, slope, and world-space macro noise. Near, Medium, and Far share the same snowline formula and world-space UV phase so the snowline does not move across LOD transitions.

## User Request / 用户需求

**中文：** 用户指出山脉上的棕色贴图缺乏美感，希望将其替换为雪线贴图。

**English:** The user reported that the brown mountain texture is unattractive and requested replacing it with a snowline texture.

## Scope / 范围

**中文：**

- 加载并复用现有 `public/assets/terrain/snow-alpine.webp`，不修改该资源文件。
- 将低地材质过渡范围调整为噪声高度 `55–90m`，使主体山脉不再被 forest-floor 分支抢占。
- 在噪声高度 `45–80m` 建立高山灰岩底层，阻止高山像素回落到棕色 dirt fallback。
- 在宏观扰动后的高度 `55–130m` 建立雪线，并使用 `normal.y 0.30–0.78` 控制坡面留雪。
- 所有地形 LOD 直接采样同一世界坐标雪贴图，相同 UV 世界尺寸约为高山纹理尺寸的 `1.35` 倍。
- 雪覆盖提高粗糙度、减弱岩石细法线，但不增加 snow normal、height、AO、几何或后处理 pass。
- 河岸、河床、湖岸和湖床仍在雪层之后执行最终覆盖。

**English:**

- Load and reuse the existing `public/assets/terrain/snow-alpine.webp` without modifying the asset file.
- Move the lowland material transition to noisy elevation `55–90m` so the main mountains are no longer captured by the forest-floor branch.
- Establish an alpine gray-rock base at noisy elevation `45–80m`, preventing high terrain from falling back to brown dirt.
- Establish the snowline at macro-adjusted elevation `55–130m`, with snow retention controlled by `normal.y 0.30–0.78`.
- Directly sample the same world-space snow texture in every terrain LOD, using an identical UV phase and a world size approximately `1.35` times the alpine texture size.
- Increase roughness and soften fine rock normals under snow without adding snow normal, height, AO, geometry, or a post-processing pass.
- River banks, river beds, lake shores, and lake beds remain the final overrides after the snow layer.

## Acceptance Criteria / 验收标准

**中文：**

- 主山体不再出现大片连续棕色地表；棕色只保留在湖边和林线以下低坡。
- 峰顶、缓坡和沟槽形成清晰积雪，近垂直岩壁仍保留灰岩轮廓。
- 雪线边缘受到低频和细尺度世界噪声扰动，不形成规则水平白带或连续白描边。
- 低于约 `35m` 的缓坡无积雪，约 `90m` 的缓坡进入过渡，约 `140m` 的缓坡达到完整积雪。
- Near、Medium、Far 各只有一次相同相位的雪 albedo 采样，LOD 切换不移动雪线或贴图。
- 仅增加一张约 368KiB 的现有雪 albedo；不增加 draw call 或新的渲染 pass。
- 针对性测试、完整测试和生产构建通过；出生点与远景固定镜头无明显雪线接缝、整山刷白、水岸染雪或 Shader 错误。

**English:**

- The main mountain mass no longer contains large continuous brown surfaces; brown remains only around the lake and on low slopes below the treeline.
- Peaks, gentle slopes, and gullies receive readable snow while near-vertical cliffs retain gray-rock silhouettes.
- Low-frequency and fine world-space noise break up the snowline edge, avoiding a regular horizontal white band or continuous white outline.
- Gentle slopes below approximately `35m` remain snow-free, around `90m` enter the transition, and around `140m` reach full snow coverage.
- Near, Medium, and Far each use one same-phase snow albedo sample, with no snowline or texture movement during LOD transitions.
- Only one existing snow albedo of approximately 368KiB is added, with no additional draw call or render pass.
- Targeted tests, the full test suite, and the production build pass; spawn and vista fixed-camera checks show no obvious snowline seams, fully white mountains, snow-contaminated water banks, or shader errors.
