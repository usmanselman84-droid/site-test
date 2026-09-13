# Home performance (ty 1.6.183)

- Root `generateMetadata` no longer calls `headers()` via getSiteIdentity (that dynamized every route).
- Home `revalidate = 60` instead of force-dynamic.
- Manrope/Unbounded subset WOFF2; hero WebP; skip `/_next/image` for static covers.
- Nginx gzip_types enabled for CSS/JS.

Dest: `/opt/sochi-portal-staging` matching filenames under `src/app` and `src/components`.
