# Requirement / 需求

Restore the original forest-floor appearance without returning to the former five-channel 4K runtime cost, and make the existing model grass reliably visible after scene startup.

恢复原有森林地表观感，但不重新引入旧版五张 4K 通道的实时开销，并确保现有模型草在场景启动后能够可靠显示。

# Summary / 概要

Use the original scanned forest-floor base color and normal as an offline-baked composite for Near terrain, with tiered 1K/2K assets. Keep branch-limited materials for Medium and Far terrain. Correct the converted GLB grass scale, opacity channel, startup streaming order, visibility range, and shadow readability.

将原扫描森林地表的基础色与法线作为离线烘焙复合结果用于近景地形，并提供分档 1K/2K 资源；中远景继续采用受限分支材质。同时修正 GLB 草模型缩放、透明度通道、启动流送顺序、可见距离与阴影可读性。

# User Request / 用户需求

The visual upgrade removed too much of the previous ground character. Restore the former ground texture, avoid an expensive real-time composite surface, and fix the missing model grass.

视觉升级削减了过多原地表特征。恢复原来的地面贴图，避免高成本的复合地表实时渲染，并修复看不到模型草的问题。

# Scope / 范围

- Replace the runtime moss slots with optimized forest-floor base-color and normal assets while preserving the existing terrain PBR, water masks, rock, snow, and LOD systems.
- Use the baked forest-floor composite directly for Near lowland terrain; retain conditional low-cost terrain branches outside Near.
- Restore the optimized grass GLB to its authored world size and increase the Balanced/Quality visibility budgets without changing grass placement rules.
- Prioritize completion of the nearest generating grass zone, sample opacity from the asset's red channel in every grass material LOD, and add restrained shadow fill.
- Do not load the original 4K roughness, AO, or displacement maps at runtime, and do not modify unrelated user assets.

- 使用优化后的森林地表基础色与法线替换运行时 moss 槽，同时保留现有地形 PBR、水体 mask、岩石、积雪与 LOD 系统。
- 近景低地区域直接使用烘焙森林地表；近景以外继续使用条件分支控制的低成本地形材质。
- 将优化后的草地 GLB 恢复到原始世界尺寸，并提高 Balanced/Quality 可见预算，不改变草地分布规则。
- 优先完成离相机最近的草地区块，所有草地材质 LOD 均从资源红色通道读取透明度，并加入受控的阴影填充。
- 运行时不加载原始 4K roughness、AO 或 displacement，不修改无关用户资源。

# Acceptance Criteria / 验收标准

- Near terrain uses the original forest-floor scan at its authored two-meter scale with base-color and normal sampling only.
- Performance loads 1K forest-floor assets; Balanced and Quality load 2K assets. The five original 4K maps are not requested at runtime.
- Medium and Far terrain preserve lower-cost conditional material sampling and all terrain variants retain water-bank and water-bed overrides.
- A converted VarA grass blade is restored from about 7 mm to about 0.73 m tall.
- Balanced keeps all near grass instances and uses `28 / 72 / 150` meter LOD distances.
- The nearest grass zone completes before background zones, and near/mid opacity uses the red channel.
- Model grass is visible and readable in both the spawn and forest debug shots without shader, texture-loading, or WebGL console warnings.
- Automated tests and the production build pass.

- 近景地形以原始两米尺度使用森林地表扫描图，并且只采样基础色与法线。
- Performance 加载 1K 森林地表资源；Balanced 与 Quality 加载 2K；运行时不请求五张原始 4K 贴图。
- 中远景地形保留低成本条件材质采样，所有地形档位继续保留水岸和水底覆盖逻辑。
- 转换后的 VarA 草叶高度从约 7 毫米恢复到约 0.73 米。
- Balanced 保留全部近景草实例，并使用 `28 / 72 / 150` 米 LOD 距离。
- 最近草地区块先于背景区块完成，近景和中景透明度均读取红色通道。
- 模型草在出生点和森林调试镜头中可见且层次可读，无 Shader、纹理加载或 WebGL 控制台警告。
- 自动化测试与生产构建通过。
