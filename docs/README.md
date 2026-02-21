---
layout: Layout
pageClass: landing-page-wrapper
pageInfo: false
author: false
readingTime: false
contributors: false
editLink: false
lastUpdated: false
prev: false
next: false
comment: false
footer: false
breadcrumb: false
toc: false
navbar: true
article: false
---

<LandingPage />

<style>
/* Force transparent background */
.landing-page-wrapper,
.landing-page-wrapper .vp-page,
.landing-page-wrapper .theme-hope-content,
.landing-page-wrapper .vp-article-wrapper {
  background: transparent !important;
  background-color: transparent !important;
  max-width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* Hide navbar border/line - comprehensive selectors */
.landing-page-wrapper .vp-navbar,
.landing-page-wrapper #navbar,
.landing-page-wrapper nav,
.landing-page-wrapper header,
.vp-navbar,
nav.vp-navbar,
header.vp-navbar {
  border-bottom: none !important;
  box-shadow: none !important;
  border: none !important;
}

/* Hide any pseudo-elements that might create lines */
.vp-navbar::after,
.vp-navbar::before,
.landing-page-wrapper header::after,
.landing-page-wrapper header::before {
  display: none !important;
  content: none !important;
}

/* Hide horizontal line/divider */
.landing-page-wrapper hr {
  display: none !important;
}

/* Hide all page info elements */
.landing-page-wrapper .page-info,
.landing-page-wrapper .page-meta,
.landing-page-wrapper .vp-page-meta,
.landing-page-wrapper .vp-page-nav,
.landing-page-wrapper .vp-toc-placeholder,
.landing-page-wrapper .page-title,
.landing-page-wrapper .vp-sidebar,
.landing-page-wrapper .vp-page-title,
.landing-page-wrapper footer.vp-footer {
  display: none !important;
}

/* Full width content */
.landing-page-wrapper .theme-hope-content {
  max-width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}

.landing-page-wrapper .vp-page {
  padding: 0 !important;
  padding-top: 0 !important;
}

.landing-page-wrapper .theme-container {
  overflow-x: hidden !important;
}

.landing-page-wrapper .vp-sidebar-mask {
  display: none !important;
}
</style>
