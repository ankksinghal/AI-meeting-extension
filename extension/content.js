console.log(
  "AI Meeting Copilot Active"
);

const currentUrl = window.location.href;

if (
  currentUrl.includes(
    "meet.google.com"
  )
) {
  console.log(
    "Google Meet Detected"
  );

  console.log(
    "Meeting URL:",
    currentUrl
  );

  chrome.storage.local.set({
    activeMeetUrl: currentUrl,
  });
}