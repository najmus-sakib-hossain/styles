module.exports = {
  content: [
    './*.html', // Adjust to your content paths (e.g., './src/**/*.{html,js,ts}')
  ],
  safelist: [
    {
      pattern: /.*/,
      variants: ['sm', 'md', 'lg', 'xl', '2xl', 'hover', 'focus', 'active', 'disabled', 'group-hover', 'group-focus', 'focus-within', 'focus-visible', 'checked', 'visited', 'first', 'last', 'odd', 'even', 'dark'],
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}