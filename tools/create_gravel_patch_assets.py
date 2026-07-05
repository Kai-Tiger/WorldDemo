import math
import os
import random

import bpy


OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public",
    "assets",
    "terrain",
    "gravel-patches",
)

PATCHES = [
    {
        "name": "gravel_patch_small",
        "seed": 3101,
        "radius_x": 1.6,
        "radius_z": 1.05,
        "stones": 86,
        "edge_noise": 0.22,
    },
    {
        "name": "gravel_patch_medium",
        "seed": 3102,
        "radius_x": 2.55,
        "radius_z": 1.65,
        "stones": 158,
        "edge_noise": 0.25,
    },
    {
        "name": "gravel_patch_wide",
        "seed": 3103,
        "radius_x": 3.2,
        "radius_z": 2.15,
        "stones": 230,
        "edge_noise": 0.28,
    },
    {
        "name": "gravel_patch_strip",
        "seed": 3104,
        "radius_x": 4.2,
        "radius_z": 0.9,
        "stones": 190,
        "edge_noise": 0.32,
    },
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def create_material():
    material = bpy.data.materials.new("Matte Gravel Vertex Color")
    material.use_nodes = True

    nodes = material.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    attribute = nodes.new(type="ShaderNodeAttribute")
    attribute.attribute_name = "StoneColor"

    if bsdf:
        material.node_tree.links.new(attribute.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.92
        bsdf.inputs["Metallic"].default_value = 0.0

    return material


def random_point_in_patch(rng, patch):
    for _ in range(80):
        angle = rng.uniform(0, math.tau)
        radius = math.sqrt(rng.random())
        x = math.cos(angle) * radius * patch["radius_x"]
        z = math.sin(angle) * radius * patch["radius_z"]
        edge = math.sqrt((x / patch["radius_x"]) ** 2 + (z / patch["radius_z"]) ** 2)
        shape_noise = (
            math.sin(angle * 3.0 + patch["seed"] * 0.01) * 0.12
            + math.sin(angle * 5.0 - 1.7) * 0.08
            + math.sin(angle * 9.0 + 0.8) * 0.05
        )
        edge_limit = 1.0 + shape_noise * patch["edge_noise"]

        if edge <= edge_limit:
            return x, z, min(edge / max(edge_limit, 0.001), 1.0)

    return 0.0, 0.0, 0.0


def add_pebble(vertices, faces, colors, rng, center_x, center_z, edge):
    sides = rng.randint(7, 10)
    yaw = rng.uniform(0, math.tau)
    base_radius = rng.uniform(0.07, 0.18) * (1.0 - edge * 0.35)
    radius_x = base_radius * rng.uniform(0.85, 1.45)
    radius_z = base_radius * rng.uniform(0.7, 1.25)
    height = rng.uniform(0.018, 0.07) * (1.0 - edge * 0.28)
    top_offset_x = rng.uniform(-0.025, 0.025)
    top_offset_z = rng.uniform(-0.025, 0.025)
    base_index = len(vertices)
    stone_color = rng.choice([
        (0.24, 0.24, 0.22, 1.0),
        (0.31, 0.30, 0.27, 1.0),
        (0.38, 0.36, 0.31, 1.0),
        (0.28, 0.30, 0.30, 1.0),
        (0.43, 0.39, 0.32, 1.0),
    ])
    shade = rng.uniform(0.78, 1.18)
    color = (
        min(stone_color[0] * shade, 1.0),
        min(stone_color[1] * shade, 1.0),
        min(stone_color[2] * shade, 1.0),
        1.0,
    )

    bottom_indices = []
    top_indices = []

    for i in range(sides):
        t = i / sides
        angle = t * math.tau + yaw
        wobble = rng.uniform(0.78, 1.18)
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)
        x = center_x + cos_a * radius_x * wobble
        z = center_z + sin_a * radius_z * wobble
        bottom_indices.append(len(vertices))
        vertices.append((x, z, 0.0))
        colors.append(color)

    for i in range(sides):
        t = i / sides
        angle = t * math.tau + yaw + rng.uniform(-0.09, 0.09)
        wobble = rng.uniform(0.68, 1.05)
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)
        x = center_x + top_offset_x + cos_a * radius_x * 0.72 * wobble
        y = center_z + top_offset_z + sin_a * radius_z * 0.72 * wobble
        z = height * rng.uniform(0.82, 1.16)
        top_indices.append(len(vertices))
        vertices.append((x, y, z))
        colors.append(color)

    bottom_center = len(vertices)
    vertices.append((center_x, center_z, -0.002))
    colors.append(color)
    top_center = len(vertices)
    vertices.append((center_x + top_offset_x, center_z + top_offset_z, height * 1.06))
    colors.append((min(color[0] * 1.08, 1.0), min(color[1] * 1.08, 1.0), min(color[2] * 1.08, 1.0), 1.0))

    for i in range(sides):
        n = (i + 1) % sides
        faces.append((bottom_indices[i], bottom_indices[n], top_indices[n], top_indices[i]))
        faces.append((top_center, top_indices[i], top_indices[n]))
        faces.append((bottom_center, bottom_indices[n], bottom_indices[i]))

    return len(vertices) - base_index


def build_patch_mesh(patch, material):
    rng = random.Random(patch["seed"])
    vertices = []
    faces = []
    colors = []

    for _ in range(patch["stones"]):
        x, z, edge = random_point_in_patch(rng, patch)

        if edge > 0.72 and rng.random() < (edge - 0.72) * 1.8:
            continue

        add_pebble(vertices, faces, colors, rng, x, z, edge)

    mesh = bpy.data.meshes.new(patch["name"])
    mesh.from_pydata(vertices, [], faces)
    mesh.update()

    color_attr = mesh.color_attributes.new(name="StoneColor", type="BYTE_COLOR", domain="CORNER")
    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            color_attr.data[loop_index].color = colors[mesh.loops[loop_index].vertex_index]

    obj = bpy.data.objects.new(patch["name"], mesh)
    obj.data.materials.append(material)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_flat()
    obj.select_set(False)

    return obj


def export_patch(obj, filepath):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    clear_scene()
    material = create_material()

    for patch in PATCHES:
        obj = build_patch_mesh(patch, material)
        export_patch(obj, os.path.join(OUTPUT_DIR, f"{patch['name']}.glb"))
        bpy.data.objects.remove(obj, do_unlink=True)


if __name__ == "__main__":
    main()
