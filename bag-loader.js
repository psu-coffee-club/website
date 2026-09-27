// The finished still loads directly, including in browsers where WebGL is unavailable.
window.addEventListener('load', () => {
  setTimeout(() => document.documentElement.classList.remove('initial-anchor'), 1000);
}, { once: true });
let started = false;
function startBagScene() {
  if (started) return;
  started = true;
  import('/bag3d.js?v=20260927-perf-2').catch((error) => {
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
    if (nearby.target.dataset.bagScene === 'story') startBagScene();
    else startAfterPaint();
  }, { rootMargin: '250px 0px' });
  bags.forEach((bag) => observer.observe(bag));
} else {
  startAfterPaint();
}
