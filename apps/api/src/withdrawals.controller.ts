import {Body,Controller,Get,Post,Req,UseGuards}from'@nestjs/common';
import {JwtAuthGuard}from'./auth.guard';
import {WithdrawalsService}from'./withdrawals.service';
@Controller('withdrawals')
export class WithdrawalsController{
  constructor(private s:WithdrawalsService){}
  @UseGuards(JwtAuthGuard)
  @Get()l(@Req()q:any){return this.s.list(q.user.sub)}
  @UseGuards(JwtAuthGuard)
  @Post()r(@Req()q:any,@Body()b:any){
    return this.s.request(q.user.sub,Number(b.amount),String(b.countryCode||''),String(b.operator||''),String(b.phone||''),String(b.accountName||''));
  }
  @Post('webhooks/paydunya')w(@Body()b:any){return this.s.webhook(b);}
}
