# Tree and Rock Volume Collision / 树木与石头体积碰撞

## Requirement / 需求

**English:** Prevent the player from passing through model trees and scene rocks by adding fitted volume collision.

**中文：** 为模型树木与场景石头增加贴合的体积碰撞，阻止玩家从中穿过。

## Summary / 概要

**English:** Register lightweight cylindrical colliders from the existing tree and rock placement data, then sweep the player's cylindrical body through the nearby collision volumes during horizontal movement.

**中文：** 根据现有树木与石头放置数据注册轻量圆柱碰撞体，并在角色水平移动时，让角色圆柱体对附近碰撞体执行扫掠检测。

## User Request / 用户需求

**English:** Trees and rocks in the current scene can be clipped through; add volume collision.

**中文：** 现在场景里的树木和石头会穿模，增加体积碰撞。

## Scope / 范围

**English:** Add trunk-sized collision for dynamically streamed model trees and fitted collision for fixed and instanced hero rocks. Keep decorative foliage and far-tree silhouettes non-colliding. Synchronize tree colliders with chunk generation and disposal, support sliding along obstacles, prevent movement tunneling, and allow passage when the player is vertically above a collider.

**中文：** 为动态流式加载的模型树添加树干尺寸碰撞，为固定及实例化的主要石头添加贴合碰撞。装饰性树冠与远景树轮廓不参与碰撞。树木碰撞随区块生成和卸载同步，支持沿障碍物表面滑动、防止高速移动穿透，并允许玩家在垂直高度超过碰撞体后通过。

## Acceptance Criteria / 验收标准

**English:**

- Ground-level player movement cannot pass through loaded model-tree trunks or scene rocks.
- Fast horizontal movement cannot tunnel through a collision volume and diagonal movement can slide along it.
- Tree colliders are added and removed with their streamed tree zones.
- The player can pass above a rock or trunk collider when their vertical volumes do not overlap.
- Focused collision tests, the full test suite, and the production build pass.

**中文：**

- 玩家在地面移动时无法穿过已加载模型树的树干或场景石头。
- 高速水平移动无法直接穿透碰撞体，斜向移动可以沿碰撞体表面滑动。
- 树木碰撞体随流式树木区块一同添加和移除。
- 当玩家与石头或树干碰撞体在垂直方向不重叠时，可以从其上方通过。
- 碰撞定向测试、完整测试集和生产构建通过。
