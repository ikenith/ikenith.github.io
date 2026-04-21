const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
const phoneViewportQuery = window.matchMedia("(max-width: 760px), (max-height: 500px) and (pointer: coarse)");
const timelineDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});
const timelineUpdatedFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

normalizeHomeUrl();
initCursor();
initBaseInterface();
initSpaceWorld();
initTimelineFeed();
initTimelinePublisher();

function isCoarsePointer() {
  return coarsePointerQuery.matches;
}

function isPhoneViewport() {
  return phoneViewportQuery.matches;
}

function usesCompactEffects() {
  return prefersReducedMotion || isCoarsePointer() || isPhoneViewport();
}

function clampPixelRatio(desktopMax = 2, compactMax = 1.3) {
  const ratio = window.devicePixelRatio || 1;
  return Math.min(ratio, usesCompactEffects() ? compactMax : desktopMax);
}

function encodeRepoPath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function decodeBase64Utf8(value) {
  const cleanedValue = value.replace(/\s/g, "");
  const binary = window.atob(cleanedValue);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
}

function normalizeHomeUrl() {
  if (!document.body || !document.body.classList.contains("base-body")) {
    return;
  }

  const { pathname, search, hash } = window.location;

  if (!pathname.endsWith("/index.html")) {
    return;
  }

  const nextPath = pathname.slice(0, -"/index.html".length) || "/";
  window.history.replaceState({}, document.title, `${nextPath}${search}${hash}`);
}

function getTodayInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function createAnimationController(renderFrame, getTargetFps) {
  let rafId = 0;
  let running = false;
  let lastFrameTime = 0;

  const step = (time) => {
    if (!running) {
      return;
    }

    const targetFps = Math.max(16, Number(getTargetFps()) || 60);
    const minimumDelta = 1000 / targetFps;

    if (!lastFrameTime || time - lastFrameTime >= minimumDelta) {
      lastFrameTime = time;
      renderFrame(time);
    }

    rafId = window.requestAnimationFrame(step);
  };

  const start = () => {
    if (running || prefersReducedMotion || document.hidden) {
      return;
    }

    running = true;
    lastFrameTime = 0;
    rafId = window.requestAnimationFrame(step);
  };

  const stop = () => {
    running = false;

    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      return;
    }

    start();
  });

  start();

  return {
    start,
    stop,
    renderNow(time = performance.now()) {
      renderFrame(time);
    }
  };
}

function initCursor() {
  if (!window.matchMedia("(pointer: fine)").matches) {
    return;
  }

  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  cursor.innerHTML = `
    <div class="custom-cursor__dot"></div>
    <div class="custom-cursor__ring"></div>
  `;
  document.body.appendChild(cursor);

  let visible = false;
  const interactiveSelector = "a, button, .system-core";

  window.addEventListener(
    "pointermove",
    (event) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;

      if (!visible) {
        cursor.classList.add("is-visible");
        visible = true;
      }
    },
    { passive: true }
  );

  window.addEventListener("pointerdown", () => {
    cursor.classList.add("is-pressed");
  });

  window.addEventListener("pointerup", () => {
    cursor.classList.remove("is-pressed");
  });

  document.addEventListener("pointerover", (event) => {
    if (event.target.closest(interactiveSelector)) {
      cursor.classList.add("is-hovering");
    }
  });

  document.addEventListener("pointerout", (event) => {
    const leftInteractive = event.target.closest(interactiveSelector);
    const enteredInteractive =
      event.relatedTarget && event.relatedTarget.closest
        ? event.relatedTarget.closest(interactiveSelector)
        : null;

    if (leftInteractive && !enteredInteractive) {
      cursor.classList.remove("is-hovering");
    }

    if (!event.relatedTarget) {
      cursor.classList.remove("is-visible");
      visible = false;
    }
  });
}

function initBaseInterface() {
  const canvas = document.getElementById("systemCanvas");
  const core = document.getElementById("systemCore");
  const vault = document.getElementById("signalVault");
  const closeVaultButton = document.getElementById("vaultClose");
  const portalCards = document.querySelectorAll(".portal-card");

  if (!canvas || !core || !vault || !closeVaultButton) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  let width = 0;
  let height = 0;
  let nodes = [];
  const pointer = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.42
  };

  function isCompactScene() {
    return usesCompactEffects();
  }

  function setViewportVariables(clientX, clientY) {
    document.documentElement.style.setProperty("--pointer-x", `${(clientX / window.innerWidth) * 100}%`);
    document.documentElement.style.setProperty("--pointer-y", `${(clientY / window.innerHeight) * 100}%`);
    document.documentElement.style.setProperty("--base-tilt-x", `${(clientX / window.innerWidth - 0.5) * 18}px`);
    document.documentElement.style.setProperty("--base-tilt-y", `${(clientY / window.innerHeight - 0.5) * 18}px`);
  }

  function makeNodes() {
    const compact = isCompactScene();
    const areaDivisor = compact ? 68000 : 46000;
    const minimumNodes = compact ? 10 : 16;
    const maximumNodes = compact ? 22 : 38;
    const total = Math.max(minimumNodes, Math.min(maximumNodes, Math.round((width * height) / areaDivisor)));

    nodes = Array.from({ length: total }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * (compact ? 0.12 : 0.2),
      vy: (Math.random() - 0.5) * (compact ? 0.12 : 0.2),
      radius: Math.random() * (compact ? 1.4 : 1.8) + 0.8,
      alpha: Math.random() * 0.32 + 0.18
    }));
  }

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = clampPixelRatio(2, 1.15);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    makeNodes();
    drawScene(false);
  }

  function updateNodes() {
    nodes.forEach((node) => {
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < -40) {
        node.x = width + 40;
      } else if (node.x > width + 40) {
        node.x = -40;
      }

      if (node.y < -40) {
        node.y = height + 40;
      } else if (node.y > height + 40) {
        node.y = -40;
      }
    });
  }

  function drawScene(shouldUpdate = true) {
    const compact = isCompactScene();

    if (shouldUpdate) {
      updateNodes();
    }

    ctx.clearRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, Math.max(width, height) * 0.32);
    glow.addColorStop(0, compact ? "rgba(125, 255, 187, 0.1)" : "rgba(125, 255, 187, 0.14)");
    glow.addColorStop(1, "rgba(125, 255, 187, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const maxDistance = compact ? 118 : 150;
    const maxDistanceSquared = maxDistance * maxDistance;

    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];

      for (let inner = index + 1; inner < nodes.length; inner += 1) {
        const other = nodes[inner];
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared <= maxDistanceSquared) {
          const strength = 1 - distanceSquared / maxDistanceSquared;
          ctx.strokeStyle = `rgba(125, 255, 187, ${strength * (compact ? 0.12 : 0.18)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        }
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210, 255, 228, ${node.alpha})`;
      ctx.fill();
    }
  }

  setViewportVariables(pointer.x, pointer.y);
  resizeCanvas();

  if (!prefersReducedMotion) {
    createAnimationController(
      () => {
        drawScene(true);
      },
      () => (isCompactScene() ? 32 : 48)
    );
  }

  window.addEventListener(
    "resize",
    () => {
      resizeCanvas();
    },
    { passive: true }
  );

  window.addEventListener(
    "pointermove",
    (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      setViewportVariables(event.clientX, event.clientY);

      if (prefersReducedMotion) {
        drawScene(false);
      }
    },
    { passive: true }
  );

  if (!isCoarsePointer()) {
    portalCards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const bounds = card.getBoundingClientRect();
        card.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
        card.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
      });

      card.addEventListener("pointerleave", () => {
        card.style.removeProperty("--pointer-x");
        card.style.removeProperty("--pointer-y");
      });
    });
  }

  const holdDelay = 1400;
  let holdTimer = 0;

  function openVault() {
    document.body.classList.add("vault-open");
    vault.classList.add("is-open");
    vault.setAttribute("aria-hidden", "false");
    core.classList.remove("is-arming");
    closeVaultButton.focus({ preventScroll: true });
  }

  function closeVault() {
    document.body.classList.remove("vault-open");
    vault.classList.remove("is-open");
    vault.setAttribute("aria-hidden", "true");
    core.focus({ preventScroll: true });
  }

  function startHold() {
    if (vault.classList.contains("is-open")) {
      return;
    }

    window.clearTimeout(holdTimer);
    core.classList.add("is-arming");
    holdTimer = window.setTimeout(openVault, holdDelay);
  }

  function stopHold() {
    window.clearTimeout(holdTimer);
    core.classList.remove("is-arming");
  }

  core.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    startHold();
  });

  ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
    core.addEventListener(eventName, stopHold);
  });

  core.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      startHold();
    }
  });

  core.addEventListener("keyup", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      stopHold();
    }
  });

  closeVaultButton.addEventListener("click", closeVault);

  vault.addEventListener("click", (event) => {
    if (event.target === vault) {
      closeVault();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && vault.classList.contains("is-open")) {
      closeVault();
    }
  });
}

function initSpaceWorld() {
  const canvas = document.getElementById("spaceCanvas");

  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const titleElement = document.getElementById("contactTitle");
  const descriptionElement = document.getElementById("contactDescription");
  const valueElement = document.getElementById("contactValue");
  const copyButton = document.getElementById("contactCopy");
  const directoryElement = document.getElementById("contactDirectory");
  const toastElement = document.getElementById("spaceToast");

  let width = 0;
  let height = 0;
  let stars = [];
  let selectedPlanet = null;
  let hoveredPlanet = null;
  let pressedPlanet = null;
  let toastTimer = 0;
  let lastRenderTime = performance.now();
  const pointer = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5
  };

  const planets = [
    {
      id: "email",
      label: "Email",
      value: "kamalkumarthakur@outlook.com",
      description: "Direct relay for collaborations, ideas, and project work.",
      href: "mailto:kamalkumarthakur@outlook.com",
      actionLabel: "Open mail channel",
      copyLabel: "Copy email",
      size: 24,
      orbitX: 0.2,
      orbitY: 0.15,
      speed: 0.00024,
      phase: 0.18,
      driftX: 20,
      driftY: 12,
      hue: "#a8ffd7",
      hueSoft: "rgba(168, 255, 215, 0.22)",
      ringScale: 1.58,
      moonScale: 0.2
    },
    {
      id: "instagram",
      label: "Instagram",
      value: "@kamalkrth",
      description: "Visual signal stream. Fast, personal, and a little more atmospheric.",
      href: "https://instagram.com/kamalkrth",
      actionLabel: "Open Instagram",
      copyLabel: "Copy handle",
      size: 28,
      orbitX: 0.34,
      orbitY: 0.19,
      speed: 0.00018,
      phase: 1.72,
      driftX: 30,
      driftY: 18,
      hue: "#ffe3fb",
      hueSoft: "rgba(255, 227, 251, 0.2)",
      ringScale: 1.82,
      moonScale: 0.16
    },
    {
      id: "twitter",
      label: "Twitter / X",
      value: "@kamalkrth",
      description: "Short-form transmission line for thoughts, experiments, and status pings.",
      href: "https://twitter.com/kamalkrth",
      actionLabel: "Open X profile",
      copyLabel: "Copy handle",
      size: 22,
      orbitX: 0.43,
      orbitY: 0.14,
      speed: 0.0002,
      phase: 3.28,
      driftX: 26,
      driftY: 16,
      hue: "#cce7ff",
      hueSoft: "rgba(204, 231, 255, 0.2)",
      ringScale: 1.4,
      moonScale: 0.18
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      value: "linkedin.com/in/kamalkrth",
      description: "Professional orbit. Best entry point for serious collaboration and background.",
      href: "https://linkedin.com/in/kamalkrth",
      actionLabel: "Open LinkedIn",
      copyLabel: "Copy link",
      size: 30,
      orbitX: 0.29,
      orbitY: 0.28,
      speed: 0.00016,
      phase: 4.94,
      driftX: 22,
      driftY: 20,
      hue: "#b8d7ff",
      hueSoft: "rgba(184, 215, 255, 0.22)",
      ringScale: 1.66,
      moonScale: 0.14
    }
  ];

  function isCompactScene() {
    return usesCompactEffects();
  }

  function showToast(message) {
    if (!toastElement) {
      return;
    }

    toastElement.textContent = message;
    toastElement.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastElement.classList.remove("is-visible");
    }, 2200);
  }

  function updatePanel(planet) {
    if (!titleElement || !descriptionElement || !valueElement || !copyButton) {
      return;
    }

    if (!planet) {
      titleElement.textContent = "Contact Constellation";
      descriptionElement.textContent = "Drift through the field and choose a planet. Every planet opens one real contact route.";
      valueElement.textContent = "No channel selected";
      copyButton.textContent = "Copy contact";
      copyButton.disabled = true;
      return;
    }

    titleElement.textContent = planet.label;
    descriptionElement.textContent = planet.description;
    valueElement.textContent = planet.value;
    copyButton.textContent = planet.copyLabel;
    copyButton.disabled = false;
  }

  function syncDirectoryState() {
    if (!directoryElement) {
      return;
    }

    directoryElement.querySelectorAll(".space-directory-link").forEach((link) => {
      const isSelected = selectedPlanet && link.dataset.contactId === selectedPlanet.id;
      link.classList.toggle("is-selected", Boolean(isSelected));
      link.setAttribute("aria-current", isSelected ? "true" : "false");
    });
  }

  function renderDirectory() {
    if (!directoryElement) {
      return;
    }

    directoryElement.textContent = "";

    const fragment = document.createDocumentFragment();

    planets.forEach((planet) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.className = "space-directory-link";
      link.dataset.contactId = planet.id;
      link.href = planet.href;
      link.innerHTML = `
        <span class="space-directory-name">${planet.label}</span>
        <span class="space-directory-value">${planet.value}</span>
      `;

      if (!planet.href.startsWith("mailto:")) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      link.addEventListener("mouseenter", () => {
        setHoveredPlanet(planet);
      });

      link.addEventListener("focus", () => {
        setSelectedPlanet(planet);
      });

      link.addEventListener("click", (event) => {
        event.preventDefault();
        openPlanetChannel(planet);
      });

      item.appendChild(link);
      fragment.appendChild(item);
    });

    directoryElement.appendChild(fragment);
    syncDirectoryState();
  }

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value).then(() => true).catch(() => false);
    }

    return new Promise((resolve) => {
      const textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();

      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }

      textArea.remove();
      resolve(copied);
    });
  }

  function setHoveredPlanet(planet) {
    if (hoveredPlanet === planet) {
      return;
    }

    hoveredPlanet = planet;
    document.body.classList.toggle("contact-hover", Boolean(planet));
    canvas.style.cursor = planet ? "pointer" : "default";
    syncDirectoryState();

    if (prefersReducedMotion) {
      drawScene(lastRenderTime);
    }
  }

  function setSelectedPlanet(planet) {
    selectedPlanet = planet;
    updatePanel(planet);
    syncDirectoryState();

    if (prefersReducedMotion) {
      drawScene(lastRenderTime);
    }
  }

  function openPlanetChannel(planet) {
    if (!planet) {
      return;
    }

    setSelectedPlanet(planet);

    if (planet.href.startsWith("mailto:")) {
      const anchor = document.createElement("a");
      anchor.href = planet.href;
      anchor.style.position = "absolute";
      anchor.style.left = "-9999px";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      showToast("Opening mail channel. If nothing happens, copy the contact.");
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = planet.href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.position = "absolute";
    anchor.style.left = "-9999px";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    showToast(`Opening ${planet.label} in a new tab.`);
  }

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = clampPixelRatio(2, 1.15);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const compact = isCompactScene();
    const starsPerArea = compact ? 26000 : 13500;
    const minimumStars = compact ? 28 : 72;
    const maximumStars = compact ? 58 : 140;

    stars = Array.from(
      { length: Math.min(maximumStars, Math.max(minimumStars, Math.round((width * height) / starsPerArea))) },
      () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * (compact ? 1.15 : 1.7) + 0.25,
        alpha: Math.random() * 0.5 + 0.18,
        twinkle: Math.random() * 0.0017 + 0.0006,
        phase: Math.random() * Math.PI * 2
      })
    );

    drawScene(lastRenderTime);
  }

  function updatePlanetPositions(time) {
    const compact = isCompactScene();
    const minDimension = Math.min(width, height);
    const coreX = width * (compact ? 0.5 : 0.53) + (pointer.x - width * 0.5) * (compact ? 0.008 : 0.015);
    const coreY = height * (compact ? 0.54 : 0.5) + (pointer.y - height * 0.5) * (compact ? 0.008 : 0.015);
    const coreRadius = minDimension * (compact ? 0.115 : 0.11);

    planets.forEach((planet) => {
      const angle = time * planet.speed + planet.phase;
      const orbitWidth = minDimension * planet.orbitX * (compact ? 1.08 : 1);
      const orbitHeight = minDimension * planet.orbitY * (compact ? 1.16 : 1);

      planet.orbitWidth = orbitWidth;
      planet.orbitHeight = orbitHeight;
      planet.x =
        coreX +
        Math.cos(angle) * orbitWidth +
        Math.sin(angle * 1.7 + planet.phase) * planet.driftX;
      planet.y =
        coreY +
        Math.sin(angle * 1.12) * orbitHeight +
        Math.cos(angle * 1.45 + planet.phase) * planet.driftY;
      planet.renderRadius = planet.size * (compact ? 1.05 : 1) * (0.96 + Math.sin(angle * 1.6 + planet.phase) * 0.05);
      planet.angle = angle;
    });

    return { coreX, coreY, coreRadius };
  }

  function drawScene(time) {
    lastRenderTime = time;
    const compact = isCompactScene();
    const scene = updatePlanetPositions(time);
    ctx.clearRect(0, 0, width, height);

    const background = ctx.createRadialGradient(
      scene.coreX,
      scene.coreY,
      0,
      scene.coreX,
      scene.coreY,
      Math.max(width, height) * (compact ? 0.54 : 0.7)
    );
    background.addColorStop(0, compact ? "rgba(18, 60, 52, 0.12)" : "rgba(18, 60, 52, 0.18)");
    background.addColorStop(0.45, "rgba(7, 18, 24, 0.16)");
    background.addColorStop(1, "rgba(2, 4, 6, 0)");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    stars.forEach((star) => {
      const twinkle = 0.72 + Math.sin(time * star.twinkle + star.phase) * 0.28;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 255, 240, ${star.alpha * twinkle})`;
      ctx.fill();
    });

    planets.forEach((planet) => {
      ctx.save();
      ctx.translate(scene.coreX, scene.coreY);
      ctx.rotate(planet.phase * 0.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, planet.orbitWidth, planet.orbitHeight, 0, 0, Math.PI * 2);
      ctx.strokeStyle = compact ? "rgba(125, 255, 187, 0.06)" : "rgba(125, 255, 187, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });

    const coreGlow = ctx.createRadialGradient(
      scene.coreX,
      scene.coreY,
      scene.coreRadius * 0.12,
      scene.coreX,
      scene.coreY,
      scene.coreRadius * (compact ? 2 : 2.5)
    );
    coreGlow.addColorStop(0, compact ? "rgba(125, 255, 187, 0.16)" : "rgba(125, 255, 187, 0.22)");
    coreGlow.addColorStop(1, "rgba(125, 255, 187, 0)");
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(scene.coreX, scene.coreY, scene.coreRadius * (compact ? 1.95 : 2.4), 0, Math.PI * 2);
    ctx.fill();

    const ringScales = compact ? [1.35, 2.05] : [1.4, 2.1, 2.85];
    ringScales.forEach((scale, index) => {
      ctx.beginPath();
      ctx.arc(scene.coreX, scene.coreY, scene.coreRadius * scale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(125, 255, 187, ${0.1 - index * 0.02})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.arc(scene.coreX, scene.coreY, scene.coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(3, 7, 10, 0.96)";
    ctx.fill();
    ctx.strokeStyle = "rgba(125, 255, 187, 0.34)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    planets
      .slice()
      .sort((leftPlanet, rightPlanet) => leftPlanet.y - rightPlanet.y)
      .forEach((planet) => {
        const isSelected = selectedPlanet && selectedPlanet.id === planet.id;
        const isHovered = hoveredPlanet && hoveredPlanet.id === planet.id;
        const halo = ctx.createRadialGradient(
          planet.x,
          planet.y,
          planet.renderRadius * 0.2,
          planet.x,
          planet.y,
          planet.renderRadius * 2.4
        );
        halo.addColorStop(0, planet.hueSoft);
        halo.addColorStop(1, "rgba(125, 255, 187, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.renderRadius * (compact ? 2.05 : 2.35), 0, Math.PI * 2);
        ctx.fill();

        const shell = ctx.createRadialGradient(
          planet.x - planet.renderRadius * 0.35,
          planet.y - planet.renderRadius * 0.4,
          planet.renderRadius * 0.25,
          planet.x,
          planet.y,
          planet.renderRadius * 1.1
        );
        shell.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        shell.addColorStop(0.35, planet.hue);
        shell.addColorStop(1, "rgba(5, 14, 18, 0.95)");

        ctx.fillStyle = shell;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.renderRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isSelected
          ? "rgba(255, 255, 255, 0.9)"
          : isHovered
            ? "rgba(125, 255, 187, 0.85)"
            : "rgba(125, 255, 187, 0.38)";
        ctx.lineWidth = isSelected ? 2 : 1.4;
        ctx.stroke();

        ctx.save();
        ctx.translate(planet.x, planet.y);
        ctx.rotate(planet.angle * 0.7);
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.renderRadius * planet.ringScale, planet.renderRadius * 0.42, 0, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? "rgba(255, 255, 255, 0.42)" : "rgba(125, 255, 187, 0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        const moonAngle = time * planet.speed * 5 + planet.phase;
        const moonDistance = planet.renderRadius * (1.75 + planet.moonScale);
        const moonX = planet.x + Math.cos(moonAngle) * moonDistance;
        const moonY = planet.y + Math.sin(moonAngle * 1.1) * moonDistance * 0.7;
        ctx.beginPath();
        ctx.arc(moonX, moonY, Math.max(1.4, planet.renderRadius * 0.15), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(238, 245, 240, 0.9)";
        ctx.fill();

        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.moveTo(planet.x, planet.y - planet.renderRadius - 6);
          ctx.lineTo(planet.x, planet.y - planet.renderRadius - 22);
          ctx.strokeStyle = "rgba(125, 255, 187, 0.44)";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = "rgba(247, 255, 249, 0.95)";
          ctx.font = '12px "IBM Plex Mono", monospace';
          ctx.textAlign = "center";
          ctx.fillText(planet.label, planet.x, planet.y - planet.renderRadius - 30);
        }
      });
  }

  function findPlanetAt(clientX, clientY) {
    const hitScale = isCompactScene() ? 1.55 : 1.15;

    for (let index = planets.length - 1; index >= 0; index -= 1) {
      const planet = planets[index];
      const dx = clientX - planet.x;
      const dy = clientY - planet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= planet.renderRadius * hitScale) {
        return planet;
      }
    }

    return null;
  }

  updatePanel(null);
  renderDirectory();
  resizeCanvas();

  if (!prefersReducedMotion) {
    createAnimationController(
      (time) => {
        drawScene(time);
      },
      () => (isCompactScene() ? 28 : 42)
    );
  }

  window.addEventListener(
    "resize",
    () => {
      resizeCanvas();
    },
    { passive: true }
  );

  canvas.addEventListener(
    "pointermove",
    (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;

      if (event.pointerType !== "touch") {
        setHoveredPlanet(findPlanetAt(event.clientX, event.clientY));
      }

      if (prefersReducedMotion) {
        drawScene(lastRenderTime);
      }
    },
    { passive: true }
  );

  canvas.addEventListener("pointerleave", () => {
    pressedPlanet = null;
    setHoveredPlanet(null);
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pressedPlanet = findPlanetAt(event.clientX, event.clientY);
  });

  canvas.addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const activePlanet = findPlanetAt(event.clientX, event.clientY);
    const shouldOpenPlanet =
      pressedPlanet &&
      activePlanet &&
      pressedPlanet.id === activePlanet.id;

    pressedPlanet = null;

    if (shouldOpenPlanet) {
      openPlanetChannel(activePlanet);
    } else if (event.pointerType !== "touch") {
      setHoveredPlanet(null);
    }
  });

  canvas.addEventListener("pointercancel", () => {
    pressedPlanet = null;
  });

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      if (!selectedPlanet) {
        return;
      }

      const copied = await copyText(selectedPlanet.value);
      showToast(copied ? "Contact copied." : "Copy failed. Try again.");
    });
  }

  if (isCompactScene()) {
    try {
      if (!window.sessionStorage.getItem("space-hint-seen")) {
        window.setTimeout(() => {
          showToast("Tap a planet to open its channel.");
        }, 700);
        window.sessionStorage.setItem("space-hint-seen", "true");
      }
    } catch (error) {
      window.setTimeout(() => {
        showToast("Tap a planet to open its channel.");
      }, 700);
    }
  }
}

function getTimelineConfig() {
  const source = document.body;

  if (!source || !source.dataset.timelineOwner || !source.dataset.timelineRepo) {
    return null;
  }

  return {
    owner: source.dataset.timelineOwner,
    ownerLogin: source.dataset.timelineOwnerLogin || source.dataset.timelineOwner,
    repo: source.dataset.timelineRepo,
    branch: source.dataset.timelineBranch || "main",
    path: source.dataset.timelinePath || "data/timeline.json"
  };
}

function normalizeTimelineAbout(about) {
  const source = about && typeof about === "object" && !Array.isArray(about) ? about : {};
  const questions = Array.isArray(source.questions)
    ? source.questions
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }

          const question = String(entry.question || "").trim();
          const answer = String(entry.answer || "").trim();

          if (!question || !answer) {
            return null;
          }

          return { question, answer };
        })
        .filter(Boolean)
    : [];

  return {
    summary: String(source.summary || "").trim(),
    postingNote: String(source.postingNote || "").trim(),
    questions
  };
}

function normalizeTimelinePayload(payload) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const entriesSource = Array.isArray(payload) ? payload : Array.isArray(source.entries) ? source.entries : [];
  const entries = entriesSource
    .map((entry) => normalizeTimelineEntry(entry))
    .filter(Boolean)
    .sort(sortTimelineEntries);

  return {
    updatedAt: source.updatedAt || null,
    about: normalizeTimelineAbout(source.about),
    entries
  };
}

function normalizeTimelineEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const date = String(entry.date || "").trim();
  const title = String(entry.title || "").trim();
  const body = String(entry.body || "").trim();

  if (!date || !title || !body) {
    return null;
  }

  return {
    id: String(entry.id || createTimelineId(date, title, entry.publishedAt || date)),
    date,
    publishedAt: String(entry.publishedAt || date),
    title,
    body
  };
}

function sortTimelineEntries(leftEntry, rightEntry) {
  const leftTime = Date.parse(leftEntry.publishedAt || leftEntry.date) || Date.parse(leftEntry.date) || 0;
  const rightTime = Date.parse(rightEntry.publishedAt || rightEntry.date) || Date.parse(rightEntry.date) || 0;

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return rightEntry.date.localeCompare(leftEntry.date);
}

function formatTimelineDate(dateString) {
  const parts = dateString.split("-").map((value) => Number.parseInt(value, 10));

  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return dateString;
  }

  return timelineDateFormatter.format(new Date(parts[0], parts[1] - 1, parts[2]));
}

function createTimelineLabel(index, total) {
  return `Transmission ${String(total - index).padStart(2, "0")}`;
}

function createTimelineId(date, title, salt = "") {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = String(salt)
    .replace(/[^0-9]/g, "")
    .slice(-6);

  return `${date}-${slug || "post"}${suffix ? `-${suffix}` : ""}`;
}

function formatTimelineUpdated(value, fallbackDate = "") {
  const date = new Date(value || fallbackDate);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return timelineUpdatedFormatter.format(date);
}

function updateTimelineMetrics(payload) {
  const countElement = document.getElementById("timelineMetricCount");
  const updatedElement = document.getElementById("timelineMetricUpdated");

  if (countElement) {
    countElement.textContent = `Signals / ${payload.entries.length}`;
  }

  if (updatedElement) {
    const latestDate = payload.updatedAt || (payload.entries[0] ? payload.entries[0].publishedAt || payload.entries[0].date : "");
    updatedElement.textContent = `Updated / ${formatTimelineUpdated(latestDate)}`;
  }
}

function createTimelineEntryElement(entry, index, total) {
  const article = document.createElement("article");
  article.className = "signal-entry";

  const header = document.createElement("header");
  header.className = "signal-entry__header";

  const label = document.createElement("span");
  label.className = "signal-entry__label";
  label.textContent = createTimelineLabel(index, total);

  const time = document.createElement("time");
  time.className = "signal-entry__date";
  time.dateTime = entry.date;
  time.textContent = formatTimelineDate(entry.date);

  const heading = document.createElement("h2");
  heading.textContent = entry.title;

  header.append(label, time);
  article.append(header, heading);

  entry.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .forEach((paragraph) => {
      const paragraphElement = document.createElement("p");
      paragraphElement.textContent = paragraph;
      article.appendChild(paragraphElement);
    });

  return article;
}

async function fetchTimelinePayload(config) {
  const publicFileUrl = config.path;
  const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeRepoPath(config.path)}?ref=${encodeURIComponent(config.branch)}`;

  try {
    const response = await fetch(publicFileUrl, { cache: "no-store" });

    if (response.ok) {
      return normalizeTimelinePayload(await response.json());
    }
  } catch (error) {
    // Fall through to the GitHub API when local file fetching is unavailable.
  }

  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    throw new Error("The signal log could not be loaded.");
  }

  const file = await response.json();
  return normalizeTimelinePayload(JSON.parse(decodeBase64Utf8(file.content || "")));
}

function renderTimelineFeed(streamElement, statusElement, payload) {
  streamElement.textContent = "";
  updateTimelineMetrics(payload);

  if (!payload.entries.length) {
    statusElement.hidden = false;
    statusElement.textContent = "No signals published yet.";
    streamElement.appendChild(statusElement);
    return;
  }

  const fragment = document.createDocumentFragment();
  payload.entries.forEach((entry, index) => {
    fragment.appendChild(createTimelineEntryElement(entry, index, payload.entries.length));
  });

  statusElement.hidden = true;
  streamElement.appendChild(fragment);
}

function initTimelineFeed() {
  const streamElement = document.getElementById("signalStream");
  const statusElement = document.getElementById("signalFeedStatus");
  const config = getTimelineConfig();

  if (!streamElement || !statusElement || !config) {
    return;
  }

  fetchTimelinePayload(config)
    .then((payload) => {
      renderTimelineFeed(streamElement, statusElement, payload);
    })
    .catch(() => {
      const countElement = document.getElementById("timelineMetricCount");
      const updatedElement = document.getElementById("timelineMetricUpdated");

      if (countElement) {
        countElement.textContent = "Signals / --";
      }

      if (updatedElement) {
        updatedElement.textContent = "Updated / unavailable";
      }

      statusElement.hidden = false;
      statusElement.textContent = "The signal log is temporarily unavailable.";
    });
}

async function githubApiRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload && payload.message ? payload.message : "GitHub request failed.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function fetchPrivateTimelineFile(config, token) {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeRepoPath(config.path)}?ref=${encodeURIComponent(config.branch)}`;

  try {
    const file = await githubApiRequest(url, token);
    return {
      sha: file.sha || null,
      payload: normalizeTimelinePayload(JSON.parse(decodeBase64Utf8(file.content || "")))
    };
  } catch (error) {
    if (error.status === 404) {
      return {
        sha: null,
        payload: {
          updatedAt: null,
          about: normalizeTimelineAbout(null),
          entries: []
        }
      };
    }

    throw error;
  }
}

function buildUpdatedTimelinePayload(existingPayload, nextValues) {
  const now = new Date().toISOString();
  const nextEntry = {
    id: createTimelineId(nextValues.date, nextValues.title, now),
    date: nextValues.date,
    publishedAt: now,
    title: nextValues.title,
    body: nextValues.body
  };

  const nextPayload = normalizeTimelinePayload({
    updatedAt: now,
    about: existingPayload.about,
    entries: [nextEntry, ...existingPayload.entries]
  });

  nextPayload.updatedAt = now;
  return nextPayload;
}

async function publishTimelinePayload(config, token, payload, sha, title) {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeRepoPath(config.path)}`;
  const commitTitle = title.length > 58 ? `${title.slice(0, 55).trimEnd()}...` : title;
  const body = {
    message: `Add signal: ${commitTitle}`,
    content: encodeBase64Utf8(`${JSON.stringify(payload, null, 2)}\n`),
    branch: config.branch
  };

  if (sha) {
    body.sha = sha;
  }

  return githubApiRequest(url, token, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

function setTimelinePublisherStatus(element, message, tone = "neutral") {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.dataset.tone = tone;
}

function initTimelinePublisher() {
  const form = document.getElementById("timelinePublisherForm");

  if (!form) {
    return;
  }

  const config = getTimelineConfig();
  const dateInput = document.getElementById("timelinePostDate");
  const titleInput = document.getElementById("timelinePostTitle");
  const bodyInput = document.getElementById("timelinePostBody");
  const tokenInput = document.getElementById("timelineGithubToken");
  const publishButton = document.getElementById("timelinePublishButton");
  const statusElement = document.getElementById("timelinePublishStatus");

  if (!config || !dateInput || !titleInput || !bodyInput || !tokenInput || !publishButton || !statusElement) {
    return;
  }

  dateInput.value = getTodayInputValue();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    const token = tokenInput.value.trim();
    const date = dateInput.value;

    if (!title || !body || !token || !date) {
      setTimelinePublisherStatus(statusElement, "Date, heading, passage, and token are all required.", "error");
      return;
    }

    publishButton.disabled = true;
    publishButton.textContent = "Publishing...";
    setTimelinePublisherStatus(statusElement, "Verifying the token and preparing the next signal...", "pending");

    try {
      const user = await githubApiRequest("https://api.github.com/user", token);

      if (!user.login || user.login.toLowerCase() !== config.ownerLogin.toLowerCase()) {
        throw new Error(`This token belongs to ${user.login || "another account"}. Only ${config.ownerLogin} can publish here.`);
      }

      const existingFile = await fetchPrivateTimelineFile(config, token);
      const nextPayload = buildUpdatedTimelinePayload(existingFile.payload, {
        date,
        title,
        body
      });

      await publishTimelinePayload(config, token, nextPayload, existingFile.sha, title);

      form.reset();
      dateInput.value = getTodayInputValue();
      tokenInput.value = "";
      setTimelinePublisherStatus(
        statusElement,
        "Signal published. GitHub Pages may take a short moment to refresh the public signal log.",
        "success"
      );
    } catch (error) {
      tokenInput.value = "";
      setTimelinePublisherStatus(
        statusElement,
        error instanceof Error ? error.message : "Publishing failed.",
        "error"
      );
    } finally {
      publishButton.disabled = false;
      publishButton.textContent = "Publish signal";
    }
  });
}
