import express, { type Express } from "express";
import path from "path";
import fs from "fs";

export function serveStatic(app: Express) {
  // Use an absolute path to the built frontend
  const distPath = path.join(process.cwd(), "dist/public");
  
  // Verify the dist/public directory exists
  if (!fs.existsSync(distPath)) {
    console.warn(`⚠️ Warning: dist/public directory not found at ${distPath}`);
    console.warn(`Current working directory: ${process.cwd()}`);
    console.warn(`Available directories:`, fs.readdirSync(process.cwd()).filter(f => !f.startsWith('.')));
  }
  
  // Verify index.html exists
  const indexPath = path.join(distPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.warn(`⚠️ Warning: index.html not found at ${indexPath}`);
  }
  
  app.use(express.static(distPath, { 
    maxAge: "1d",
    etag: false 
  }));
  
  // Catch-all route for SPA routing - use regex pattern for Express 5.x compatibility
  app.get(/^\/(?!api\/).*$/, (req, res) => {
    try {
      res.sendFile(path.resolve(distPath, "index.html"));
    } catch (error) {
      console.error("Error serving index.html:", error);
      res.status(500).send("Internal Server Error");
    }
  });
}
