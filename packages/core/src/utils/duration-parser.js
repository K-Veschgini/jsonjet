/**
 * Duration Parser - Converts duration strings to seconds
 * Supports formats like: 100s, 60ms, 20ns, 1w3d, 1w2d8h, etc.
 */
export class DurationParser {
    static TIME_UNITS = {
        'ns': 1e-9,    // nanoseconds
        'μs': 1e-6,    // microseconds
        'ms': 1e-3,    // milliseconds
        's': 1,        // seconds
        'm': 60,       // minutes
        'h': 3600,     // hours
        'd': 86400,    // days
        'w': 604800    // weeks
    };

    /**
     * Parse a duration string and return the total seconds as a double
     * @param {string} durationStr - Duration string like "1w3d", "100s", "60ms"
     * @returns {number} Total duration in seconds
     */
    static parse(durationStr) {
        if (!durationStr || typeof durationStr !== 'string') {
            throw new Error('Duration string is required');
        }

        const trimmed = durationStr.trim();
        if (!trimmed) {
            throw new Error('Duration string cannot be empty');
        }

        // Match all duration parts (number + unit)
        const matches = trimmed.match(/(\d+(?:\.\d+)?)\s*([a-zA-Zμ]+)/g);
        if (!matches) {
            throw new Error(`Invalid duration format: ${durationStr}`);
        }

        let totalSeconds = 0;
        const seenUnits = new Set();

        for (const match of matches) {
            const partMatch = match.match(/(\d+(?:\.\d+)?)\s*([a-zA-Zμ]+)/);
            if (!partMatch) {
                throw new Error(`Invalid duration part: ${match}`);
            }

            const [, valueStr, unit] = partMatch;
            const value = parseFloat(valueStr);
            
            if (isNaN(value) || value < 0) {
                throw new Error(`Invalid duration value: ${valueStr}`);
            }

            const unitKey = unit.toLowerCase();
            const multiplier = this.TIME_UNITS[unitKey];
            
            if (multiplier === undefined) {
                throw new Error(`Unknown time unit: ${unit}`);
            }

            // Check for duplicate units
            if (seenUnits.has(unitKey)) {
                throw new Error(`Duplicate time unit: ${unit}`);
            }
            seenUnits.add(unitKey);

            totalSeconds += value * multiplier;
        }

        return totalSeconds;
    }

    /**
     * Convert seconds back to a human-readable duration string
     * @param {number} seconds - Duration in seconds
     * @returns {string} Human-readable duration string
     */
    static format(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
            throw new Error('Invalid seconds value');
        }

        if (seconds === 0) {
            return '0s';
        }

        const parts = [];
        let remaining = seconds;

        // Order from largest to smallest units
        const units = [
            ['w', 604800],  // weeks
            ['d', 86400],   // days
            ['h', 3600],    // hours
            ['m', 60],      // minutes
            ['s', 1]        // seconds
        ];

        for (const [unit, multiplier] of units) {
            if (remaining >= multiplier) {
                const value = Math.floor(remaining / multiplier);
                parts.push(`${value}${unit}`);
                remaining -= value * multiplier;
            }
        }

        // Handle fractional seconds
        if (remaining > 0) {
            if (remaining >= 1e-6) {
                parts.push(`${Math.round(remaining * 1000)}ms`);
            } else if (remaining >= 1e-9) {
                parts.push(`${Math.round(remaining * 1e6)}μs`);
            } else {
                parts.push(`${Math.round(remaining * 1e9)}ns`);
            }
        }

        return parts.join('');
    }

    /**
     * Validate if a string is a valid duration format
     * @param {string} durationStr - Duration string to validate
     * @returns {boolean} True if valid, false otherwise
     */
    static isValid(durationStr) {
        try {
            this.parse(durationStr);
            return true;
        } catch {
            return false;
        }
    }
}

export default DurationParser;