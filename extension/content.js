(() => {
  if (
    window.__aiMeetingCopilotLoaded
  ) {
    return;
  }

  window.__aiMeetingCopilotLoaded =
    true;

  const DASHBOARD_SOURCE =
    "AI_MEETING_COPILOT_DASHBOARD";

  const EXTENSION_SOURCE =
    "AI_MEETING_COPILOT_EXTENSION";

  const CAPTURE_ENABLED_KEY =
    "aiMeetingCopilotCaptureEnabled";

  const CAPTION_REGION_SELECTORS =
    [
      '[role="region"][aria-label*="Captions" i]',
      '[aria-label*="Captions" i]',
      '[aria-live="polite"]',
      '[aria-live="assertive"]',
      ".uVccjd",
    ];

  const IGNORED_CAPTION_TEXT =
    new Set([
      "caption",
      "captions",
      "captions are off",
      "closed_caption",
      "closed_caption_disabled",
      "turn on captions",
      "turn off captions",
      "show captions",
      "hide captions",
      "translated captions",
      "mic",
      "mic_off",
      "videocam",
      "videocam_off",
      "call_end",
      "more_vert",
      "present_to_all",
      "system default",
      "white black blue green red yellow cyan magenta",
    ]);

  const MEET_SYSTEM_TEXT_PATTERNS =
    [
      /you'?ll be able to join in just a moment/i,
      /ready to join\?/i,
      /looking for others in the call/i,
      /you have joined the call/i,
      /you are the first one here/i,
      /returning to home screen in\s+\d+\s+seconds?/i,
      /your camera is/i,
      /your microphone is/i,
      /your hand is/i,
      /background is no longer blurred/i,
      /developing an extension for meet/i,
      /developers\.google\.com\/meet\/add-ons/i,
      /browser-extension-\*-buttons/i,
      /return to meet button/i,
      /main screen now has the usual layout/i,
      /system default/i,
      /white black blue green red yellow cyan magenta/i,
      /microphone array/i,
      /smart sound technology/i,
      /digital microphones/i,
      /speakers \(\d+-/i,
      /realtek/i,
      /hp hd camera/i,
      /chevron_left/i,
      /chevron_right/i,
      /skin tone/i,
      /^previous\s+.*next/i,
      /\bin\s+[\d,]+\s+minutes\b/i,
      /more_vert\s*more options/i,
      /more options pop-up menu/i,
      /scheduled for\s+\d{1,2}:\d{2}/i,
      /^scheduled for:\s+/i,
      /arrow_downward\s*jump to bottom/i,
      /jump to bottom/i,
      /others might still see your full video/i,
      /call_end\s*leave call/i,
      /leave call/i,
      /videocam_off\s*turn on camera/i,
      /videocam\s*turn off camera/i,
      /turn on camera\s*\(ctrl\s*\+\s*e\)/i,
      /turn off camera\s*\(ctrl\s*\+\s*e\)/i,
      /back_hand(?:\s+back_hand)?\s*raise hand/i,
      /raise hand\s*\(ctrl\s*\+\s*alt\s*\+\s*h\)/i,
      /\bctrl\s*\+\s*e\b/i,
      /\bctrl\s*\+\s*alt\s*\+\s*h\b/i,
      /\bBETA\b.*\bAfrikaans\b/i,
      /\bAfrikaans\b.*\bZulu\b.*\bBETA\b/i,
      /\bEnglish\b.*\bAlbanian\b.*\bAmharic\b/i,
    ];

  if (isGoogleMeetPage()) {
    startMeetCaptionCapture();
  }

  if (isDashboardPage()) {
    startDashboardBridge();
  }

  function isGoogleMeetPage() {
    return (
      window.location.hostname ===
      "meet.google.com"
    );
  }

  function isDashboardPage() {
    return (
      [
        "localhost",
        "127.0.0.1",
      ].includes(
        window.location.hostname
      ) &&
      window.location.port ===
        "3000"
    );
  }

  function startMeetCaptionCapture() {
    console.log(
      "AI Meeting Copilot: Google Meet detected"
    );

    let captureEnabled = true;
    let scanTimer = 0;
    let sequence =
      Number(
        sessionStorage.getItem(
          "aiMeetingCopilotCaptionSequence"
        )
      ) || 0;

    const rowIds =
      new WeakMap();

    const rowTimestamps =
      new WeakMap();

    const lastTextByRowId =
      new Map();

    const meetingCode =
      getMeetingCode();

    sendRuntimeMessage({
      type: "AI_MC_MEET_ACTIVE",
      url: window.location.href,
      meetingCode,
    });

    window.setTimeout(
      ensureMeetCaptionsEnabled,
      1500
    );

    chrome.storage.local.get(
      [CAPTURE_ENABLED_KEY],
      (result) => {
        captureEnabled =
          result[
            CAPTURE_ENABLED_KEY
          ] !== false;

        if (captureEnabled) {
          ensureMeetCaptionsEnabled();
        }
      }
    );

    chrome.storage.onChanged.addListener(
      (changes, areaName) => {
        if (areaName !== "local") {
          return;
        }

        if (
          changes[
            CAPTURE_ENABLED_KEY
          ]
        ) {
          captureEnabled =
            changes[
              CAPTURE_ENABLED_KEY
            ].newValue !== false;

          if (captureEnabled) {
            ensureMeetCaptionsEnabled();
          }
        }
      }
    );

    chrome.runtime.onMessage.addListener(
      (message) => {
        if (
          message?.type ===
          "AI_MC_CAPTURE_STATE"
        ) {
          captureEnabled =
            Boolean(message.enabled);

          if (captureEnabled) {
            ensureMeetCaptionsEnabled();
          }
        }
      }
    );

    const observer =
      new MutationObserver(() => {
        scheduleScan();
      });

    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true,
        characterData: true,
      }
    );

    window.setInterval(
      () => {
        if (captureEnabled) {
          ensureMeetCaptionsEnabled();
        }

        scanCaptions();
      },
      1000
    );

    scanCaptions();

    function scheduleScan() {
      window.clearTimeout(
        scanTimer
      );

      scanTimer =
        window.setTimeout(
          scanCaptions,
          250
        );
    }

    function scanCaptions() {
      if (!captureEnabled) {
        return;
      }

      const entries =
        extractCaptionEntries();

      entries.forEach(
        (entry) => {
          const text =
            normalizeText(
              entry.text
            );

          if (
            !text ||
            isIgnoredCaptionText(
              entry.text
            ) ||
            isSpeakerOnlyText(
              entry.text,
              entry.speaker
            ) ||
            isMeetSystemText(
              entry.text,
              entry.speaker
            )
          ) {
            return;
          }

          const rowId =
            getRowId(
              entry.element
            );

          if (
            lastTextByRowId.get(
              rowId
            ) === text
          ) {
            return;
          }

          lastTextByRowId.set(
            rowId,
            text
          );

          sendRuntimeMessage({
            type:
              "AI_MC_CAPTION_LINE",
            line: {
              id: rowId,
              speaker:
                entry.speaker ||
                "Unknown speaker",
              text:
                entry.text.trim(),
              timestamp:
                getRowTimestamp(
                  entry.element
                ),
              meetingUrl:
                window.location.href,
              meetingCode,
            },
          });
        }
      );
    }

    function getRowId(element) {
      if (
        element &&
        rowIds.has(element)
      ) {
        return rowIds.get(
          element
        );
      }

      sequence += 1;

      sessionStorage.setItem(
        "aiMeetingCopilotCaptionSequence",
        String(sequence)
      );

      const id = [
        "meet",
        meetingCode || "meeting",
        Date.now(),
        sequence,
      ].join("-");

      if (element) {
        rowIds.set(element, id);
      }

      return id;
    }

    function getRowTimestamp(
      element
    ) {
      if (!element) {
        return new Date().toISOString();
      }

      if (
        !rowTimestamps.has(
          element
        )
      ) {
        rowTimestamps.set(
          element,
          new Date().toISOString()
        );
      }

      return rowTimestamps.get(
        element
      );
    }

    function ensureMeetCaptionsEnabled() {
      const button =
        findTurnOnCaptionsButton();

      if (!button) {
        return;
      }

      button.click();

      console.log(
        "AI Meeting Copilot: enabled Google Meet captions"
      );
    }
  }

  function startDashboardBridge() {
    console.log(
      "AI Meeting Copilot: dashboard bridge active"
    );

    const postToDashboard = (
      type,
      payload = {}
    ) => {
      window.postMessage(
        {
          source:
            EXTENSION_SOURCE,
          type,
          ...payload,
        },
        window.location.origin
      );
    };

    const postState = () => {
      sendRuntimeMessage(
        {
          type: "AI_MC_GET_STATE",
        },
        (state, error) => {
          if (error) {
            postToDashboard(
              "AI_MC_ERROR",
              {
                message:
                  error.message ||
                  "Extension bridge is unavailable.",
              }
            );

            return;
          }

          postToDashboard(
            "AI_MC_STATE",
            {
              state,
            }
          );
        }
      );
    };

    window.addEventListener(
      "message",
      (event) => {
        if (
          event.source !== window
        ) {
          return;
        }

        const data =
          event.data;

        if (
          data?.source !==
          DASHBOARD_SOURCE
        ) {
          return;
        }

        if (
          data.type ===
          "AI_MC_GET_STATE"
        ) {
          postState();
        }

        if (
          data.type ===
          "AI_MC_SET_CAPTURE"
        ) {
          sendRuntimeMessage(
            {
              type:
                "AI_MC_SET_CAPTURE",
              enabled:
                Boolean(
                  data.enabled
                ),
            },
            () => {
              postState();
            }
          );
        }

        if (
          data.type ===
          "AI_MC_CLEAR_TRANSCRIPT"
        ) {
          sendRuntimeMessage(
            {
              type:
                "AI_MC_CLEAR_TRANSCRIPT",
            },
            () => {
              postState();
            }
          );
        }
      }
    );

    chrome.storage.onChanged.addListener(
      (changes, areaName) => {
        if (areaName !== "local") {
          return;
        }

        const shouldRefresh =
          [
            "aiMeetingCopilotTranscriptLines",
            CAPTURE_ENABLED_KEY,
            "activeMeetUrl",
            "aiMeetingCopilotActiveMeetCode",
          ].some((key) =>
            Boolean(changes[key])
          );

        if (shouldRefresh) {
          postState();
        }
      }
    );

    postToDashboard(
      "AI_MC_READY"
    );

    postState();
  }

  function extractCaptionEntries() {
    const entries =
      getCaptionDocuments().flatMap(
        (captionDocument) => {
          const region =
            findCaptionRegion(
              captionDocument
            );

          if (!region) {
            return [];
          }

          const rows =
            extractCaptionRows(
              region
            );

          return rows
            .map(parseCaptionRow)
            .filter(Boolean);
        }
      );

    return dedupeEntries(
      entries
    );
  }

  function getCaptionDocuments() {
    const documents = [
      document,
    ];

    try {
      const pictureInPictureDocument =
        window
          .documentPictureInPicture
          ?.window?.document;

      if (
        pictureInPictureDocument
      ) {
        documents.push(
          pictureInPictureDocument
        );
      }
    } catch (error) {
      console.debug(
        "Picture-in-picture captions unavailable:",
        error
      );
    }

    return Array.from(
      new Set(documents)
    );
  }

  function findTurnOnCaptionsButton() {
    const selector =
      'button, [role="button"]';

    const candidates =
      getCaptionDocuments().flatMap(
        (captionDocument) =>
          Array.from(
            captionDocument.querySelectorAll(
              selector
            )
          )
      );

    return (
      candidates.find((element) => {
        if (
          !isVisible(element) ||
          !isCaptionControl(element)
        ) {
          return false;
        }

        const label =
          [
            element.getAttribute(
              "aria-label"
            ),
            element.getAttribute(
              "data-tooltip"
            ),
            element.getAttribute(
              "title"
            ),
            getCleanText(element),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return (
          label.includes(
            "caption"
          ) &&
          (
            label.includes(
              "turn on"
            ) ||
            label.includes(
              "show"
            ) ||
            label.includes(
              "closed_caption"
            )
          ) &&
          !label.includes(
            "turn off"
          ) &&
          !label.includes("hide")
        );
      }) || null
    );
  }

  function findCaptionRegion(
    rootDocument = document
  ) {
    const candidates = [];

    CAPTION_REGION_SELECTORS.forEach(
      (selector) => {
        try {
          rootDocument
            .querySelectorAll(
              selector
            )
            .forEach((element) => {
              candidates.push(
                element
              );
            });
        } catch (error) {
          console.debug(
            "Caption selector skipped:",
            selector,
            error
          );
        }
      }
    );

    const uniqueCandidates =
      Array.from(
        new Set(candidates)
      ).filter(
        (element) =>
          !isCaptionControl(
            element
          ) &&
          isVisible(element) &&
          hasStrongCaptionTextCandidate(
            element
          )
      );

    if (!uniqueCandidates.length) {
      return findFallbackCaptionRegion(
        rootDocument
      );
    }

    uniqueCandidates.sort(
      (a, b) =>
        scoreCaptionRegion(b) -
        scoreCaptionRegion(a)
    );

    return (
      uniqueCandidates[0] ||
      null
    );
  }

  function findFallbackCaptionRegion(
    rootDocument
  ) {
    const ownerWindow =
      rootDocument.defaultView ||
      window;

    const candidates =
      Array.from(
        rootDocument.querySelectorAll(
          "div"
        )
      ).filter((element) => {
        const rect =
          element.getBoundingClientRect();

        return (
          !isCaptionControl(
            element
          ) &&
          isVisible(element) &&
          hasStrongCaptionTextCandidate(
            element
          ) &&
          rect.top >
            ownerWindow.innerHeight *
              0.35 &&
          getCleanText(element)
            .length < 1000
        );
      });

    candidates.sort(
      (a, b) =>
        scoreCaptionRegion(b) -
        scoreCaptionRegion(a)
    );

    return (
      candidates[0] ||
      null
    );
  }

  function scoreCaptionRegion(
    element
  ) {
    if (
      isCaptionControl(element)
    ) {
      return -1000;
    }

    const label = String(
      element.getAttribute(
        "aria-label"
      ) || ""
    ).toLowerCase();

    const rect =
      element.getBoundingClientRect();
    const ownerWindow =
      element.ownerDocument
        ?.defaultView || window;

    let score = 0;

    if (
      label.includes("caption")
    ) {
      score +=
        element.getAttribute(
          "role"
        ) === "region"
          ? 140
          : 40;
    }

    if (
      element.hasAttribute(
        "aria-live"
      )
    ) {
      score += 80;
    }

    if (
      element.querySelector(
        'img[data-iml], img[src*="googleusercontent.com"]'
      )
    ) {
      score += 30;
    }

    if (
      rect.top >
      ownerWindow.innerHeight *
        0.35
    ) {
      score += 15;
    }

    score +=
      getCaptionTextLeaves(
        element
      ).length * 20;

    score += Math.min(
      getCleanText(element).length,
      500
    ) / 100;

    return score;
  }

  function extractCaptionRows(
    region
  ) {
    const avatarRows =
      Array.from(
        region.querySelectorAll(
          'img[data-iml], img[src*="googleusercontent.com"]'
        )
      )
        .map((image) =>
          closestCaptionRow(
            image,
            region
          )
        )
        .filter(Boolean);

    if (avatarRows.length) {
      return sortByDocumentOrder(
        uniqueElements(avatarRows)
      );
    }

    const directChildren =
      Array.from(
        region.children
      ).filter(
        (element) =>
          isVisible(element) &&
          hasStrongCaptionTextCandidate(
            element
          )
      );

    if (
      directChildren.length > 1
    ) {
      return directChildren;
    }

    const compactRows =
      Array.from(
        region.querySelectorAll(
          "div"
        )
      ).filter((element) => {
        const text =
          getCleanText(element);

        if (
          !text ||
          text.length > 800 ||
          !isVisible(element) ||
          !hasStrongCaptionTextCandidate(
            element
          )
        ) {
          return false;
        }

        const textLeaves =
          getCaptionTextLeaves(
            element
          );

        return (
          textLeaves.length >= 2
        );
      });

    if (compactRows.length) {
      return sortByDocumentOrder(
        uniqueElements(compactRows)
      ).filter(
        (element, index, all) =>
          !all.some(
            (other, otherIndex) =>
              otherIndex !== index &&
              other.contains(
                element
              ) &&
              getCleanText(
                other
              ) ===
                getCleanText(
                  element
                )
          )
      );
    }

    return [region];
  }

  function closestCaptionRow(
    node,
    region
  ) {
    let current =
      node.parentElement;

    while (
      current &&
      current !==
        document.body
    ) {
      const text =
        getCleanText(current);

      if (
        text &&
        text.length < 1000 &&
        hasStrongCaptionTextCandidate(
          current
        ) &&
        (
          current.querySelector(
            'img[data-iml], img[src*="googleusercontent.com"]'
          ) ||
          getCaptionTextLeaves(
            current
          ).length >= 2
        )
      ) {
        return current;
      }

      if (current === region) {
        return region;
      }

      current =
        current.parentElement;
    }

    return region;
  }

  function parseCaptionRow(row) {
    const leaves =
      getCaptionTextLeaves(row);

    const fullText =
      getCleanText(row);

    if (
      !leaves.length &&
      !fullText
    ) {
      return null;
    }

    const speaker =
      inferSpeaker(
        row,
        leaves
      );

    let captionParts = leaves;

    if (
      speaker &&
      captionParts[0] &&
      normalizeText(
        captionParts[0]
      ) ===
        normalizeText(speaker)
    ) {
      captionParts =
        captionParts.slice(1);
    }

    let text =
      captionParts.join(" ");

    if (
      !text &&
      speaker &&
      fullText
        .toLowerCase()
        .startsWith(
          speaker.toLowerCase()
        )
    ) {
      text = fullText
        .slice(speaker.length)
        .trim();
    }

    if (!text && !speaker) {
      text = fullText;
    }

    text =
      removeSpeakerPrefix(
        text,
        speaker
      );

    if (
      !text ||
      isIgnoredCaptionText(
        text
      ) ||
      isSpeakerOnlyText(
        text,
        speaker
      ) ||
      isMeetSystemText(
        text,
        speaker
      )
    ) {
      return null;
    }

    return {
      element: row,
      speaker:
        speaker ||
        "Unknown speaker",
      text,
    };
  }

  function inferSpeaker(
    row,
    leaves
  ) {
    const imageAlt =
      Array.from(
        row.querySelectorAll(
          "img[alt]"
        )
      )
        .map((image) =>
          getCleanTextFromString(
            image.getAttribute(
              "alt"
            )
          )
        )
        .find(isLikelySpeaker);

    if (imageAlt) {
      return imageAlt;
    }

    const hasAvatar =
      Boolean(
        row.querySelector(
          'img[data-iml], img[src*="googleusercontent.com"]'
        )
      );

    const spanCandidate =
      Array.from(
        row.querySelectorAll(
          "span"
        )
      )
        .map(getCleanText)
        .find(
          (text) =>
            isLikelySpeaker(text) &&
            text !==
              getCleanText(row)
        );

    if (
      hasAvatar &&
      spanCandidate
    ) {
      return spanCandidate;
    }

    const firstLeaf =
      leaves[0];

    if (
      leaves.length > 1 &&
      isLikelySpeaker(firstLeaf)
    ) {
      return firstLeaf;
    }

    return "";
  }

  function getCaptionTextLeaves(
    root
  ) {
    return getTextLeaves(root).filter(
      (text) =>
        !isIgnoredCaptionText(
          text
        )
    );
  }

  function hasStrongCaptionTextCandidate(
    element
  ) {
    const leaves =
      getCaptionTextLeaves(
        element
      );

    const nonSpeakerLeaves =
      leaves.filter(
        (text) =>
          !isSpeakerOnlyText(
            text,
            ""
          )
      );

    return (
      (
        leaves.length >= 2 &&
        nonSpeakerLeaves.length >=
          1
      ) ||
      nonSpeakerLeaves.some(
        (text) =>
          !isMeetSystemText(
            text,
            ""
          ) &&
          (
            text.length >= 15 ||
            /[.,!?]/.test(text)
          )
      )
    );
  }

  function getTextLeaves(root) {
    const elements = [
      root,
      ...root.querySelectorAll(
        "span, div"
      ),
    ];

    const leaves = elements
      .filter((element) => {
        if (
          isInsideCaptionControl(
            element
          ) ||
          isInsideNonCaptionUi(
            element
          ) ||
          element.getAttribute(
            "aria-hidden"
          ) === "true"
        ) {
          return false;
        }

        const text =
          getCleanText(element);

        if (!text) {
          return false;
        }

        return !Array.from(
          element.children
        ).some((child) =>
          getCleanText(child)
        );
      })
      .map(getCleanText);

    if (!leaves.length) {
      const text =
        getCleanText(root);

      return text
        ? [text]
        : [];
    }

    return leaves.filter(
      (text, index, list) =>
        index === 0 ||
        normalizeText(text) !==
          normalizeText(
            list[index - 1]
          )
    );
  }

  function dedupeEntries(entries) {
    const seen =
      new Set();

    return entries.filter(
      (entry) => {
        const key = [
          normalizeText(
            entry.speaker
          ),
          normalizeText(
            entry.text
          ),
        ].join("|");

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);

        return true;
      }
    );
  }

  function removeSpeakerPrefix(
    text,
    speaker
  ) {
    if (!speaker) {
      return text.trim();
    }

    const normalizedText =
      text.trim();

    const lowerText =
      normalizedText.toLowerCase();

    const lowerSpeaker =
      speaker.toLowerCase();

    if (
      lowerText.startsWith(
        `${lowerSpeaker}:`
      )
    ) {
      return normalizedText
        .slice(
          speaker.length + 1
        )
        .trim();
    }

    if (
      lowerText.startsWith(
        lowerSpeaker
      )
    ) {
      return normalizedText
        .slice(speaker.length)
        .trim();
    }

    return normalizedText;
  }

  function isIgnoredCaptionText(
    value
  ) {
    const text =
      normalizeText(value);

    return (
      !text ||
      IGNORED_CAPTION_TEXT.has(
        text
      ) ||
      isMaterialIconText(text)
    );
  }

  function isSpeakerOnlyText(
    text,
    speaker
  ) {
    const normalizedText =
      normalizeText(text);

    const normalizedSpeaker =
      normalizeText(speaker);

    return (
      normalizedText ===
        normalizedSpeaker ||
      normalizedText === "you" ||
      normalizedText ===
        "unknown speaker"
    );
  }

  function isMeetSystemText(
    text,
    speaker
  ) {
    const normalizedText =
      normalizeText(text);

    const normalizedSpeaker =
      normalizeText(speaker);

    const combinedText = [
      speaker,
      text,
    ]
      .filter(Boolean)
      .join(" ");

    const normalizedCombinedText =
      normalizeText(combinedText);

    if (!normalizedText) {
      return true;
    }

    if (
      normalizedSpeaker ===
        "default" ||
      normalizedSpeaker ===
        "english" ||
      /[\u{1F300}-\u{1FAFF}]/u.test(
        speaker || ""
      ) ||
      normalizedSpeaker.startsWith(
        "speakers ("
      ) ||
      normalizedSpeaker.startsWith(
        "microphone ("
      ) ||
      normalizedSpeaker.startsWith(
        "camera ("
      )
    ) {
      return true;
    }

    if (
      isTimeOnlyText(
        normalizedText
      ) ||
      isTimeOnlyText(
        normalizedCombinedText
      ) ||
      isTimePrefixedMeetingUiText(
        normalizedCombinedText
      ) ||
      isMeetingCountdownText(
        normalizedText,
        normalizedSpeaker
      ) ||
      isMeetKeyboardControlText(
        normalizedCombinedText,
        normalizedSpeaker
      ) ||
      isUnknownSpeakerUiText(
        normalizedCombinedText,
        normalizedSpeaker
      ) ||
      isLongLanguageList(
        text
      ) ||
      isLongLanguageList(
        combinedText
      ) ||
      isDeviceSettingsText(
        text
      ) ||
      isDeviceSettingsText(
        combinedText
      )
    ) {
      return true;
    }

    return MEET_SYSTEM_TEXT_PATTERNS.some(
      (pattern) =>
        pattern.test(text) ||
        pattern.test(combinedText)
    );
  }

  function isMeetingCountdownText(
    normalizedText,
    normalizedSpeaker
  ) {
    return (
      /^in\s+[\d,]+\s+minutes?$/.test(
        normalizedText
      ) &&
      normalizedSpeaker !== "you"
    );
  }

  function isUnknownSpeakerUiText(
    normalizedText,
    normalizedSpeaker
  ) {
    const isUnknownSpeaker =
      !normalizedSpeaker ||
      normalizedSpeaker ===
        "unknown speaker";

    if (!isUnknownSpeaker) {
      return false;
    }

    return (
      /^([a-z]+_)+[a-z]+\b/.test(
        normalizedText
      ) ||
      /\b(pop-up|popup|menu|options|background|blurred|camera|microphone|hand|leave call|jump to bottom|share screen|screen share|present)\b/.test(
        normalizedText
      )
    );
  }

  function isMeetKeyboardControlText(
    normalizedText,
    normalizedSpeaker
  ) {
    const isUnknownSpeaker =
      !normalizedSpeaker ||
      normalizedSpeaker ===
        "unknown speaker";

    if (!isUnknownSpeaker) {
      return false;
    }

    return (
      /\b(ctrl|alt|shift|command|cmd)\b\s*\+/.test(
        normalizedText
      ) &&
      /(camera|microphone|mic|hand|caption|present|chat|call|leave|turn on|turn off|raise|lower|mute|unmute)/.test(
        normalizedText
      )
    );
  }

  function isTimePrefixedMeetingUiText(
    normalizedText
  ) {
    return /^\d{1,2}:\d{2}:?\s*(am|pm)\s+.{2,80}$/.test(
      normalizedText
    );
  }

  function isTimeOnlyText(
    normalizedText
  ) {
    return /^\d{1,2}:\d{2}:?\s*(am|pm)?$/i.test(
      normalizedText
    );
  }

  function isLongLanguageList(
    text
  ) {
    const normalizedText =
      normalizeText(text);

    const betaCount =
      (
        text.match(/\bBETA\b/g) ||
        []
      ).length;

    return (
      betaCount >= 5 ||
      (
        normalizedText.length >
          250 &&
        normalizedText.includes(
          "afrikaans"
        ) &&
        normalizedText.includes(
          "zulu"
        )
      )
    );
  }

  function isDeviceSettingsText(
    text
  ) {
    const normalizedText =
      normalizeText(text);

    return (
      normalizedText.includes(
        "microphone"
      ) &&
      normalizedText.includes(
        "speakers"
      ) &&
      (
        normalizedText.includes(
          "camera"
        ) ||
        normalizedText.includes(
          "realtek"
        )
      )
    );
  }

  function isMaterialIconText(
    text
  ) {
    return (
      text.includes("_") &&
      /^[a-z0-9_]+$/.test(text) &&
      text.length <= 40
    );
  }

  function isCaptionControl(
    element
  ) {
    const tagName =
      element.tagName.toLowerCase();

    const role =
      String(
        element.getAttribute(
          "role"
        ) || ""
      ).toLowerCase();

    return (
      tagName === "button" ||
      [
        "button",
        "menuitem",
        "switch",
        "checkbox",
      ].includes(role)
    );
  }

  function isInsideCaptionControl(
    element
  ) {
    const control =
      element.closest(
        'button, [role="button"], [role="menuitem"], [role="switch"], [role="checkbox"]'
      );

    return Boolean(control);
  }

  function isInsideNonCaptionUi(
    element
  ) {
    const container =
      element.closest(
        '[role="dialog"], [role="menu"], [role="listbox"], [role="toolbar"], [role="tablist"], [role="grid"], [role="presentation"], [aria-modal="true"]'
      );

    if (!container) {
      return false;
    }

    const label =
      String(
        container.getAttribute(
          "aria-label"
        ) || ""
      ).toLowerCase();

    return !label.includes(
      "caption"
    );
  }

  function isLikelySpeaker(
    value
  ) {
    const text =
      getCleanTextFromString(
        value
      );

    if (!text) {
      return false;
    }

    const wordCount =
      text.split(" ").length;

    return (
      text.length <= 60 &&
      wordCount <= 6 &&
      !/[.!?]$/.test(text) &&
      !isIgnoredCaptionText(text)
    );
  }

  function isVisible(element) {
    const rect =
      element.getBoundingClientRect();

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return false;
    }

    const style =
      (
        element.ownerDocument
          ?.defaultView || window
      ).getComputedStyle(element);

    return (
      style.display !== "none" &&
      style.visibility !==
        "hidden" &&
      style.opacity !== "0"
    );
  }

  function getCleanText(
    element
  ) {
    return getCleanTextFromString(
      element?.innerText ||
        element?.textContent ||
        ""
    );
  }

  function getCleanTextFromString(
    value
  ) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeText(text) {
    return getCleanTextFromString(
      text
    ).toLowerCase();
  }

  function uniqueElements(
    elements
  ) {
    return Array.from(
      new Set(elements)
    );
  }

  function sortByDocumentOrder(
    elements
  ) {
    return [...elements].sort(
      (a, b) => {
        if (a === b) {
          return 0;
        }

        return a.compareDocumentPosition(
          b
        ) &
          Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1;
      }
    );
  }

  function getMeetingCode() {
    return window.location.pathname
      .split("/")
      .filter(Boolean)[0] || "";
  }

  function sendRuntimeMessage(
    message,
    callback
  ) {
    try {
      chrome.runtime.sendMessage(
        message,
        (response) => {
          const error =
            chrome.runtime.lastError;

          if (error) {
            console.debug(
              "AI Meeting Copilot message error:",
              error.message
            );
          }

          if (callback) {
            callback(
              response,
              error
            );
          }
        }
      );
    } catch (error) {
      console.debug(
        "AI Meeting Copilot runtime unavailable:",
        error
      );

      if (callback) {
        callback(null, error);
      }
    }
  }
})();
