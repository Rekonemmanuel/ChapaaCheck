import confetti from "canvas-confetti";

export function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#2a9d6e", "#e8a838", "#e05252", "#4ade80", "#fbbf24"],
  });
}

export function fireStreakConfetti() {
  const end = Date.now() + 600;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#2a9d6e", "#e8a838"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#2a9d6e", "#e8a838"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
