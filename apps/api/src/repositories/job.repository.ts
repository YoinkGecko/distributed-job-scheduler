import {Job} from '@scheduler/types';

export class JobRepository {
    async create(job: Job) {
        console.log("Job Repository reached, JOB:",job);
    }
}