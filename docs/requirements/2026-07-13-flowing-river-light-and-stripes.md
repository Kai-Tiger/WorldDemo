# Flowing River Light and Stripe Fix / 流动河水光影与条纹修复

## Requirement / 需求

**中文：** 恢复全部流动河道中清晰但克制、沿下游持续移动的水面光影，并消除石头周围及河面上的闭合轮廓、同心白线和长条纹。保留现有河道几何、连续流向坐标和共享流动水材质，不通过新增纹理、几何属性或 draw call 实现效果。

**English:** Restore clear but restrained downstream-moving surface light across every flowing river while removing closed contours, concentric white lines, and long stripes around rocks or across the water. Preserve the existing river geometry, continuous flow coordinates, and shared flowing-water material without adding textures, geometry attributes, or draw calls.

## Summary / 概要

**中文：** 共享河水 shader 使用横向一致、速度分别为每秒 0.85 米和 1.15 米的双层顺流域生成米级法线、明暗斑和破碎泡沫。逐顶点流速不再乘入绝对时间相位，石头扰动不再增强法线或镜面反射；镜面高光变宽且受限，石后只保留短而断续的白沫尾流。固定镜头预览中的河水继续实时流动，只有显式 `?capture=1` 才将水面时间冻结为 18.5 秒，以兼顾视觉检查和确定性截图。

**English:** The shared river shader uses two laterally coherent downstream domains moving at 0.85 and 1.15 meters per second to produce meter-scale normals, light patches, and broken foam. Per-vertex flow speed no longer multiplies absolute time, and rock disturbance no longer amplifies normals or specular reflection; highlights are broader and capped, while rocks retain only short, intermittent white-water wakes. Water remains animated in fixed-camera previews and freezes at 18.5 seconds only when `?capture=1` is explicitly present, supporting both motion review and deterministic screenshots.

## User Request / 用户需求

**中文：** 用户指出当前河面看不到流动光影，同时石头附近出现多层闭合白色条纹，要求恢复可辨认的水流运动，并去掉这些不自然的线状伪影。

**English:** The user reported that the current river shows no visible flowing light and that multiple closed white stripes appear around rocks. They requested recognizable water motion and removal of these unnatural line artifacts.

## Scope / 范围

**中文：**

- 修改共享流动河水 shader，使 Hero 主河及支流、山地河网、三组低地溪流和瀑布前出口河带获得一致的双层顺流动画。
- 主流动域以每秒 0.85 米沿 `flowUv.x` 下游移动；细节域以每秒 1.15 米移动，并使用独立偏移和反向横坐标打散重复。`vFlowSpeed`、河心、急流和交汇信号只调节效果强度，不再改变绝对时间相位。
- 使用约 `(0.11, 0.30)` 与 `(0.24, 0.68)` 的双尺度流向噪声生成柔和法线和明暗斑；明暗变化限制在 `-5%` 到 `+8%`，深水仍保留约 55% 的光影强度。不得使用周期正弦、ridge 或硬阈值等值线。
- 石头扰动不得进入法线或镜面高光强度；交汇法线扰动只保留 35% 权重。镜面指数从 96 降至 56，普通河面强度不超过 0.06，急流不超过 0.12。
- 泡沫使用约 `(0.18, 0.55)` 与 `(0.42, 1.10)` 的双尺度米级噪声相乘打散；急流、交汇和石头扰动权重分别为 0.72、0.10 和 `smoothstep(0.18, 0.58, disturbanceMask)`。泡沫颜色混合不超过 0.58，附加 alpha 不超过 0.35，石后尾流限制在约三个石头半径内。
- 普通固定镜头保持固定相机及现有环境时间逻辑，但 Hero 与共享水系统都接收实时水面时间；仅 `?capture=1` 使用固定的 18.5 秒水面时间。不增加新的 URL 参数或公开 API。
- 不修改河道或交汇几何、河床高度、河岸材质、反射模式、植被规则、静态湖面材质、瀑布幕材质、游戏水体逻辑、纹理资源或粒子系统。

**English:**

- Update the shared flowing-water shader so the Hero trunk and tributaries, mountain network, three lowland stream systems, and pre-waterfall outlet all receive the same two-layer downstream animation.
- Move the primary flow domain downstream along `flowUv.x` at 0.85 meters per second and the detail domain at 1.15 meters per second, using an independent offset and reversed lateral coordinate to break repetition. `vFlowSpeed`, center, rapid, and junction signals may adjust effect strength but must not alter the absolute time phase.
- Generate soft normals and light-dark patches with flow-aligned noise at approximately `(0.11, 0.30)` and `(0.24, 0.68)` scales; bound tone variation from `-5%` to `+8%` and preserve roughly 55% of the light pattern in deep water. Do not use periodic sine bands, ridges, or hard-threshold contour lines.
- Keep rock disturbance out of normal and specular strength; junctions retain only 35% normal-disturbance weight. Reduce specular power from 96 to 56 and cap intensity at 0.06 on ordinary water and 0.12 in rapids.
- Break foam with multiplied meter-scale noise at approximately `(0.18, 0.55)` and `(0.42, 1.10)`; rapid, junction, and rock-disturbance weights are 0.72, 0.10, and `smoothstep(0.18, 0.58, disturbanceMask)`. Cap foam color mixing at 0.58 and added alpha at 0.35, with rock wakes limited to about three rock radii.
- Keep the existing fixed camera and environment-time behavior for ordinary fixed shots, but pass real-time water time to both the Hero and shared water systems; use the fixed 18.5-second water time only with `?capture=1`. Add no URL parameters or public APIs.
- Do not change river or confluence geometry, bed height, bank materials, reflection modes, vegetation rules, static-lake materials, waterfall-curtain materials, gameplay water logic, texture assets, or particle systems.

## Acceptance Criteria / 验收标准

**中文：**

- Shader 合约验证绝对时间相位不包含 `centerSpeedScale` 或逐顶点 `vFlowSpeed`，且两个独立流动域均沿下游推进并把明暗范围限制在规定区间。
- `disturbanceMask` 只参与破碎泡沫，不参与法线或镜面高光；代码中不存在周期条纹、超低频巨大泡沫域或直接由连续扰动遮罩形成的白色轮廓。
- 普通 `?shot=` 预览的水面时间持续递增，`?shot=&capture=1` 固定为 18.5 秒，Hero 河和其他共享流动水体收到同一时间值。
- 在 `river-junctions-overhead` 的 474×856 视图中，间隔两秒至少能辨认三个向下游移动约 1.5 到 2.5 米的亮斑，而石头、岸线和植被保持静止。
- 用户截图对应的石头后方不得出现三圈以上连续闭合白线，不得出现贯穿大半河宽的长条；石后只允许短、破碎、顺流的白沫尾迹。
- `river-reference-flow` 显示低机位可辨认的流动光影，`river-reference-bank` 无近岸平行条纹；`river-tree-j1`、`lowland-creek`、出口河带及瀑布镜头无回归，Balanced 为主且 Performance 与 Quality 通过烟测。
- `npm test`、`npm run build`、`npm run check:lowlands` 和 `git diff --check` 全部通过。

**English:**

- Shader-contract tests confirm that absolute time phase contains neither `centerSpeedScale` nor per-vertex `vFlowSpeed`, that two independent flow domains advance downstream, and that tone variation remains within the specified bounds.
- `disturbanceMask` contributes only to broken foam, not normal or specular strength; the shader contains no periodic stripes, giant ultra-low-frequency foam cells, or white contours driven directly by a continuous disturbance mask.
- Water time advances in ordinary `?shot=` previews, remains fixed at 18.5 seconds for `?shot=&capture=1`, and is passed identically to the Hero river and all other shared flowing water.
- In the 474×856 `river-junctions-overhead` view, screenshots two seconds apart show at least three light patches moving approximately 1.5 to 2.5 meters downstream while rocks, banks, and vegetation remain stationary.
- Behind the rocks shown in the user reference, fewer than three continuous closed white loops may appear and no stripe may cross most of the river width; only short, broken, downstream white-water wakes are allowed.
- `river-reference-flow` shows recognizable moving light from a low viewpoint, `river-reference-bank` shows no parallel near-bank stripes, and `river-tree-j1`, `lowland-creek`, the outlet corridor, and waterfall views show no regression. Balanced is the primary quality target, with Performance and Quality smoke-tested.
- `npm test`, `npm run build`, `npm run check:lowlands`, and `git diff --check` all pass.
