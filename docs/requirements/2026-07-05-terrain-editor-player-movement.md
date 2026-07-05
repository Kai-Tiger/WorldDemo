# Requirement / 需求

English: Allow the player to keep moving while the terrain editor is open.

中文：允许玩家在地形编辑器打开时继续移动。

# Summary / 概要

English: Keep keyboard-driven player movement, terrain streaming, gravel updates, and camera following active during edit mode, while disabling only pointer-driven camera rotation and zoom so terrain brush painting remains stable.

中文：在编辑模式下保持键盘驱动的玩家移动、地形加载、碎石更新和相机跟随，同时只禁用鼠标驱动的相机旋转与缩放，确保地形笔刷绘制保持稳定。

# User Request / 用户需求

English: The user asked for the character to remain movable after entering terrain edit mode.

中文：用户要求进入地形编辑模式后人物仍然可以移动。

# Scope / 范围

English: Update only edit-mode input handling and the main per-frame update gate. Do not change terrain brush radius, strength, save behavior, terrain assets, water, vegetation, player movement rules, camera follow math, or unrelated pending work.

中文：只更新编辑模式输入处理和主循环逐帧更新条件。不修改地形笔刷半径、强度、保存行为、地形资产、水体、植被、玩家移动规则、相机跟随算法或无关未提交改动。

# Acceptance Criteria / 验收标准

English:
- WASD, Alt, and Ctrl movement remain active while the terrain editor is open.
- Terrain chunks, gravel overlay, camera follow, HUD position, lighting, and visual systems continue updating from the moving player.
- Terrain brush painting still works with left-click drag.
- Dragging the brush does not also rotate or zoom the camera.
- The production build completes successfully.

中文：
- 地形编辑器打开时，WASD、Alt 和 Ctrl 移动仍然可用。
- 地形分块、碎石覆盖层、相机跟随、HUD 坐标、灯光和视觉系统会继续跟随移动中的玩家更新。
- 左键拖拽地形笔刷仍然可以绘制。
- 拖拽笔刷时不会同时旋转或缩放相机。
- 生产构建成功完成。
