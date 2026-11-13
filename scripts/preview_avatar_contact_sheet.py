from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
ids = ['standing-cat-cow','standing-side-bend-reach','chair-march','plank-full','child-pose','glute-bridge','neck-rotation','overhead-triceps-stretch','wrist-circles','dance-ymca','funny-cartwheel','yoga-easy-boat']
sheet = Image.new('RGB', (240*6,440*2), '#f2ede4')
draw = ImageDraw.Draw(sheet)
for row,avatar in enumerate(['man-athletic','woman-casual']):
    for col,exercise in enumerate(ids):
        x,y=(col%6)*240,(row*2+col//6)*220
        path=root/'public'/'previews'/avatar/(exercise+'.gif')
        if path.exists():
            with Image.open(path) as im:
                im.seek(im.n_frames//2);sheet.paste(im.convert('RGB'),(x,y))
        draw.text((x+4,y+201),f'{avatar}: {exercise}',fill='black')
output=root/'.artifacts'/'avatars';output.mkdir(parents=True,exist_ok=True)
sheet.save(output/'avatar-review.png')
