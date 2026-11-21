// Fixed scenes for screenshots: ?shot=cover shows the cover alone at a post size; ?shot=editor shows the
// editor with sample photos loaded. Query: photos=pier,convertible & caption= & sub= & layout= & grade= &
// size=square|portrait|wide. window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, setupScene) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photos = (query.get('photos') ?? 'convertible,pier,boulevard,neon-night').split(',').filter(Boolean);
  await setupScene({
    photos,
    caption: query.get('caption') ?? 'Neon Harbor',
    sub: query.get('sub') ?? 'Vice Shores',
    layout: query.get('layout') ?? 'poster',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? 'wide',
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
