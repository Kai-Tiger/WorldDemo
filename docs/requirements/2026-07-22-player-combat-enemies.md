# Player Combat and Enemies / 玩家战斗与敌人

## Requirement / 需求

Add a compact third-person combat loop: the player moves relative to the camera with walk and run animation, can attack, defend, and cast a fireball, while enemies spawn safely, pursue the player, attack during a defined window, take damage, and die.

新增一套紧凑的第三人称战斗循环：玩家相对相机方向移动并播放行走和奔跑动画，可以攻击、防御和施放火球；敌人会在安全位置出生、追击玩家、在明确的攻击窗口内造成伤害，并能受伤和死亡。

## Summary / 概要

Extend the existing player controller with camera-relative locomotion and the minimum combat state needed for melee attack, defense, defensive movement, and a fireball ability. Add enemies with safe randomized placement, pursuit and timed melee attacks, then connect both sides through health, damage, and death behavior. Keep controls and combat timing deterministic enough for focused automated verification.

扩展现有玩家控制器，加入相对相机的移动，以及近战攻击、防御、防御移动和火球技能所需的最小战斗状态。新增敌人的安全随机放置、追击和定时近战攻击，并通过生命值、伤害和死亡行为连接玩家与敌人。控制和战斗时序应保持足够确定，以便进行聚焦的自动化验证。

## User Request / 用户需求

The user requested player walk and run animation, `J` attack, `K` defense with movement retained, and `E` fireball casting. Enemies must appear at random safe positions, chase and attack the player, and participate in a complete damage and death loop.

用户要求玩家具备行走和奔跑动画，使用 `J` 攻击、按住 `K` 防御且仍能移动，并使用 `E` 施放火球。敌人必须在随机安全位置出现、追击并攻击玩家，同时参与完整的伤害与死亡循环。

## Scope / 范围

- Player movement remains camera-relative and selects idle, walk, or run animation from actual movement state.
- `J` starts the player's melee attack and only its configured hit window can damage a valid target.
- Holding `K` enters defense, reduces or blocks eligible incoming damage, and permits slower defensive movement.
- `E` casts a forward fireball that can hit an enemy once and then expires.
- Enemies spawn within map bounds, 12–38 meters from the player, at least 5 meters apart, on terrain no steeper than 40 degrees, and outside water exclusions.
- Enemies pursue after the player enters their 18-meter awareness range and can damage the player only once during each configured attack window.
- Player and enemy health is reduced by valid hits; zero health enters death state, stops combat behavior, and prevents further damage.
- Automated checks cover control/state transitions, animation selection, attack timing, defense, projectiles, pursuit, spawning constraints, damage, and death; the production build remains valid.

- 玩家移动保持相对相机方向，并根据实际移动状态选择待机、行走或奔跑动画。
- `J` 触发玩家近战攻击，只有配置的命中窗口能够对有效目标造成伤害。
- 按住 `K` 进入防御，减少或阻挡符合条件的来袭伤害，并允许以较低速度进行防御移动。
- `E` 向前施放火球；火球只能命中一名敌人一次，随后失效。
- 敌人在地图边界内、距玩家 12–38 米、彼此至少相距 5 米、坡度不超过 40 度且不属于水体排除区的位置出生。
- 玩家进入敌人 18 米感知范围后，敌人会开始追击，并且每次配置的攻击窗口最多只能对玩家造成一次伤害。
- 有效命中会降低玩家或敌人的生命值；生命值归零后进入死亡状态、停止战斗行为，并且不再受到伤害。
- 自动化检查覆盖控制与状态切换、动画选择、攻击时序、防御、投射物、追击、出生约束、伤害和死亡；生产构建保持有效。

## Acceptance Criteria / 验收标准

- Walking and running follow camera-relative input and play the matching animation without root-motion displacement.
- Pressing `J`, holding `K` while moving, and pressing `E` enter the expected attack, defense, and fireball states without overlapping invalid actions.
- Melee and enemy attacks apply damage only inside their hit windows and at most once per attack; defense changes eligible incoming damage as specified.
- Fireballs travel forward, damage the first valid enemy hit once, and are removed on hit or expiry.
- A flat valid terrain returns six deterministic enemy positions when a seeded random source is supplied; every position satisfies distance, spacing, slope, boundary, ground-height, and water-exclusion rules.
- Enemies transition between pursuit, attack, hurt, and death correctly; dead actors no longer move, attack, or receive damage.
- Focused automated tests and the production build pass.

- 行走和奔跑遵循相对相机的输入，并播放匹配的动画，不产生根运动位移。
- 按下 `J`、移动时按住 `K`、以及按下 `E` 会分别进入预期的攻击、防御和火球状态，且不会叠加无效动作。
- 玩家近战和敌人攻击只在各自命中窗口内造成伤害，每次攻击最多命中一次；防御会按规定改变符合条件的来袭伤害。
- 火球向前飞行，只对首个有效敌人造成一次伤害，并在命中或到期后移除。
- 在有效平坦地形上注入带种子的随机源时，会返回六个确定的敌人位置；每个位置均满足距离、间距、坡度、边界、贴地高度和水体排除规则。
- 敌人能正确切换追击、攻击、受伤和死亡状态；死亡单位不再移动、攻击或受到伤害。
- 聚焦自动化测试和生产构建通过。
