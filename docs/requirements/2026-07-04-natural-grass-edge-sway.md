# Requirement / 需求

Make grass field borders look natural instead of visibly procedural, and restore grass wind motion without bringing back distant shimmer.

让草地边缘更自然，避免明显的程序化硬边，同时恢复草地风动但不重新引入远景闪烁。

# Summary / 概要

Grass patch placement now uses broken edge acceptance, lower edge density, and smaller low-profile grass near patch borders. Grass sway now has two ranges: stronger movement near the player and subtle wind motion in the near/mid field, while far grass remains static.

草地斑块放置现在使用破碎边缘接受率、更低的边缘密度，以及边缘处更矮的低姿态草。草地摆动现在分为两层：玩家附近较明显的摆动，以及近中景的轻微风动，远景草仍保持静止。

# User Request / 用户需求

The user reported that the grass edge looked too deliberate despite procedural borders, and asked to make it more natural while restoring the grass sway effect.

用户反馈草地边缘虽然有程序边界，但看起来仍然太刻意，并要求让边缘更自然，同时恢复草地摆动效果。

# Scope / 范围

In scope: grass patch edge acceptance, grass edge scale and variant selection, near/mid-distance sway masks, and matching grass zone generation behavior.

范围内：草地斑块边缘接受率、边缘草缩放与变体选择、近中景摆动遮罩，以及对应的草地区块生成行为。

Out of scope: terrain texture replacement, tree visuals, water, character lighting, leaf decals, enemy assets, and unrelated dirty files.

范围外：地形贴图替换、树木视觉、水体、角色光照、落叶贴花、敌人资源，以及无关未提交文件。

# Acceptance Criteria / 验收标准

- The project builds successfully with `npm run build`.
- Grass patch borders appear broken, sparse, and lower instead of forming a hard wall.
- Grass centers remain dense enough to preserve the field feel.
- Grass within the near/mid field has subtle wind motion.
- Far grass remains static enough to avoid obvious shimmer returning.
- The commit includes only grass edge/sway files and this requirement document.

- 项目可以通过 `npm run build` 构建。
- 草地斑块边缘呈现破碎、稀疏、低矮的过渡，而不是硬墙。
- 草地中心仍保持足够密度，保留草场感觉。
- 近中景草具有轻微风动。
- 远景草保持足够静止，避免明显闪烁回归。
- 提交只包含草地边缘/摆动相关文件和本需求文档。
