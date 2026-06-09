import OpenAI from "openai";

type SummaryRequestBody = {
  transcript?: unknown;
};

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

    const completion =
      await client.chat.completions.create(
        {
          model:
            "openai/gpt-3.5-turbo",

          messages: [
            {
              role: "user",

              content: `
You are an AI Meeting Copilot for software engineering teams.

Analyze the meeting transcript carefully and generate:

1. Meeting Summary
2. Key Discussion Points
3. Action Items

Instructions:
- Correct obvious speech-to-text mistakes.
- Convert incorrect technical terms into proper software terminology.
Examples:
  - "Pigma" -> "Figma"
  - "I pay" -> "API"
  - "react yes" -> "React.js"
- Improve grammar slightly while preserving meaning.
- Understand both structured and unstructured meeting conversations.
- Do not invent information.
- Generate action items only if clearly mentioned.
- If transcript is too short like "hello", mark it as informal conversation.

Return response in professional format.

Transcript:
${transcript.trim()}
`,
            },
          ],
        }
      );

    return Response.json({
      result:
        completion.choices[0]
          .message.content,
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
