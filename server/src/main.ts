import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { jsonCompression, healthHandler } from './core/http/middleware';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = (await NestFactory.create(AppModule)) as NestExpressApplication;

  // 全局前缀 /api/v1（与文档 §6 约定一致）
  app.setGlobalPrefix(process.env.APP_GLOBAL_PREFIX || 'api/v1', {
    exclude: ['health', 'docs', 'files'],
  });

  // 健康探针（不走全局前缀，前缀已 exclude；需在 listen 前注册）
  app.use('/health', healthHandler);

  // 响应压缩（全局中间件，早于路由执行以包裹 res.json）
  app.use(jsonCompression);

  // 请求体大小限制：显式声明，避免误配超大 body 打满内存
  app.useBodyParser('json', { limit: process.env.BODY_LIMIT || '1mb' });

  // 本地存储文件静态托管（STORAGE_TYPE=local）：/files/* → UPLOAD_DIR
  if ((process.env.STORAGE_TYPE || 'local').toLowerCase() === 'local') {
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    app.use('/files', express.static(uploadDir));
  }

  // DTO 校验
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 统一响应 + 异常
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS（H5 / 小程序 / 套壳 App 跨域）
  app.enableCors({ origin: true, credentials: true });

  // Swagger（开发/测试环境）
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('机构管理系统 API')
      .setDescription('校外培训机构管理系统 — 招生/教务/财务/家校闭环')
      .setVersion('1.9')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.setup('docs', app, config as any);
    void document;
  }

  const port = Number(process.env.APP_PORT) || 3000;

  // 优雅退出：监听 SIGTERM/SIGINT，先停止接收请求、关闭定时任务与连接池再退出。
  // 缺失该钩子时，定时任务(@nestjs/schedule)与 TypeORM 连接池会阻止进程退出，
  // 导致滚动发布时旧实例被强杀，连接与内存无法有序释放。
  app.enableShutdownHooks();

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 机构管理系统已启动: http://localhost:${port}/${process.env.APP_GLOBAL_PREFIX}`);
  // eslint-disable-next-line no-console
  console.log(`📚 Swagger: http://localhost:${port}/docs`);
}
bootstrap();
