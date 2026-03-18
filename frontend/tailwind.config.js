/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            fontFamily: {
                orbitron: ['Orbitron', 'sans-serif'],
                inter: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                primary: {
                    DEFAULT: '#FF0033',
                    hover: '#CC0029',
                },
                secondary: {
                    DEFAULT: '#00F0FF',
                    hover: '#00C0CC',
                },
                accent: {
                    purple: '#BD00FF',
                    green: '#00FF66',
                    gold: '#FFD700',
                },
                dark: {
                    main: '#050511',
                    surface: '#0F0F1A',
                    glass: 'rgba(15, 15, 26, 0.6)',
                },
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            boxShadow: {
                'neon-red': '0 0 20px rgba(255, 0, 51, 0.4)',
                'neon-blue': '0 0 20px rgba(0, 240, 255, 0.4)',
                'neon-purple': '0 0 20px rgba(189, 0, 255, 0.4)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(255, 0, 51, 0.4)' },
                    '50%': { boxShadow: '0 0 40px rgba(255, 0, 51, 0.8)' }
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' }
                },
                'gift-fly': {
                    '0%': { transform: 'scale(1) translateY(0)', opacity: '1' },
                    '50%': { transform: 'scale(1.5) translateY(-50px)', opacity: '1' },
                    '100%': { transform: 'scale(0.5) translateY(-100px)', opacity: '0' }
                },
                'slide-up': {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' }
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'float': 'float 3s ease-in-out infinite',
                'gift-fly': 'gift-fly 1s ease-out forwards',
                'slide-up': 'slide-up 0.3s ease-out',
            },
            backgroundImage: {
                'gradient-brand': 'linear-gradient(135deg, #FF0033 0%, #BD00FF 100%)',
                'gradient-cyber': 'linear-gradient(90deg, #00F0FF 0%, #BD00FF 100%)',
                'gradient-glass': 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
};
