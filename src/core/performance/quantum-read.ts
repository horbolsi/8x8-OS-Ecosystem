/**
 * 🧬 Quantum File Reader - Ultra High Performance
 * Handles 1,000,000+ lines with zero-lag streaming
 */

import { createReadStream, statSync } from 'fs';
import { createInterface } from 'readline';
import { EventEmitter } from 'events';

export interface ReadProgress {
  bytesRead: number;
  totalBytes: number;
  linesRead: number;
  percentage: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export interface QuantumReadOptions {
  highWaterMark?: number;      // Buffer size (default: 256KB)
  batchSize?: number;           // Lines per batch (default: 10000)
  progressInterval?: number;   // Progress updates (default: 1000 lines)
  encoding?: BufferEncoding;   // Default: 'utf-8'
}

export class QuantumFileReader extends EventEmitter {
  private static instance: QuantumFileReader;
  private activeReads: Map<string, Promise<string[]>> = new Map();

  static getInstance(): QuantumFileReader {
    if (!QuantumFileReader.instance) {
      QuantumFileReader.instance = new QuantumFileReader();
    }
    return QuantumFileReader.instance;
  }

  /**
   * Read file with streaming - zero lag approach
   * Returns lines as they're processed
   */
  async *streamLines(
    filePath: string,
    options: QuantumReadOptions = {}
  ): AsyncGenerator<{ line: string; lineNum: number; progress: ReadProgress }, void, unknown> {
    const {
      highWaterMark = 256 * 1024,  // 256KB buffer
      batchSize = 10000,
      progressInterval = 1000,
      encoding = 'utf-8'
    } = options;

    const stat = statSync(filePath);
    const totalBytes = stat.size;
    let bytesRead = 0;
    let linesRead = 0;
    let buffer: string[] = [];
    const startTime = Date.now();

    const rl = createInterface({
      input: createReadStream(filePath, { highWaterMark, encoding }),
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      bytesRead += Buffer.byteLength(line, encoding) + 1;
      linesRead++;
      buffer.push(line);

      // Emit batch when buffer is full
      if (buffer.length >= batchSize) {
        const progress = this.calculateProgress(
          bytesRead, totalBytes, linesRead, startTime
        );
        
        for (const bufferedLine of buffer) {
          yield { line: bufferedLine, lineNum: linesRead - buffer.length + buffer.indexOf(bufferedLine), progress };
        }
        buffer = [];
      }

      // Emit progress at intervals
      if (linesRead % progressInterval === 0) {
        const progress = this.calculateProgress(
          bytesRead, totalBytes, linesRead, startTime
        );
        this.emit('progress', progress);
      }
    }

    // Emit remaining buffer
    if (buffer.length > 0) {
      const progress = this.calculateProgress(
        bytesRead, totalBytes, linesRead, startTime
      );
      for (const bufferedLine of buffer) {
        yield { line: bufferedLine, lineNum: linesRead - buffer.length + buffer.indexOf(bufferedLine), progress };
      }
    }

    // Final progress
    const finalProgress = this.calculateProgress(
      bytesRead, totalBytes, linesRead, startTime
    );
    this.emit('complete', finalProgress);
  }

  /**
   * Read entire file ultra-fast using parallel chunk processing
   */
  async readFileParallel(filePath: string, numChunks = 16): Promise<string> {
    const stat = statSync(filePath);
    const chunkSize = Math.ceil(stat.size / numChunks);
    const chunks: Buffer[] = new Array(numChunks);
    
    const readChunk = async (index: number): Promise<Buffer> => {
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, stat.size);
      
      const { createReadStream } = await import('fs');
      const stream = createReadStream(filePath, { start, end: end - 1 });
      
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    };

    const buffers = await Promise.all(
      Array.from({ length: numChunks }, (_, i) => readChunk(i))
    );

    return Buffer.concat(buffers).toString('utf-8');
  }

  /**
   * Count lines without loading entire file
   */
  async countLines(filePath: string): Promise<number> {
    let lineCount = 0;
    
    const rl = createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    });

    for await (const _ of rl) {
      lineCount++;
    }

    return lineCount;
  }

  /**
   * Search file with streaming (grep-like)
   */
  async *searchLines(
    filePath: string,
    pattern: RegExp,
    options: QuantumReadOptions = {}
  ): AsyncGenerator<{ line: string; lineNum: number; progress: ReadProgress }, void, unknown> {
    for await (const result of this.streamLines(filePath, options)) {
      if (pattern.test(result.line)) {
        yield result;
      }
    }
  }

  private calculateProgress(
    bytesRead: number,
    totalBytes: number,
    linesRead: number,
    startTime: number
  ): ReadProgress {
    const elapsedMs = Date.now() - startTime;
    const percentage = totalBytes > 0 ? (bytesRead / totalBytes) * 100 : 100;
    const bytesPerMs = elapsedMs > 0 ? bytesRead / elapsedMs : 1;
    const remainingBytes = totalBytes - bytesRead;
    const estimatedRemainingMs = bytesPerMs > 0 ? remainingBytes / bytesPerMs : 0;

    return {
      bytesRead,
      totalBytes,
      linesRead,
      percentage,
      elapsedMs,
      estimatedRemainingMs
    };
  }
}

export const quantumReader = QuantumFileReader.getInstance();
