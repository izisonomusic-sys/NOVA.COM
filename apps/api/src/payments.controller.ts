import {Body,Controller,Post,Req,UseGuards}from'@nestjs/common';
import {JwtAuthGuard}from'./auth.guard';
import {PaymentsService}from'./payments.service';
@Controller('payments'){
