# Photo, membership verification and appearance

## Recognition photograph

The shared `PhotoEditor` component is used during account signup, account activation and class registration. It provides click-to-select and drag/drop input, a square crop preview, rotation in 90-degree increments, zoom, and JPEG output at 800 x 800 pixels. The normalized JPEG is uploaded to the private `student-photos` bucket.

Phone browsers do not all decode HEIC/HEIF. The editor attempts `createImageBitmap` and then the browser image decoder. If both fail, it asks the user to convert the photo to JPG in the phone gallery.

## Membership verification

A card is downloadable only when `registration_status = 'approved'`, `membership_status = 'active'`, and a card verification token exists. Approval is performed by an authorized administrator from the registration management page. The issued QR code opens `/verify/:token`, which checks the live membership record. This is a class membership card, not an official KMTC student ID.

## Appearance

The appearance provider supports four explicit themes: `light`, `dark`, `teal`, and `contrast`. Font preferences include `system`, `poppins`, `nunito`, `humanist`, `serif`, `editorial`, `slab`, and `mono`. Preferences are saved locally in the browser. Google Fonts are optional; CSS fallback stacks keep the portal readable offline.
