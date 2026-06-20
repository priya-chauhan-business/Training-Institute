# Hospera Forms Email Setup

Your current Google Apps Script web app URL is live, but it is broken because the deployed script does not contain `doPost()`.

That is why the website form currently shows success but no email reaches the admin inbox.

## Fix it

1. Open [HOSPERA_FORMS_APPS_SCRIPT.gs](C:/Users/HP/Desktop/Hospera-Institute%20of%20Hospitality/Website%20creation%20-Github/Hospera%20website/Github%20designs%20-%20Master/Training-Institute-main%204june/Google%20Analytics/HOSPERA_FORMS_APPS_SCRIPT.gs)
2. Copy the full code
3. Go to [script.google.com](https://script.google.com/)
4. Create a new Apps Script project
5. Delete any default code
6. Paste the full Hospera script code
7. Click `Deploy`
8. Choose `New deployment`
9. Select `Web app`
10. Set:
   - Execute as: `Me`
   - Who has access: `Anyone`
11. Click `Deploy`
12. Copy the new Web App URL

## Put the new URL into the website

Open [script.js](C:/Users/HP/Desktop/Hospera-Institute%20of%20Hospitality/Website%20creation%20-Github/Hospera%20website/Github%20designs%20-%20Master/Training-Institute-main%204june/Google%20Analytics/script.js)

Replace this line:

```js
appsScriptUrl: "https://script.google.com/macros/s/AKfycbz9u5HoQJLcl8g6T6vUCVBOecQZ4JeK2wuwl6fFqMpZ_4dfyJ92iObesa3Lg-H5vM0/exec",
```

with your new deployed Web App URL.

## What the fixed script does

- sends the candidate details to `admin@hosperainstitute.com`
- sends the candidate an automatic email reply if they entered an email address
- uses the message:

`Thanks for your interest. Our team will get back to you shortly.`

## Important

If you later edit the Apps Script code, you must deploy a new version again.
