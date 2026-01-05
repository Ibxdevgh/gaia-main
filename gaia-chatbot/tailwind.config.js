/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'gaia-space': '#0a0a0f',
        'gaia-deep-blue': '#000666',
        'gaia-purple': '#8b5cf6',
        'gaia-cyan': '#06b6d4',
        'gaia-pink': '#ec4899',
        'gaia-off-white': '#f8fafc',
        'gaia-paragraph': '#94a3b8',
        'gaia-card': '#12121a',
        'gaia-border': '#1e1e2e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gaia-gradient': 'linear-gradient(135deg, #8b5cf6, #ec4899, #06b6d4)',
        'gaia-gradient-radial': 'radial-gradient(circle, #8b5cf6, #06b6d4)',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.4), 0 0 40px rgba(6, 182, 212, 0.2)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.4), 0 0 40px rgba(236, 72, 153, 0.2)',
        'glow-multi': '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(6, 182, 212, 0.2), 0 0 60px rgba(236, 72, 153, 0.1)',
      },
      animation: {
        'glow': 'pulse-glow 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'gradient': 'gradientShift 4s ease infinite',
      },
    },
  },
  plugins: [],
};
