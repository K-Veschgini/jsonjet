import fs from 'fs';
import path from 'path';
import DurationParser from '../utils/duration-parser.js';

/**
 * WriteToFile - Sink operator that writes stream data to a file as NDJSON
 * Usage: | write_to_file("/path/to/file.ndjson", { fsync_every: "5s", mode: "append", buffer_size_mb: 1.0 })
 */
export class WriteToFile {
    constructor(filePath, options = {}) {
        this.filePath = filePath;
        this.options = this._parseOptions(options);
        this.buffer = [];
        this.bufferSizeBytes = 0;
        this.bufferSizeLimitBytes = this.options.buffer_size_mb * 1024 * 1024;
        this.documentCount = 0;
        this.lastFsyncTime = Date.now();
        this.fileDescriptor = null;
        this.downstream = null;
        this.stream = null;
        this.isInitialized = false;
        
        // Initialize file on construction
        this._initializeFile();
    }

    _parseOptions(options) {
        const defaults = {
            fsync_every: null, // null means only fsync on flush
            mode: "append",
            buffer_size_mb: 1.0
        };

        const parsed = { ...defaults, ...options };

        // Parse fsync_every duration if provided
        if (parsed.fsync_every && typeof parsed.fsync_every === 'string') {
            try {
                parsed.fsync_every = DurationParser.parse(parsed.fsync_every);
            } catch (error) {
                console.warn(`Invalid fsync_every duration "${parsed.fsync_every}", using default (flush only)`);
                parsed.fsync_every = null;
            }
        }

        // Validate mode
        if (!['append', 'overwrite'].includes(parsed.mode)) {
            console.warn(`Invalid mode "${parsed.mode}", using "append"`);
            parsed.mode = 'append';
        }

        // Validate buffer size
        if (typeof parsed.buffer_size_mb !== 'number' || parsed.buffer_size_mb <= 0) {
            console.warn(`Invalid buffer_size_mb "${parsed.buffer_size_mb}", using 1.0 MB`);
            parsed.buffer_size_mb = 1.0;
        }

        return parsed;
    }

    _initializeFile() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Open file based on mode
            const flags = this.options.mode === 'overwrite' ? 'w' : 'a';
            this.fileDescriptor = fs.openSync(this.filePath, flags);
            this.isInitialized = true;
            
            console.log(`WriteToFile: Initialized file "${this.filePath}" in ${this.options.mode} mode`);
        } catch (error) {
            console.error(`WriteToFile: Failed to initialize file "${this.filePath}":`, error.message);
            throw error;
        }
    }

    async process(item) {
        if (!this.isInitialized) {
            console.error('WriteToFile: File not initialized, skipping item');
            return;
        }

        try {
            // Convert item to NDJSON line
            const jsonLine = JSON.stringify(item) + '\n';
            const lineBytes = Buffer.byteLength(jsonLine, 'utf8');
            
            // Add to buffer
            this.buffer.push(jsonLine);
            this.bufferSizeBytes += lineBytes;
            this.documentCount++;

            // Check if we need to flush buffer due to size limit
            if (this.bufferSizeBytes >= this.bufferSizeLimitBytes) {
                await this._flushBuffer();
            }

            // Check if we need to fsync based on time interval
            if (this.options.fsync_every && 
                (Date.now() - this.lastFsyncTime) / 1000 >= this.options.fsync_every) {
                await this._flushBuffer();
                await this._fsync();
            }

        } catch (error) {
            console.error(`WriteToFile: Error processing item:`, error.message);
        }
    }

    async _flushBuffer() {
        if (this.buffer.length === 0 || !this.isInitialized) {
            return;
        }

        try {
            // Write all buffered lines
            const data = this.buffer.join('');
            fs.writeSync(this.fileDescriptor, data);
            
            // Clear buffer
            this.buffer = [];
            this.bufferSizeBytes = 0;
            
        } catch (error) {
            console.error(`WriteToFile: Error flushing buffer:`, error.message);
            throw error;
        }
    }

    async _fsync() {
        if (!this.isInitialized) {
            return;
        }

        try {
            fs.fsyncSync(this.fileDescriptor);
            this.lastFsyncTime = Date.now();
        } catch (error) {
            console.error(`WriteToFile: Error during fsync:`, error.message);
            throw error;
        }
    }

    async flush() {
        console.log(`WriteToFile: Flushing ${this.buffer.length} buffered items to "${this.filePath}"`);
        
        try {
            // Flush buffer and fsync
            await this._flushBuffer();
            await this._fsync();
        } catch (error) {
            console.error(`WriteToFile: Error during flush:`, error.message);
        }

        // Pass flush downstream
        if (this.downstream) {
            await this.downstream.flush();
        }
    }

    async cleanup() {
        console.log(`WriteToFile: Cleaning up file "${this.filePath}"`);
        
        try {
            // Flush any remaining data
            await this._flushBuffer();
            await this._fsync();
            
            // Close file descriptor
            if (this.fileDescriptor !== null) {
                fs.closeSync(this.fileDescriptor);
                this.fileDescriptor = null;
            }
            
            this.isInitialized = false;
        } catch (error) {
            console.error(`WriteToFile: Error during cleanup:`, error.message);
        }
    }

    push(item) {
        this.process(item).catch(error => {
            console.error(`WriteToFile push error:`, error);
        });
    }

    emit(item) {
        this.push(item);
    }

    pipe(operator) {
        this.downstream = operator;
        operator.stream = this.stream;
        return operator;
    }

    // Get stats for debugging
    getStats() {
        return {
            filePath: this.filePath,
            options: this.options,
            documentsProcessed: this.documentCount,
            bufferSize: this.buffer.length,
            bufferSizeBytes: this.bufferSizeBytes,
            bufferSizeLimitBytes: this.bufferSizeLimitBytes,
            isInitialized: this.isInitialized
        };
    }
}

export default WriteToFile;