# Single Fireball Release / 单次火球释放

## Requirement / 需求

One spell action must create only one fireball so casting does not accumulate many simultaneous projectiles and stall rendering.

一次施法动作只能创建一个火球，避免同时堆积大量投射物并导致渲染卡顿。

## Summary / 概要

Treat the release timer crossing zero as a one-way event, so the same animation cannot make the release ready again. Keep the emissive and additive fireball glow without adding a scene-wide dynamic point light for every projectile.

把释放计时器越过零点视为单向事件，使同一段动画无法再次把释放状态设为就绪。保留火球的自发光和叠加光效，但不再为每个投射物添加影响整个场景的动态点光源。

## User Request / 用户需求

The user reported severe stuttering while casting, with many fireballs appearing from one spell action.

用户反馈施放法术时卡顿严重，并且一次施法会出现大量连续火球。

## Scope / 范围

- Preserve the existing spell animation, mana cost, delay, damage, trajectory, and emissive projectile effect.
- Prevent repeated release events during one spell animation.
- Remove the per-projectile point light that changes the scene lighting shader variant while a fireball is active.
- Add a regression test that advances the spell state after its first release and confirms no second release occurs.

- 保留现有施法动画、法力消耗、释放延迟、伤害、轨迹和投射物自发光效果。
- 阻止同一段施法动画重复产生释放事件。
- 移除投射物点光源，避免火球存续期间改变整个场景的光照着色器变体。
- 新增回归测试，在首次释放后继续推进施法状态，并确认不会再次释放。

## Acceptance Criteria / 验收标准

- One press of `E` creates at most one fireball.
- Continuing the same spell animation after release creates no additional projectile.
- Focused tests, the full test suite, the production build, and browser verification pass.

- 按一次 `E` 最多创建一个火球。
- 首次释放后继续播放同一段施法动画不会创建额外投射物。
- 聚焦测试、完整测试、生产构建和浏览器验收全部通过。
