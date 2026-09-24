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
  const progressFill = document.querySelector(".progress-fill");
  const cues = [...document.querySelectorAll("[data-cue]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactScreen = window.matchMedia("(max-width: 760px)");
  const chapters = [
    {
      time: "6:30 PM",
      stamp: "6:30",
      label: "THE FIRST POUR",
      name: "The setup",
      title: "The brew team<br />gets hands-on.",
      description: "At 6:30, the Brew Team gets things moving — dialing in methods, learning the why behind each brew, and making enough for everyone to taste.",
    },
    {
      time: "7:00 PM",
      stamp: "7:00",
      label: "THE ROOM OPENS",
      name: "The gathering",
      title: "The public meeting<br />begins.",
      description: "At 7, everyone’s invited in. Talk coffee, try the week’s brew, play a game, and meet people who are happy to share the table.",
    },
    {
      time: "EVERY WEEK",
      stamp: "01—∞",
      label: "LEARN BY TASTING",
      name: "The discovery",
      title: "A little knowledge<br />in every cup.",
      description: "Each week brings a new angle on coffee — how it grows, how it brews, and how small choices change what you taste.",
    },
    {
      time: "6:30—8:00 PM",
      stamp: "6:30—8",
      label: "HUB-ROBESON · 102",
      name: "The invitation",
      title: "Room for<br />one more.",
      description: "The official on-campus meeting runs from 6:30 to 8:00 PM every Thursday. Come for a pour; leave with a few new faces to say hi to next week.",
    },
  ];

  const chapterIndex = document.querySelector("#chapter-index");
  const chapterLabel = document.querySelector(".chapter-label");
  const chapterTime = document.querySelector("#chapter-time");
  const chapterTitle = document.querySelector("#chapter-title");
  const chapterDescription = document.querySelector("#chapter-description");
  const currentStep = document.querySelector("#current-step");
  const currentChapter = document.querySelector("#current-chapter");
  const stampTime = document.querySelector("#stamp-time");
  let activeChapter = -1;
  let framePending = false;

  const updateChapter = (index) => {
    if (index === activeChapter) return;
    activeChapter = index;
    const chapter = chapters[index];
    if (chapterIndex) chapterIndex.textContent = String(index + 1).padStart(2, "0");
    if (chapterLabel) chapterLabel.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span> / ${chapter.label}`;
    if (chapterTime) chapterTime.textContent = chapter.time;
    if (chapterTitle) chapterTitle.innerHTML = chapter.title;
    if (chapterDescription) chapterDescription.textContent = chapter.description;
    if (currentStep) currentStep.textContent = String(index + 1).padStart(2, "0");
    if (currentChapter) currentChapter.textContent = chapter.name;
    if (stampTime) stampTime.textContent = chapter.stamp;
    cues.forEach((cue, cueIndex) => {
      cue.classList.toggle("is-active", cueIndex === index);
      if (cueIndex === index) cue.setAttribute("aria-current", "step");
      else cue.removeAttribute("aria-current");
    });
  };

  const renderStory = () => {
    framePending = false;
    if (!story || !storyBag || compactScreen.matches || reducedMotion.matches) return;
    const bounds = story.getBoundingClientRect();
    const travel = Math.max(1, story.offsetHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, -bounds.top / travel));
    const chapter = Math.min(chapters.length - 1, Math.floor(progress * chapters.length));
    const opening = Math.min(1, Math.max(0, (progress - 0.08) / 0.36));
    const tilt = Math.sin(progress * Math.PI) * 7;

    updateChapter(chapter);
    if (progressFill) progressFill.style.transform = `scaleX(${progress})`;
    storyBag.style.transform = `translate3d(0, ${Math.sin(progress * Math.PI * 2) * 9}px, 0) rotateY(${tilt}deg) rotateZ(${(progress - 0.5) * -3}deg)`;
    storyBag.querySelectorAll(".bag-sealed").forEach((image) => { image.style.opacity = String(1 - opening); });
    storyBag.querySelectorAll(".bag-open").forEach((image) => { image.style.opacity = String(opening); });
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
  }

  const instagramEmbed = document.createElement("script");
  instagramEmbed.async = true;
  instagramEmbed.src = "https://www.instagram.com/embed.js";
  instagramEmbed.onload = () => window.instgrm?.Embeds?.process();
  document.body.append(instagramEmbed);
})();
