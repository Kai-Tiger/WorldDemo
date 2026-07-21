# Requirement / 需求

**English:** Replace the flat, isolated map-edge hills with a continuous alpine ridge that retains distinct pointed summits.

**中文：** 将地图边缘平缓且彼此孤立的丘陵改为连续的高山脊线，同时保留清晰的尖锐主峰。

## Summary / 概要

**English:** Add a continuous, irregular perimeter ridge beneath the existing landmark summits and give those summits a pointed profile without changing the central playable terrain.

**中文：** 在现有地标主峰下方增加一圈连续且不规则的外围山脊，并将主峰改为尖顶剖面，同时保持中央可玩地形不变。

## User Request / 用户需求

**English:** The hills at the map edge look too flat. Make them read as a connected mountain range with pointed peaks.

**中文：** 地图边缘的丘陵看起来太平，希望它们呈现为连绵、带尖峰的山脉。

## Scope / 范围

- **English:** Add one continuous rounded-square ridge within the outer terrain cells, with varied crest height and position around the perimeter.
- **中文：** 在外围地形区块内增加一条连续的圆角方形山脊，并让脊线高度和位置沿地图边缘产生变化。
- **English:** Preserve the existing separated 200–300 meter landmark summits, but replace their flat summit plateaus with pointed profiles and keep their upper outlines controlled.
- **中文：** 保留现有彼此分离的 200–300 米地标主峰，但将平顶平台改为尖顶剖面，并控制上部轮廓避免放射状畸变。
- **English:** Apply the same mountain mask to expanded-water carving and material suppression so rivers do not cut visible channels through the new ridge.
- **中文：** 将同一山脉遮罩用于外围水系雕刻和材质抑制，避免河道切穿新山脊。
- **English:** Leave the center heightmap, lowland lakes, rolling foothills, and world-edge fade unchanged.
- **中文：** 保持中央高度图、低地湖泊、缓丘和世界边缘淡出逻辑不变。

## Acceptance Criteria / 验收标准

- **English:** Radial samples around the full perimeter encounter a mountain crest of at least 135 meters with no lowland-sized gaps.
- **中文：** 沿地图外围完整一圈进行径向采样时，每个方向都能遇到至少 135 米高的山脊，不出现低地尺度的断口。
- **English:** Every landmark summit drops by more than 5 meters within 6% of its local radius, proving the former flat summit plateau is gone.
- **中文：** 每座地标主峰在局部半径 6% 的范围内下降超过 5 米，证明原有平顶平台已消失。
- **English:** Existing cross-cell seam continuity and high-mountain water suppression remain valid.
- **中文：** 现有跨区块接缝连续性和高山水系抑制继续有效。
- **English:** The original center terrain is unchanged, the targeted terrain tests and full test suite pass, the production build succeeds, and a fixed-camera visual check shows a continuous pointed skyline without console warnings.
- **中文：** 原始中央地形保持不变；定向地形测试和完整测试套件通过，生产构建成功；固定机位实景检查显示连续的尖峰天际线，且控制台无警告。
