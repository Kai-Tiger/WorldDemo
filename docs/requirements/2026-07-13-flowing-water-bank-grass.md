# Flowing-Water Bank Grass / 流动水系河岸草

## Requirement / 需求

**中文：** 将所有流动水系河岸的整带禁草改为分层、确定性的稀疏草布局，同时保持水面、湿岸、静态湖岸、瀑布唇和落水潭安全区无草。

**English:** Replace blanket grass exclusion along every flowing-water bank with layered, deterministic sparse grass while keeping water surfaces, wet banks, static lake shores, the waterfall lip, and the plunge-pool safety area grass-free.

## Summary / 概要

**中文：** 河岸草接受率从湿岸外的零值平滑提升到砾石或干岸外缘的 0.35，再在外侧 2.5 米恢复为普通草地。Hero 河使用动态湿岸与砾石宽度，山地河、低地溪流和瀑布前出口使用现有水系影响范围；运行时通过独立稳定哈希筛选既有草候选，不新增模型、材质或 draw call。

**English:** Bank-grass acceptance rises smoothly from zero beyond the wet bank to 0.35 at the gravel or dry-bank edge, then returns to normal grass over the next 2.5 meters. The Hero river uses its dynamic wet and gravel widths, while mountain rivers, lowland streams, and the pre-waterfall outlet use their existing water influence; runtime placement filters existing candidates with an independent stable hash and adds no models, materials, or draw calls.

## User Request / 用户需求

**中文：** 用户认为河岸完全不长草过于粗暴，要求先设计布局，再为全部流动水系实现偏茂盛但不会穿水的稀疏河岸草。

**English:** The user found fully grass-free riverbanks too blunt and requested a designed layout followed by implementation of relatively lush, sparse bank grass across all flowing waterways without water intersections.

## Scope / 范围

**中文：** 覆盖 Hero 主河和支流、山地河网、三组低地溪流以及瀑布前出口河带。保留草模型、群落噪声、LOD、坡度与地面遮罩、树木排除、河岸材质和高度图；静态湖岸、瀑布飞溅核心和落水潭继续硬排除。

**English:** Cover the Hero trunk and tributaries, mountain river network, three lowland stream systems, and the pre-waterfall outlet. Preserve grass assets, community noise, LODs, slope and ground masks, tree exclusions, bank materials, and the heightmap; static lake shores, the waterfall spray core, and the plunge pool remain hard exclusions.

## Acceptance Criteria / 验收标准

**中文：**

- 水面、湿岸及外侧 0.6 米安全带的草接受率为 0；岸带外缘为 0.35；再向外 2.5 米恢复为 1，且全程有限、单调并位于 0 到 1。
- Hero Y 形交汇的三条水臂无草，旱地夹角允许稀草，不产生圆形空白；其他河网交汇对所有候选河臂取最严格结果。
- 静态湖岸、瀑布唇最后 3 米和落水潭现有安全范围保持无草，草根与草叶不得明显穿过水面轮廓。
- 河岸候选筛选跨分区确定且可重复，稀草带密度约为邻接完整草地的 10% 到 40%，并保持质量档位的嵌套 LOD 子集。
- 全量测试、生产构建、低地确定性检查和固定河岸视觉镜头通过。

**English:**

- Grass acceptance is 0 across water, wet banks, and the outer 0.6-meter safety strip; it reaches 0.35 at the bank edge and returns to 1 over the next 2.5 meters, remaining finite, monotonic, and bounded from 0 to 1.
- All three wet arms of Hero Y junctions remain grass-free while dry wedges may receive sparse grass without a circular clearing; other confluences use the strictest result across every candidate arm.
- Static lake shores, the final 3 meters before the waterfall lip, and the existing plunge-pool safety area remain grass-free, with no visible roots or blades crossing the water silhouette.
- Bank candidate filtering is deterministic and repeatable across zones, sparse-band density is about 10% to 40% of adjacent full grass, and quality presets retain nested LOD subsets.
- The full test suite, production build, deterministic lowland check, and fixed bank visual shots pass.
