import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { DocState, IncomingChange } from '../../domain/merge.js';
import type {
  ApplyResult,
  SyncedDoc,
  SyncRepository,
} from '../../ports/SyncRepository.js';

const toJson = (data: unknown) =>
  data === null || data === undefined
    ? Prisma.DbNull
    : (data as Prisma.InputJsonValue);

@Injectable()
export class PrismaSyncRepository implements SyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  apply(
    userId: string,
    changes: IncomingChange[],
    resolve: (
      incoming: IncomingChange,
      current: DocState | null,
    ) => DocState | null,
  ): Promise<ApplyResult> {
    return this.prisma.$transaction(async (tx) => {
      // Bloquea la fila del usuario: los envíos simultáneos del mismo usuario se serializan.
      const locked = await tx.user.update({
        where: { id: userId },
        data: { syncSeq: { increment: 0 } },
        select: { syncSeq: true },
      });

      const existing = await tx.syncDoc.findMany({
        where: {
          userId,
          OR: changes.map((c) => ({
            collection: c.collection,
            docId: c.docId,
          })),
        },
      });
      const byKey = new Map(
        existing.map((d) => [`${d.collection}\u0000${d.docId}`, d]),
      );

      // Si el mismo documento viene varias veces en el lote, se resuelve en orden.
      const pending = new Map<
        string,
        { change: IncomingChange; state: DocState }
      >();
      let skipped = 0;
      for (const change of changes) {
        const key = `${change.collection}\u0000${change.docId}`;
        const stored = byKey.get(key);
        const current: DocState | null =
          pending.get(key)?.state ??
          (stored
            ? {
                data: stored.data,
                deleted: stored.deleted,
                clientUpdatedAt: stored.clientUpdatedAt,
              }
            : null);
        const result = resolve(change, current);
        if (result) pending.set(key, { change, state: result });
        else skipped++;
      }

      let version = locked.syncSeq;
      for (const { change, state } of pending.values()) {
        version += 1n;
        await tx.syncDoc.upsert({
          where: {
            userId_collection_docId: {
              userId,
              collection: change.collection,
              docId: change.docId,
            },
          },
          create: {
            userId,
            collection: change.collection,
            docId: change.docId,
            data: toJson(state.data),
            deleted: state.deleted,
            clientUpdatedAt: state.clientUpdatedAt,
            version,
          },
          update: {
            data: toJson(state.data),
            deleted: state.deleted,
            clientUpdatedAt: state.clientUpdatedAt,
            version,
          },
        });
      }
      if (pending.size > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { syncSeq: version },
        });
      }
      return { applied: pending.size, skipped, cursor: version };
    });
  }

  async listSince(
    userId: string,
    since: bigint,
    limit: number,
  ): Promise<SyncedDoc[]> {
    const rows = await this.prisma.syncDoc.findMany({
      where: { userId, version: { gt: since } },
      orderBy: { version: 'asc' },
      take: limit,
    });
    return rows.map((r) => ({
      collection: r.collection,
      docId: r.docId,
      data: r.data,
      deleted: r.deleted,
      clientUpdatedAt: r.clientUpdatedAt,
      version: r.version,
    }));
  }
}
