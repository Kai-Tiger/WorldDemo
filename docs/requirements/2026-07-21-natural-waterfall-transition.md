# Natural Waterfall Transition / 自然瀑布过渡

## Requirement / 需求

Rebuild the mountain waterfall as one gravity-driven thin veil with a continuous rock lip, a real unified plunge-pool surface, localized impact whitewater, and depth-aware blending into the surrounding terrain and water.

将山地瀑布重建为一张受重力驱动的薄水帘，并提供连续岩唇、真实统一的冲潭水面、局部冲击白水，以及与周边地形和水体一致的深度融合。

## Summary / 概要

Replace the layered transparent waterfall cards and long rectangular foam strip with one ballistic curtain, a directionally carved plunge pool connected to the Hero river, a bounded hydraulic foam field, and deterministic spray/mist particles. Preserve the same waterfall geometry and effect budget across all render-quality presets.

用单层弹道水帘、与 Hero 河相连的定向冲潭、有界水力泡沫场和确定性飞溅/水雾粒子，替换多层透明水板与长矩形泡沫条。所有渲染质量档位保持相同的瀑布几何和效果预算。

## User Request / 用户需求

The existing waterfall flow looks artificial. Diagnose the cause and fully upgrade it to a natural mountain thin-veil waterfall with consistent quality across Performance, Balanced, and Quality modes.

现有瀑布水流显得不真实，需要诊断原因并完整升级为自然的山地薄帘瀑布，同时在 Performance、Balanced 和 Quality 三档保持一致品质。

## Scope / 范围

- Add one authoritative waterfall hydraulic frame shared by runtime terrain, deterministic height baking, water geometry, and particles.
- Restore the waterfall lip, directionally blend the plunge-pool carve, and regenerate the baked terrain heightmap.
- Register the plunge pool in the unified Hero water basin and preserve longitudinal river/source coverage fades without weakening lateral shore fades.
- Replace the four waterfall cards, radial lip foam, long impact strip, and underwater mist origin with one curtain and localized contact effects.
- Bind waterfall optical materials to the existing scene and WaterInfo inputs without adding a fullscreen pass or render target.
- Cross-fade the final outlet coverage, crest foam, and curtain over one shared metric lip band so no raised translucent plate or hard handoff line remains.
- Keep unrelated lake-shore and natural-river-shoreline behavior unchanged.

- 新增唯一的瀑布水力坐标框架，供运行时地形、确定性高度烘焙、水体几何和粒子共同使用。
- 恢复瀑布岩唇，定向渐入冲潭切削，并重新生成烘焙地形高度图。
- 将冲潭注册到统一 Hero 水域，并保留河流/源头纵向覆盖淡出，同时不削弱横向岸边淡出。
- 用单层水帘和局部接触效果替换四张水板、放射状岩唇泡沫、长冲击条与水下水雾起点。
- 使用现有场景和 WaterInfo 输入绑定瀑布光学材质，不新增全屏 Pass 或 RenderTarget。
- 在同一米制岩唇带内交叉淡化出口末端覆盖率、岩唇泡沫和水帘，消除悬浮透明板及硬交接线。
- 保持无关的湖岸和自然河岸行为不变。

## Acceptance Criteria / 验收标准

- The authored lip is continuous, the curtain begins on the final outlet row, and its terminal row remains at the plunge-pool surface.
- The upper 60% reads as one thin veil, the middle contracts, and only the lower third separates into several strands.
- The plunge pool is covered by unified water and connects to the Hero river through the existing five-row transition topology without holes or duplicate/non-manifold triangles.
- Impact foam remains localized near the landing point; no long rectangular water plate, parallel curtain cards, underwater curtain, or spherical mist mass remains.
- The outlet-to-curtain handoff has no visible straight seam from overhead or close oblique views, and the crest overlay stays within two centimeters of the authored surface before wrapping over the lip.
- Performance, Balanced, and Quality use the same waterfall mesh, shader path, noise layers, particles, and deterministic seed.
- Targeted water tests, the full test suite, deterministic lowland-height check, production build, and whitespace validation all pass before commit.

- 设计岩唇保持连续，水帘从出口最后横排开始，末排保持在冲潭水面高度。
- 上部 60% 呈现为一张连续薄帘，中段收束，仅下方三分之一分裂为数束水流。
- 冲潭由统一水面完整覆盖，并通过现有五行过渡拓扑连接 Hero 河，不出现孔洞、重复三角形或非流形三角形。
- 冲击泡沫限制在落点附近，不再出现长矩形水板、平行水帘卡片、水下水帘或球状雾团。
- 俯视和近距离斜视下，出口到水帘的交接处不出现可见直线；岩唇覆盖层在翻越岩唇前与设计水面的高度差不超过两厘米。
- Performance、Balanced 和 Quality 使用相同的瀑布网格、Shader 路径、噪声层、粒子数量和确定性随机种子。
- 定向水体测试、完整测试集、确定性低地高度校验、生产构建和空白检查在提交前全部通过。
