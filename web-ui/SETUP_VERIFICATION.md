# Setup Verification Guide

## Verify Tailwind CSS v4 is Working

### 1. Check Build Output
```bash
npm run build
```

You should see:
- CSS file around ~14KB (indicates Tailwind styles are generated)
- No build errors
- TypeScript compilation successful

### 2. Check Dev Server
```bash
npm run dev
```

Open `http://localhost:5173` and verify:
- Page loads without console errors
- Styles are applied (cards have borders, proper spacing, etc.)
- Text has proper typography (font weights, sizes)
- Colors are applied (gray backgrounds, blue buttons)

### 3. Visual Verification Checklist

When the dashboard loads, you should see:

✅ **Header Section:**
- Large, bold "Solana Cluster Monitor" title
- Gray subtitle text with proper spacing
- Blue "Refresh" button with hover effects

✅ **Cards (if cluster is running):**
- White background cards with subtle shadows
- Rounded corners and borders
- Proper padding and spacing
- Colored status indicators (green, blue, purple, orange dots)

✅ **No Nodes Message (if cluster is offline):**
- Card with proper styling
- Gray code block background
- Monospace font for the command

✅ **Responsive Layout:**
- Grid layout adjusts on different screen sizes
- Proper spacing between elements
- Text remains readable at all sizes

### 4. Browser Developer Tools Check

Open browser dev tools and verify:
- No CSS-related console errors
- Tailwind classes are present in the DOM
- Computed styles show proper values (margins, padding, colors)

### 5. Common Issues and Solutions

**Problem:** Styles not applied, everything looks unstyled
**Solution:** 
- Check that `@import "tailwindcss";` is in `src/index.css`
- Verify `@tailwindcss/vite` is in `vite.config.ts`
- Restart dev server

**Problem:** Build fails with CSS errors
**Solution:**
- Ensure using Tailwind CSS v4 (not v3)
- Remove any old `tailwind.config.js` files
- Check that all class names are valid Tailwind utilities

**Problem:** Some styles missing
**Solution:**
- Tailwind v4 auto-detects classes, ensure they're in source files
- Check for typos in class names
- Verify custom components use standard Tailwind classes