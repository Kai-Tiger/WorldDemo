# Requirement / 需求

Implement a procedural cloudy sky with only one visible sun.

实现程序化云天空，并确保天空中只有一个可见太阳。

# Summary / 概要

The scene should use the existing sky cloud dome for blue sky, soft clouds, atmospheric haze, and the single sun disc. The old sprite sun should be removed so the shader sun is the only visual sun source.

场景应使用现有云天空 dome 来渲染蓝天、柔和云层、大气雾霾和唯一的太阳盘。旧的精灵太阳应移除，让 shader 太阳成为唯一可见太阳来源。

# User Request / 用户需求

The user asked for clouds in the sky, using `~/Desktop/my-game` as the visual reference, and reported that a previous attempt created two suns.

用户希望在天空中实现云，参考 `~/Desktop/my-game` 的效果，并指出此前实现产生了两个太阳。

# Scope / 范围

This change updates sky rendering only: procedural cloud parameters and removal of the duplicate sprite sun. It does not change terrain, water, player, vegetation, lighting physics, or gameplay.

本次只修改天空渲染：程序化云参数以及移除重复的精灵太阳。不修改地形、水体、玩家、植被、光照物理或玩法。

# Acceptance Criteria / 验收标准

- The cloud dome remains active and follows the camera.
- The sky shows soft procedural cloud coverage similar to the reference.
- Only one visual sun remains in the sky.
- Directional lighting and shadows continue to use the shared sun direction.
- Build verification passes.

- 云天空 dome 仍然启用并跟随相机。
- 天空显示接近参考效果的柔和程序化云层。
- 天空中只保留一个可见太阳。
- 方向光和阴影继续使用共享太阳方向。
- 构建验证通过。
