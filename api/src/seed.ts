/**
 * Seed script — populates the database with 20 sample transactions for demo purposes.
 *
 * Run with:  npx ts-node -r tsconfig-paths/register src/seed.ts
 *
 * What it does:
 * 1. Connects to PostgreSQL using the same TypeORM config as the app
 * 2. Finds the first registered user (or exits if none exist)
 * 3. Creates 5 fraud transactions (using real Kaggle dataset values)
 * 4. Creates 15 legitimate transactions (random small amounts, random V features)
 * 5. For each transaction: saves it, calls FastAPI /predict, saves the prediction
 *
 * The fraud feature vectors are taken from the same dataset used to train the model,
 * so they should reliably produce high fraud probabilities.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

// ── Entity imports ───────────────────────────────────────────────────────────
import { User } from './users/entities/user.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { Prediction } from './predictions/entities/prediction.entity';
import { Review } from './reviews/entities/review.entity';

// ── FastAPI response shape ───────────────────────────────────────────────────
interface MlPredictResponse {
    fraud_probability: number;
    predicted_label: boolean;
    threshold: number;
    model_version: string;
}

// ── Fraud feature vectors (real Kaggle dataset fraudulent transactions) ───────
// These are known fraudulent transactions — expect high fraud probabilities.
const FRAUD_FEATURES: Array<Record<string, number>> = [
    {
        Time: 406, Amount: 0,
        V1: -2.3122, V2: 1.9519, V3: -1.6099, V4: 3.9979,
        V5: -0.5221, V6: -1.4265, V7: -2.5374, V8: 1.3917,
        V9: -2.7700, V10: -2.7722, V11: 3.2020, V12: -2.8999,
        V13: -0.5952, V14: -4.2893, V15: 0.3898, V16: -1.1407,
        V17: -2.8301, V18: -0.0168, V19: 0.4170, V20: 0.1267,
        V21: 0.5172, V22: -0.0350, V23: -0.4653, V24: 0.3201,
        V25: 0.0445, V26: 0.1778, V27: 0.2611, V28: -0.1432,
    },
    {
        Time: 472, Amount: 529.00,
        V1: -3.0435, V2: -3.1572, V3: 1.0887, V4: 2.2886,
        V5: 1.3597, V6: -1.0467, V7: 0.3600, V8: -0.5026,
        V9: -0.9877, V10: -1.6912, V11: 1.9483, V12: -0.2944,
        V13: 0.3425, V14: -3.4604, V15: 0.5564, V16: -0.5785,
        V17: -2.2319, V18: -0.3929, V19: 0.2566, V20: 0.3488,
        V21: 0.3827, V22: -0.4017, V23: -0.2399, V24: 0.0942,
        V25: -0.1503, V26: -0.1046, V27: 0.7082, V28: 0.1249,
    },
    {
        Time: 5733, Amount: 239.93,
        V1: -2.1820, V2: -2.5299, V3: -2.5573, V4: 2.2506,
        V5: 3.6184, V6: 2.5766, V7: -0.9040, V8: 2.7695,
        V9: -0.9272, V10: -1.0296, V11: 2.0298, V12: -3.6907,
        V13: 0.2545, V14: -3.2126, V15: 0.7048, V16: -0.2977,
        V17: -3.9555, V18: -1.9427, V19: 0.8038, V20: -0.0706,
        V21: 0.4780, V22: -0.4990, V23: -0.2793, V24: -0.2386,
        V25: -0.1015, V26: 0.0344, V27: 0.5019, V28: 0.2295,
    },
    {
        Time: 9644, Amount: 56.25,
        V1: -1.3926, V2: 1.6487, V3: -4.2103, V4: 2.9573,
        V5: 3.2613, V6: -3.3574, V7: -1.3226, V8: -0.5660,
        V9: -1.6697, V10: -1.1297, V11: 2.2397, V12: -4.4046,
        V13: 0.2793, V14: -3.9082, V15: 0.5869, V16: -0.2060,
        V17: -2.6543, V18: -0.9041, V19: 0.4264, V20: -0.1183,
        V21: 0.5960, V22: -0.4416, V23: -0.3393, V24: 0.0558,
        V25: -0.0497, V26: 0.0988, V27: 0.5993, V28: 0.0933,
    },
    {
        Time: 11538, Amount: 0.76,
        V1: -2.9741, V2: 1.2695, V3: -0.3497, V4: 0.8320,
        V5: -0.9780, V6: -0.2437, V7: -2.1049, V8: 0.3780,
        V9: -2.0028, V10: -1.7558, V11: 1.3929, V12: -2.5576,
        V13: -0.4649, V14: -3.2380, V15: 0.0767, V16: -0.6688,
        V17: -2.7193, V18: -0.0679, V19: 0.2688, V20: 0.0596,
        V21: 0.4376, V22: -0.1199, V23: -0.5231, V24: 0.0748,
        V25: 0.0574, V26: 0.1553, V27: 0.2133, V28: -0.0793,
    },
];

/**
 * Generates a random legitimate-looking transaction feature vector.
 * V1-V28 are sampled from N(0,1) within [-3, 3] to mimic PCA output.
 */
function generateLegitFeatures(): Record<string, number> {
    const features: Record<string, number> = {
        Time: Math.floor(Math.random() * 86400),             // random second in 24h
        Amount: parseFloat((Math.random() * 195 + 5).toFixed(2)), // €5–€200
    };
    for (let i = 1; i <= 28; i++) {
        // Clamp to [-3, 3] to stay within plausible PCA range
        features[`V${i}`] = parseFloat((Math.random() * 6 - 3).toFixed(4));
    }
    return features;
}

// ── DataSource (mirrors app.module.ts TypeORM config) ───────────────────────
const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    username: process.env['DB_USERNAME'] ?? 'postgres',
    password: process.env['DB_PASSWORD'],
    database: process.env['DB_NAME'] ?? 'fraudguard',
    entities: [User, Transaction, Prediction, Review],
    synchronize: false, // tables already exist — don't re-sync in seed
    logging: false,
});

async function seed() {
    console.log('🌱 FraudGuard — Seed Script');
    console.log('────────────────────────────');

    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // ── Find the first user to attribute transactions to ────────────────────
    const userRepo = AppDataSource.getRepository(User);
    const seeder = await userRepo.findOne({ where: {}, order: { id: 'ASC' } });

    if (!seeder) {
        console.error('❌ No users found. Please register a user first (POST /auth/register), then re-run this script.');
        await AppDataSource.destroy();
        process.exit(1);
        return; // unreachable, but satisfies TypeScript's null-flow analysis
    }

    // At this point TypeScript knows `seeder` is not null
    const seedUser = seeder;
    console.log(`👤 Seeding as user: ${seedUser.email} (${seedUser.role})`);

    const txRepo = AppDataSource.getRepository(Transaction);
    const predRepo = AppDataSource.getRepository(Prediction);

    const ML_URL = process.env['ML_SERVICE_URL'] ?? 'http://localhost:8000';

    let processed = 0;
    let failed = 0;

    // Helper: save one transaction + call FastAPI + save prediction
    async function scoreAndSave(features: Record<string, number>, label: string, index: number) {
        const amount = features['Amount'] as number;
        const tx = txRepo.create({
            uploadedBy: seedUser,
            amount,
            occurredAt: new Date(),
            features,
            status: 'pending',
        });
        await txRepo.save(tx);

        try {
            const res = await axios.post<MlPredictResponse>(`${ML_URL}/predict`, features);
            const ml = res.data;

            const pred = predRepo.create({
                transaction: tx,
                fraudProbability: ml.fraud_probability,
                predictedLabel: ml.predicted_label,
                modelVersion: ml.model_version,
            });
            await predRepo.save(pred);

            tx.status = 'scored';
            await txRepo.save(tx);

            console.log(
                `  [${String(index + 1).padStart(2)}] ${label.padEnd(10)} | €${String(amount).padStart(7)} | fraud_prob=${ml.fraud_probability.toFixed(4)} | flagged=${ml.predicted_label}`,
            );
            processed++;
        } catch {
            tx.status = 'pending'; // leave as pending if ML fails
            console.error(`  [${index + 1}] ❌ ML service error for ${label} #${index}`);
            failed++;
        }
    }

    console.log('\n🔴 Seeding 5 fraud transactions...');
    for (let i = 0; i < FRAUD_FEATURES.length; i++) {
        await scoreAndSave(FRAUD_FEATURES[i], 'FRAUD', i);
    }

    console.log('\n🟢 Seeding 15 legitimate transactions...');
    for (let i = 0; i < 15; i++) {
        await scoreAndSave(generateLegitFeatures(), 'LEGIT', i);
    }

    console.log('\n────────────────────────────');
    console.log(`✅ Done — processed: ${processed}, failed: ${failed}`);
    await AppDataSource.destroy();
}

seed().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
