import {Body,Controller,Post} from '@nestjs/common';
import {IsOptional,IsString,MinLength,Matches} from 'class-validator';
import {AuthService} from './auth.service';
class R{@IsString()@Matches(/^\+[1-9]\d{7,14}$/)phone!:string;@IsString()@MinLength(8)password!:string;@IsString()@MinLength(8)confirmPassword!:string;@IsOptional()@IsString()firstName?:string;@IsOptional()@IsString()lastName?:string;@IsOptional()@IsString()referredBy?:string}
class L{@IsString()phone!:string;@IsString()password!:string}
class F{@IsString()@MinLength(20)refreshToken!:string}
@Controller('auth') export class AuthController{constructor(private s:AuthService){}@Post('register')r(@Body()d:R){return this.s.register(d.phone,d.password,d.confirmPassword,d.firstName,d.lastName,d.referredBy)}@Post('login')l(@Body()d:L){return this.s.login(d.phone,d.password)}@Post('refresh')f(@Body()d:F){return this.s.refresh(d.refreshToken)}}
