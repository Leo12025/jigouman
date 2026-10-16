import { Module } from '@nestjs/common';
import { AiService } from './ai.service';

/** 全局共享的 AI 辅助服务（§11.8），无状态、可安全被多模块复用。 */
@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
