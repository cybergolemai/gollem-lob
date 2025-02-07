/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
      './pages/**/*.{ts,tsx}',
      './components/**/*.{ts,tsx}',
      './app/**/*.{ts,tsx}',
      './src/**/*.{ts,tsx}',
    ],
    theme: {
      container: {
        center: true,
        padding: "2rem",
        screens: {
          "2xl": "1400px",
        },
      },
      extend: {
        colors: {
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--accent))",
            foreground: "hsl(var(--accent-foreground))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
        },
        borderRadius: {
          lg: "var(--radius)",
          md: "calc(var(--radius) - 2px)",
          sm: "calc(var(--radius) - 4px)",
        },
        keyframes: {
          "accordion-down": {
            from: { height: 0 },
            to: { height: "var(--radix-accordion-content-height)" },
          },
          "accordion-up": {
            from: { height: "var(--radix-accordion-content-height)" },
            to: { height: 0 },
          },
          "collapsible-down": {
            from: { height: 0 },
            to: { height: 'var(--radix-collapsible-content-height)' },
          },
          "collapsible-up": {
            from: { height: 'var(--radix-collapsible-content-height)' },
            to: { height: 0 },
          },
        },
        animation: {
          "accordion-down": "accordion-down 0.2s ease-out",
          "accordion-up": "accordion-up 0.2s ease-out",
          "collapsible-down": "collapsible-down 0.2s ease-out",
          "collapsible-up": "collapsible-up 0.2s ease-out",
        },
        fontSize: {
          "2xs": ["0.625rem", { lineHeight: "0.75rem" }],
        },
        spacing: {
          18: "4.5rem",
          112: "28rem",
          128: "32rem",
          144: "36rem",
        },
        opacity: {
          15: "0.15",
        },
        maxWidth: {
          "8xl": "88rem",
        },
        zIndex: {
          60: "60",
          70: "70",
          80: "80",
          90: "90",
          100: "100",
        },
      },
    },
    plugins: [
      require("tailwindcss-animate"),
      require("@tailwindcss/typography"),
      require("@tailwindcss/forms"),
    ],
  }