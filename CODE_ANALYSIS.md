# GAIA Website - Detailed Code Analysis

## Project Overview
This is a **static website** built with **Astro v2.10.15** for GAIA, a blockchain interaction platform focused on Solana ecosystem engagement through AI-powered chat experiences.

## Key Findings

### 1. **Chatbot Location**
❌ **The chatbot is NOT embedded in this codebase.**

The chatbot is hosted externally at:
- **Web Application**: `https://askgaia.app` (or `http://askgaia.app`)
- **Chrome Extension**: Available on Chrome Web Store (ID: `afebmagfbkjhjpgjohcgpplmnjlmpaam`)

This repository contains only the **marketing/landing website** that links to the chatbot.

### 2. **Project Structure**
```
gaia-main/
├── index.html              # Main landing page
├── contact/               # Contact page
├── vision/                # Vision/about page
├── work/                  # Case studies/work portfolio
├── privacy-policy/        # Privacy policy page
├── assets/                # Compiled CSS/JS bundles
├── _astro/                # Astro build artifacts
├── images/                # Images and logos
├── fonts/                 # Custom fonts
├── videos/                # Video assets
└── vercel.json            # Vercel deployment config
```

### 3. **Technology Stack**
- **Framework**: Astro v2.10.15 (static site generator)
- **Deployment**: Vercel (based on vercel.json)
- **Analytics**: Google Tag Manager (GTM-NTXJ6R88)
- **Chat Integration**: HubSpot Scripts (js-eu1.hs-scripts.com)

### 4. **Key Features**

#### Visual Effects
- **WebGL Bubble Animation**: Interactive 3D bubble effect using WebGL
- **Profile Silhouette Animation**: SVG profile image that responds to scroll and mouse movement
- **Smooth Scroll Animations**: Custom scroll-based animations
- **Preloader**: Animated loading screen with gradient circles

#### Interactive Elements
- **Menu System**: Animated hamburger menu with overlay
- **Video Player**: Custom video player for reel content
- **Copy Button**: Clipboard functionality for Solana wallet address
- **Cookie Consent**: GDPR-compliant cookie banner

#### Content Sections
- **Landing Intro**: Hero section with CTA buttons
- **Vision Section**: Company mission and values
- **Work Portfolio**: Multiple case study pages
- **Contact Page**: Links to chatbot and Chrome extension
- **Footer**: Social links and company info

### 5. **Chatbot References**

The website mentions the chatbot in several places:

1. **Homepage (index.html)**:
   - Line 602-603: "AI-powered chat experiences"
   - Line 680: "AI-powered conversations"
   - Line 689: Link to `https://askgaia.app`

2. **Vision Page (vision/index.html)**:
   - Line 299-303: "An AI chatbot rooted in ChatGPT and Solana"

3. **Contact Page (contact/index.html)**:
   - Line 308: "Chat with GAIA" button linking to askgaia.app
   - Line 353: "Download Extension" button for Chrome extension

### 6. **Solana Integration**
- **Wallet Address Display**: Shows Solana wallet address `4SUseTDGaWtMtFQFV9pt9bD4MGc1qFR4XeMqy3CYpump` with copy functionality
- **Solana Logo**: Featured in the "Trusted by" section
- **Blockchain Focus**: Content emphasizes Solana ecosystem integration

### 7. **Code Quality Observations**

#### Strengths
- ✅ Well-structured HTML
- ✅ Responsive design considerations
- ✅ Accessibility features (aria-labels)
- ✅ SEO meta tags
- ✅ Performance optimizations (preloading, lazy loading)

#### Areas of Note
- ⚠️ Large JavaScript bundle (bundle.c2377b65.js - ~48,000+ lines)
- ⚠️ Inline styles mixed with external CSS
- ⚠️ Multiple scroll test sections in index.html (lines 1393-1490) - appears to be test code

### 8. **Running the Website**

Since this is a static site, it can be served using:
- Any static file server (Python's http.server, Node's http-server, etc.)
- Vercel CLI
- Any web server (Apache, Nginx)

### 9. **Dependencies**
No package.json found - this appears to be the **built/dist** version of the site, not the source code.

## Conclusion

**Answer to "Is the chatbot inside the code?":**
**NO** - The chatbot is hosted separately at `askgaia.app`. This repository only contains the marketing website that promotes and links to the chatbot. The chatbot functionality itself would be in a separate codebase/repository.

