import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Plan, Role, Task, Artifact, AgentOutput, File } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePlanFromGoal = async (goal: string, initialFiles: File[] = []): Promise<Plan> => {
  const ai = getAI();

  const systemInstruction = `You are an expert Project Manager and System Architect. 
  Your goal is to break down a high-level objective into a step-by-step execution plan.
  
  The plan must:
  1. Define specialized Roles with titles and purposes.
  2. Define specific Tasks, assigning them to Roles (and optionally specific Agents).
  3. Ensure Tasks have logical dependencies (topological sort).
  4. Provide reasoning for the plan structure.
  
  Task IDs should be short, snake_case strings like 'init_setup', 'research_topic'.`;

  let promptContent = `The goal is: ${goal}`;

  if (initialFiles.length > 0) {
    promptContent += `\n\nINITIAL CONTEXT FILES PROVIDED BY USER:\n`;
    initialFiles.forEach(f => {
      promptContent += `\n--- START FILE: ${f.path} ---\n${f.content}\n--- END FILE ---\n`;
    });
    promptContent += `\nUse these files to understand the requirements, existing code, or data structures when creating the plan.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: promptContent,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          high_level_goal: { type: Type.STRING },
          reasoning: { type: Type.STRING },
          roles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                purpose: { type: Type.STRING },
              },
              required: ["title", "purpose"]
            }
          },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                description: { type: Type.STRING },
                role: { type: Type.STRING, description: "Must match one of the role titles defined" },
                agent: { type: Type.STRING, nullable: true },
                deps: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Array of Task IDs that must complete before this one."
                }
              },
              required: ["id", "description", "role", "deps"]
            }
          },
          team: {
            type: Type.OBJECT,
            properties: {
              notes: { type: Type.STRING, nullable: true }
            },
            nullable: true
          }
        },
        required: ["high_level_goal", "reasoning", "roles", "tasks"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from Gemini");
  }

  const rawData = JSON.parse(response.text);
  
  // Sanitize to match internal types (add status)
  const tasks = rawData.tasks.map((t: any) => ({
    ...t,
    status: 'pending'
  }));

  return {
    ...rawData,
    tasks
  };
};

export const executeTaskWithAgent = async (
  task: Task, 
  role: Role, 
  goal: string, 
  contextArtifacts: Artifact[]
): Promise<AgentOutput> => {
  const ai = getAI();

  // Prepare context from previous artifacts
  // Since artifacts now contain files, we flatten them for context
  const contextStr = contextArtifacts.map(a => 
    `--- ARTIFACT FROM TASK: ${a.taskId} ---
     ${a.files.map(f => `FILE: ${f.path}\nCONTENT:\n${f.content}`).join("\n\n")}
     --- END ARTIFACT ---`
  ).join("\n\n");

  const prompt = `
  GOAL: ${goal}
  
  CURRENT TASK:
  ID: ${task.id}
  Description: ${task.description}
  
  YOUR ROLE: ${role.title}
  PURPOSE: ${role.purpose}
  
  PREVIOUS CONTEXT:
  ${contextStr.length > 0 ? contextStr : "No previous context."}
  
  INSTRUCTIONS:
  Execute the task. Return a structured JSON response.
  1. 'reasoning': Explain your thought process.
  2. 'output': A summary of your work.
  3. 'artifact': (Optional) If you created code or files, provide them here as a list of files with 'path' and 'content'.
  `;

  // Define schema for AgentOutput
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      reasoning: { type: Type.STRING },
      output: { type: Type.STRING },
      artifact: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          files: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ["path", "content"]
            }
          }
        },
        required: ["files"]
      },
      team: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
            notes: { type: Type.STRING }
        }
      }
    },
    required: ["reasoning", "output"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Agent");

  try {
    return JSON.parse(text) as AgentOutput;
  } catch (e) {
    console.error("Failed to parse agent output", text);
    throw new Error("Agent produced invalid JSON");
  }
};