import {NestFactory}from '@nestjs/core';import {Logger,ValidationPipe}from '@nestjs/common';import helmet from 'helmet';import {AppModule}from './app.module';import {AllExceptionsFilter}from './common/all-exceptions.filter';

const bootLogger=new Logger('Bootstrap');

// Vérifie les variables indispensables AVANT de tenter de démarrer Nest/Prisma.
// Sans ça, une variable manquante fait planter le process au tout premier
// $connect() de Prisma, avec un message Prisma générique et l'API ne se met
// jamais à écouter sur le port -> côté frontend ça ressemble à "impossible
// de joindre le serveur", sans aucune indication de la vraie cause.
function checkRequiredEnv(){
  const required=['DATABASE_URL','DIRECT_URL','SUPABASE_URL','SUPABASE_SECRET_KEY'];
  const missing=required.filter(k=>!process.env[k] || process.env[k]!.includes('YOUR_') || process.env[k]!.includes('TON-PROJET') || process.env[k]!.includes('COLLE_ICI'));
  if(missing.length){
    bootLogger.error(`Démarrage annulé : variables manquantes ou non renseignées dans apps/api/.env -> ${missing.join(', ')}`);
    bootLogger.error("Renseigne ces valeurs (voir apps/api/.env.example et ENV-SETUP-NOVA.md) puis relance 'npm run dev -w apps/api'.");
    process.exit(1);
  }
}

async function main(){
  checkRequiredEnv();
  const app=await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({origin:(process.env.FRONTEND_URL||'http://localhost:3000').split(',').map(x=>x.trim()),credentials:true});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,forbidUnknownValues:false}));
  app.useGlobalFilters(new AllExceptionsFilter());
  const port=Number(process.env.PORT||4000);
  await app.listen(port,'0.0.0.0');
  bootLogger.log(`API démarrée sur http://localhost:${port}`);
}

main().catch((err)=>{
  bootLogger.error(`L'API n'a pas pu démarrer : ${err?.message||err}`, err?.stack);
  process.exit(1);
});
