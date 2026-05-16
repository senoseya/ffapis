import protobuf from 'protobufjs';
import path from 'path';
import { encrypt } from './crypto';
import { resolveProjectDir } from './resolve-path';

const PROTO_DIR = resolveProjectDir('proto');

class ProtoHandler {
  private roots: Record<string, protobuf.Root> = {};

  async load(filename: string): Promise<protobuf.Root> {
    if (!this.roots[filename]) {
      this.roots[filename] = await protobuf.load(path.join(PROTO_DIR, filename));
    }
    return this.roots[filename];
  }

  async encode(filename: string, messageName: string, payload: Record<string, unknown>, shouldEncrypt = true): Promise<Buffer> {
    const root = await this.load(filename);
    const Type = root.lookupType(messageName);

    const errMsg = Type.verify(payload);
    if (errMsg) throw new Error(errMsg);

    const message = Type.create(payload);
    const buffer = Type.encode(message).finish();

    if (shouldEncrypt) {
      return encrypt(Buffer.from(buffer));
    }
    return Buffer.from(buffer);
  }

  async decode(filename: string, messageName: string, buffer: Buffer | ArrayBuffer): Promise<unknown> {
    const root = await this.load(filename);
    const Type = root.lookupType(messageName);

    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const message = Type.decode(buf);
    return Type.toObject(message, {
      longs: String,
      enums: String,
      bytes: String,
      defaults: true,
      arrays: true
    });
  }
}

export const protoHandler = new ProtoHandler();
