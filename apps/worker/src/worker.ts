import redis from "./redis/client.js";

async function startWorker() {
  try {
    await redis.xgroup("CREATE", "jobs-stream", "workers", "0", "MKSTREAM");

    console.log("Consumer Group Created");
  } catch (err) {
    console.log("Consumer Group already exists");
  }

  while (true) {
    const jobs = await redis.xreadgroup(
      "GROUP",
      "workers",
      "worker-1",
      "BLOCK",
      0,
      "COUNT",
      1,
      "STREAMS",
      "jobs-stream",
      ">",
    );

    console.log(jobs)
  }
}

startWorker();
