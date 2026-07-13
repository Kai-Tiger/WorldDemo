# Quality Cascaded Shadows / Quality 级联阴影

## Requirement / 需求

**中文**

在不改变 Performance 与 Balanced 阴影预算的前提下，让 Quality 档实际使用双级级联阴影，并确保流送地形、树木、草和其他内置受光材质保持正确的光照与阴影。

**English**

Make the Quality preset use two real cascaded shadow maps without changing the Performance or Balanced shadow budgets, while preserving correct lighting and shadows for streamed terrain, trees, grass, and other built-in lit materials.

## Summary / 概要

**中文**

Quality 使用两个 2048 阴影级联，近级约覆盖 0–90 米，远级覆盖到 420 米，并在级联边界淡化。Performance 继续使用单张 1024 阴影图，Balanced 继续使用单张 2048 阴影图。阴影控制器负责质量切换、相机更新、尺寸变化、动态材质注册和资源释放。

**English**

Quality uses two 2048 shadow cascades: a near cascade covering approximately 0–90 meters and a far cascade extending to 420 meters, with fading across cascade boundaries. Performance keeps one 1024 map and Balanced keeps one 2048 map. A shadow controller owns quality switching, camera updates, resizing, dynamic material registration, and cleanup.

## User Request / 用户需求

**中文**

用户要求清朗天气下的阴影更加细腻，Quality 档启用真正的双级 CSM，同时不得覆盖地形混合、树木风摆、草材质等现有 shader hook，也不得破坏树叶 alpha-cutout 自定义深度材质。

**English**

The user requested finer shadows for the clear-weather scene, with a true two-cascade CSM path in Quality. Existing shader hooks for terrain blending, tree sway, and grass must remain intact, and leaf alpha-cutout custom depth materials must not be replaced.

## Scope / 范围

**中文**

- 消费现有质量预设中的 `cascadeCount`、`mapSize` 与 `distance`。
- Quality 创建并更新两个方向光阴影级联，隐藏原单级太阳光；退出 Quality 时恢复原太阳光。
- 组合而非替换材质的 `onBeforeCompile` 与程序缓存键。
- 注册异步加载和运行时流送产生的内置受光材质。
- 在切档和销毁时恢复材质 defines、shader hook、全局 Three.js shader chunk，并释放级联阴影资源。
- 不改变地形、植被布局、阴影投射范围或 Performance/Balanced 的预设值。

**English**

- Consume the existing `cascadeCount`, `mapSize`, and `distance` quality settings.
- Create and update two directional-light shadow cascades in Quality while hiding the original single sun; restore the original sun when leaving Quality.
- Compose rather than replace material `onBeforeCompile` hooks and program cache keys.
- Register built-in lit materials created by asynchronous loading and runtime streaming.
- Restore material defines, shader hooks, global Three.js shader chunks, and release cascade resources during quality changes and disposal.
- Do not change terrain or vegetation layout, shadow casting distance, or Performance/Balanced preset values.

## Acceptance Criteria / 验收标准

**中文**

- Performance 为单张 1024 阴影图，Balanced 为单张 2048 阴影图。
- Quality 创建两个 2048 级联，分界约为 90 米，最远覆盖 420 米，并启用淡化。
- 地形、树木和草的原有 `onBeforeCompile` 在 CSM uniforms 注入前仍被调用。
- 树冠的 `customDepthMaterial` 保持原对象，alpha-test 和风摆深度变形路径不变。
- 从 Quality 切回 Balanced/Performance 后，没有残留级联灯、CSM defines 或被覆盖的 shader hook。
- 动态新增材质可加入 CSM，材质释放后不被阴影控制器继续持有。
- 定向测试、完整测试、生产构建和低地形检查通过。

**English**

- Performance uses one 1024 shadow map and Balanced uses one 2048 shadow map.
- Quality creates two 2048 cascades split at approximately 90 meters, reaches 420 meters, and enables cascade fading.
- Existing terrain, tree, and grass `onBeforeCompile` hooks still run before CSM uniforms are attached.
- Canopy `customDepthMaterial` references remain unchanged, preserving alpha testing and sway deformation in the depth path.
- Switching from Quality to Balanced or Performance leaves no cascade lights, CSM defines, or overwritten shader hooks behind.
- Dynamically added materials can opt into CSM and disposed materials are no longer retained by the shadow controller.
- Focused tests, the full test suite, the production build, and the lowland check pass.
