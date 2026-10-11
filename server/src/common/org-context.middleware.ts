import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { orgAls } from './org-context';

/**
 * 校区上下文中间件：读取 X-Org-Id（前端校区切换器下发），
 * 用 AsyncLocalStorage.run 包裹整条请求，使下游 Service（BaseService）可按校区隔离。
 * 同时挂到 req.orgId 便于调试。
 */
@Injectable()
export class OrgContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const header = req.header('X-Org-Id');
    const orgId = header && !Number.isNaN(Number(header)) ? Number(header) : undefined;
    (req as any).orgId = orgId;
    orgAls.run({ orgId }, () => next());
  }
}
