declare module "recursive-fs" {
    export interface ICopyDirCallback {
        (error?: any): void;
    }

    export interface IReadDirCallback {
        (error?: any, directories?: string[], files?: string[]): void;
    }

    export interface IRemoveDirCallback {
        (error?: any): void;
    }

    export function cpdirr(sourceDirectoryPath: string, targetDirectoryPath: string, callback: ICopyDirCallback): void;
    export function readdirr(directoryPath: string, callback: IReadDirCallback): void;
    export function rmdirr(directoryPath: string, callback: IRemoveDirCallback): void;
}