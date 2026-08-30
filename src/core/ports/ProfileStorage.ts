/**
 * The storage port. Implemented by browser local storage, later by a file next
 * to the .exe. No cloud and no network (P5).
 */
export interface ProfileStorage {
  load<T>(key: string): Promise<T | null>
  save<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}
