# Requirement / 需求

Create a quick terrain editing tool that opens from the game page, lets the user paint height changes directly on the 3D terrain, previews the terrain changes live, and saves the result back into the project heightmap file.

创建一个快速地形编辑工具，可从游戏页面打开，让用户直接在 3D 地形上绘制高度变化，实时预览地形变化，并将结果保存回项目高度图文件。

# Summary / 概要

The editor adds an `Edit` button to the HUD. It opens a compact in-scene editing toolbar with raise, lower, radius, strength, save, and close controls. The mouse raycasts onto the visible 3D terrain, shows a circular brush cursor, modifies the in-memory heightmap under the brush, and refreshes affected terrain chunks immediately. Saving posts the encoded WebP heightmap to a local Vite middleware, which overwrites `public/assets/terrain/height.webp` after creating a one-time backup.

编辑器在 HUD 中增加 `Edit` 按钮。点击后打开紧凑的场景内编辑工具栏，提供增高、降低、半径、强度、保存和关闭控制。鼠标会对可见 3D 地形做射线检测，显示圆形笔刷光标，修改笔刷下方的内存高度图，并立即刷新受影响的地形 chunk。保存时将编码后的 WebP 高度图发送到本地 Vite middleware；middleware 会先创建一次性备份，再覆盖 `public/assets/terrain/height.webp`。

# User Request / 用户需求

The user wants a fast and intuitive terrain editing workflow: click an edit button, enter the current 3D scene editing mode, use two brushes to raise or lower terrain directly under the cursor, preview changes in real time, and save the edited height data inside the project directory.

用户希望获得快速且直观的地形编辑流程：点击编辑按钮，进入当前 3D 场景编辑模式，用两个笔刷直接对鼠标下方地形增高或降低，实时预览变化，并把编辑后的高度数据保存到项目目录中。

# Scope / 范围

Add the first version of the in-scene terrain editor UI, raycast terrain brush editing, in-memory heightmap updates, affected chunk refresh, and a local dev save endpoint. Do not add undo, smoothing brushes, terrain material painting, a separate editor page, a top-down heightmap editor, or production file writing.

新增第一版场景内地形编辑器 UI、射线地形笔刷编辑、内存高度图更新、受影响 chunk 刷新，以及本地开发保存接口。不加入撤销、平滑笔刷、地形材质绘制、独立编辑页面、俯视高度图编辑器或生产环境写文件能力。

# Acceptance Criteria / 验收标准

`npm run build` passes. The `Edit` button opens the in-scene terrain editing toolbar. Moving the cursor over visible terrain shows a circular brush. `Raise` and `Lower` brushes update terrain height in the current 3D preview. `Save` writes `public/assets/terrain/height.webp` through the local dev server and creates `public/assets/terrain/height.original.webp` on the first save.

`npm run build` 通过。`Edit` 按钮能打开场景内地形编辑工具栏。鼠标移动到可见地形上时显示圆形笔刷。`Raise` 与 `Lower` 笔刷会更新当前 3D 预览中的地形高度。`Save` 通过本地开发服务器写入 `public/assets/terrain/height.webp`，并在首次保存时创建 `public/assets/terrain/height.original.webp`。
