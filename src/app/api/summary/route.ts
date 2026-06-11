import OpenAI from "openai";

type SummaryRequestBody = {
  transcript?: unknown;
};

const SUMMARY_MODEL =
  "openai/gpt-3.5-turbo";

const client = new OpenAI({
  apiKey:
    process.env.OPENROUTER_API_KEY,

  baseURL:
    "https://openrouter.ai/api/v1",
});

export async function POST(
  req: Request
) {
  try {
    const body =
      (await req.json()) as SummaryRequestBody;

    const transcript =
      body.transcript;

    if (
      typeof transcript !==
        "string" ||
      !transcript.trim()
    ) {
      return Response.json(
        {
          error:
            "Transcript is required before generating a summary.",
        },
        {
          status: 400,
        }
      );
    }

    const cleanedTranscript =
      await cleanTranscript(
        transcript.trim()
      );

    const summary =
      await generateMeetingSummary(
        cleanedTranscript
      );

    return Response.json({
      result: summary,
    });
  } catch (error) {
    console.error(
      "OpenRouter Error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate summary",
      },
      {
        status: 500,
      }
    );
  }
}

async function cleanTranscript(
  transcript: string
) {
  const completion =
    await client.chat.completions.create({
      model: SUMMARY_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You clean Google Meet live captions for software meetings. Preserve speaker names and meaning. Do not invent missing content.",
        },
        {
          role: "user",
          content: `
Clean and correct this transcript before summarization.

Rules:
- Keep each speaker label, for example "Ana: text".
- Fix obvious speech-to-text and caption mistakes.
- Correct common technical terms, product names, acronyms, and grammar.
- Convert likely software terms correctly, such as "a pay" or "I pay" to "API", "Pigma" to "Figma", "react yes" to "React.js", "type script" to "TypeScript".
- Remove duplicated fragments only when they are clearly caption repetition.
- Do not add facts, decisions, people, dates, or tasks that are not present.
- If a phrase is unclear, keep the closest faithful wording.
- Return only the cleaned transcript, no explanation.

Transcript:
${transcript}
`,
        },
      ],
    });

  return (
    completion.choices[0]
      .message.content?.trim() ||
    transcript
  );
}

async function generateMeetingSummary(
  cleanedTranscript: string
) {
  const completion =
    await client.chat.completions.create({
      model: SUMMARY_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an AI Meeting Copilot for software engineering teams.",
        },
        {
          role: "user",
          content: `
Analyze the cleaned meeting transcript and generate:

1. Meeting Summary
2. Key Discussion Points
3. Action Items

Instructions:
- Use the corrected transcript as the source of truth.
- Understand both structured and unstructured meeting conversations.
- Do not invent information.
- Generate action items only if clearly mentioned.
- If the transcript is too short like "hello", mark it as informal conversation.
- Return the response in a professional format.

Cleaned Transcript:
${cleanedTranscript}
`,
        },
      ],
    });

  return (
    completion.choices[0]
      .message.content ||
    ""
  );
}
