chrome.storage.local.get(
  ["activeMeetUrl"],
  (result) => {
    const status =
      document.getElementById(
        "status"
      );

    if (result.activeMeetUrl) {
      status.textContent =
        "Meeting Detected";
    } else {
      status.textContent =
        "No Active Meeting";
    }
  }
);

document
  .getElementById(
    "openDashboard"
  )
  .addEventListener(
    "click",
    () => {
      chrome.tabs.create({
        url: "http://localhost:3000",
      });
    }
  );