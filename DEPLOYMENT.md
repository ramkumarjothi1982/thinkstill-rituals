# Deployment

## GitHub Pages

The included workflow publishes only the runtime files. The source workbook, scripts and repository documentation remain in the repository but are not copied into the public Pages artifact.

1. Push all files to `main`.
2. Set **Settings → Pages → Source** to **GitHub Actions**.
3. Run or re-run **Deploy ThinkStill to GitHub Pages**.
4. Confirm the workflow's validation step passes before deployment.

## Custom domain

1. Copy `CNAME.example` to a file named `CNAME`.
2. Replace the sample value with the domain.
3. Add `CNAME` to the runtime-file copy command in `.github/workflows/pages.yml`.
4. Configure the required DNS record with your domain provider.

## Local preview

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

## Release check

```bash
npm test
```

Deployment must stop if the validator finds a missing body, incomplete consumer section, ID gap, loss of uniqueness, double period, awkward one-inch construction, backend label leakage or manifest-integrity mismatch.
