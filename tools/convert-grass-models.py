from pathlib import Path

import bpy


SOURCE_DIR = Path("public/assets/vegetation/ribbon-grass")
OUTPUT_DIR = SOURCE_DIR / "optimized" / "models-raw"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

for source in sorted(SOURCE_DIR.glob("*_LOD*.fbx")):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(source.resolve()))
    bpy.ops.export_scene.gltf(
        filepath=str((OUTPUT_DIR / f"{source.stem}.glb").resolve()),
        export_format="GLB",
        export_apply=True,
        export_materials="NONE",
        export_animations=False,
        export_yup=True,
    )
