# Alpine Cell Bombing / 高山材质 Cell Bombing

## Requirement / 需求

Remove obvious repeating rock and snow patterns from distant mountain surfaces without changing terrain collision, river materials, or the close-range heightfield.

消除远景山体表面明显重复的岩石与积雪纹理，同时不改变地形碰撞、河道材质和近距离高度场。

## Summary / 概要

Apply deterministic, continuous cell-phase variation to alpine rock color, rock normals, and snow color. Use the same transformation for rock color and normal samples, widen visual normal sampling with terrain LOD, and transition distant snow coverage from micro-slope thresholds to a continuous macro mask.

为高山岩石颜色、岩石法线和积雪颜色加入确定性的连续 cell 相位变化。岩石颜色与法线共享同一变换；地形视觉法线的采样范围随 LOD 扩大；远景积雪覆盖从微观坡度阈值平滑过渡到连续的宏观遮罩。

## User Request / 用户需求

The distant terrain texture has obvious repetition and should use cell bombing to break up the pattern.

远景地形贴图的重复痕迹明显，希望通过 cell bombing 打散规律。

## Scope / 范围

- Add a dedicated alpine cell-phase offset function with explicit texture gradients.
- Apply it to all three triplanar rock projections and to the snow layer.
- Keep rock color and normal maps on identical coordinates and deterministic seeds.
- Leave the generic river bank, river bed, and gravel sampling paths unchanged.
- Widen only rendered chunk-normal sampling at coarse LOD; detailed surface queries and player collision retain their original one-meter sampling.
- Blend distant snow coverage toward an elevation-led macro mask while preserving the existing detailed close-range snowline.
- Update terrain material and LOD regression tests and invalidate the cached shader program key.

- 新增独立的高山 cell 相位偏移函数，并使用显式纹理梯度采样。
- 将其应用于岩石的三个三平面投影和积雪层。
- 岩石颜色图与法线图使用完全一致的坐标和确定性 seed。
- 通用河岸、河床和砾石采样路径保持不变。
- 仅扩大低 LOD 渲染网格的法线采样范围；精细表面查询和玩家碰撞继续保留原有一米采样。
- 远景积雪覆盖平滑过渡到以海拔为主的宏观遮罩，同时保留现有近距离精细雪线。
- 更新地形材质和 LOD 回归测试，并更新 shader 程序缓存键。

## Acceptance Criteria / 验收标准

- Large mountain walls no longer expose fixed 32-meter rock or 27-meter snow repetition.
- Rock albedo and normal detail remain aligned and do not create lighting seams.
- Cell variation is continuous, uses stable gradients, and does not introduce square boundaries or mip flicker.
- Distant coarse terrain no longer turns micro-height relief into strong regular shading bands.
- Distant snow transitions avoid concentric slope-threshold rings while the close snowline remains slope-aware.
- River, lake, bank, and gravel material sampling remains unchanged.
- Targeted tests, the full test suite, production build, cold-start WebGL logs, and east/west mountain visual checks pass.

- 大面积山壁不再暴露固定约 32 米的岩石重复或约 27 米的积雪重复。
- 岩石颜色与法线细节保持对齐，不产生光照接缝。
- Cell 变化连续、梯度稳定，不出现方形边界或 mip 闪烁。
- 远景低 LOD 地形不再把微观高度起伏放大成强烈的规则明暗条带。
- 远景积雪过渡不再形成同心坡度阈值环，近距离雪线仍保留坡度响应。
- 河流、湖泊、河岸与砾石材质采样保持不变。
- 定向测试、完整测试集、生产构建、冷启动 WebGL 日志及东、西山体视觉检查全部通过。
