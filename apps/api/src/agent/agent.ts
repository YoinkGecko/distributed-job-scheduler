const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "phi3:mini";
const JOB_API_URL = "http://localhost:3000/jobs";

interface Job {
  type: string;
  payload: Record<string, unknown>;
  priority: number;
}

async function userPrompt(): Promise<string> {
  return "Create a CheckOllamaStatus job with user kash and priority 58";
}

async function askOllama(prompt: string): Promise<Job> {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: `
You are a job creation agent.

Convert the user's request into ONLY valid JSON:

{
  "type": ,
  "payload": {},
  "priority": 
}

Rules:
- type must be uppercase
- payload contains the required job data
- priority must be a number from 1 to 100
- Return ONLY JSON

User request:
${prompt}
      `,
      stream: false,
      format: "json",
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status}`);
  }

  const data = await response.json();

  return JSON.parse(data.response);
}

async function createJob(job: Job) {
  const response = await fetch(JOB_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    throw new Error(`Job creation failed: ${response.status}`);
  }

  return await response.json();
}

async function main() {
  // 1. Get user's natural-language prompt
  const prompt = await userPrompt();

  console.log("USER:", prompt);

  // 2. Ask AI to convert it into a job
  const job = await askOllama(prompt);

  console.log("AI GENERATED JOB:", job);

  // 3. Create the job using our existing API
  const createdJob = await createJob(job);

  console.log("JOB CREATED:", createdJob);
}

main();