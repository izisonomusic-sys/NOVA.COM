import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private s: PaymentsService) {}
  @UseGuards(JwtAuthGuard)
  @Post('deposits') d(@Req() q: any, @Body() b: any) { return this.s.deposit(q.user.sub, Number(b.amount), String(b.method || 'paydunya')); }
  @UseGuards(JwtAuthGuard)
  @Post('mock/confirm') m(@Req() q: any, @Body() b: any) { return this.s.mockConfirm(q.user.sub, String(b.providerReference || '')); }
  @Post('webhooks/paydunya') w(@Body() b: any) { return this.s.webhook(b); }
}
