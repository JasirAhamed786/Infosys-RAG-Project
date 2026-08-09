/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Clario design tokens ────────────────────────────────
        // Background / surface
        canvas: '#FAFBFC',      // app background base (near-white, cool)
        surface: '#FFFFFF',     // card / panel surface
        borderline: '#E4E7EC',  // 1px flat borders
        // Text
        ink: '#101828',         // primary text
        inkmuted: '#667085',    // secondary / muted text
        // Accent — single deliberate deep desaturated blue
        accent: {
          DEFAULT: '#2E5AAC',
          hover: '#274D8F',
          soft: '#EEF2FA',      // tinted active / selected surface
          bordsoft: '#D6E0F2',  // soft accent border
        },
        // Semantic status — status only, never decoration
        success: {
          DEFAULT: '#12B76A',
          soft: '#E7F7EF',
          bordsoft: '#B7E8CF',
        },
        warning: {
          DEFAULT: '#F79009',
          soft: '#FEF3E2',
          bordsoft: '#FAD9A8',
        },
        danger: {
          DEFAULT: '#F04438',
          soft: '#FDEBEA',
          bordsoft: '#F6B5B0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      spacing: {
        // 8px spacing scale helpers (8/16/24/32/48 already default multiples;
        // add explicit named steps for consistency)
        4.5: '18px',
        7: '28px',
        11: '44px',
        13: '52px',
        15: '60px',
        18: '72px',
      },
      borderRadius: {
        card: '8px',   // standard card radius
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04)',
        cardh: '0 1px 3px rgba(16,24,40,0.10)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 300ms ease-out both',
        'fade-in-up': 'fade-in-up 340ms ease-out both',
      },
    },
  },
  plugins: [],
}
