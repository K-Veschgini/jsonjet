import { Operator } from '../core/operator.js';

export class ScanOperator extends Operator {
    constructor() {
        super();
        this.steps = [];
        this.stepStates = {};
        this.nextMatchId = 0;
    }

    addStep(name, condition, assignment = null) {
        this.steps.push({ name, condition, assignment });
        this.stepStates[name] = null;
        return this;
    }

    async process(item) {
        for (let i = this.steps.length - 1; i >= 0; i--) {
            const step = this.steps[i];
            let matched = false;
            
            // Check 1: Previous step state promotion
            if (i > 0 && this.stepStates[this.steps[i - 1].name] !== null) {
                const conditionMet = step.condition(this.stepStates[this.steps[i - 1].name], item);
                
                if (conditionMet) {
                    // Promote previous step's state to current step
                    const promotedState = this.stepStates[this.steps[i - 1].name];
                    this.stepStates[step.name] = {
                        ...promotedState,
                        [step.name]: { 
                            ...(promotedState[step.name] || {})
                        }
                    };
                    this.stepStates[this.steps[i - 1].name] = null;

                    // Calculate assignments if assignment function exists
                    // Create a flat state object for the assignment function
                    const flatState = { [step.name]: this.stepStates[step.name][step.name] };
                    const assignments = step.assignment ? 
                        step.assignment(flatState, item) : null;

                    // Update the actual state with any changes from the assignment function
                    this.stepStates[step.name][step.name] = flatState[step.name];

                    // Add to output (only if assignments exist)
                    if (assignments) {
                        this.emit(assignments);
                    }
                    matched = true;
                }
            }
            
            // Check 2: Current step state update (skip if Check 1 matched)
            if (!matched && (this.stepStates[step.name] !== null || i === 0)) {
                const conditionMet = step.condition(this.stepStates[step.name], item);
                
                if (conditionMet) {
                    // Initialize state for first step if null
                    if (i === 0 && this.stepStates[step.name] === null) {
                        this.stepStates[step.name] = { 
                            matchId: this.nextMatchId++,
                            [step.name]: {}
                        };
                    } else if (this.stepStates[step.name] !== null) {
                        // Update existing state - preserve accumulated properties, don't merge input
                        const currentState = this.stepStates[step.name];
                        this.stepStates[step.name] = { 
                            ...currentState,
                            [step.name]: { 
                                ...currentState[step.name]
                            }
                        };
                    }
                    
                    // Calculate assignments if assignment function exists
                    // Create a flat state object for the assignment function
                    const flatState = { [step.name]: this.stepStates[step.name][step.name] };
                    const assignments = step.assignment ? 
                        step.assignment(flatState, item) : null;

                    // Update the actual state with any changes from the assignment function
                    this.stepStates[step.name][step.name] = flatState[step.name];

                    // Add to output (only if assignments exist)
                    if (assignments) {
                        this.emit(assignments);
                    }
                }
            }
        }
    }
} 