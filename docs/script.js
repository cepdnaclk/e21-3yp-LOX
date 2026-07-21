// LOX card hover/reveal behavior + Main Features image switcher
// Hover animation and gray card strokes are handled in styles.css.

document.addEventListener("DOMContentLoaded", () => {
  const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const revealElements = Array.from(
    document.querySelectorAll(".card, .team-card, .step, .feature-showcase, .feature-visual-card, .feature-tab")
  );

  revealElements.forEach((element, index) => {
    element.classList.add("reveal");
    element.style.setProperty("--reveal-delay", `${(index % 4) * 80}ms`);
  });

  if (!motionOK || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("in-view"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -70px 0px"
      }
    );

    revealElements.forEach((element) => revealObserver.observe(element));
  }

  const featureTabs = Array.from(document.querySelectorAll(".feature-tab"));
  const featureVisualCard = document.getElementById("featureVisualCard");
  const featureImage = document.getElementById("featureImage");
  const featurePlaceholder = document.getElementById("featurePlaceholder");
  const featureCount = document.getElementById("featureCount");
  const featureTitle = document.getElementById("featureTitle");
  const featureDescription = document.getElementById("featureDescription");

  function showPlaceholder(tab) {
    if (!featureImage || !featurePlaceholder) return;

    featureImage.classList.remove("has-image");
    featureImage.removeAttribute("src");
    featureImage.alt = tab.dataset.alt || tab.dataset.title || "LOX feature image placeholder";
    featurePlaceholder.textContent = "";
  }

  function loadFeatureImage(tab) {
    if (!featureImage) return;

    const imagePath = tab.dataset.image || "";
    const imageAlt = tab.dataset.alt || tab.dataset.title || "LOX feature image";

    if (!imagePath) {
      showPlaceholder(tab);
      return;
    }

    const testImage = new Image();

    testImage.onload = () => {
      featureImage.src = imagePath;
      featureImage.alt = imageAlt;
      featureImage.classList.add("has-image");
    };

    testImage.onerror = () => {
      showPlaceholder(tab);
    };

    testImage.src = imagePath;
  }

  function setActiveFeature(tab) {
    if (!tab || tab.classList.contains("active")) return;

    featureTabs.forEach((button) => {
      button.classList.remove("active");
      button.setAttribute("aria-selected", "false");
    });

    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");

    if (featureVisualCard && motionOK) {
      featureVisualCard.classList.add("is-switching");
    }

    window.setTimeout(() => {
      if (featureCount) featureCount.textContent = tab.dataset.count || "";
      if (featureTitle) featureTitle.textContent = tab.dataset.title || "LOX Feature";
      if (featureDescription) featureDescription.textContent = tab.dataset.description || "";

      loadFeatureImage(tab);

      if (featureVisualCard) {
        featureVisualCard.classList.remove("is-switching");
      }
    }, motionOK ? 160 : 0);
  }

  featureTabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveFeature(tab));

    tab.addEventListener("keydown", (event) => {
      const currentIndex = featureTabs.indexOf(tab);
      let nextIndex = currentIndex;

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % featureTabs.length;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + featureTabs.length) % featureTabs.length;
      }

      if (nextIndex !== currentIndex) {
        event.preventDefault();
        featureTabs[nextIndex].focus();
        setActiveFeature(featureTabs[nextIndex]);
      }
    });
  });

  const firstActiveFeature = document.querySelector(".feature-tab.active") || featureTabs[0];
  if (firstActiveFeature) {
    loadFeatureImage(firstActiveFeature);
  }
});
