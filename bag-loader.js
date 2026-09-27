// Show a tiny still immediately, then sharpen it while the interactive bag loads.
const posters = document.querySelectorAll('.bag-poster');
window.addEventListener('load', () => {
  setTimeout(() => document.documentElement.classList.remove('initial-anchor'), 1000);
}, { once: true });
let sharpPosterStarted = false;
function sharpenPosters() {
  if (sharpPosterStarted) return;
  sharpPosterStarted = true;
  const sharpPoster = new Image();
  sharpPoster.decoding = 'async';
  sharpPoster.fetchPriority = 'low';
  sharpPoster.src = '/images/bag-poster.webp';
  sharpPoster.decode().then(() => {
    posters.forEach((poster) => { poster.src = sharpPoster.src; });
  }).catch(() => {});
}

let started = false;
function startBagScene() {
  if (started) return;
  started = true;
  import('/bag3d.js?v=20260927-perf-1').catch((error) => {
    document.querySelectorAll('[data-bag-scene]').forEach((container) => container.classList.add('is-unavailable'));
    console.warn('Interactive coffee bag unavailable; keeping the still image.', error);
  });
}

function startAfterPaint() {
  requestAnimationFrame(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(startBagScene, { timeout: 1800 });
    } else {
      setTimeout(startBagScene, 250);
    }
  });
}

// A deep link below both bags should not download the 3D engine at all.
const bags = document.querySelectorAll('[data-bag-scene]');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    const nearby = entries.find((entry) => entry.isIntersecting);
    if (!nearby) return;
    observer.disconnect();
    sharpenPosters();
    if (nearby.target.dataset.bagScene === 'story') startBagScene();
    else startAfterPaint();
  }, { rootMargin: '250px 0px' });
  bags.forEach((bag) => observer.observe(bag));
} else {
  sharpenPosters();
  startAfterPaint();
}
