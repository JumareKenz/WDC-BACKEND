/**
 * Boots the Nest app in document-only mode to extract the OpenAPI spec from
 * @nestjs/swagger decorators and write it to `openapi.generated.yaml`. CI
 * compares this against the committed `openapi.yaml` to catch breaking changes.
 *
 * For M1 the document is a stub; this script exists so the toolchain is wired
 * end-to-end. It is filled in as endpoints are added in later milestones.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stringify } from 'yaml';

async function main(): Promise<void> {
  // Late dynamic import so this script can run before deps are fully wired.
  const { NestFactory } = await import('@nestjs/core');
  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const { AppModule } = await import('../src/app.module');

  const app = await NestFactory.create(AppModule, { logger: false });
  const cfg = new DocumentBuilder()
    .setTitle('WDC Backend')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, cfg);
  await app.close();

  const out = resolve(process.cwd(), 'openapi.generated.yaml');
  writeFileSync(out, stringify(doc), 'utf8');
  process.stdout.write(`wrote ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`openapi:generate failed: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
