import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProvidersService {
  private readonly encKey: Buffer;

  constructor(private prisma: PrismaService) {
    // 32-byte key for AES-256-CBC
    const keyHex = process.env.ENCRYPTION_KEY || '0'.repeat(64);
    this.encKey = Buffer.from(keyHex.padEnd(64, '0').slice(0, 64), 'hex');
  }

  private encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decrypt(ciphertext: string): string {
    const [ivHex, encHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', this.encKey, iv);
    const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
    return decrypted.toString();
  }

  async addProvider(
    teamId: string,
    data: {
      name: string;
      apiKey: string;
      monthlyTokensAllowed: number;
      costPerMillionTokens: number;
    },
  ) {
    const encrypted = this.encrypt(data.apiKey);
    const provider = await this.prisma.provider.create({
      data: {
        id: uuidv4(),
        teamId,
        name: data.name,
        apiKeyEncrypted: encrypted,
        monthlyTokensAllowed: BigInt(data.monthlyTokensAllowed),
        costPerMillionTokens: data.costPerMillionTokens,
      },
    });

    return {
      id: provider.id,
      name: provider.name,
      monthlyTokensAllowed: Number(provider.monthlyTokensAllowed),
      costPerMillionTokens: provider.costPerMillionTokens,
      isActive: provider.isActive,
      // Never return the decrypted key
      apiKeyMasked: `sk-...${data.apiKey.slice(-4)}`,
    };
  }

  async getTeamProviders(teamId: string) {
    const providers = await this.prisma.provider.findMany({
      where: { teamId, isActive: true },
    });
    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      monthlyTokensAllowed: Number(p.monthlyTokensAllowed),
      costPerMillionTokens: p.costPerMillionTokens,
      isActive: p.isActive,
      createdAt: p.createdAt,
    }));
  }

  async getDecryptedKey(providerId: string): Promise<string> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return this.decrypt(provider.apiKeyEncrypted);
  }

  async deleteProvider(providerId: string) {
    await this.prisma.provider.update({
      where: { id: providerId },
      data: { isActive: false },
    });
    return { success: true };
  }
}
