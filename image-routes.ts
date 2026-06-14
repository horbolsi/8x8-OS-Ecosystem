/**
 * 8x8 Hub — Image Generation Routes
 * Bridges Express API to FAL.ai via Python image_gen.py
 */

import type { Express } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

const IMAGE_GEN_SCRIPT = path.join(__dirname, "image_gen.py");

/**
 * Generate an image by calling the Python FAL bridge.
 */
async function callImageGen(
  prompt: string,
  model: string = "flux-pro",
  filename?: string,
  size?: string
): Promise<any> {
  const args = ["python3", IMAGE_GEN_SCRIPT, "generate", prompt, model];
  if (filename) args.push(filename);

  const { stdout, stderr } = await execFileAsync(args[0], args.slice(1), {
    timeout: 120_000,
    maxBuffer: 50 * 1024 * 1024, // 50MB for base64 images
  });

  if (stderr && !stderr.includes("DeprecationWarning")) {
    console.warn("[image_gen] stderr:", stderr.substring(0, 500));
  }

  try {
    return JSON.parse(stdout);
  } catch {
    // If output is too large for JSON, the image was saved to disk
    return { status: "completed", raw: stdout.substring(0, 500) };
  }
}

/**
 * Get job status from Python bridge.
 */
async function getJobStatus(jobId: string): Promise<any> {
  const { stdout } = await execFileAsync(
    "python3",
    [IMAGE_GEN_SCRIPT, "status", jobId],
    { timeout: 10_000 }
  );
  try {
    return JSON.parse(stdout);
  } catch {
    return { error: "Failed to parse status", raw: stdout };
  }
}

/**
 * List available models.
 */
async function listModels(): Promise<any> {
  const { stdout } = await execFileAsync(
    "python3",
    [IMAGE_GEN_SCRIPT, "models"],
    { timeout: 10_000 }
  );
  return JSON.parse(stdout);
}

/**
 * Register image generation routes on the Express app.
 */
export function registerImageRoutes(app: Express): void {

  /**
   * POST /api/image/generate
   * Body: { prompt, model?, filename?, size?, num_images? }
   */
  app.post("/api/image/generate", async (req, res) => {
    try {
      const { prompt, model, filename, size, num_images } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "prompt is required" });
      }

      console.log(`[image_gen] Generating: "${prompt.substring(0, 80)}" model=${model || "flux-pro"}`);

      const result = await callImageGen(
        prompt,
        model || "flux-pro",
        filename,
        size
      );

      if (result.error) {
        return res.status(500).json({ error: result.error, job_id: result.job_id });
      }

      res.json({
        success: true,
        job_id: result.job_id,
        status: result.status,
        model: result.model,
        images: result.images?.map((img: any) => ({
          path: img.path,
          width: img.width,
          height: img.height,
        })),
        seed: result.seed,
      });
    } catch (err: any) {
      console.error("[image_gen] Error:", err.message);
      res.status(500).json({ error: err.message || "Image generation failed" });
    }
  });

  /**
   * GET /api/image/status/:id
   */
  app.get("/api/image/status/:id", async (req, res) => {
    try {
      const result = await getJobStatus(req.params.id);
      if (result.error && result.error === "Job not found") {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/image/models
   */
  app.get("/api/image/models", async (_req, res) => {
    try {
      const models = await listModels();
      res.json({ models });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/image/jobs
   */
  app.get("/api/image/jobs", async (_req, res) => {
    try {
      const { stdout } = await execFileAsync(
        "python3",
        [IMAGE_GEN_SCRIPT, "jobs"],
        { timeout: 10_000 }
      );
      const jobs = JSON.parse(stdout);
      res.json({ jobs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
