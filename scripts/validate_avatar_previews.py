"""Check complete manifests and decode every frame of both saved GIF sets."""
import json
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
ids={e['id'] for e in json.loads((root/'public/assets/desk-break/exercises.json').read_text(encoding='utf-8'))['exercises']}
for avatar in ['man-athletic','woman-casual','wood']:
    folder=root/'public/previews' if avatar == 'wood' else root/'public/previews'/avatar
    manifest=json.loads((folder/'manifest.json').read_text())
    assert len(manifest)==len(ids) and set(manifest)==ids, f'{avatar}: incomplete manifest'
    total=0
    for id in ids:
        with Image.open(folder/(id+'.gif')) as im:
            assert im.size==(360,300) and im.info.get('loop')==0, id
            for frame in range(im.n_frames):
                im.seek(frame);im.load();total+=1
                assert im.info.get('duration',0)>0, id
    print(f'{avatar}: {len(ids)} complete previews, {total} frames decoded successfully.')
