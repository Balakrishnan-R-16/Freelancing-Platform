/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* 14-step grayscale (screenshot palette), black → white */
        mono: {
          950: "#000000",
          850: "#121212",
          800: "#262626",
          700: "#3B3B3B",
          650: "#4F4F4F",
          600: "#636363",
          550: "#787878",
          500: "#8C8C8C",
          450: "#A1A1A1",
          400: "#B5B5B5",
          300: "#C9C9C9",
          200: "#DEDEDE",
          100: "#F2F2F2",
          50: "#FFFFFF",
        },

        /* Semantic — light UI from same gradient */
        background: {
          DEFAULT: "#F2F2F2",
          secondary: "#FFFFFF",
          tertiary: "#FFFFFF",
          input: "#FFFFFF",
          hover: "#DEDEDE",
          active: "#C9C9C9",
        },
        foreground: {
          DEFAULT: "#000000",
          secondary: "#3B3B3B",
          muted: "#787878",
          subtle: "#636363",
        },
        border: {
          DEFAULT: "#C9C9C9",
          hover: "#B5B5B5",
          subtle: "#DEDEDE",
        },
        danger: {
          DEFAULT: "#636363",
          hover: "#4F4F4F",
          muted: "#DEDEDE",
        },

        ai: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
          accent: "#60A5FA",
          muted: "rgba(59,130,246,0.12)",
        },

        blockchain: {
          DEFAULT: "#D4AF37",
          hover: "#C9A227",
          accent: "#F5D97E",
          muted: "rgba(212,175,55,0.14)",
        },
      },

      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        /* Soft UI depth using palette stops */
        "gradient-mono": "linear-gradient(135deg, #F2F2F2 0%, #FFFFFF 40%, #DEDEDE 100%)",
        /* Full 14-stop strip (reference / decorative) */
        "gradient-mono-full": "linear-gradient(90deg, #000000 0%, #121212 7.69%, #262626 15.38%, #3B3B3B 23.08%, #4F4F4F 30.77%, #636363 38.46%, #787878 46.15%, #8C8C8C 53.85%, #A1A1A1 61.54%, #B5B5B5 69.23%, #C9C9C9 76.92%, #DEDEDE 84.62%, #F2F2F2 92.31%, #FFFFFF 100%)",
        "gradient-ai": "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
        "gradient-gold": "linear-gradient(135deg, #D4AF37 0%, #F5D97E 100%)",
      },

      animation: {
        shimmer: "shimmer 2s linear infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },

      keyframes: {
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },

      boxShadow: {
        surface: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
        ai: "0 0 30px -5px rgba(59, 130, 246, 0.25)",
        gold: "0 0 30px -5px rgba(212, 175, 55, 0.25)",
      },
    },
  },
  plugins: [],
}
