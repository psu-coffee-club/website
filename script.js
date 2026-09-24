(() => {
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");

  if (menuButton && navigation) {
    const closeMenu = () => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
      navigation.classList.remove("is-open");
      document.body.classList.remove("menu-open");
    };

    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      navigation.classList.toggle("is-open", isOpen);
      document.body.classList.toggle("menu-open", isOpen);
    });
    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  const story = document.querySelector(".unseal-track");
  const storyBag = document.querySelector(".story-bag");
  const pageProgressFill = document.querySelector(".page-progress span");
  const cues = [...document.querySelectorAll("[data-cue]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactScreen = window.matchMedia("(max-width: 760px)");
  const chapters = [
    {
      name: "Brew Team",
      label: "6:30 PM",
      title: "We start with the brew team.",
    },
    {
      name: "Open table",
      label: "7:00 PM",
      title: "Everyone’s invited in.",
    },
    {
      name: "Taste together",
      label: "EVERY WEEK",
      title: "Taste something new.",
    },
    {
      name: "Until next Thursday",
      label: "HUB-ROBESON 102",
      title: "Until next Thursday.",
    },
  ];

  const chapterLabel = document.querySelector(".chapter-label");
  const chapterTitle = document.querySelector("#chapter-title");
  const currentStep = document.querySelector("#current-step");
  const currentChapter = document.querySelector("#current-chapter");
  let activeChapter = -1;
  let framePending = false;

  const updateChapter = (index) => {
    if (index === activeChapter) return;
    activeChapter = index;
    const chapter = chapters[index];
    if (chapterLabel) chapterLabel.textContent = chapter.label;
    if (chapterTitle) chapterTitle.textContent = chapter.title;
    if (currentStep) currentStep.textContent = String(index + 1).padStart(2, "0");
    if (currentChapter) currentChapter.textContent = chapter.name;
    cues.forEach((cue, cueIndex) => {
      cue.classList.toggle("is-active", cueIndex === index);
      if (cueIndex === index) cue.setAttribute("aria-current", "step");
      else cue.removeAttribute("aria-current");
    });
  };

  const renderStory = () => {
    framePending = false;
    const fullPageTravel = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pageProgress = Math.min(1, Math.max(0, window.scrollY / fullPageTravel));
    if (pageProgressFill) pageProgressFill.style.transform = `scaleX(${pageProgress})`;
    if (!story || !storyBag || compactScreen.matches || reducedMotion.matches) return;
    const bounds = story.getBoundingClientRect();
    const travel = Math.max(1, story.offsetHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, -bounds.top / travel));
    const chapter = Math.min(chapters.length - 1, Math.floor(progress * chapters.length));
    const opening = Math.min(1, Math.max(0, (progress - 0.03) / 0.38));

    updateChapter(chapter);
    storyBag.style.setProperty("--opening", String(opening));
    storyBag.style.setProperty("--open-right", `${opening * 20}%`);
    storyBag.style.setProperty("--open-left", `${opening * 15}%`);
    storyBag.style.setProperty("--open-extent", `${opening * 100}%`);
  };

  const requestStoryUpdate = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(renderStory);
  };

  if (story) {
    window.addEventListener("scroll", requestStoryUpdate, { passive: true });
    window.addEventListener("resize", requestStoryUpdate);
    compactScreen.addEventListener("change", requestStoryUpdate);
    reducedMotion.addEventListener("change", requestStoryUpdate);
    requestStoryUpdate();
  } else {
    window.addEventListener("scroll", requestStoryUpdate, { passive: true });
    window.addEventListener("resize", requestStoryUpdate);
    requestStoryUpdate();
  }

  const instagramEmbed = document.createElement("script");
  instagramEmbed.async = true;
  instagramEmbed.src = "https://www.instagram.com/embed.js";
  instagramEmbed.onload = () => window.instgrm?.Embeds?.process();
  document.body.append(instagramEmbed);
})();
