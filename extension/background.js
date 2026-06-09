const TRANSCRIPT_LINES_KEY =
  "aiMeetingCopilotTranscriptLines";

const CAPTURE_ENABLED_KEY =
  "aiMeetingCopilotCaptureEnabled";

const ACTIVE_MEET_URL_KEY =
  "activeMeetUrl";

const ACTIVE_MEET_CODE_KEY =
  "aiMeetingCopilotActiveMeetCode";

const MAX_TRANSCRIPT_LINES = 800;

chrome.runtime.onInstalled.addListener(() => {
  console.log(
    "AI Meeting Copilot Installed"
  );

  chrome.storage.local.set({
    [CAPTURE_ENABLED_KEY]: true,
    [TRANSCRIPT_LINES_KEY]: [],
  });
});

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (!message || !message.type) {
      return false;
    }

    if (
      message.type ===
      "AI_MC_GET_STATE"
    ) {
      getTranscriptState().then(
        sendResponse
      );

      return true;
    }

    if (
      message.type ===
      "AI_MC_SET_CAPTURE"
    ) {
      const enabled =
        Boolean(message.enabled);

      chrome.storage.local.set(
        {
          [CAPTURE_ENABLED_KEY]:
            enabled,
        },
        () => {
          notifyMeetTabs({
            type:
              "AI_MC_CAPTURE_STATE",
            enabled,
          });

          getTranscriptState().then(
            sendResponse
          );
        }
      );

      return true;
    }

    if (
      message.type ===
      "AI_MC_CLEAR_TRANSCRIPT"
    ) {
      chrome.storage.local.set(
        {
          [TRANSCRIPT_LINES_KEY]:
            [],
        },
        () => {
          getTranscriptState().then(
            sendResponse
          );
        }
      );

      return true;
    }

    if (
      message.type ===
      "AI_MC_MEET_ACTIVE"
    ) {
      handleMeetActive(
        message.url,
        message.meetingCode
      ).then(sendResponse);

      return true;
    }

    if (
      message.type ===
      "AI_MC_CAPTION_LINE"
    ) {
      upsertTranscriptLine(
        message.line,
        sender.tab?.url
      ).then(sendResponse);

      return true;
    }

    return false;
  }
);

async function getTranscriptState() {
  const state =
    await chrome.storage.local.get(
      [
        TRANSCRIPT_LINES_KEY,
        CAPTURE_ENABLED_KEY,
        ACTIVE_MEET_URL_KEY,
        ACTIVE_MEET_CODE_KEY,
      ]
    );

  return {
    transcriptLines:
      state[TRANSCRIPT_LINES_KEY] ||
      [],
    captureEnabled:
      state[CAPTURE_ENABLED_KEY] !==
      false,
    activeMeetUrl:
      state[ACTIVE_MEET_URL_KEY] ||
      "",
    activeMeetCode:
      state[ACTIVE_MEET_CODE_KEY] ||
      "",
  };
}

async function handleMeetActive(
  url,
  meetingCode
) {
  if (!url) {
    return getTranscriptState();
  }

  const state =
    await chrome.storage.local.get(
      [
        ACTIVE_MEET_URL_KEY,
        ACTIVE_MEET_CODE_KEY,
        TRANSCRIPT_LINES_KEY,
        CAPTURE_ENABLED_KEY,
      ]
    );

  const previousMeetCode =
    state[ACTIVE_MEET_CODE_KEY];

  const shouldResetTranscript =
    Boolean(
      previousMeetCode &&
        meetingCode &&
        previousMeetCode !==
          meetingCode
    );

  await chrome.storage.local.set({
    [ACTIVE_MEET_URL_KEY]: url,
    [ACTIVE_MEET_CODE_KEY]:
      meetingCode || "",
    [CAPTURE_ENABLED_KEY]:
      state[CAPTURE_ENABLED_KEY] !==
      false,
    ...(shouldResetTranscript
      ? {
          [TRANSCRIPT_LINES_KEY]:
            [],
        }
      : {}),
  });

  return getTranscriptState();
}

async function upsertTranscriptLine(
  candidate,
  fallbackUrl
) {
  const normalizedText =
    normalizeText(candidate?.text);

  if (!normalizedText) {
    return {
      ok: false,
      reason:
        "Empty caption text",
    };
  }

  const state =
    await chrome.storage.local.get(
      [
        TRANSCRIPT_LINES_KEY,
        CAPTURE_ENABLED_KEY,
        ACTIVE_MEET_URL_KEY,
        ACTIVE_MEET_CODE_KEY,
      ]
    );

  if (
    state[CAPTURE_ENABLED_KEY] ===
    false
  ) {
    return {
      ok: false,
      reason:
        "Capture is stopped",
    };
  }

  const existingLines =
    Array.isArray(
      state[TRANSCRIPT_LINES_KEY]
    )
      ? state[TRANSCRIPT_LINES_KEY]
      : [];

  const now =
    new Date().toISOString();

  const line = {
    id:
      candidate.id ||
      `caption-${Date.now()}`,
    speaker:
      normalizeSpeaker(
        candidate.speaker
      ),
    text:
      candidate.text.trim(),
    timestamp:
      candidate.timestamp ||
      now,
    updatedAt: now,
    meetingUrl:
      candidate.meetingUrl ||
      state[ACTIVE_MEET_URL_KEY] ||
      fallbackUrl ||
      "",
    meetingCode:
      candidate.meetingCode ||
      state[ACTIVE_MEET_CODE_KEY] ||
      "",
  };

  const lines =
    upsertLine(existingLines, line);

  await chrome.storage.local.set({
    [TRANSCRIPT_LINES_KEY]:
      lines.slice(
        -MAX_TRANSCRIPT_LINES
      ),
  });

  return {
    ok: true,
    line,
  };
}

function upsertLine(lines, line) {
  const nextLines = [...lines];

  const sameIdIndex =
    nextLines.findIndex(
      (item) => item.id === line.id
    );

  if (sameIdIndex >= 0) {
    const previous =
      nextLines[sameIdIndex];

    if (
      normalizeText(previous.text) ===
      normalizeText(line.text)
    ) {
      return nextLines;
    }

    nextLines[sameIdIndex] = {
      ...previous,
      ...line,
      timestamp:
        previous.timestamp ||
        line.timestamp,
    };

    return nextLines;
  }

  const lastSameSpeakerIndex =
    findLastIndex(
      nextLines,
      (item) =>
        normalizeSpeaker(
          item.speaker
        ) === line.speaker
    );

  if (lastSameSpeakerIndex >= 0) {
    const previous =
      nextLines[
        lastSameSpeakerIndex
      ];

    const previousText =
      normalizeText(previous.text);

    const nextText =
      normalizeText(line.text);

    const secondsSincePrevious =
      Math.abs(
        new Date(line.timestamp)
          .getTime() -
          new Date(
            previous.timestamp ||
              previous.updatedAt
          ).getTime()
      ) / 1000;

    if (previousText === nextText) {
      return nextLines;
    }

    if (
      secondsSincePrevious < 30 &&
      nextText.startsWith(
        previousText
      )
    ) {
      nextLines[
        lastSameSpeakerIndex
      ] = {
        ...previous,
        ...line,
        timestamp:
          previous.timestamp ||
          line.timestamp,
      };

      return nextLines;
    }

    if (
      secondsSincePrevious < 30 &&
      previousText.startsWith(
        nextText
      )
    ) {
      return nextLines;
    }
  }

  return [...nextLines, line];
}

function findLastIndex(
  items,
  predicate
) {
  for (
    let index =
      items.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (predicate(items[index])) {
      return index;
    }
  }

  return -1;
}

function notifyMeetTabs(message) {
  chrome.tabs.query(
    {
      url: "https://meet.google.com/*",
    },
    (tabs) => {
      tabs.forEach((tab) => {
        if (!tab.id) return;

        chrome.tabs.sendMessage(
          tab.id,
          message,
          () => {
            const error =
              chrome.runtime.lastError;

            if (error) {
              console.debug(
                "Could not notify Meet tab:",
                error.message
              );
            }
          }
        );
      });
    }
  );
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeSpeaker(speaker) {
  const normalized =
    String(speaker || "")
      .replace(/\s+/g, " ")
      .trim();

  return (
    normalized ||
    "Unknown speaker"
  );
}
