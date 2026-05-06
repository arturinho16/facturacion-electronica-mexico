declare module 'ssh2-sftp-client' {
  type ConnectConfig = {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string | Buffer;
    passphrase?: string;
    readyTimeout?: number;
  };

  export default class SftpClient {
    constructor(name?: string);
    connect(config: ConnectConfig): Promise<unknown>;
    list(remotePath?: string): Promise<unknown[]>;
    mkdir(remotePath: string, recursive?: boolean): Promise<string>;
    put(input: string | Buffer, remotePath: string): Promise<string>;
    end(): Promise<void>;
  }
}
