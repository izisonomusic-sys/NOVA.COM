import {Body,Controller,Post,Req,UseGuards}from'@nestjs/common';import {JwtAuthGuard}from'./auth.guard';import {StorageService}from'./storage.service';
@Controller('storage')@UseGuards(JwtAuthGuard)export class StorageController{constructor(private s:StorageService){}@Post('signed-upload')upload(@Req()q:any,@Body()b:any){return this.s.signedUpload(q.user,b.path)}}
