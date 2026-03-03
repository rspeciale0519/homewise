export async function loadOgFonts() {
  const [dmSans, cormorant] = await Promise.all([
    fetch("https://fonts.googleapis.com/css2?family=DM+Sans:wght@600;700&display=swap")
      .then(() =>
        fetch("https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-600-normal.woff")
          .then((res) => res.arrayBuffer()),
      ),
    fetch("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&display=swap")
      .then(() =>
        fetch("https://cdn.jsdelivr.net/fontsource/fonts/cormorant-garamond@latest/latin-700-normal.woff")
          .then((res) => res.arrayBuffer()),
      ),
  ]);

  return [
    { name: "DM Sans", data: dmSans, weight: 600 as const },
    { name: "Cormorant Garamond", data: cormorant, weight: 700 as const },
  ];
}
