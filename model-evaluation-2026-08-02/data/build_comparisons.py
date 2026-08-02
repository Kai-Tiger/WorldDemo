from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "screenshots"
PANEL = (640, 360)
LABEL_HEIGHT = 52


def font(size: int, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


TITLE = font(25, bold=True)
SUBTITLE = font(18)


def fit(source: Path, panel: tuple[int, int]) -> Image.Image:
    image = Image.open(source).convert("RGB")
    scale = max(panel[0] / image.width, panel[1] / image.height)
    size = (round(image.width * scale), round(image.height * scale))
    image = image.resize(size, Image.Resampling.LANCZOS)
    left = (image.width - panel[0]) // 2
    top = (image.height - panel[1]) // 2
    return image.crop((left, top, left + panel[0], top + panel[1]))


def build(output: str, columns: int, items: list[tuple[str, str, str]], panel: tuple[int, int] = PANEL):
    rows = (len(items) + columns - 1) // columns
    sheet = Image.new("RGB", (panel[0] * columns, (panel[1] + LABEL_HEIGHT) * rows), "white")
    draw = ImageDraw.Draw(sheet)
    for index, (filename, title, subtitle) in enumerate(items):
        x = (index % columns) * panel[0]
        y = (index // columns) * (panel[1] + LABEL_HEIGHT)
        sheet.paste(fit(SCREENSHOTS / filename, panel), (x, y))
        baseline = y + panel[1] + 10
        draw.text((x + 12, baseline), title, fill="#18324d", font=TITLE)
        title_width = draw.textlength(title, font=TITLE)
        draw.text((x + 20 + title_width, baseline + 5), subtitle, fill="#637083", font=SUBTITLE)
        draw.rectangle((x, y, x + panel[0] - 1, y + panel[1] + LABEL_HEIGHT - 1), outline="#d7dde5", width=2)
    sheet.save(ROOT / output, optimize=True)


build(
    "comparison-vista.png",
    4,
    [
        ("main-vista.png", "main", "benchmark"),
        ("gpt-5-6-luna-max-vista.png", "GPT 5.6 Luna Max", "luna-max"),
        ("gpt-5-5-vista.png", "GPT 5.5 xhigh", "~/Desktop/5.5"),
        ("deepseek-v4-flash-vista.png", "DeepSeek V4", "codex-ds-flash"),
        ("gpt-5-6-sol-vista.png", "GPT 5.6 Sol xhigh", "~/Desktop/5.6 · :4174"),
        ("glm-5-2-vista.png", "GLM 5.2", "feat/GLM-5-2"),
        ("gpt-5-6-luna-medium-vista.png", "GPT 5.6 Luna Medium", "gpt-luna"),
    ],
    panel=(480, 270),
)

build(
    "comparison-waterfall.png",
    3,
    [
        ("gpt-5-6-luna-max-waterfall.png", "GPT 5.6 Luna Max", "verified live fixed shot"),
        ("gpt-5-5-waterfall.png", "GPT 5.5 xhigh", "verified live fixed shot"),
        ("deepseek-v4-flash-waterfall.png", "DeepSeek V4", "committed fixed shot"),
        ("glm-5-2-waterfall.png", "GLM 5.2", "verified fixed shot"),
        ("gpt-5-6-luna-medium-waterfall.png", "GPT 5.6 Luna Medium", "committed fixed shot"),
        ("gpt-5-6-sol-waterfall.png", "GPT 5.6 Sol xhigh", "verified live fixed shot · :4174"),
    ],
    panel=(480, 270),
)

build(
    "comparison-third-person.png",
    3,
    [
        ("gpt-5-6-luna-max-spawn.png", "GPT 5.6 Luna Max", "third-person, T-pose"),
        ("gpt-5-5-spawn.png", "GPT 5.5 xhigh", "third-person, water occludes player"),
        ("deepseek-v4-flash-spawn.png", "DeepSeek V4", "first-person; player absent"),
        ("gpt-5-6-sol-spawn.png", "GPT 5.6 Sol xhigh", "third-person, visible player"),
        ("glm-5-2-spawn.png", "GLM 5.2", "third-person, T-pose"),
        ("gpt-5-6-luna-medium-spawn.png", "GPT 5.6 Luna Medium", "third-person, visible player"),
    ],
    panel=(480, 270),
)
