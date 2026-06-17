import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { validate } from './config/index.js';
import { DatabaseModule } from './database/database.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { InstitutionModule } from './modules/institution/institution.module.js';
import { ProgramModule } from './modules/program/program.module.js';
import { CategoryModule } from './modules/category/category.module.js';
import { KeywordModule } from './modules/keyword/keyword.module.js';
import { AuthorModule } from './modules/author/author.module.js';
import { ResearchModule } from './modules/research/research.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { CollectionModule } from './modules/collection/collection.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { PdfRequestModule } from './modules/pdf-request/pdf-request.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    DatabaseModule,
    StorageModule,
    EmailModule,
    AuthModule,
    UserModule,
    InstitutionModule,
    ProgramModule,
    CategoryModule,
    KeywordModule,
    AuthorModule,
    ResearchModule,
    SearchModule,
    CollectionModule,
    NotificationModule,
    AnalyticsModule,
    PdfRequestModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
