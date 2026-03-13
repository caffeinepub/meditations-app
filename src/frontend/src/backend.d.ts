import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Session {
    duration: bigint;
    date: Time;
}
export type Time = bigint;
export interface backendInterface {
    addSession(duration: bigint): Promise<void>;
    getAllSessions(): Promise<Array<[Principal, Array<Session>]>>;
    getSessions(): Promise<Array<Session>>;
    getUserSessions(user: Principal): Promise<Array<Session>>;
}
