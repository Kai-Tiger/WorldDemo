# Waterfall Outlet Channel Height / 瀑布出口河道高度

## Requirement / 需求

English: Keep the lake outlet water in its carved channel until it reaches the waterfall lip.

中文：让湖泊出口水流在到达瀑布口之前保持在雕刻出的河道内。

## Summary / 概要

English: The outlet channel and outlet stream now stay near the waterfall lip height instead of descending to the plunge pool before the waterfall begins.

中文：出口河道和出口水面现在保持在瀑布口附近高度，而不是在瀑布开始前提前下降到冲潭高度。

## User Request / 用户需求

English: The user reported that the waterfall river channel appears to flow from the air instead of staying in the riverbed.

中文：用户反馈瀑布河道看起来像是从空中流下来的，没有在河道里。

## Scope / 范围

English: Update only the outlet stream height and outlet channel terrain carving before the waterfall. Do not change lake shape, waterfall shader, mist particles, downstream river geometry, vegetation, player behavior, or unrelated pending work.

中文：仅更新瀑布前的出口水面高度和出口河道地形雕刻。不改变湖泊形状、瀑布着色器、雾粒子、下游主河道几何、植被、玩家行为或无关的待提交改动。

## Acceptance Criteria / 验收标准

English:
- The outlet stream remains near the lake and waterfall lip elevation until it reaches the waterfall.
- The outlet channel bed no longer ramps down to the plunge pool before the waterfall.
- The waterfall drop remains handled by the waterfall veil and plunge pool.
- The project build passes.

中文：
- 出口水流在到达瀑布前保持在湖面和瀑布口附近高度。
- 出口河床不再在瀑布前提前下降到冲潭。
- 瀑布落差仍由瀑布帘和冲潭表现。
- 项目构建通过。
