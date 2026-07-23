import redis from "@scheduler/redis";

const STREAM_KEY = "jobs-stream";
const GROUP_NAME = "workers";
const CONSUMER_NAME = "recovery-worker";

async function startRecoveryWorker() {

    console.log("[Recovery Worker] Started");

    while (true) {

        const response = await redis.xautoclaim(
            STREAM_KEY,
            GROUP_NAME,
            CONSUMER_NAME,
            30000,
            "0-0",
            "COUNT",
            10
        );

        console.log(response);

        await sleep(5000);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startRecoveryWorker();