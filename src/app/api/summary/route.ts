import OpenAI from "openai";

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
    const body = await req.json();

    const transcript =
      body.transcript;

    const completion =
      await client.chat.completions.create(
        {
          model:
            "openai/gpt-3.5-turbo",

          messages: [
            {
              role: "user",

              content: `
Generate:
1. Meeting Summary
2. Key Discussion Points
3. Action Items

Transcript:
${transcript}
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