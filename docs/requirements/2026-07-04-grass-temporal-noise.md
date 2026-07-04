# Requirement / 需求

Reduce grass temporal noise caused by animated blade movement.

降低草叶动画导致的时间噪点。

# Summary / 概要

This change keeps the existing grass instances and material color grade, but calms the near-grass wind animation by reducing motion amplitude, wave speed, spatial frequency, and side flutter.

本次保留现有草实例和材质调色，但通过降低运动幅度、波动速度、空间频率和横向抖动，让近处草叶风动更平稳。

# User Request / 用户需求

The user reported that grass still has many noisy speckles and asked whether the issue is caused by grass movement.

用户反馈草地仍然有很多噪点，并询问是否因为草都在动导致。

# Scope / 范围

Update only the grass wind animation parameters inside the grass instance material. Do not change grass placement density, terrain textures, global post-processing, lighting, water, trees, player behavior, leaf decals, enemy assets, or unrelated pending work.

仅更新草实例材质内部的风动动画参数。不修改草地放置密度、地形贴图、全局后处理、灯光、水体、树木、玩家行为、落叶贴花、敌人资源或无关待提交改动。

# Acceptance Criteria / 验收标准

- Grass blade motion is calmer and produces less frame-to-frame sparkle.
- Close grass still has subtle wind movement instead of becoming completely static.
- Existing grass brightness and distant LOD noise reductions remain in place.
- Build verification passes.

- 草叶运动更平稳，减少逐帧闪烁感。
- 近处草仍保留轻微风动，而不是完全静止。
- 既有草地亮度压低和远处 LOD 噪点削减效果保持不变。
- 构建验证通过。
