const path = require("path");
module.exports = {
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "src/**/*.{ts,tsx}"),
  ],
  theme: {
    extend: {
      colors: { navy: "#0D3155", medical: "#1677B8", teal: "#13A89E" },
    },
  },
  plugins: [],
};
