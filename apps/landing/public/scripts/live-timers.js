const timers = document.querySelectorAll("[data-live-timer]");

timers.forEach((timerElement) => {
  const h1 = timerElement.querySelector('[data-part="h1"]');
  const h2 = timerElement.querySelector('[data-part="h2"]');
  const m1 = timerElement.querySelector('[data-part="m1"]');
  const m2 = timerElement.querySelector('[data-part="m2"]');
  const s1 = timerElement.querySelector('[data-part="s1"]');
  const s2 = timerElement.querySelector('[data-part="s2"]');

  if (!h1 || !h2 || !m1 || !m2 || !s1 || !s2) return;

  let elapsedSeconds = 2 * 60 * 60 + 37 * 60 + 14;

  const renderTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hourString = String(hours).padStart(2, "0");
    const minuteString = String(minutes).padStart(2, "0");
    const secondString = String(seconds).padStart(2, "0");

    h1.textContent = hourString[0];
    h2.textContent = hourString[1];
    m1.textContent = minuteString[0];
    m2.textContent = minuteString[1];
    s1.textContent = secondString[0];
    s2.textContent = secondString[1];
  };

  renderTime(elapsedSeconds);
  setInterval(() => {
    elapsedSeconds += 1;
    renderTime(elapsedSeconds);
  }, 1000);
});
