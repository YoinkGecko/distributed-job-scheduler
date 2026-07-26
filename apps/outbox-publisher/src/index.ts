import { OutboxPublisher } from "./publisher.js";

const publisher = new OutboxPublisher();

publisher.start();