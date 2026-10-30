# Kid School Art

A self-hosted web app for scanning, organizing, sharing, and printing the art our kids bring home from school.

Each kid gets their own page. Families invite grandparents and other relatives with a link, and each person gets a role:

| Role | Can |
| --- | --- |
| Owner | Do everything, including inviting and removing family members |
| Parent | Add kids, upload art, and build collections |
| Viewer | Look at everything in the family, but not change it |

## Roadmap

1. **Foundation and families** (done): accounts, families, kids, invites, and roles.
2. **Kid pages and galleries** (done): collections tagged by school, teacher, year, and grade, with uploads from a scanner, phone camera, drag-and-drop, or bulk import.
3. **Sharing** (done): tag family members on art, plus read-only share links that can be revoked or expire.
4. **Year-end books** (started): a book builder with print-ready PDF and photo pack exports. Ordering directly through a print API, such as Lulu's, could come next.

## Adding art

On a kid's page or in a collection, you can:

- **Drop files** from a scanner folder or the desktop onto the upload box.
- **Choose files** from the computer or the phone's photo library.
- **Take a photo** with the phone's camera.
- **Import a folder** to bring in a whole batch, such as a year of scans.

Art uploaded on the kid's page lands in **Unsorted**. Use **Select** to pick pieces and move them into a collection. The app keeps the original file and makes smaller copies for the gallery, turning phone photos upright.

iPhone HEIC photos can't be read yet. Safari converts them when you upload, or you can set the camera to "Most Compatible".

## Sharing

- **Tag family:** on any piece or collection, tag people in the family, with an optional note. It shows up on their **For you** page, with a badge in the header until they've looked.
- **Share links:** parents and owners can use **Share** on a kid, collection, or piece to make a read-only link for someone without an account, like a teacher or a friend. Each link can expire after a week, a month, three months, or a year, or never, and can optionally allow downloading the originals. You can see how often each link was opened and turn any of them off under **Manage family**.

## Year-end books

On a kid's page, **Make a book** turns collections into a book. Choose the size (8×8, 8.5×8.5, 12×12, 8.5×11, 11×8.5, or 10×8), the layout (one, two, or four pieces per page), and what goes under each piece (title, what they said, date and age). You can also add a dedication. In the builder you can reorder collections, leave pieces out, and pick the cover.

Downloads:

- **Print-ready PDF:** a cover, a title page for each collection, then the art. Bleed (⅛") is on by default for print services like Blurb, Lulu, or a print shop; turn it off for home printing. A padded version adds blank pages up to the 20-page minimum most photo books need.
- **Photo pack:** numbered, full-resolution JPEGs in book order plus `captions.txt`, for services that only take photos into their own editor (Shutterfly, Mixbook, Artifact Uprising).

## Develop on the Mac

You need Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:3000. The first person to sign up sets things up; after that, new people join with an invite link. Data is stored in `./data`.

```sh
npm test        # unit tests
npm run lint    # type check
```

## Run on the Raspberry Pi

Use a 64-bit Raspberry Pi OS with Docker installed. On the Pi:

```sh
git clone https://github.com/christiangoff/kid-school-art.git
cd kid-school-art
cp .env.example .env   # then set APP_URL, e.g. http://raspberrypi.local:3000
docker compose up -d --build
```

The app runs on port 3000. Everything it stores (the database and the art) is in the `data` folder next to `compose.yaml`, so that's the folder to back up.

To update later: `git pull && docker compose up -d --build`.

### Settings

See [`.env.example`](.env.example):

- `APP_URL`: the address people use to reach the app. Invite links use it, and an `https://` address turns on HTTPS-only cookies.
- `DATA_DIR`: where data is stored (the Docker image uses `/data`).
- `ALLOW_SIGNUP=true`: let anyone create an account without an invite.
