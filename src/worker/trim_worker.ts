import { nanoid } from 'nanoid';
import { NewTrimJobRequest, TrimJobStatus } from '../model';
import TrimService from '../service/trim_service';

type TrimServices = TrimService[];

export default class TrimWorker {
  private id: string;
  private trimServices: TrimServices = [];

  constructor() {
    this.id = nanoid();
  }

  getId(): string {
    return this.id;
  }

  cancelJob(id: string): void {
    const service = this.trimServices.find((service) => service.getId() === id);
    if (service) {
      service.cancelJob();
    }
  }

  getJob(id: string):
    | {
        job: NewTrimJobRequest | undefined;
        outputFiles: string[];
      }
    | undefined {
    const service = this.trimServices.find((service) => service.getId() === id);
    return service?.getJob();
  }

  getJobStatus(id: string): TrimJobStatus | undefined {
    return this.trimServices
      .find((service) => service.getId() === id)
      ?.getState();
  }

  startJob(props: NewTrimJobRequest): string {
    let service = this.trimServices.find(
      (service) =>
        !service.getState() || service.getState() !== TrimJobStatus.RUNNING
    );
    if (!service) {
      service = new TrimService();
      this.trimServices.push(service);
    }
    service.trim(props);
    return service.getId();
  }
}
