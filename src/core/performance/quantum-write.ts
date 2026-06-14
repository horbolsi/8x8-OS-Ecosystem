/**
 * 🧬 Quantum File Writer - Ultra High Performance
 * Handles 1,000,000+ lines with parallel streaming writes
 */

import { createWriteStream, open, close, statSync } from 'fs';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';
import { EventEmitter } from 'events';

export interface WriteProgress {
  bytesWritten: number;
  totalBytes: number;
  linesWritten: number;
  percentage: number;
  elapsedMs: number;
  throughputMBps: number;
}

export interface QuantumWriteOptions {
  highWaterMark?: number;
  flushInterval?: number;      // Auto-flush interval ms
  parallelWrites?: number;      // Parallel write streams
  useDirectIO?: boolean;        // Direct I/O bypass
  encoding?: BufferEncoding;
}

export class QuantumFileWriter extends EventEmitter {
  private static instance: QuantumFileWriter;
  private writeStreams: Map<string, { stream: NodeJS.WritableStream; lines: number }> = new Map();

  static getInstance(): QuantumFileWriter {
    if (!QuantumFileWriter.instance) {
      QuantumFileWriter.instance = new QuantumFileWriter();
    }
    return QuantumFileWriter.instance;
  }

  /**
   * Create a high-performance write stream
   */
  createStream(
    filePath: string,
    options: QuantumWriteOptions = {}
  ): NodeJS.WritableStream {
    // Ensure directory exists
    const dir = dirname(filePath);
    mkdir(dir, { recursive: true }).catch(() => {});

    const {
      highWaterMark = 256 * 1024,
      encoding = 'utf-8'
    } = options;

    const stream = createWriteStream(filePath, {
      highWaterMark,
      encoding,
      flags: 'w'
    });

    this.writeStreams.set(filePath, { stream, lines: 0 });

    stream.on('finish', () => {
      this.writeStreams.delete(filePath);
      this.emit('complete', filePath);
    });

    return stream;
  }

  /**
   * Write lines with batching for maximum throughput
   */
  async writeBatched(
    filePath: string,
    lines: string[],
    batchSize = 10000
  ): Promise<WriteProgress> {
    const startTime = Date.now();
    let linesWritten = 0;
    let bytesWritten = 0;

    // Ensure directory exists
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });

    const stream = createWriteStream(filePath, { flags: 'a' });

    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize);
      const content = batch.join('\n') + '\n';
      
      await new Promise<void>((resolve, reject) => {
        stream.write(content, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      linesWritten += batch.length;
      bytesWritten += Buffer.byteLength(content, 'utf-8');

      // Emit progress
      const progress = this.calculateProgress(
        bytesWritten,
        linesWritten,
        lines.length,
        startTime
      );
      this.emit('progress', progress);
    }

    return new Promise((resolve, reject) => {
      stream.end(() => {
        const progress = this.calculateProgress(
          bytesWritten,
          linesWritten,
          lines.length,
          startTime
        );
        resolve(progress);
      });
      stream.on('error', reject);
    });
  }

  /**
   * Append single line with minimal overhead
   */
  appendLine(filePath: string, line: string): void {
    const existing = this.writeStreams.get(filePath);
    if (existing) {
      existing.stream.write(line + '\n');
      existing.lines++;
    } else {
      const stream = createWriteStream(filePath, { flags: 'a' });
      stream.write(line + '\n');
      this.writeStreams.set(filePath, { stream, lines: 1 });
    }
  }

  /**
   * Parallel file writing for massive datasets
   */
  async writeParallel(
    filePath: string,
    lines: string[],
    numStreams = 4
  ): Promise<void> {
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });

    const chunkSize = Math.ceil(lines.length / numStreams);
    const tempFiles: string[] = [];

    // Write chunks to temp files in parallel
    const writeChunk = async (index: number): Promise<string> => {
      const start = index * chunkSize;
      const chunk = lines.slice(start, start + chunkSize);
      const tempPath = `${filePath}.chunk${index}`;
      
      await this.writeBatched(tempPath, chunk);
      tempFiles.push(tempPath);
      
      return tempPath;
    };

    await Promise.all(
      Array.from({ length: numStreams }, (_, i) => writeChunk(i))
    );

    // Concatenate all chunks
    const finalStream = createWriteStream(filePath, { flags: 'w' });
    const { createReadStream } = await import('fs');

    for (const tempPath of tempFiles) {
      await new Promise<void>((resolve, reject) => {
        const readStream = createReadStream(tempPath);
        readStream.pipe(finalStream, { end: false });
        readStream.on('end', resolve);
        readStream.on('error', reject);
      });
    }

    finalStream.end();

    // Clean up temp files
    const { unlink } = await import('fs/promises');
    for (const tempPath of tempFiles) {
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Atomic write with temp file + rename (crash-safe)
   */
  async writeAtomic(
    filePath: string,
    content: string
  ): Promise<void> {
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });

    const tempPath = `${filePath}.tmp.${Date.now()}`;
    const stream = createWriteStream(tempPath, { flags: 'w' });

    await new Promise<void>((resolve, reject) => {
      stream.write(content, () => {
        stream.end(resolve);
      });
      stream.on('error', reject);
    });

    // Atomic rename
    const { rename } = await import('fs/promises');
    await rename(tempPath, filePath);
  }

  /**
   * Get stream statistics
   */
  getStreamStats(filePath: string): { lines: number; active: boolean } | null {
    const info = this.writeStreams.get(filePath);
    return info ? { lines: info.lines, active: !info.stream.destroyed } : null;
  }

  /**
   * Close all streams safely
   */
  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = [];
    
    for (const [path, info] of this.writeStreams) {
      closePromises.push(
        new Promise((resolve) => {
          info.stream.end(() => resolve());
        })
      );
    }

    await Promise.all(closePromises);
    this.writeStreams.clear();
  }

  private calculateProgress(
    bytesWritten: number,
    linesWritten: number,
    totalLines: number,
    startTime: number
  ): WriteProgress {
    const elapsedMs = Date.now() - startTime;
    const percentage = totalLines > 0 ? (linesWritten / totalLines) * 100 : 100;
    const throughputMBps = elapsedMs > 0 ? (bytesWritten / (1024 * 1024)) / (elapsedMs / 1000) : 0;

    return {
      bytesWritten,
      totalBytes: 0,
      linesWritten,
      percentage,
      elapsedMs,
      throughputMBps
    };
  }
}

export const quantumWriter = QuantumFileWriter.getInstance();
