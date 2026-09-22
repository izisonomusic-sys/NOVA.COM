import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

/**
 * Filet de sécurité global : sans lui, toute exception non prévue (erreur Prisma,
 * erreur réseau vers Supabase, etc.) ressort côté client comme un "500 Internal
 * Server Error" totalement muet, et rien n'est logué côté serveur.
 * Ici on logue systématiquement le détail complet (message + stack) côté serveur,
 * et on renvoie au client un message générique sans fuite d'information sensible.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('UnhandledException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response: any = ctx.getResponse();
    const request: any = ctx.getRequest();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string;
    if (isHttp) {
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as any)?.message || exception.message;
    } else {
      message = 'Une erreur interne est survenue. Réessayez dans un instant ou contactez le support.';
    }

    if (!isHttp) {
      const err: any = exception;
      this.logger.error(
        `${request?.method} ${request?.url} -> exception non gérée: ${err?.message || err}`,
        err?.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request?.url,
      timestamp: new Date().toISOString(),
    });
  }
}
