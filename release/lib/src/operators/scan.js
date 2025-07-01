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

    async process(doc) {
        for (let i = this.steps.length - 1; i >= 0; i--) {
            const step = this.steps[i];
            let matched = false;
            
            // Check 1: Previous step state promotion
            if (i > 0 && this.stepStates[this.steps[i - 1].name] !== null) {
                const conditionMet = step.condition(this.stepStates[this.steps[i - 1].name], doc);
                
                if (conditionMet) {
                    // Promote previous step's state to current step
                    const promotedState = this.stepStates[this.steps[i - 1].name];
                    this.stepStates[step.name] = {
                        ...promotedState,
                        [step.name]: { 
                            ...(promotedState[step.name] || {}),
                            ...doc 
                        }
                    };
                    this.stepStates[this.steps[i - 1].name] = null;

                    // Calculate assignments if assignment function exists
                    const assignments = step.assignment ? 
                        step.assignment(this.stepStates[step.name], doc) : null;

                    // Add to output (only if assignments exist)
                    if (assignments) {
                        this.emit(assignments);
                    }
                    matched = true;
                }
            }
            
            // Check 2: Current step state update (skip if Check 1 matched)
            if (!matched && (this.stepStates[step.name] !== null || i === 0)) {
                const conditionMet = step.condition(this.stepStates[step.name], doc);
                
                if (conditionMet) {
                    // Initialize state for first step if null
                    if (i === 0 && this.stepStates[step.name] === null) {
                        this.stepStates[step.name] = { 
                            matchId: this.nextMatchId++,
                            [step.name]: { ...doc }
                        };
                    } else if (this.stepStates[step.name] !== null) {
                        // Update existing state - preserve accumulated properties, update document
                        const currentState = this.stepStates[step.name];
                        this.stepStates[step.name] = { 
                            ...currentState,
                            [step.name]: { 
                                ...currentState[step.name],
                                ...doc 
                            }
                        };
                    }
                    
                    // Calculate assignments if assignment function exists
                    const assignments = step.assignment ? 
                        step.assignment(this.stepStates[step.name], doc) : null;

                    // Add to output (only if assignments exist)
                    if (assignments) {
                        this.emit(assignments);
                    }
                }
            }
        }
    }
} 