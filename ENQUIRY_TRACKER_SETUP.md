# Hospera Enquiry Tracker Setup

This setup keeps your existing enquiry email flow working and also writes every new website enquiry into your Google Sheet automatically.

## What gets added

- `Contact` and `Careers` enquiries go to `Enquiry Tracker`
- `Live Chat` opening messages go to `Enquiry Tracker`
- `Apply Now` submissions go to `Apply Now`
- `Apply Now` entries are marked `High` priority by default

## Files you already have

- Spreadsheet template: `Hospera-Enquiry-Tracker.xlsx`
- Google Apps Script receiver: `HOSPERA_ENQUIRY_TRACKER.gs`

## Step 1: Upload the tracker into Google Drive

1. Open [Google Drive](https://drive.google.com/drive/u/1/my-drive)
2. Upload `Hospera-Enquiry-Tracker.xlsx`
3. After upload, right-click it
4. Choose `Open with > Google Sheets`
5. Rename it if you want, for example: `Hospera Enquiry Tracker`

## Step 2: Add the Apps Script inside that Google Sheet

1. Open the Google Sheet
2. Click `Extensions > Apps Script`
3. Delete the default sample code
4. Open the local file `HOSPERA_ENQUIRY_TRACKER.gs`
5. Copy all code from that file
6. Paste it into Apps Script
7. Click `Save`

## Step 3: Deploy it as a web app

1. In Apps Script, click `Deploy`
2. Click `New deployment`
3. Click the gear icon and choose `Web app`
4. Set:
   - `Execute as`: `Me`
   - `Who has access`: `Anyone`
5. Click `Deploy`
6. Copy the `Web app URL`

## Step 4: Put that web app URL into the website

Open:

- `script.js`

Find this line:

```js
trackerSyncUrl: "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"
```

Replace it with your real Apps Script web app URL.

## Step 5: Upload updated website files to GitHub

Upload these updated files from the `Google Analytics` folder:

- `script.js`
- `chat-client.js`
- `contact.html`
- `careers.html`
- `apply.html`

## Step 6: Test it

1. Fill the `Contact` form
2. Check the `Enquiry Tracker` tab in Google Sheets
3. Fill the `Apply Now` form
4. Check the `Apply Now` tab
5. Start a new live chat
6. Check the `Enquiry Tracker` tab again

## Important note

If `trackerSyncUrl` is still left as the placeholder, nothing breaks. The website will keep working, but sheet sync will stay off until you paste the real web app URL.
