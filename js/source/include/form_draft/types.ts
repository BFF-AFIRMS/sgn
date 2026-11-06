export interface DraftData<T = unknown> {
    last_modified: number;
    max_step?: number;
    data: T;
}
