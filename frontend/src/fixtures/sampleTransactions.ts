import type { TransactionFeatures } from '../types';

/**
 * A real legitimate transaction from the Kaggle dataset (Class = 0).
 * Pre-filled for quick demo.
 */
export const LEGITIMATE_EXAMPLE: TransactionFeatures = {
    Time: 0,
    Amount: 149.62,
    V1: -1.3598, V2: -0.0728, V3: 2.5363, V4: 1.3782,
    V5: -0.3383, V6: 0.4624, V7: 0.2396, V8: 0.0987,
    V9: 0.3638, V10: 0.0908, V11: -0.5516, V12: -0.6178,
    V13: -0.9914, V14: -0.3112, V15: 1.4682, V16: -0.4704,
    V17: 0.2080, V18: 0.0258, V19: 0.4040, V20: 0.2514,
    V21: -0.0183, V22: 0.2778, V23: -0.1105, V24: 0.0669,
    V25: 0.1285, V26: -0.1891, V27: 0.1336, V28: -0.0211,
};

/**
 * A real fraudulent transaction from the Kaggle dataset (Class = 1).
 */
export const FRAUD_EXAMPLE: TransactionFeatures = {
    Time: 406,
    Amount: 0,
    V1: -2.3122, V2: 1.9519, V3: -1.6099, V4: 3.9979,
    V5: -0.5221, V6: -1.4265, V7: -2.5374, V8: 1.3917,
    V9: -2.7700, V10: -2.7722, V11: 3.2020, V12: -2.8999,
    V13: -0.5952, V14: -4.2893, V15: 0.3898, V16: -1.1407,
    V17: -2.8301, V18: -0.0168, V19: 0.4170, V20: 0.1267,
    V21: 0.5172, V22: -0.0350, V23: -0.4653, V24: 0.3201,
    V25: 0.0445, V26: 0.1778, V27: 0.2611, V28: -0.1432,
};

/** Returns a blank transaction (all zeros) — useful for "Clear" button. */
export function emptyTransaction(): TransactionFeatures {
    return {
        Time: 0, Amount: 0,
        V1: 0, V2: 0, V3: 0, V4: 0, V5: 0, V6: 0, V7: 0, V8: 0,
        V9: 0, V10: 0, V11: 0, V12: 0, V13: 0, V14: 0, V15: 0, V16: 0,
        V17: 0, V18: 0, V19: 0, V20: 0, V21: 0, V22: 0, V23: 0, V24: 0,
        V25: 0, V26: 0, V27: 0, V28: 0,
    };
}