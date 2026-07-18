# Headless Real Estate Demo

A bilingual (EN/PT) real estate showcase built with a headless architecture: WordPress as a headless CMS via WPGraphQL and Next.js 15 frontend deployed on Vercel.

## Project Structure

- **`wp-plugin/`** - WordPress companion plugin
  - Property Custom Post Type (CPT)
  - ACF fields for property details (bedrooms, bathrooms, price, images, etc.)
  - GraphQL integration via WPGraphQL
  - Polylang bilingual wiring

- **`frontend/`** - Next.js 15 frontend application
  - Server-side rendering with static export capabilities
  - Tailwind CSS for styling
  - Fetches property listings from WordPress via GraphQL
  - Deployed on Vercel

- **`docs/`** - Project documentation and design specifications

## Local Development

_Documentation for local development setup (Docker WordPress environment, Yarn workflow, etc.) will be added as the project progresses._

## License

MIT
