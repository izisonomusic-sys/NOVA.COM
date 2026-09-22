import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { InvestmentsService } from './investments.service';

@Controller('investments')
@UseGuards(JwtAuthGuard)
export class InvestmentsController {
  constructor(private s: InvestmentsService) {}
  @Get() l(@Req() q:any) { return this.s.list(q.user.sub); }
  @Get('me') me(@Req() q:any) { return this.s.list(q.user.sub); }
  @Post() i(@Req() q:any,@Body() b:any) { return this.s.invest(q.user.sub,b.projectId,Number(b.amount)); }
}
