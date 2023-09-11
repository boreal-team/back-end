import { Injectable } from "@nestjs/common";

@Injectable()
export class NetworkDatastoreService {

    private readonly store: Map<string, string> = new Map<string, string>();

    constructor() {
        this.put(`${process.env.PUBLIC_KEY_API}-tokenid`, "78309");
    }

    put(key: string, value: string): void {
        this.store.set(key, value);
    }

    get(key: string): string {
        return this.store.get(key);
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }

    size(): number {
        return this.store.size;
    }

    has(key: string): boolean {
        return this.store.has(key);
    }

    keys(): IterableIterator<string> {
        return this.store.keys();
    }

    values(): IterableIterator<string> {
        return this.store.values();
    }
}