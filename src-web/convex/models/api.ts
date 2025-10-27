export async function analyzePhonemesFromPython(
  text: string,
  accent: string = "us",
): Promise<{
  phonemes: string[];
  counts: {
    vowels: number;
    consonants: number;
    diphthongs: number;
    difficult: number;
  };
}> {
  const PYTHON_API_URL = process.env.PYTHON_API_URL ||
    "https://monroe-overpensive-finnegan.ngrok-free.dev";
  console.log(PYTHON_API_URL);

  try {
    const response = await fetch(
      `${PYTHON_API_URL}/analyze-phonemes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, accent }),
      },
    );

    if (!response.ok) {
      throw new Error(`Python API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to analyze phonemes:", error);
    throw error;
  }
}
