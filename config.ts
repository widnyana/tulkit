const port = process.env.PORT || 3000;

export const APP_URL = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}`
  : `http://127.0.0.1:${port}`;

// export const STATIC_ASSETS_URL = "https://static.easyinvoicepdf.com";
export const STATIC_ASSETS_URL = APP_URL;

export const PROD_WEBSITE_URL = "https://tulkit.widnyana.web.id";

export const GITHUB_URL = "https://github.com/widnyana/tulkit";

export const TWITTER_URL = "https://x.com/widnyana_";
