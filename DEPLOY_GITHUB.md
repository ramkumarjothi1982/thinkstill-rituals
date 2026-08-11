# Deploy to GitHub

1. Open your ThinkStill GitHub repository.
2. Upload **all files from this folder to the same repository directory**.
3. Commit the upload.
4. In GitHub: **Settings → Pages**.
5. Deploy from the branch/folder that contains `index.html`.
6. Open the GitHub Pages URL and test:
   - ritual data loads;
   - Bubble badge appears;
   - title/goal/steps/win/support/formula/safety render;
   - Another reset does not immediately repeat;
   - close/reopen browser and confirm history persists;
   - dark/light mode persists.

## Raw manifest path

If these files are in the repository root, the raw manifest follows this form:

`https://raw.githubusercontent.com/<OWNER>/<REPO>/refs/heads/main/manifest.json`

## Circle gating

Do not rely on JavaScript `document.referrer` alone for paid/member-only access. If you already use `redirect-glitch` / `unlock-glitch` server-side protection, point the protected destination to this deployed app.
