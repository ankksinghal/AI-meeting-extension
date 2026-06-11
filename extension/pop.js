const status =
  document.getElementById(
    "status"
  );

const openDashboardButton =
  document.getElementById(
    "openDashboard"
  );

const toggleCaptureButton =
  document.getElementById(
    "toggleCapture"
  );

let captureEnabled = false;

loadState();

openDashboardButton.addEventListener(
  "click",
  () => {
    chrome.tabs.create({
      url: "http://localhost:3000",
    });
  }
);

toggleCaptureButton.addEventListener(
  "click",
  () => {
    setCaptureEnabled(
      !captureEnabled
    );
  }
);

function loadState() {
  chrome.runtime.sendMessage(
    {
      type: "AI_MC_GET_STATE",
    },
    (state) => {
      const error =
        chrome.runtime.lastError;

      if (error || !state) {
        status.textContent =
          "Extension state unavailable";

        toggleCaptureButton.disabled =
          true;

        return;
      }

      renderState(state);
    }
  );
}

function setCaptureEnabled(enabled) {
  toggleCaptureButton.disabled =
    true;

  chrome.runtime.sendMessage(
    {
      type: "AI_MC_SET_CAPTURE",
      enabled,
    },
    (state) => {
      const error =
        chrome.runtime.lastError;

      if (error || !state) {
        status.textContent =
          "Could not update recording";

        toggleCaptureButton.disabled =
          false;

        return;
      }

      renderState(state);
    }
  );
}

function renderState(state) {
  captureEnabled =
    state.captureEnabled === true;

  status.textContent =
    state.activeMeetUrl
      ? `Meeting Detected - ${
          captureEnabled
            ? "Recording"
            : "Stopped"
        }`
      : state.meetingEnded
      ? "Meeting Ended - Summary Pending"
      : "No Active Meeting";

  toggleCaptureButton.disabled =
    !state.activeMeetUrl;

  toggleCaptureButton.textContent =
    captureEnabled
      ? "Stop Recording"
      : "Start Recording";

  toggleCaptureButton.classList.toggle(
    "bg-green-600",
    !captureEnabled
  );

  toggleCaptureButton.classList.toggle(
    "hover:bg-green-700",
    !captureEnabled
  );

  toggleCaptureButton.classList.toggle(
    "bg-red-600",
    captureEnabled
  );

  toggleCaptureButton.classList.toggle(
    "hover:bg-red-700",
    captureEnabled
  );
}
